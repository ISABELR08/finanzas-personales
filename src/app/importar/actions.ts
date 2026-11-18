"use server";

import { refresh } from "next/cache";
import type { FilaBanco } from "@/lib/importar/csv";
import { calcularHuella } from "@/lib/importar/huella";
import { normalizar } from "@/lib/importar/texto";
import { createClient } from "@/lib/supabase/server";

export type FilaAImportar = FilaBanco & {
  ocurrencia: number;
  categoriaId: string | null;
};

export type ResultadoImportacion =
  | { ok: true; guardados: number; omitidos: number }
  | { ok: false; error: string };

const MAXIMO = 2000;

function filaValida(f: FilaAImportar): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(f.fecha) &&
    Number.isFinite(f.monto) &&
    f.monto > 0 &&
    (f.tipo === "gasto" || f.tipo === "ingreso") &&
    typeof f.descripcion === "string" &&
    Number.isInteger(f.ocurrencia) &&
    f.ocurrencia >= 0
  );
}

export type YaRegistrado = {
  /** Huellas de renglones del banco ya importados (duplicados seguros). */
  huellas: string[];
  /** Capturas manuales no pagadas en efectivo (posibles duplicados). */
  manuales: { fecha: string; monto: number; tipo: string }[];
};

/**
 * Lo que ya existe en un rango de fechas, para avisar en la revisión.
 * El rango se amplía dos días porque una compra con tarjeta puede aparecer
 * en el banco uno o dos días después de cuando la capturaste.
 */
export async function consultarYaRegistrado(desde: string, hasta: string): Promise<YaRegistrado> {
  const mover = (fecha: string, dias: number) =>
    new Date(Date.parse(fecha) + dias * 86_400_000).toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data } = await supabase
    .from("movimientos")
    .select("fecha, monto, tipo, origen, metodo_pago, huella_importacion")
    .gte("fecha", mover(desde, -2))
    .lte("fecha", mover(hasta, 2));

  const filas = data ?? [];
  return {
    huellas: filas.map((m) => m.huella_importacion).filter(Boolean),
    manuales: filas
      .filter((m) => m.origen === "manual" && m.metodo_pago !== "efectivo")
      .map((m) => ({ fecha: m.fecha, monto: Number(m.monto), tipo: m.tipo })),
  };
}

/**
 * Guarda los renglones aprobados en la revisión, marcados con origen "banco".
 * La huella se recalcula aquí, en el servidor, en vez de confiar en la que
 * mande el navegador. "upsert ... ignoreDuplicates" se traduce a
 * INSERT ... ON CONFLICT DO NOTHING: si la huella ya existe, la fila se salta.
 */
export async function importarMovimientos(
  filas: FilaAImportar[],
): Promise<ResultadoImportacion> {
  if (!Array.isArray(filas) || filas.length === 0) {
    return { ok: false, error: "No hay movimientos seleccionados." };
  }
  if (filas.length > MAXIMO) {
    return { ok: false, error: `Máximo ${MAXIMO} movimientos por importación.` };
  }
  if (!filas.every(filaValida)) {
    return { ok: false, error: "Hay renglones con datos inválidos." };
  }

  const registros = await Promise.all(
    filas.map(async (f) => ({
      monto: Math.round(f.monto * 100) / 100,
      tipo: f.tipo,
      categoria_id: f.categoriaId || null,
      fecha: f.fecha,
      descripcion: f.descripcion.trim().slice(0, 200) || null,
      // El archivo es de una cuenta de débito; las transferencias se distinguen.
      metodo_pago: /SPEI|TRANSFER/.test(normalizar(f.descripcion)) ? "transferencia" : "debito",
      origen: "banco",
      huella_importacion: await calcularHuella(f, f.ocurrencia),
    })),
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimientos")
    .upsert(registros, { onConflict: "user_id,huella_importacion", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return { ok: false, error: "No se pudieron guardar los movimientos." };
  }

  refresh();
  const guardados = data?.length ?? 0;
  return { ok: true, guardados, omitidos: registros.length - guardados };
}
