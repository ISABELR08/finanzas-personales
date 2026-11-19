import { CalendarDays, CirclePlus, FileUp, Tags } from "lucide-react";
import Link from "next/link";

const SECCIONES = [
  { clave: "registrar", href: "/", etiqueta: "Registrar", Icono: CirclePlus },
  { clave: "mes", href: "/mes", etiqueta: "Mes", Icono: CalendarDays },
  { clave: "categorias", href: "/categorias", etiqueta: "Categorías", Icono: Tags },
  { clave: "importar", href: "/importar", etiqueta: "Importar", Icono: FileUp },
] as const;

// La demo pública solo tiene las dos pantallas que no necesitan cuenta.
const SECCIONES_DEMO = [
  { clave: "registrar", href: "/demo/registrar", etiqueta: "Registrar", Icono: CirclePlus },
  { clave: "mes", href: "/demo", etiqueta: "Mes", Icono: CalendarDays },
] as const;

type Props = { activa: (typeof SECCIONES)[number]["clave"]; demo?: boolean };

/**
 * Barra fija inferior, al alcance del pulgar en el celular. Su relleno
 * inferior la mantiene por encima de la franja del gesto de inicio del iPhone,
 * para que tocar un botón no dispare ese gesto.
 */
export function Navegacion({ activa, demo = false }: Props) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-background pb-[calc(var(--seguro-abajo)+0.25rem)] dark:border-neutral-800"
    >
      <ul className="mx-auto flex max-w-md">
        {(demo ? SECCIONES_DEMO : SECCIONES).map(({ clave, href, etiqueta, Icono }) => (
          <li key={clave} className="flex-1">
            <Link
              href={href}
              aria-current={activa === clave ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 pt-2.5 pb-1.5 text-xs font-medium ${
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
