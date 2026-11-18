"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MetodoPago, TipoMovimiento } from "@/lib/tipos";

export type DatosMovimiento = {
  monto: number;
  tipo: TipoMovimiento;
  categoriaId: string;
  fecha: string;
  descripcion: string;
  metodoPago: MetodoPago | null;
};

export type Resultado = { ok: true } | { ok: false; error: string };

const TIPOS = ["gasto", "ingreso"];
const METODOS = ["efectivo", "debito", "credito", "transferencia"];

/**
 * Una Server Action es una función que el navegador puede invocar pero que
 * corre en el servidor; por eso se vuelve a validar todo aquí: nunca se
 * confía en lo que manda el cliente. La base (checks + RLS) es la última red.
 * Devuelve las columnas listas para guardar, o un mensaje de error.
 */
function validar(datos: DatosMovimiento) {
  const monto = Math.round(Number(datos.monto) * 100) / 100;
  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: "El monto debe ser mayor a cero." };
  }
  if (!TIPOS.includes(datos.tipo)) {
    return { error: "Tipo de movimiento inválido." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) || Number.isNaN(Date.parse(datos.fecha))) {
    return { error: "Fecha inválida." };
  }
  if (datos.metodoPago !== null && !METODOS.includes(datos.metodoPago)) {
    return { error: "Método de pago inválido." };
  }
  if (!datos.categoriaId) {
    return { error: "Elige una categoría." };
  }
  return {
    columnas: {
      monto,
      tipo: datos.tipo,
      categoria_id: datos.categoriaId,
      fecha: datos.fecha,
      descripcion: String(datos.descripcion ?? "").trim().slice(0, 200) || null,
      metodo_pago: datos.metodoPago,
    },
  };
}

/** Guarda un movimiento capturado a mano. */
export async function crearMovimiento(datos: DatosMovimiento): Promise<Resultado> {
  const v = validar(datos);
  if ("error" in v) return { ok: false, error: v.error! };

  const supabase = await createClient();
  const { error } = await supabase
    .from("movimientos")
    .insert({ ...v.columnas, origen: "manual" });

  if (error) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };

  refresh(); // vuelve a pedir los datos de la página para mostrar el nuevo
  return { ok: true };
}

/** Edita un movimiento existente. No cambia su origen (manual/banco). */
export async function actualizarMovimiento(
  id: string,
  datos: DatosMovimiento,
): Promise<Resultado> {
  const v = validar(datos);
  if ("error" in v) return { ok: false, error: v.error! };

  const supabase = await createClient();
  // .select() devuelve las filas modificadas: si RLS no deja tocar la fila
  // (o no existe), no hay error pero tampoco filas, y hay que avisarlo.
  const { data, error } = await supabase
    .from("movimientos")
    .update(v.columnas)
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    return { ok: false, error: "No se pudo guardar el cambio." };
  }

  refresh();
  return { ok: true };
}

export async function borrarMovimiento(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimientos")
    .delete()
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    return { ok: false, error: "No se pudo borrar." };
  }

  refresh();
  return { ok: true };
}
