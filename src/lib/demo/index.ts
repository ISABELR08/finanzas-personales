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
}));

const porNombre = new Map(categoriasDemo.map((c) => [`${c.tipo}|${c.nombre.toLowerCase()}`, c]));

/** Todos los movimientos de la demo, del más reciente al más antiguo. */
export const movimientosDemo: MovimientoConCategoria[] = crudos
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
      categorias: categoria && { nombre: categoria.nombre, icono: categoria.icono },
    };
  })
  .reverse();

/** Último mes con datos ("AAAA-MM"): es el que la demo muestra al entrar. */
export const ultimoMesDemo = movimientosDemo[0].fecha.slice(0, 7);
