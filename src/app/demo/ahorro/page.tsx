import type { Metadata } from "next";
import { AvisoDemo } from "@/components/AvisoDemo";
import { Navegacion } from "@/components/Navegacion";
import { PanelAhorro } from "@/components/PanelAhorro";
import { ahorroDemo } from "@/lib/demo";
import { nombreMes } from "@/lib/fechas";

export const metadata: Metadata = { title: "Demo · Finanzas personales" };

/** Pantalla de ahorro con datos inventados: se puede ver, pero no guarda. */
export default function DemoAhorro() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+var(--seguro-abajo))]">
        <AvisoDemo />
        <header>
          <h1 className="text-lg font-semibold">Ahorro</h1>
          <p className="text-sm text-neutral-500">
            Cuánto apartar de cada ingreso y cuánto te queda para gastar.
          </p>
        </header>
        <PanelAhorro
          resumen={ahorroDemo.resumen}
          totalAhorrado={ahorroDemo.totalAhorrado}
          diaIngreso={ahorroDemo.diaIngreso}
          ahorroInicial={ahorroDemo.ahorroInicial}
          nombreDelMes={nombreMes(ahorroDemo.hoy.slice(0, 7))}
          demo
        />
      </main>
      <Navegacion activa="ahorro" demo />
    </>
  );
}
