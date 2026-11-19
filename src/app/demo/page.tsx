import type { Metadata } from "next";
import { Suspense } from "react";
import { AvisoDemo } from "@/components/AvisoDemo";
import { Navegacion } from "@/components/Navegacion";
import { VistaMes } from "@/components/VistaMes";
import { categoriasDemo, movimientosDemo, ultimoMesDemo } from "@/lib/demo";
import { esMesValido } from "@/lib/fechas";

export const metadata: Metadata = { title: "Demo · Finanzas personales" };

type Props = { searchParams: Promise<{ m?: string | string[] }> };

/** Vista del mes con datos inventados: se puede abrir sin cuenta. */
export default function DemoMes({ searchParams }: Props) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+var(--seguro-abajo))]">
        <AvisoDemo />
        <Suspense fallback={<p className="py-20 text-center text-neutral-500">Cargando…</p>}>
          <Mes searchParams={searchParams} />
        </Suspense>
      </main>
      <Navegacion activa="mes" demo />
    </>
  );
}

async function Mes({ searchParams }: Props) {
  const { m } = await searchParams;
  const mes = esMesValido(m) ? m : ultimoMesDemo;
  return (
    <VistaMes
      mes={mes}
      movimientos={movimientosDemo.filter((x) => x.fecha.startsWith(mes))}
      categorias={categoriasDemo}
      ruta="/demo"
      soloLectura
    />
  );
}
