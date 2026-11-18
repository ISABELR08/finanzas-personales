import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "./login/actions";

// Next 16 separa cada página en dos partes: un "cascarón" estático que se
// muestra al instante y el contenido que depende de quién eres (tu sesión),
// que llega enseguida dentro de <Suspense>.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">Finanzas personales</h1>
      <Suspense fallback={<p className="text-neutral-500">Cargando…</p>}>
        <EstadoDeConexion />
      </Suspense>
    </main>
  );
}

async function EstadoDeConexion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Comprobación de la fase 1: ¿existen las tablas y puedo leerlas con mi sesión?
  const { count, error } = await supabase
    .from("movimientos")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <p className="text-neutral-500">Sesión iniciada como {user?.email}</p>
      {error ? (
        <p role="alert" className="max-w-sm text-sm text-red-600">
          No pude leer la tabla de movimientos. ¿Ya corriste el SQL de
          supabase/migrations en el SQL Editor?
        </p>
      ) : (
        <p className="text-sm text-emerald-600">
          Base de datos conectada: {count ?? 0} movimientos.
        </p>
      )}
      <form action={cerrarSesion}>
        <button
          type="submit"
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
