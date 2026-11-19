import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { IconoCategoria } from "@/components/IconoCategoria";
import { ListaMovimientos } from "@/components/ListaMovimientos";
import { moverMes, nombreMes } from "@/lib/fechas";
import { formatoMXN } from "@/lib/formato";
import type { Categoria, MovimientoConCategoria } from "@/lib/tipos";

type Props = {
  mes: string; // "AAAA-MM"
  movimientos: MovimientoConCategoria[]; // solo los de ese mes, del más reciente al más antiguo
  categorias: Categoria[];
  /** Ruta base de los enlaces a otros meses: "/mes" en la app, "/demo" en la demo. */
  ruta: string;
  /** En la demo pública no se puede editar ni borrar. */
  soloLectura?: boolean;
};

/**
 * Resumen de un mes: totales, gasto por categoría y lista de movimientos.
 * Solo presenta datos que recibe; no sabe de dónde vienen. Por eso la misma
 * vista sirve para la app (datos de Supabase) y para la demo (datos inventados).
 */
export function VistaMes({
  mes,
  movimientos,
  categorias,
  ruta,
  soloLectura = false,
}: Props) {
  const lista = movimientos;

  // Se suma en centavos enteros para no arrastrar errores de decimales.
  const centavos = (x: MovimientoConCategoria) =>
    Math.round(Number(x.monto) * 100);
  let gastos = 0;
  let ingresos = 0;
  let ahorrado = 0; // dinero pasado a la cuenta de ahorro: no es gasto
  const porCategoria = new Map<
    string,
    { nombre: string; icono: string; total: number }
  >();
  for (const x of lista) {
    if (x.tipo === "ingreso") {
      ingresos += centavos(x);
      continue;
    }
    if (x.categorias?.es_ahorro) {
      ahorrado += centavos(x);
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
  // El ahorro no se resta: sigue siendo dinero mío, solo cambió de cuenta.
  const balance = ingresos - gastos;

  return (
    <>
      <header className="flex items-center justify-between">
        <Link
          href={`${ruta}?m=${moverMes(mes, -1)}`}
          aria-label="Mes anterior"
          className="rounded-full p-2 text-neutral-500"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="text-lg font-semibold first-letter:uppercase">
          {nombreMes(mes)}
        </h1>
        <Link
          href={`${ruta}?m=${moverMes(mes, 1)}`}
          aria-label="Mes siguiente"
          className="rounded-full p-2 text-neutral-500"
        >
          <ChevronRight className="size-6" aria-hidden />
        </Link>
      </header>

      <section aria-label="Resumen" className="flex flex-col gap-3">
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Gastado</p>
          <p className="text-4xl font-semibold tabular-nums">
            {formatoMXN(gastos / 100)}
          </p>
        </div>
        {ahorrado > 0 && (
          <div className="flex items-baseline justify-between rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">Ahorrado</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-600">
              {formatoMXN(ahorrado / 100)}
            </p>
          </div>
        )}
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
          <h2 className="text-sm font-semibold text-neutral-500">
            Gasto por categoría
          </h2>
          <ul className="flex flex-col gap-3">
            {desglose.map((c) => (
              <li key={c.nombre} className="flex items-center gap-3">
                <IconoCategoria
                  categoria={c}
                  className="size-5 shrink-0 text-neutral-500"
                />
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
                      style={{
                        width: `${Math.max(2, (c.total / mayor) * 100)}%`,
                      }}
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
          <p className="text-sm text-neutral-500">
            No hay movimientos en este mes.
          </p>
        ) : (
          <ListaMovimientos
            movimientos={lista}
            categorias={categorias}
            soloLectura={soloLectura}
          />
        )}
      </section>
    </>
  );
}
