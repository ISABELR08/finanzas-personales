import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Categoria } from "@/lib/tipos";
import { sugerirCategoria } from "./categorizar";
import { leerCSV, leerFecha, leerNumero } from "./csv";
import { asignarOcurrencias, calcularHuella } from "./huella";
import { claveComercio } from "./texto";

describe("leerFecha", () => {
  it.each([
    ["18/11/2026", "2026-11-18"],
    ["18-11-26", "2026-11-18"],
    ["18112026", "2026-11-18"],
    ["'02112026'", "2026-11-02"],
    ["2112026", "2026-11-02"], // Excel quitó el cero inicial
    ["2026-11-18", "2026-11-18"],
    ["18/NOV/2026", "2026-11-18"],
    ["5 ene 26", "2026-01-05"],
  ])("%s → %s", (entrada, esperado) => {
    expect(leerFecha(entrada)).toBe(esperado);
  });

  it("rechaza fechas imposibles y texto", () => {
    expect(leerFecha("31/02/2026")).toBeNull();
    expect(leerFecha("Saldo inicial")).toBeNull();
    expect(leerFecha("")).toBeNull();
  });
});

describe("leerNumero", () => {
  it.each([
    ["85.00", 85],
    ["$1,234.50", 1234.5],
    ["85,50", 85.5],
    ["-612.30", -612.3],
    ["(85.00)", -85],
    ["'4500.00'", 4500],
  ])("%s → %d", (entrada, esperado) => {
    expect(leerNumero(entrada)).toBe(esperado);
  });

  it("devuelve null si no es número", () => {
    expect(leerNumero("")).toBeNull();
    expect(leerNumero("N/A")).toBeNull();
  });
});

describe("leerCSV", () => {
  const ejemplo = readFileSync("data/ejemplo/santander_ejemplo.csv", "utf8");

  it("lee el ejemplo con columna Cargo/Abono de signo", () => {
    const r = leerCSV(ejemplo);
    if (!r.ok) throw new Error(r.error);
    expect(r.filas).toHaveLength(15);
    expect(r.filas[0]).toEqual({
      fecha: "2026-11-02",
      descripcion: "DEPOSITO SPEI · BECA MANUTENCION NOV",
      monto: 4500,
      tipo: "ingreso",
    });
    expect(r.filas[1]).toMatchObject({ monto: 85, tipo: "gasto" });
    expect(r.filas.filter((f) => f.tipo === "ingreso")).toHaveLength(2);
  });

  it("lee columnas separadas de Cargo y Abono, con renglones previos y totales", () => {
    const csv = [
      "Estado de cuenta;Cuenta 123",
      "Fecha;Concepto;Cargos;Abonos;Saldo",
      "01/10/2026;SALDO ANTERIOR;;;1,000.00",
      "03/10/2026;OXXO CENTRO;$52.50;;947.50",
      "05/10/2026;NOMINA EMPRESA;;3,000.00;3,947.50",
      "TOTALES;;52.50;3,000.00;",
    ].join("\n");
    const r = leerCSV(csv);
    if (!r.ok) throw new Error(r.error);
    expect(r.filas).toEqual([
      { fecha: "2026-10-03", descripcion: "OXXO CENTRO", monto: 52.5, tipo: "gasto" },
      { fecha: "2026-10-05", descripcion: "NOMINA EMPRESA", monto: 3000, tipo: "ingreso" },
    ]);
    expect(r.descartadas).toBe(2);
  });

  it("usa el signo del importe cuando no hay columna de signo", () => {
    const r = leerCSV("Fecha,Descripcion,Monto\n2026-10-03,Netflix,-199\n2026-10-04,Deposito,500");
    if (!r.ok) throw new Error(r.error);
    expect(r.filas.map((f) => f.tipo)).toEqual(["gasto", "ingreso"]);
  });

  it("explica el problema si no reconoce el archivo", () => {
    expect(leerCSV("hola,mundo\n1,2")).toMatchObject({ ok: false });
    expect(leerCSV("Fecha,Descripcion\n01/01/2026,algo")).toMatchObject({ ok: false });
  });
});

describe("huella contra duplicados", () => {
  const cafe = { fecha: "2026-11-03", descripcion: "CAFE LA ESQUINA", monto: 45, tipo: "gasto" } as const;

  it("numera las compras idénticas del mismo día", () => {
    const otro = { ...cafe, monto: 50 };
    expect(asignarOcurrencias([cafe, otro, cafe, cafe])).toEqual([0, 0, 1, 2]);
  });

  it("es estable entre importaciones y distinta por ocurrencia", async () => {
    const a = await calcularHuella(cafe, 0);
    expect(a).toHaveLength(32);
    expect(await calcularHuella({ ...cafe, descripcion: " café  la esquina " }, 0)).toBe(a);
    expect(await calcularHuella(cafe, 1)).not.toBe(a);
    expect(await calcularHuella({ ...cafe, monto: 45.01 }, 0)).not.toBe(a);
  });
});

describe("sugerirCategoria", () => {
  const cat = (id: string, nombre: string, tipo: "gasto" | "ingreso"): Categoria => ({
    id, nombre, tipo, icono: "tag", orden: 0, archivada: false, es_ahorro: false,
  });
  const categorias = [
    cat("comida", "Comida", "gasto"),
    cat("transporte", "Transporte", "gasto"),
    cat("subs", "Suscripciones", "gasto"),
    cat("otros", "Otros", "gasto"),
    cat("beca", "Beca / Mesada", "ingreso"),
    cat("otros-ing", "Otros ingresos", "ingreso"),
  ];

  it("aplica reglas por palabra clave, la más específica primero", () => {
    expect(sugerirCategoria("COMPRA · UBER EATS", "gasto", categorias, {})).toBe("comida");
    expect(sugerirCategoria("COMPRA · UBER TRIP", "gasto", categorias, {})).toBe("transporte");
    expect(sugerirCategoria("SPOTIFY MEXICO", "gasto", categorias, {})).toBe("subs");
    expect(sugerirCategoria("DEPOSITO · BECA NOV", "ingreso", categorias, {})).toBe("beca");
  });

  it("cae en Otros cuando no reconoce nada", () => {
    expect(sugerirCategoria("FERRETERIA LOPEZ", "gasto", categorias, {})).toBe("otros");
    expect(sugerirCategoria("DEPOSITO EFECTIVO", "ingreso", categorias, {})).toBe("otros-ing");
  });

  it("lo aprendido del historial gana a las reglas", () => {
    const historial = { [claveComercio("UBER TRIP 4471")]: "comida" };
    expect(sugerirCategoria("UBER TRIP 9902", "gasto", categorias, historial)).toBe("comida");
  });
});
