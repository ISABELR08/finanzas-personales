import { Suspense } from "react";
import { Navegacion } from "@/components/Navegacion";
import { VistaMes } from "@/components/VistaMes";
import { esMesValido, mesActual, rangoDelMes } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  COLUMNAS_CATEGORIA,
  COLUMNAS_MOVIMIENTO,
  type Categoria,
  type MovimientoConCategoria,
} from "@/lib/tipos";

type Props = { searchParams: Promise<{ m?: string | string[] }> };

export default function PaginaMes({ searchParams }: Props) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+var(--seguro-abajo))]">
        <Suspense
          fallback={
            <p className="py-20 text-center text-neutral-500">Cargando…</p>
          }
        >
          <Mes searchParams={searchParams} />
        </Suspense>
      </main>
      <Navegacion activa="mes" />
    </>
  );
}

async function Mes({ searchParams }: Props) {
  // El mes viene en la URL (/mes?m=2026-10); así cada mes tiene su enlace
  // y los botones de anterior/siguiente son simples links.
  const { m } = await searchParams;
  const supabase = await createClient();
  const mes = esMesValido(m) ? m : mesActual();
  const { desde, antesDe } = rangoDelMes(mes);

  const [{ data: movimientos }, { data: categorias }] = await Promise.all([
    supabase
      .from("movimientos")
      .select(COLUMNAS_MOVIMIENTO)
      .gte("fecha", desde)
      .lt("fecha", antesDe)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .overrideTypes<MovimientoConCategoria[]>(),
    supabase
      .from("categorias")
      .select(COLUMNAS_CATEGORIA)
      .order("orden")
      .overrideTypes<Categoria[]>(),
  ]);

  return (
    <VistaMes
      mes={mes}
      movimientos={movimientos ?? []}
      categorias={categorias ?? []}
      ruta="/mes"
    />
  );
}
