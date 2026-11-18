import Papa from "papaparse";
import type { TipoMovimiento } from "@/lib/tipos";
import { normalizar } from "./texto";

/** Un renglón del estado de cuenta ya interpretado. */
export type FilaBanco = {
  fecha: string; // AAAA-MM-DD
  descripcion: string;
  monto: number; // siempre positivo
  tipo: TipoMovimiento;
};

export type ResultadoCSV =
  | { ok: true; filas: FilaBanco[]; descartadas: number }
  | { ok: false; error: string };

const MESES: Record<string, number> = {
  ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, AUG: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12,
};

/** Quita comillas, apóstrofos y el ="..." con que los bancos protegen las celdas. */
function limpiarCelda(celda: unknown): string {
  return String(celda ?? "")
    .trim()
    .replace(/^=?["']+|["']+$/g, "")
    .trim();
}

function armarFecha(a: number, m: number, d: number): string | null {
  if (a < 100) a += 2000;
  if (a < 1990 || a > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCMonth() !== m - 1) return null; // p. ej. 31 de febrero
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Interpreta los formatos de fecha habituales en bancos mexicanos (día primero):
 * 18/11/2026, 18-11-26, 18112026, 2026-11-18, 18/NOV/2026, 18 nov 26.
 */
export function leerFecha(texto: string): string | null {
  const t = limpiarCelda(texto);
  let p: RegExpMatchArray | null;

  if ((p = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    return armarFecha(+p[1], +p[2], +p[3]);
  }
  if ((p = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/))) {
    return armarFecha(+p[3], +p[2], +p[1]);
  }
  if (/^\d{7,8}$/.test(t)) {
    // DDMMAAAA; con 7 dígitos, Excel se comió el cero inicial del día.
    const s = t.padStart(8, "0");
    return (
      armarFecha(+s.slice(4), +s.slice(2, 4), +s.slice(0, 2)) ??
      armarFecha(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6)) // AAAAMMDD
    );
  }
  if ((p = t.match(/^(\d{1,2})[/\-. ]([A-Za-z]{3})[A-Za-z]*\.?[/\-. ](\d{2,4})$/))) {
    const mes = MESES[p[2].toUpperCase()];
    return mes ? armarFecha(+p[3], mes, +p[1]) : null;
  }
  return null;
}

/** "$1,234.50" → 1234.5 · "(85.00)" → -85 · "85,50" → 85.5. null si no es número. */
export function leerNumero(texto: string): number | null {
  let t = limpiarCelda(texto).replace(/[$\s]|MXN|M\.N\./gi, "");
  if (!t) return null;
  let signo = 1;
  if (/^\(.*\)$/.test(t)) { signo = -1; t = t.slice(1, -1); }
  if (t.endsWith("-")) { signo = -1; t = t.slice(0, -1); }
  if (t.startsWith("-")) { signo = -1; t = t.slice(1); }
  if (t.startsWith("+")) t = t.slice(1);

  if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(",", "."); // coma decimal
  else t = t.replace(/,/g, ""); // comas de miles
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return signo * Number(t);
}

/** Índice de la primera columna cuyo encabezado cumple la condición. */
function buscar(encabezados: string[], cumple: (e: string) => boolean): number {
  return encabezados.findIndex(cumple);
}

/**
 * Lee el texto de un CSV bancario y devuelve sus movimientos.
 *
 * No asume un formato fijo: localiza el renglón de encabezados (los bancos
 * suelen poner datos de la cuenta antes) y reconoce las columnas por nombre.
 * Admite tanto columnas separadas de Cargo y Abono como una sola de Importe
 * con signo o con una columna "Cargo/Abono" que indique + o -.
 */
export function leerCSV(texto: string): ResultadoCSV {
  const { data } = Papa.parse<string[]>(texto.replace(/^﻿/, ""), {
    skipEmptyLines: "greedy",
  });
  const tabla = data.map((fila) => fila.map(limpiarCelda));

  const iEncabezado = tabla.findIndex((fila) => {
    const n = fila.map(normalizar);
    return (
      n.some((c) => c.startsWith("FECHA")) &&
      n.some((c) => /DESCRIPCION|CONCEPTO|DETALLE|MOVIMIENTO/.test(c))
    );
  });
  if (iEncabezado === -1) {
    return {
      ok: false,
      error:
        "No encontré el renglón de encabezados. El archivo debe tener una columna de fecha y una de descripción o concepto.",
    };
  }

  const enc = tabla[iEncabezado].map(normalizar);
  const cFecha = buscar(enc, (e) => e.startsWith("FECHA"));
  let cDesc = buscar(enc, (e) => /DESCRIPCION|DETALLE/.test(e));
  if (cDesc === -1) cDesc = buscar(enc, (e) => /CONCEPTO|MOVIMIENTO/.test(e));
  const cConcepto = enc.findIndex((e, i) => i !== cDesc && /CONCEPTO/.test(e));
  const cCargo = buscar(enc, (e) => /CARGO|RETIRO|DEBE/.test(e) && !/ABONO/.test(e));
  const cAbono = buscar(enc, (e) => /ABONO|DEPOSITO|HABER/.test(e) && !/CARGO/.test(e));
  const cSigno = buscar(
    enc,
    (e) => (/CARGO/.test(e) && /ABONO/.test(e)) || /^(TIPO|SIGNO|NATURALEZA)/.test(e),
  );
  const cImporte = buscar(enc, (e) => /IMPORTE|MONTO|CANTIDAD/.test(e));

  const dosColumnas = cCargo !== -1 && cAbono !== -1;
  if (!dosColumnas && cImporte === -1) {
    return {
      ok: false,
      error: `No encontré las columnas de monto. Encabezados detectados: ${tabla[iEncabezado].filter(Boolean).join(", ")}.`,
    };
  }

  const filas: FilaBanco[] = [];
  let descartadas = 0;

  for (const fila of tabla.slice(iEncabezado + 1)) {
    const fecha = leerFecha(fila[cFecha] ?? "");
    let monto: number | null = null;
    let tipo: TipoMovimiento = "gasto";

    if (dosColumnas) {
      const cargo = Math.abs(leerNumero(fila[cCargo] ?? "") ?? 0);
      const abono = Math.abs(leerNumero(fila[cAbono] ?? "") ?? 0);
      if (cargo > 0) [monto, tipo] = [cargo, "gasto"];
      else if (abono > 0) [monto, tipo] = [abono, "ingreso"];
    } else {
      const importe = leerNumero(fila[cImporte] ?? "");
      if (importe !== null && importe !== 0) {
        monto = Math.abs(importe);
        const signo = cSigno === -1 ? "" : normalizar(fila[cSigno] ?? "");
        if (signo.startsWith("-") || /^(C|D|CARGO|RETIRO)\b/.test(signo)) tipo = "gasto";
        else if (signo.startsWith("+") || /^(A|H|ABONO|DEPOSITO)\b/.test(signo)) tipo = "ingreso";
        else tipo = importe < 0 ? "gasto" : "ingreso";
      }
    }

    // Renglones de saldo inicial, totales o pies de página no son movimientos.
    if (!fecha || monto === null) {
      descartadas++;
      continue;
    }

    const partes = [fila[cDesc], cConcepto === -1 ? "" : fila[cConcepto]]
      .map((x) => (x ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const descripcion = [...new Set(partes)].join(" · ").slice(0, 200) || "Sin descripción";

    filas.push({ fecha, descripcion, monto: Math.round(monto * 100) / 100, tipo });
  }

  if (filas.length === 0) {
    return { ok: false, error: "El archivo no contiene movimientos que pueda leer." };
  }
  return { ok: true, filas, descartadas };
}

/** Decodifica el archivo: UTF-8 si es válido; si no, Windows-1252 (común en bancos). */
export function decodificar(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
