import { Suspense } from "react";
import { Importador } from "@/components/Importador";
import { Navegacion } from "@/components/Navegacion";
import type { Historial } from "@/lib/importar/categorizar";
import { claveComercio } from "@/lib/importar/texto";
import { createClient } from "@/lib/supabase/server";
import type { Categoria } from "@/lib/tipos";

export default function PaginaImportar() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-24">
        <header>
          <h1 className="text-lg font-semibold">Importar estado de cuenta</h1>
          <p className="text-sm text-neutral-500">
            Elige el PDF (Santander débito) o un CSV de tu banco, revisa los movimientos y guarda solo los que quieras.
          </p>
        </header>
        <Suspense fallback={<p className="py-20 text-center text-neutral-500">Cargando…</p>}>
          <Contenido />
        </Suspense>
      </main>
      <Navegacion activa="importar" />
    </>
  );
}

async function Contenido() {
  const supabase = await createClient();

  const [{ data: categorias }, { data: previos }] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nombre, tipo, icono, orden, archivada")
      .order("orden")
      .overrideTypes<Categoria[]>(),
    // Lo ya importado sirve de memoria: qué categoría tiene hoy cada comercio.
    // Si corriges una categoría (aquí o en la vista del mes), la próxima
    // importación la sugiere sola para ese mismo comercio.
    supabase
      .from("movimientos")
      .select("descripcion, categoria_id")
      .eq("origen", "banco")
      .not("categoria_id", "is", null)
      .order("fecha", { ascending: false })
      .limit(3000),
  ]);

  const historial: Historial = {};
  for (const m of previos ?? []) {
    const clave = claveComercio(m.descripcion ?? "");
    // Vienen del más reciente al más antiguo: gana la decisión más reciente.
    if (clave && !(clave in historial)) historial[clave] = m.categoria_id;
  }

  return <Importador categorias={categorias ?? []} historial={historial} />;
}
