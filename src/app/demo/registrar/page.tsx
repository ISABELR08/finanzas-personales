import type { Metadata } from "next";
import { AvisoDemo } from "@/components/AvisoDemo";
import { CapturaRapida } from "@/components/CapturaRapida";
import { Navegacion } from "@/components/Navegacion";
import { categoriasDemo } from "@/lib/demo";

export const metadata: Metadata = { title: "Demo · Finanzas personales" };

/** Pantalla de captura rápida en modo demo: se puede probar, pero no guarda. */
export default function DemoRegistrar() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+var(--seguro-abajo))]">
        <AvisoDemo />
        <h1 className="text-lg font-semibold">Nuevo movimiento</h1>
        <CapturaRapida categorias={categoriasDemo} demo />
      </main>
      <Navegacion activa="registrar" demo />
    </>
  );
}
