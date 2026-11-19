import Link from "next/link";
import { Suspense } from "react";
import { CapturaRapida } from "@/components/CapturaRapida";
import { Navegacion } from "@/components/Navegacion";
import { IconoCategoria } from "@/components/IconoCategoria";
import { CATEGORIAS_INICIALES } from "@/lib/categorias-iniciales";
import { fechaCorta, formatoMXN } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import {
  COLUMNAS_MOVIMIENTO,
  type Categoria,
  type MovimientoConCategoria,
} from "@/lib/tipos";
import { cerrarSesion } from "./login/actions";

export default function Home() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+var(--seguro-abajo))]">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Nuevo movimiento</h1>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="text-sm text-neutral-500 underline-offset-4 hover:underline"
            >
              Salir
            </button>
          </form>
        </header>

        {/* Lo que depende de tu sesión llega dentro de <Suspense> (ver fase 1). */}
        <Suspense
          fallback={
            <p className="py-20 text-center text-neutral-500">Cargando…</p>
          }
        >
          <Contenido />
        </Suspense>
      </main>
      <Navegacion activa="registrar" />
    </>
  );
}

async function Contenido() {
  const supabase = await createClient();
  const categorias = await obtenerCategorias(supabase);

  const { data: recientes } = await supabase
    .from("movimientos")
    .select(COLUMNAS_MOVIMIENTO)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5)
    .overrideTypes<MovimientoConCategoria[]>();

  return (
    <>
      <CapturaRapida categorias={categorias} />

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-neutral-500">
            Últimos movimientos
          </h2>
          <Link href="/mes" className="text-sm text-emerald-600">
            Ver el mes
          </Link>
        </div>
        {!recientes?.length ? (
          <p className="text-sm text-neutral-500">
            Aún no hay movimientos. Registra el primero arriba.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {recientes.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <IconoCategoria
                  categoria={m.categorias}
                  className="size-5 text-neutral-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.descripcion || m.categorias?.nombre || "Sin categoría"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {fechaCorta(m.fecha)}
                    {m.descripcion && m.categorias
                      ? ` · ${m.categorias.nombre}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    m.tipo === "ingreso" ? "text-emerald-600" : ""
                  }`}
                >
                  {m.tipo === "ingreso" ? "+" : "−"}
                  {formatoMXN(Number(m.monto))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Lee las categorías activas; si la cuenta es nueva, crea las iniciales. */
async function obtenerCategorias(supabase: Supabase): Promise<Categoria[]> {
  const leer = () =>
    supabase
      .from("categorias")
      .select("id, nombre, tipo, icono, orden, archivada")
      .eq("archivada", false)
      .order("orden")
      .overrideTypes<Categoria[]>();

  const { count } = await supabase
    .from("categorias")
    .select("id", { count: "exact", head: true });

  if (count === 0) {
    // ignoreDuplicates: si dos pestañas llegan a la vez, no se duplican.
    await supabase.from("categorias").upsert(
      CATEGORIAS_INICIALES.map((c, i) => ({ ...c, orden: i })),
      { onConflict: "user_id,tipo,nombre", ignoreDuplicates: true },
    );
  }

  return (await leer()).data ?? [];
}
