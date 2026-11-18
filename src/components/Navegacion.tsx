import { CalendarDays, CirclePlus, Tags } from "lucide-react";
import Link from "next/link";

const SECCIONES = [
  { clave: "registrar", href: "/", etiqueta: "Registrar", Icono: CirclePlus },
  { clave: "mes", href: "/mes", etiqueta: "Mes", Icono: CalendarDays },
  { clave: "categorias", href: "/categorias", etiqueta: "Categorías", Icono: Tags },
] as const;

/** Barra fija inferior, al alcance del pulgar en el celular. */
export function Navegacion({ activa }: { activa: (typeof SECCIONES)[number]["clave"] }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-background pb-[env(safe-area-inset-bottom)] dark:border-neutral-800"
    >
      <ul className="mx-auto flex max-w-md">
        {SECCIONES.map(({ clave, href, etiqueta, Icono }) => (
          <li key={clave} className="flex-1">
            <Link
              href={href}
              aria-current={activa === clave ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                activa === clave ? "text-emerald-600" : "text-neutral-500"
              }`}
            >
              <Icono className="size-6" strokeWidth={1.75} aria-hidden />
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
