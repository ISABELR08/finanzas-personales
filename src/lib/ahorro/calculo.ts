import type { Ajustes } from "@/lib/tipos";

/** Lo mínimo que el cálculo necesita saber de cada movimiento. */
export type MovimientoAhorro = {
  fecha: string; // AAAA-MM-DD
  created_at: string; // fecha y hora en que se registró
  tipo: "gasto" | "ingreso";
  monto: number;
  es_ahorro: boolean;
};

export type ResumenAhorro = {
  porcentaje: number;
  /** Dinero disponible hoy; null si todavía no se ha anotado un saldo. */
  saldo: number | null;
  ingresosMes: number;
  /** Meta del mes: porcentaje × ingresos registrados en el mes. */
  metaMes: number;
  ahorradoMes: number;
  /** Lo que falta pasar a la cuenta de ahorro para cumplir la meta del mes. */
  faltaApartar: number;
  /** Saldo menos lo que falta apartar: lo que de verdad se puede gastar. */
  disponible: number | null;
  /** Días que deben cubrirse con ese dinero, contando hoy. */
  diasHastaIngreso: number;
  porDia: number | null;
};

const centavos = (n: number) => Math.round(Number(n) * 100);

/** Día de la semana de una fecha "AAAA-MM-DD": 0 = lunes ... 6 = domingo. */
function diaSemana(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * Días que faltan para el próximo ingreso, contando hoy. Si hoy es el día de
 * ingreso se cuenta la semana completa (7): el dinero de hoy debe durar hasta
 * el siguiente.
 */
export function diasHastaIngreso(hoy: string, diaIngreso: number): number {
  return ((diaIngreso - diaSemana(hoy) + 7) % 7) || 7;
}

/**
 * Calcula el estado del ahorro. Es una función pura (sin base de datos ni
 * reloj): recibe los datos y la fecha de hoy, y por eso se puede probar.
 *
 *   saldo      = saldo anotado ± movimientos registrados después de anotarlo
 *   meta       = porcentaje × ingresos del mes
 *   falta      = meta − lo ya ahorrado en el mes
 *   disponible = saldo − falta
 *   por día    = disponible ÷ días hasta el próximo ingreso
 *
 * `movimientos` debe incluir al menos los del mes en curso y los posteriores
 * a la fecha del saldo anotado.
 */
export function calcularAhorro(
  ajustes: Ajustes | null,
  movimientos: MovimientoAhorro[],
  hoy: string,
): ResumenAhorro {
  const porcentaje = Number(ajustes?.porcentaje_ahorro ?? 30);
  const mes = hoy.slice(0, 7);

  let ingresosMes = 0;
  let ahorradoMes = 0;
  for (const m of movimientos) {
    if (!m.fecha.startsWith(mes)) continue;
    if (m.tipo === "ingreso") ingresosMes += centavos(m.monto);
    else if (m.es_ahorro) ahorradoMes += centavos(m.monto);
  }
  const metaMes = Math.round((ingresosMes * porcentaje) / 100);
  const faltaApartar = Math.max(0, metaMes - ahorradoMes);

  // El saldo anotado ya incluía todo lo anterior. Solo lo modifican los
  // movimientos de días posteriores, o los del mismo día registrados después.
  // (Importar un estado de cuenta viejo no lo altera: sus fechas son previas.)
  let saldo: number | null = null;
  if (ajustes?.saldo_inicial != null && ajustes.saldo_fecha && ajustes.saldo_marca) {
    const { saldo_fecha, saldo_marca } = ajustes;
    const marca = Date.parse(saldo_marca);
    saldo = centavos(ajustes.saldo_inicial);
    for (const m of movimientos) {
      const posterior =
        m.fecha > saldo_fecha || (m.fecha === saldo_fecha && Date.parse(m.created_at) > marca);
      if (posterior) saldo += (m.tipo === "ingreso" ? 1 : -1) * centavos(m.monto);
    }
  }

  const dias = diasHastaIngreso(hoy, ajustes?.dia_ingreso ?? 0);
  const disponible = saldo === null ? null : saldo - faltaApartar;

  return {
    porcentaje,
    saldo: saldo === null ? null : saldo / 100,
    ingresosMes: ingresosMes / 100,
    metaMes: metaMes / 100,
    ahorradoMes: ahorradoMes / 100,
    faltaApartar: faltaApartar / 100,
    disponible: disponible === null ? null : disponible / 100,
    diasHastaIngreso: dias,
    porDia: disponible === null ? null : Math.max(0, Math.floor(disponible / dias)) / 100,
  };
}
