// Utilidades de meses. Un mes se representa como texto "AAAA-MM".

/** Mes actual en hora del centro de México (el servidor vive en UTC). */
export function mesActual(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const anio = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  return `${anio}-${mes}`;
}

export function esMesValido(texto: unknown): texto is string {
  return typeof texto === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(texto);
}

/** Suma o resta meses: moverMes("2026-01", -1) → "2025-12" */
export function moverMes(mes: string, cuanto: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + cuanto, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Primer día del mes y primer día del siguiente, para filtrar por rango. */
export function rangoDelMes(mes: string): { desde: string; antesDe: string } {
  return { desde: `${mes}-01`, antesDe: `${moverMes(mes, 1)}-01` };
}

/** "2026-11" → "noviembre de 2026" */
export function nombreMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(
    new Date(a, m - 1, 1),
  );
}

/** "2026-11-18" → "miércoles 18" */
export function nombreDia(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric" }).format(
    new Date(a, m - 1, d),
  );
}
