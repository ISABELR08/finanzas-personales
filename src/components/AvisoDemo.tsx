import Link from "next/link";

/** Franja que deja claro que lo que se ve no son datos reales. */
export function AvisoDemo() {
  return (
    <p className="rounded-xl bg-neutral-100 px-3 py-2 text-center text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
      Demo con datos inventados. No se guarda nada.{" "}
      <Link href="/login" className="font-medium text-emerald-600">
        Iniciar sesión
      </Link>
    </p>
  );
}
