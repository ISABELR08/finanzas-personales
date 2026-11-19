import { hoyMX } from "@/lib/fechas";
import type { createClient } from "@/lib/supabase/server";
import type { Ajustes } from "@/lib/tipos";
import { calcularAhorro, type MovimientoAhorro, type ResumenAhorro } from "./calculo";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type EstadoAhorro = {
  ajustes: Ajustes | null;
  resumen: ResumenAhorro;
  /** Todo lo ahorrado: lo que ya tenía más lo registrado en la app. */
  totalAhorrado: number;
  hoy: string;
};

/**
 * Lee de la base lo necesario y delega el cálculo en calcularAhorro.
 * Devuelve null si la tabla "ajustes" aún no existe (falta correr la
 * migración 0002), para que las pantallas puedan avisarlo en vez de fallar.
 */
export async function obtenerEstadoAhorro(supabase: Supabase): Promise<EstadoAhorro | null> {
  const { data: ajustes, error } = await supabase
    .from("ajustes")
    .select("porcentaje_ahorro, dia_ingreso, saldo_inicial, saldo_fecha, saldo_marca, ahorro_inicial")
    .maybeSingle()
    .overrideTypes<Ajustes>();
  if (error) return null;

  const hoy = hoyMX();
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const desde =
    ajustes?.saldo_fecha && ajustes.saldo_fecha < inicioMes ? ajustes.saldo_fecha : inicioMes;

  type Fila = {
    fecha: string;
    created_at: string;
    tipo: "gasto" | "ingreso";
    monto: number;
    categorias: { es_ahorro: boolean } | null;
  };
  const [{ data: recientes }, { data: deAhorro }] = await Promise.all([
    supabase
      .from("movimientos")
      .select("fecha, created_at, tipo, monto, categorias(es_ahorro)")
      .gte("fecha", desde)
      .overrideTypes<Fila[]>(),
    // "!inner" deja solo los movimientos cuya categoría es de ahorro.
    supabase
      .from("movimientos")
      .select("monto, categorias!inner(es_ahorro)")
      .eq("categorias.es_ahorro", true),
  ]);

  const movimientos: MovimientoAhorro[] = (recientes ?? []).map((m) => ({
    fecha: m.fecha,
    created_at: m.created_at,
    tipo: m.tipo,
    monto: Number(m.monto),
    es_ahorro: m.categorias?.es_ahorro ?? false,
  }));

  const registrado = (deAhorro ?? []).reduce((s, m) => s + Math.round(Number(m.monto) * 100), 0);

  return {
    ajustes: ajustes ?? null,
    resumen: calcularAhorro(ajustes ?? null, movimientos, hoy),
    totalAhorrado: registrado / 100 + Number(ajustes?.ahorro_inicial ?? 0),
    hoy,
  };
}
