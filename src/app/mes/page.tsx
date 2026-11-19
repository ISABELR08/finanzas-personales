import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { IconoCategoria } from "@/components/IconoCategoria";
import { ListaMovimientos } from "@/components/ListaMovimientos";
import { Navegacion } from "@/components/Navegacion";
import { esMesValido, mesActual, moverMes, nombreMes, rangoDelMes } from "@/lib/fechas";
import { formatoMXN } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import {
  COLUMNAS_MOVIMIENTO,
  type Categoria,
  type MovimientoConCategoria,
} from "@/lib/tipos";

type Props = { searchParams: Promise<{ m?: string | string[] }> };

export default function PaginaMes({ searchParams }: Props) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+var(--seguro-abajo))]">
        <Suspense fallback={<p className="py-20 text-center text-neutral-500">Cargando…</p>}>
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
      .select("id, nombre, tipo, icono, orden, archivada")
      .order("orden")
      .overrideTypes<Categoria[]>(),
  ]);

  const lista = movimientos ?? [];

  // Se suma en centavos enteros para no arrastrar errores de decimales.
  const centavos = (x: MovimientoConCategoria) => Math.round(Number(x.monto) * 100);
  let gastos = 0;
  let ingresos = 0;
  const porCategoria = new Map<string, { nombre: string; icono: string; total: number }>();
  for (const x of lista) {
    if (x.tipo === "ingreso") {
      ingresos += centavos(x);
      continue;
    }
    gastos += centavos(x);
    const clave = x.categoria_id ?? "sin";
    const actual = porCategoria.get(clave) ?? {
      nombre: x.categorias?.nombre ?? "Sin categoría",
      icono: x.categorias?.icono ?? "tag",
      total: 0,
    };
    actual.total += centavos(x);
    porCategoria.set(clave, actual);
  }
  const desglose = [...porCategoria.values()].sort((a, b) => b.total - a.total);
  const mayor = desglose[0]?.total ?? 0;
  const balance = ingresos - gastos;

  return (
    <>
      <header className="flex items-center justify-between">
        <Link
          href={`/mes?m=${moverMes(mes, -1)}`}
          aria-label="Mes anterior"
          className="rounded-full p-2 text-neutral-500"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="text-lg font-semibold first-letter:uppercase">{nombreMes(mes)}</h1>
        <Link
          href={`/mes?m=${moverMes(mes, 1)}`}
          aria-label="Mes siguiente"
          className="rounded-full p-2 text-neutral-500"
        >
          <ChevronRight className="size-6" aria-hidden />
        </Link>
      </header>

      <section aria-label="Resumen" className="flex flex-col gap-3">
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Gastado</p>
          <p className="text-4xl font-semibold tabular-nums">{formatoMXN(gastos / 100)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">Ingresos</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-600">
              {formatoMXN(ingresos / 100)}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">Balance</p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                balance < 0 ? "text-rose-600" : ""
              }`}
            >
              {balance < 0 ? "−" : ""}
              {formatoMXN(Math.abs(balance) / 100)}
            </p>
          </div>
        </div>
      </section>

      {desglose.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-500">Gasto por categoría</h2>
          <ul className="flex flex-col gap-3">
            {desglose.map((c) => (
              <li key={c.nombre} className="flex items-center gap-3">
                <IconoCategoria categoria={c} className="size-5 shrink-0 text-neutral-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{c.nombre}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatoMXN(c.total / 100)}
                      <span className="ml-1.5 text-xs text-neutral-500">
                        {Math.round((c.total / gastos) * 100)}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900">
                    <div
                      className="h-full rounded-full bg-rose-600"
                      style={{ width: `${Math.max(2, (c.total / mayor) * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-500">Movimientos</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay movimientos en este mes.</p>
        ) : (
          <ListaMovimientos movimientos={lista} categorias={categorias ?? []} />
        )}
      </section>
    </>
  );
}
