import type { TipoMovimiento } from "@/lib/tipos";
import { MESES, type FilaBanco, type ResultadoLectura } from "./csv";

/**
 * Interpreta el texto de un estado de cuenta de débito de Santander México.
 *
 * El PDF de Santander no trae texto: cada página es una imagen. Por eso el
 * texto llega de un OCR (reconocimiento óptico de caracteres) y esta función
 * está escrita para tolerar sus errores típicos, como leer "0CT" por "OCT".
 *
 * Cada movimiento empieza con un renglón así, seguido de renglones de detalle:
 *   02-OCT-2026 0025177 CONSUMO LOCAL AJENO ...      500.00      10,762.98
 *   (fecha)     (folio) (descripción)                (monto)     (saldo)
 *
 * El OCR no conserva en qué columna estaba el monto (Depósito o Retiro), así
 * que el tipo se deduce con aritmética: si el saldo subió exactamente ese
 * monto fue un depósito; si bajó, un retiro. La misma cuenta sirve para
 * detectar y corregir un dígito mal leído (ver "resolver"). Al final, las
 * sumas se comparan con el renglón TOTAL del propio estado de cuenta.
 */

const DINERO = /\d{1,3}(?:,\d{3})*\.\d{2}/g;
// Fecha, folio y el resto. Entre folio y descripción hay una línea vertical
// que el OCR a veces lee como "|", "/", "[" o una "f" pegada al texto.
const INICIO =
  /^([0-9OIl]{2})-([A-Z0-9]{3})-(\d{4})\s+(\d{5,8})(?:\s+|[^A-Za-z0-9\s]\s*|[fli](?=[A-Z]))(.+)$/;
// Plan B si el folio salió ilegible: basta la fecha (y, más abajo, dos cifras).
const INICIO_SIN_FOLIO = /^([0-9OIl]{2})-([A-Z0-9]{3})-(\d{4})\s+()(.+)$/;
const ENCABEZADO_O_PIE =
  /^(P[áa]gina \d|.{0,3}Santander|Banco Santander|Instituci[óo]n de Banca|Grupo Financiero|PERIODO DEL|FECHA\b|DEBITO |SALDO FINAL)|CODIGO DE CLIENTE/i;

// Renglón final de la tabla: "TOTAL  21,798.00  26,800.39". El "(?!%)" evita
// confundirlo con el TOTAL del resumen de la página 1, que lleva porcentajes.
const TOTAL = /^TOTAL\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?!\s*%)/m;

/** ¿El texto leído hasta ahora ya incluye el final de la tabla de movimientos? */
export function terminoLaTabla(texto: string): boolean {
  return /^[0-9OIl]{2}-[A-Z0-9]{3}-\d{4}\s/m.test(texto) && TOTAL.test(texto);
}

const aNumero = (texto: string) => Number(texto.replace(/,/g, ""));
const centavos = (n: number) => Math.round(n * 100);

/** Corrige confusiones del OCR entre letras y dígitos: "0CT" → "OCT", "O5" → "05". */
function leerFechaOCR(dia: string, mes: string, anio: string): string | null {
  const d = Number(dia.replace(/O/g, "0").replace(/[Il]/g, "1"));
  const m = MESES[mes.replace(/0/g, "O").replace(/1/g, "I").replace(/5/g, "S")];
  if (!m || !(d >= 1 && d <= 31)) return null;
  return `${anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const OPERACIONES = ["CONSUMO", "ABONO", "DEPOSITO", "PAGO", "CARGO", "RETIRO", "COMISION"];

/** ¿Dos textos del mismo largo difieren en a lo mucho `max` caracteres? */
function casiIguales(a: string, b: string, max: number): boolean {
  if (a.length !== b.length) return false;
  let distintos = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) distintos++;
  return distintos <= max;
}

/**
 * La primera palabra es la que más sufre en el OCR, porque queda pegada a la
 * línea vertical de la tabla: "[consu", "7olcoNsuMO", "fPACO". Como siempre es
 * una de pocas operaciones conocidas, se restaura comparando solo sus letras.
 */
function repararInicio(principal: string): string {
  let resto = principal.trim();
  for (let intento = 0; intento < 2; intento++) {
    const [primera = "", ...demas] = resto.split(/\s+/);
    const letras = primera.replace(/[^A-Za-z]/g, "").toUpperCase();
    const operacion =
      OPERACIONES.find((op) => letras.endsWith(op)) ??
      OPERACIONES.find((op) => letras.length >= 4 && op.includes(letras)) ??
      OPERACIONES.find((op) => casiIguales(letras.slice(-op.length), op, 1));
    if (operacion) return [operacion, ...demas].join(" ");
    if (!/\d/.test(primera)) break; // es una palabra normal: se deja como está
    resto = demas.join(" "); // era un resto del folio: se descarta y se reintenta
  }
  return resto;
}

/** Arma una descripción corta: operación + lo más informativo del detalle. */
function describir(principal: string, detalle: string[]): string {
  const operacion = repararInicio(
    principal
      .replace(/\bHORA \d{2}:\d{2}:\d{2}\b/, "")
      .replace(/\bTERMINACION \d{4}\b.*$/, "")
      .replace(/[|—¡!]/g, " ")
      .replace(/\s+/g, " "),
  );

  // En transferencias lo útil es el CONCEPTO; en compras, el comercio, que
  // viene en el renglón siguiente tras unos códigos ("OPM 150323DI1 PAYPAL...").
  const concepto = detalle.find((l) => /^CONCEPTO\s+\S/i.test(l))?.replace(/^CONCEPTO\s+/i, "");
  const comercio = detalle[0]?.replace(/^(?:[A-Z]{3}\s+[A-Z0-9]{9,13}|\d{6,})\s+/, "");
  const extra = (concepto ?? comercio ?? "")
    .replace(/\s+/g, " ")
    .replace(/[\s—\-[\]|]+$/, "")
    .trim();

  return [operacion, extra].filter(Boolean).join(" · ").slice(0, 200) || "Sin descripción";
}

/** Un renglón tal como salió del OCR, antes de decidir si es depósito o retiro. */
type Crudo = {
  fecha: string;
  folio: string;
  monto: number;
  saldo: number | null; // saldo impreso tras el movimiento, si se pudo leer
  principal: string;
  detalle: string[];
};

/**
 * Decide el tipo de cada movimiento siguiendo la cadena de saldos:
 *   saldo anterior ± monto = saldo nuevo
 * Si la cuenta no sale es que el OCR leyó mal una cifra. Para saber cuál, se
 * mira el renglón siguiente:
 *  a) si el siguiente parte bien de este saldo, el saldo es correcto y el mal
 *     leído es el monto: se corrige con la diferencia de saldos;
 *  b) si el siguiente solo cuadra saltándose este saldo, el mal leído es el
 *     saldo: se ignora y el monto se conserva;
 *  c) si nada cuadra, se decide por el texto y se marca como dudoso.
 */
function resolver(crudos: Crudo[], saldoInicial: number | null): FilaBanco[] {
  let saldo = saldoInicial === null ? null : centavos(saldoInicial);

  return crudos.map((c, i) => {
    let monto = centavos(c.monto);
    const nuevo = c.saldo === null ? null : centavos(c.saldo);
    const signoPorTexto = /^(ABONO|DEPOSITO)/.test(repararInicio(c.principal)) ? 1 : -1;
    let signo = signoPorTexto;
    let dudoso = false;

    if (saldo === null || nuevo === null) {
      // Falta un saldo para comparar: se decide por el texto.
      saldo = nuevo ?? (saldo === null ? null : saldo + signo * monto);
    } else if (Math.abs(nuevo - saldo) === monto) {
      signo = nuevo > saldo ? 1 : -1;
      saldo = nuevo;
    } else {
      const sig = crudos[i + 1];
      const sigMonto = sig ? centavos(sig.monto) : null;
      const sigSaldo = sig?.saldo == null ? null : centavos(sig.saldo);

      if (sigMonto !== null && sigSaldo !== null && Math.abs(sigSaldo - nuevo) === sigMonto) {
        // (a) el saldo es fiable; el monto se leyó mal.
        const corregido = Math.abs(nuevo - saldo);
        // Un dígito o dos cambiados es un error de lectura normal. Si la
        // diferencia es mayor, quizá se perdió un renglón entero: a revisar.
        dudoso = !casiIguales(String(monto), String(corregido), 2);
        monto = corregido;
        signo = nuevo > saldo ? 1 : -1;
        saldo = nuevo;
      } else {
        const base = saldo;
        const posibles = [1, -1].filter(
          (s) =>
            sigMonto !== null &&
            sigSaldo !== null &&
            Math.abs(sigSaldo - (base + s * monto)) === sigMonto,
        );
        if (posibles.length > 0) {
          // (b) el saldo impreso se leyó mal; se reconstruye.
          signo = posibles.includes(signoPorTexto) ? signoPorTexto : posibles[0];
          saldo = base + signo * monto;
        } else {
          // (c) no hay forma de comprobarlo.
          dudoso = true;
          saldo = nuevo;
        }
      }
    }

    return {
      fecha: c.fecha,
      descripcion: describir(c.principal, c.detalle),
      monto: monto / 100,
      tipo: signo === 1 ? "ingreso" : "gasto",
      ...(c.folio ? { referencia: c.folio } : {}),
      ...(dudoso || monto === 0 ? { dudoso: true } : {}),
    };
  });
}

export function leerTextoSantander(texto: string): ResultadoLectura {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let saldo: number | null = null; // saldo con el que empieza el periodo
  let totales: { depositos: number; retiros: number } | null = null;
  let descartadas = 0;

  const crudos: Crudo[] = [];

  for (const linea of lineas) {
    const saldoAnterior = linea.match(/SALDO FINAL DEL PERIODO ANTERIOR\D*([\d,]+\.\d{2})/i);
    if (saldoAnterior && saldo === null) {
      saldo = aNumero(saldoAnterior[1]);
      continue;
    }

    const total = linea.match(TOTAL);
    if (total && crudos.length > 0) {
      totales = { depositos: aNumero(total[1]), retiros: aNumero(total[2]) };
      break; // después de TOTAL ya solo hay glosario y avisos legales
    }

    const sinFolio = linea.match(INICIO_SIN_FOLIO);
    const inicio =
      linea.match(INICIO) ??
      (sinFolio && [...sinFolio[5].matchAll(DINERO)].length >= 2 ? sinFolio : null);
    if (!inicio) {
      const actual = crudos[crudos.length - 1];
      if (actual && !ENCABEZADO_O_PIE.test(linea)) actual.detalle.push(linea);
      continue;
    }

    const [, dia, mes, anio, folio, resto] = inicio;
    const fecha = leerFechaOCR(dia, mes, anio);
    const cifras = [...resto.matchAll(DINERO)];
    if (!fecha || cifras.length === 0) {
      descartadas++;
      continue;
    }

    // Lo normal son dos cifras al final: monto y saldo. Si el OCR perdió el
    // saldo, queda solo el monto.
    const iMonto = cifras.length >= 2 ? cifras.length - 2 : 0;
    const monto = aNumero(cifras[iMonto][0]);
    const saldoNuevo = cifras.length >= 2 ? aNumero(cifras[cifras.length - 1][0]) : null;
    const principal = resto.slice(0, cifras[iMonto].index).trim();
    if (!(monto > 0)) {
      descartadas++;
      continue;
    }

    crudos.push({ fecha, folio, monto, saldo: saldoNuevo, principal, detalle: [] });
  }

  if (crudos.length === 0) {
    return {
      ok: false,
      error:
        "No encontré movimientos en el PDF. Por ahora solo se reconoce el estado de cuenta de débito de Santander.",
    };
  }

  const filas = resolver(crudos, saldo);

  let cuadra: boolean | undefined;
  if (totales) {
    const suma = (t: TipoMovimiento) =>
      filas.filter((f) => f.tipo === t).reduce((s, f) => s + centavos(f.monto), 0);
    cuadra =
      suma("ingreso") === centavos(totales.depositos) &&
      suma("gasto") === centavos(totales.retiros);
  }

  return { ok: true, filas, descartadas, cuadra };
}
