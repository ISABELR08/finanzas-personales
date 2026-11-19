import { describe, expect, it } from "vitest";
import { leerTextoSantander, terminoLaTabla } from "./santander-pdf";

// Texto inventado con la forma en que el OCR entrega un estado de cuenta de
// Santander, incluidos sus errores típicos. Ningún dato es real.
const ENCABEZADO = [
  "d Santander",
  "Banco Santander México, S.A,",
  "JUANA PEREZ LOPEZ                    CODIGO DE CLIENTE NO. 00000000",
  "PERIODO DEL 01-OCT-2026 AL 31-OCT-2026",
  "DEBITO LIKEU 00-00000000-0",
  "SALDO FINAL DEL PERIODO ANTERIOR:                          $1,000.00",
  "FECHA — FOLIO | DESCRIPCION                | DEPOSITO      |       RETIRO                 SALDO",
];

const leer = (...renglones: string[]) => {
  const r = leerTextoSantander([...ENCABEZADO, ...renglones].join("\n"));
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe("leerTextoSantander", () => {
  it("deduce depósito o retiro con el saldo y arma la descripción", () => {
    const r = leer(
      "01-0CT-2026 1111111 ABONO TRANSFERENCIA SPEI HORA 20:42:50          500.00            1,500.00",
      "RECIBIDO DE BANCO EJEMPLO",
      "DE LA CUENTA 000000000000000000",
      "CONCEPTO mesada",
      "02-OCT-2026 0022222 CONSUMO LOCAL AJENO TERMINACION 0000 02OCT26        85.50      1,414.50",
      "OPM 150323DI1 TAQUERIA EL EJEMPLO",
      "Página 2 de 8.                              P 0000000",
      "d Santander",
      "PERIODO DEL 01-OCT-2026 AL 31-OCT-2026",
      "05-OCT-2026 0033333 DEPOSITO EN EFECTIVO ATM            200.00           1,614.50",
      "TOTAL                           700.00          85.50",
      "Significado de abreviaturas utilizadas en el estado de cuenta:",
    );
    expect(r.filas).toEqual([
      {
        fecha: "2026-10-01",
        descripcion: "ABONO TRANSFERENCIA SPEI · mesada",
        monto: 500,
        tipo: "ingreso",
        referencia: "1111111",
      },
      {
        fecha: "2026-10-02",
        descripcion: "CONSUMO LOCAL AJENO · TAQUERIA EL EJEMPLO",
        monto: 85.5,
        tipo: "gasto",
        referencia: "0022222",
      },
      {
        fecha: "2026-10-05",
        descripcion: "DEPOSITO EN EFECTIVO ATM",
        monto: 200,
        tipo: "ingreso",
        referencia: "0033333",
      },
    ]);
    expect(r.cuadra).toBe(true);
  });

  it("tolera la línea vertical de la tabla leída como símbolo o letra", () => {
    const r = leer(
      "05-OCT-2026 0000270|DEPOSITO EN EFECTIVO ATM      500.00     1,500.00",
      "06-OCT-2026 0095620/cONSUMO LOCAL AJENO TERMINACION 0000 06OCT26    100.00    1,400.00",
      "07-OCT-2026 0720568fPACO TRANSFERENCIA SPEI HORA 10:00:00      50.00     1,350.00",
      "08-OCT-2026 0080982 [consu LOCAL AJENO TERMINACION 0000 08OCT26    25.00    1,325.00",
    );
    expect(r.filas.map((f) => [f.referencia, f.tipo, f.descripcion])).toEqual([
      ["0000270", "ingreso", "DEPOSITO EN EFECTIVO ATM"],
      ["0095620", "gasto", "CONSUMO LOCAL AJENO"],
      ["0720568", "gasto", "PAGO TRANSFERENCIA SPEI"],
      ["0080982", "gasto", "CONSUMO LOCAL AJENO"],
    ]);
  });

  it("corrige un monto mal leído usando la diferencia de saldos", () => {
    const r = leer(
      "14-OCT-2026 0011111 CONSUMO LOCAL AJENO      37.34     962.06", // era 37.94
      "15-OCT-2026 0022222 CONSUMO LOCAL AJENO      62.06     900.00",
      "TOTAL       0.00     100.00",
    );
    expect(r.filas[0]).toMatchObject({ monto: 37.94, tipo: "gasto" });
    expect(r.filas[0].dudoso).toBeUndefined();
    expect(r.cuadra).toBe(true);
  });

  it("ignora un saldo mal leído si el renglón siguiente lo confirma", () => {
    const r = leer(
      "21-OCT-2026 0011111 ¡ABONO TRANSFERENCIA ENLACE      60.00     1,860.00", // saldo real 1,060.00
      "22-OCT-2026 0022222 CONSUMO LOCAL AJENO      10.00     1,050.00",
    );
    expect(r.filas.map((f) => [f.tipo, f.monto, f.dudoso])).toEqual([
      ["ingreso", 60, undefined],
      ["gasto", 10, undefined],
    ]);
  });

  it("si el OCR perdió el saldo, decide por el texto y sigue la cadena", () => {
    const r = leer(
      "29-OCT-2026 0011111 ABONO TRANSFERENCIA SPEI      118.00         6",
      "30-OCT-2026 0022222 CONSUMO LOCAL AJENO      18.00     1,100.00",
    );
    expect(r.filas.map((f) => [f.tipo, f.monto])).toEqual([
      ["ingreso", 118],
      ["gasto", 18],
    ]);
  });

  it("marca como dudoso lo que no puede comprobar y avisa si no cuadra", () => {
    const r = leer(
      "10-OCT-2026 0011111 CONSUMO LOCAL AJENO      40.00     777.77",
      "11-OCT-2026 0022222 CONSUMO LOCAL AJENO      10.00     123.45",
      "TOTAL       0.00     999.00",
    );
    expect(r.filas[0].dudoso).toBe(true);
    expect(r.cuadra).toBe(false);
  });

  it("no confunde el TOTAL del resumen (con porcentajes) con el final de la tabla", () => {
    const resumen = "TOTAL          1,000.00      100.00%   |    1,614.50     100.00%";
    expect(terminoLaTabla(resumen)).toBe(false);
    const r = leer(
      resumen,
      "05-OCT-2026 0033333 DEPOSITO EN EFECTIVO ATM            200.00           1,200.00",
      "TOTAL                           200.00          0.00",
    );
    expect(r.filas).toHaveLength(1);
    expect(r.cuadra).toBe(true);
    expect(terminoLaTabla("05-OCT-2026 0033333 DEPOSITO 200.00 1,200.00\nTOTAL   200.00    0.00")).toBe(true);
  });

  it("rechaza un texto que no es un estado de cuenta", () => {
    expect(leerTextoSantander("Hola\nEsto no es un estado de cuenta")).toMatchObject({ ok: false });
  });
});
