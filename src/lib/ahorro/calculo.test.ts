import { describe, expect, it } from "vitest";
import type { Ajustes } from "@/lib/tipos";
import { calcularAhorro, diasHastaIngreso, type MovimientoAhorro } from "./calculo";

const ajustes = (cambios: Partial<Ajustes> = {}): Ajustes => ({
  porcentaje_ahorro: 30,
  dia_ingreso: 0, // lunes
  saldo_inicial: null,
  saldo_fecha: null,
  saldo_marca: null,
  ahorro_inicial: 0,
  ...cambios,
});

const mov = (
  fecha: string,
  tipo: "gasto" | "ingreso",
  monto: number,
  extra: Partial<MovimientoAhorro> = {},
): MovimientoAhorro => ({
  fecha,
  tipo,
  monto,
  es_ahorro: false,
  created_at: `${fecha}T18:00:00Z`,
  ...extra,
});

describe("diasHastaIngreso", () => {
  // 2026-11-16 es lunes.
  it("cuenta los días hasta el próximo día de ingreso, incluyendo hoy", () => {
    expect(diasHastaIngreso("2026-11-19", 0)).toBe(4); // jueves → lunes: ju, vi, sá, do
    expect(diasHastaIngreso("2026-11-22", 0)).toBe(1); // domingo → lunes
    expect(diasHastaIngreso("2026-11-16", 4)).toBe(4); // lunes → viernes
  });

  it("el día de ingreso cuenta la semana completa", () => {
    expect(diasHastaIngreso("2026-11-16", 0)).toBe(7);
  });
});

describe("calcularAhorro", () => {
  it("la meta es el porcentaje de los ingresos del mes: $1,000 semanales → $300", () => {
    const r = calcularAhorro(ajustes(), [mov("2026-11-16", "ingreso", 1000)], "2026-11-19");
    expect(r).toMatchObject({ ingresosMes: 1000, metaMes: 300, ahorradoMes: 0, faltaApartar: 300 });
  });

  it("en vacaciones, con la mitad de ingreso, la meta baja sola", () => {
    const r = calcularAhorro(ajustes(), [mov("2026-07-06", "ingreso", 500)], "2026-07-08");
    expect(r.metaMes).toBe(150);
  });

  it("lo ya pasado a la cuenta de ahorro se descuenta de lo que falta", () => {
    const r = calcularAhorro(
      ajustes(),
      [
        mov("2026-11-02", "ingreso", 1000),
        mov("2026-11-09", "ingreso", 1000),
        mov("2026-11-03", "gasto", 300, { es_ahorro: true }),
        mov("2026-11-04", "gasto", 120), // gasto normal: no cuenta como ahorro
        mov("2026-10-28", "gasto", 300, { es_ahorro: true }), // otro mes
      ],
      "2026-11-10",
    );
    expect(r).toMatchObject({ metaMes: 600, ahorradoMes: 300, faltaApartar: 300 });
  });

  it("ahorrar de más no deja un faltante negativo", () => {
    const r = calcularAhorro(
      ajustes(),
      [mov("2026-11-02", "ingreso", 1000), mov("2026-11-03", "gasto", 500, { es_ahorro: true })],
      "2026-11-10",
    );
    expect(r.faltaApartar).toBe(0);
  });

  it("sin saldo anotado no inventa cuánto dinero hay", () => {
    const r = calcularAhorro(null, [mov("2026-11-16", "ingreso", 1000)], "2026-11-19");
    expect(r).toMatchObject({ porcentaje: 30, saldo: null, disponible: null, porDia: null });
  });

  it("el saldo solo cambia con movimientos posteriores a cuando se anotó", () => {
    const conSaldo = ajustes({
      saldo_inicial: 1000,
      saldo_fecha: "2026-11-16",
      saldo_marca: "2026-11-16T15:00:00Z",
    });
    const r = calcularAhorro(
      conSaldo,
      [
        mov("2026-11-10", "gasto", 400), // anterior: ya estaba reflejado
        mov("2026-11-16", "gasto", 50, { created_at: "2026-11-16T12:00:00Z" }), // mismo día, antes
        mov("2026-11-16", "gasto", 80, { created_at: "2026-11-16T20:00:00Z" }), // mismo día, después
        mov("2026-11-17", "gasto", 120),
        mov("2026-11-18", "ingreso", 200),
        // estado de cuenta viejo importado hoy: fecha anterior, no altera el saldo
        mov("2026-11-05", "gasto", 999, { created_at: "2026-11-19T10:00:00Z" }),
      ],
      "2026-11-19",
    );
    expect(r.saldo).toBe(1000 - 80 - 120 + 200);
  });

  it("pasar dinero al ahorro baja el saldo pero no lo que se puede gastar", () => {
    const conSaldo = ajustes({
      saldo_inicial: 1000,
      saldo_fecha: "2026-11-16",
      saldo_marca: "2026-11-16T15:00:00Z",
    });
    const ingreso = mov("2026-11-16", "ingreso", 1000, { created_at: "2026-11-16T10:00:00Z" });

    const antes = calcularAhorro(conSaldo, [ingreso], "2026-11-19");
    expect(antes).toMatchObject({ saldo: 1000, faltaApartar: 300, disponible: 700 });
    expect(antes.porDia).toBe(175); // 700 entre 4 días (jueves a domingo)

    const despues = calcularAhorro(
      conSaldo,
      [ingreso, mov("2026-11-19", "gasto", 300, { es_ahorro: true })],
      "2026-11-19",
    );
    expect(despues).toMatchObject({ saldo: 700, faltaApartar: 0, disponible: 700, porDia: 175 });
  });

  it("si ya no alcanza, el gasto por día es cero, no negativo", () => {
    const conSaldo = ajustes({
      saldo_inicial: 100,
      saldo_fecha: "2026-11-16",
      saldo_marca: "2026-11-16T15:00:00Z",
    });
    const r = calcularAhorro(conSaldo, [mov("2026-11-16", "ingreso", 1000, { created_at: "2026-11-16T10:00:00Z" })], "2026-11-19");
    expect(r.disponible).toBe(-200);
    expect(r.porDia).toBe(0);
  });
});
