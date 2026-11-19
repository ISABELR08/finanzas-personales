import { Suspense } from "react";
import { GestorCategorias } from "@/components/GestorCategorias";
import { Navegacion } from "@/components/Navegacion";
import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_CATEGORIA, type Categoria } from "@/lib/tipos";

export default function PaginaCategorias() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(6rem+var(--seguro-abajo))]">
        <header>
          <h1 className="text-lg font-semibold">Categorías</h1>
          <p className="text-sm text-neutral-500">
            Toca una para cambiarle el nombre o el icono, o para archivarla.
          </p>
        </header>
        <Suspense fallback={<p className="py-20 text-center text-neutral-500">Cargando…</p>}>
          <Lista />
        </Suspense>
      </main>
      <Navegacion activa="categorias" />
    </>
  );
}

async function Lista() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categorias")
    .select(COLUMNAS_CATEGORIA)
    .order("orden")
    .overrideTypes<Categoria[]>();

  return <GestorCategorias categorias={data ?? []} />;
}
