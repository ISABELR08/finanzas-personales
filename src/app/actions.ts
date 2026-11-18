"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MetodoPago, TipoMovimiento } from "@/lib/tipos";

export type NuevoMovimiento = {
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
 * Guarda un movimiento capturado a mano.
 * Una Server Action es una función que el navegador puede invocar pero que
 * corre en el servidor; por eso se vuelve a validar todo aquí: nunca se
 * confía en lo que manda el cliente. La base (checks + RLS) es la última red.
 */
export async function crearMovimiento(datos: NuevoMovimiento): Promise<Resultado> {
  const monto = Math.round(Number(datos.monto) * 100) / 100;
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a cero." };
  }
  if (!TIPOS.includes(datos.tipo)) {
    return { ok: false, error: "Tipo de movimiento inválido." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (datos.metodoPago !== null && !METODOS.includes(datos.metodoPago)) {
    return { ok: false, error: "Método de pago inválido." };
  }
  if (!datos.categoriaId) {
    return { ok: false, error: "Elige una categoría." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("movimientos").insert({
    monto,
    tipo: datos.tipo,
    categoria_id: datos.categoriaId,
    fecha: datos.fecha,
    descripcion: datos.descripcion.trim().slice(0, 200) || null,
    metodo_pago: datos.metodoPago,
    origen: "manual",
  });

  if (error) {
    return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
  }

  refresh(); // vuelve a pedir los datos de la página para mostrar el nuevo
  return { ok: true };
}
