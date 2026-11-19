import { calcularAhorro } from "@/lib/ahorro/calculo";
import { CATEGORIAS_INICIALES } from "@/lib/categorias-iniciales";
import type { Categoria, MetodoPago, MovimientoConCategoria, Origen, TipoMovimiento } from "@/lib/tipos";
import crudos from "./movimientos.json";

// Datos INVENTADOS para la demo pública (/demo). Salen del mismo CSV de ejemplo
// que usa el notebook (scripts/generar-datos-demo.mjs los convierte a JSON).

export const categoriasDemo: Categoria[] = CATEGORIAS_INICIALES.map((c, i) => ({
  ...c,
  id: `demo-cat-${i}`,
  orden: i,
  archivada: false,
  es_ahorro: c.es_ahorro ?? false,
}));

const porNombre = new Map(categoriasDemo.map((c) => [`${c.tipo}|${c.nombre.toLowerCase()}`, c]));

// Dos traspasos a la cuenta de ahorro en el último mes, para que la demo
// muestre la función de ahorro. (No están en el CSV del análisis.)
const AHORROS_DEMO = [
  { fecha: "2026-10-02", monto: 1650 },
  { fecha: "2026-10-16", monto: 750 },
].map((a, i) => ({
  id: `demo-ahorro-${i}`,
  fecha: a.fecha,
  tipo: "gasto",
  monto: a.monto,
  categoria: "ahorro",
  descripcion: "Ahorro a Mercado Pago",
  metodo_pago: "transferencia",
  origen: "manual",
}));

/** Todos los movimientos de la demo, del más reciente al más antiguo. */
export const movimientosDemo: MovimientoConCategoria[] = [...crudos, ...AHORROS_DEMO]
  .sort((a, b) => a.fecha.localeCompare(b.fecha))
  .map((m) => {
    const tipo = m.tipo as TipoMovimiento;
    const categoria = porNombre.get(`${tipo}|${m.categoria}`) ?? null;
    return {
      id: m.id,
      fecha: m.fecha,
      tipo,
      monto: m.monto,
      descripcion: m.descripcion,
      metodo_pago: m.metodo_pago as MetodoPago | null,
      origen: m.origen as Origen,
      categoria_id: categoria?.id ?? null,
      categorias: categoria && {
        nombre: categoria.nombre,
        icono: categoria.icono,
        es_ahorro: categoria.es_ahorro,
      },
    };
  })
  .reverse();

/** Último mes con datos ("AAAA-MM"): es el que la demo muestra al entrar. */
export const ultimoMesDemo = movimientosDemo[0].fecha.slice(0, 7);

// ── Ahorro en la demo ────────────────────────────────────────────
// "Hoy" es el último día con datos, y el saldo se anotó ese mismo día.
const hoyDemo = movimientosDemo[0].fecha;

export const ahorroDemo = {
  hoy: hoyDemo,
  diaIngreso: 0,
  ahorroInicial: 6000,
  totalAhorrado:
    6000 + movimientosDemo.filter((m) => m.categorias?.es_ahorro).reduce((s, m) => s + m.monto, 0),
  resumen: calcularAhorro(
    {
      porcentaje_ahorro: 30,
      dia_ingreso: 0,
      saldo_inicial: 1840,
      saldo_fecha: hoyDemo,
      saldo_marca: `${hoyDemo}T23:59:59Z`,
      ahorro_inicial: 6000,
    },
    movimientosDemo.map((m) => ({
      fecha: m.fecha,
      created_at: `${m.fecha}T12:00:00Z`,
      tipo: m.tipo,
      monto: m.monto,
      es_ahorro: m.categorias?.es_ahorro ?? false,
    })),
    hoyDemo,
  ),
};
