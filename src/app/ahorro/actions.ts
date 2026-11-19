"use server";

import { refresh } from "next/cache";
import type { Resultado } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

const esFecha = (texto: string) => /^\d{4}-\d{2}-\d{2}$/.test(texto);
const esMonto = (n: number, minimo: number) => Number.isFinite(n) && n >= minimo && n < 1e10;
const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * "Tengo $X hoy". Guarda también el momento exacto: a partir de ahí, cada
 * movimiento que se registre suma o resta de ese dinero.
 */
export async function guardarSaldo(monto: number, fechaLocal: string): Promise<Resultado> {
  if (!esMonto(monto, 0)) return { ok: false, error: "Escribe cuánto dinero tienes." };
  if (!esFecha(fechaLocal)) return { ok: false, error: "Fecha inválida." };

  const supabase = await createClient();
  // upsert: crea la fila de ajustes si no existe, o actualiza solo estas columnas.
  const { error } = await supabase.from("ajustes").upsert(
    {
      saldo_inicial: redondear(monto),
      saldo_fecha: fechaLocal,
      saldo_marca: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: "No se pudo guardar." };

  refresh();
  return { ok: true };
}

export async function guardarPreferencias(datos: {
  porcentaje: number;
  diaIngreso: number;
  ahorroInicial: number;
}): Promise<Resultado> {
  const { porcentaje, diaIngreso, ahorroInicial } = datos;
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    return { ok: false, error: "El porcentaje debe estar entre 0 y 100." };
  }
  if (!Number.isInteger(diaIngreso) || diaIngreso < 0 || diaIngreso > 6) {
    return { ok: false, error: "Día de ingreso inválido." };
  }
  if (!esMonto(ahorroInicial, 0)) return { ok: false, error: "Monto ahorrado inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("ajustes").upsert(
    {
      porcentaje_ahorro: redondear(porcentaje),
      dia_ingreso: diaIngreso,
      ahorro_inicial: redondear(ahorroInicial),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: "No se pudo guardar." };

  refresh();
  return { ok: true };
}

/**
 * Anota que pasé dinero a mi cuenta de ahorro. Es un movimiento normal en la
 * categoría marcada como ahorro: baja el dinero disponible, pero la app no lo
 * cuenta como gasto.
 */
export async function registrarAhorro(monto: number, fechaLocal: string): Promise<Resultado> {
  if (!esMonto(monto, 0.01)) return { ok: false, error: "Escribe cuánto pasaste a tu ahorro." };
  if (!esFecha(fechaLocal)) return { ok: false, error: "Fecha inválida." };

  const supabase = await createClient();
  let { data: categoria } = await supabase
    .from("categorias")
    .select("id")
    .eq("es_ahorro", true)
    .order("archivada")
    .limit(1)
    .maybeSingle();

  if (!categoria) {
    const creada = await supabase
      .from("categorias")
      .insert({ nombre: "Ahorro", tipo: "gasto", icono: "piggy-bank", orden: 99, es_ahorro: true })
      .select("id")
      .single();
    categoria = creada.data;
  }
  if (!categoria) return { ok: false, error: "No encontré la categoría de ahorro." };

  const { error } = await supabase.from("movimientos").insert({
    monto: redondear(monto),
    tipo: "gasto",
    categoria_id: categoria.id,
    fecha: fechaLocal,
    descripcion: "Ahorro a Mercado Pago",
    metodo_pago: "transferencia",
    origen: "manual",
  });
  if (error) return { ok: false, error: "No se pudo registrar el ahorro." };

  refresh();
  return { ok: true };
}
