"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ICONOS } from "@/components/IconoCategoria";
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

// ── Categorías ───────────────────────────────────────────────────

export type DatosCategoria = { nombre: string; icono: string };

function validarCategoria(datos: DatosCategoria) {
  const nombre = String(datos.nombre ?? "").trim().replace(/\s+/g, " ");
  if (nombre.length < 1 || nombre.length > 40) {
    return { error: "El nombre debe tener entre 1 y 40 caracteres." };
  }
  if (!(datos.icono in ICONOS)) {
    return { error: "Icono inválido." };
  }
  return { columnas: { nombre, icono: datos.icono } };
}

/** 23505 es el código de Postgres para "violación de restricción única". */
const mensajeDeError = (codigo?: string) =>
  codigo === "23505"
    ? "Ya tienes una categoría con ese nombre."
    : "No se pudo guardar la categoría.";

export async function crearCategoria(
  tipo: TipoMovimiento,
  datos: DatosCategoria,
): Promise<Resultado> {
  const v = validarCategoria(datos);
  if ("error" in v) return { ok: false, error: v.error! };
  if (!TIPOS.includes(tipo)) return { ok: false, error: "Tipo inválido." };

  const supabase = await createClient();
  // La nueva categoría va al final: orden = el mayor que exista + 1.
  const { data: ultima } = await supabase
    .from("categorias")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1);
  const orden = (ultima?.[0]?.orden ?? -1) + 1;

  const { error } = await supabase.from("categorias").insert({ ...v.columnas, tipo, orden });
  if (error) return { ok: false, error: mensajeDeError(error.code) };

  refresh();
  return { ok: true };
}

export async function actualizarCategoria(
  id: string,
  datos: DatosCategoria,
): Promise<Resultado> {
  const v = validarCategoria(datos);
  if ("error" in v) return { ok: false, error: v.error! };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categorias")
    .update(v.columnas)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: mensajeDeError(error?.code) };

  refresh();
  return { ok: true };
}

/**
 * Archivar oculta la categoría al registrar, pero no la borra: los
 * movimientos que ya la usan la conservan y el historial no se rompe.
 */
export async function archivarCategoria(id: string, archivada: boolean): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categorias")
    .update({ archivada })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "No se pudo actualizar la categoría." };

  refresh();
  return { ok: true };
}
