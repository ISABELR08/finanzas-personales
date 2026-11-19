import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Se ejecuta antes de cada página. Hace dos cosas:
 *  1. Refresca la sesión de Supabase (los tokens caducan cada hora).
 *  2. Si no hay sesión, manda a /login; si ya la hay, saca de /login.
 *
 * Es solo la primera barrera (comodidad). La protección real de los datos
 * es RLS en la base: aunque alguien se saltara esto, no vería ninguna fila.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const enLogin = ruta.startsWith("/login");
  // La demo usa datos inventados incluidos en el código: no toca la base
  // de datos, así que puede verse sin cuenta.
  const esDemo = ruta === "/demo" || ruta.startsWith("/demo/");

  if (!user && !enLogin && !esDemo) {
    return redirigir(request, response, "/login");
  }
  if (user && enLogin) {
    return redirigir(request, response, "/");
  }
  return response;
}

/** Redirige conservando las cookies de sesión que se hayan refrescado. */
function redirigir(request: NextRequest, origen: NextResponse, ruta: string) {
  const url = request.nextUrl.clone();
  url.pathname = ruta;
  url.search = "";
  const destino = NextResponse.redirect(url);
  origen.cookies.getAll().forEach((cookie) => destino.cookies.set(cookie));
  return destino;
}

export const config = {
  // Todo excepto archivos estáticos, imágenes, la PWA y el lector de PDF.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|pdfjs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
