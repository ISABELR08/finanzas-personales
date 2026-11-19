import { Suspense } from "react";
import { Navegacion } from "@/components/Navegacion";
import { PanelAhorro } from "@/components/PanelAhorro";
import { obtenerEstadoAhorro } from "@/lib/ahorro/servidor";
import { nombreMes } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";

export default function PaginaAhorro() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+var(--seguro-abajo))]">
        <header>
          <h1 className="text-lg font-semibold">Ahorro</h1>
          <p className="text-sm text-neutral-500">
            Cuánto apartar de cada ingreso y cuánto te queda para gastar.
          </p>
        </header>
        <Suspense fallback={<p className="py-20 text-center text-neutral-500">Cargando…</p>}>
          <Contenido />
        </Suspense>
      </main>
      <Navegacion activa="ahorro" />
    </>
  );
}

async function Contenido() {
  const supabase = await createClient();
  const estado = await obtenerEstadoAhorro(supabase);

  if (!estado) {
    return (
      <p role="alert" className="text-sm text-red-600">
        Falta preparar la base de datos para el ahorro: corre el archivo
        supabase/migrations/0002_ahorro.sql en el SQL Editor de Supabase.
      </p>
    );
  }

  return (
    <PanelAhorro
      resumen={estado.resumen}
      totalAhorrado={estado.totalAhorrado}
      diaIngreso={estado.ajustes?.dia_ingreso ?? 0}
      ahorroInicial={Number(estado.ajustes?.ahorro_inicial ?? 0)}
      nombreDelMes={nombreMes(estado.hoy.slice(0, 7))}
    />
  );
}
