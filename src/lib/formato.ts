const pesos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

/** 1234.5 → "$1,234.50" */
export function formatoMXN(monto: number): string {
  return pesos.format(monto);
}

/**
 * Fecha de hoy en la zona horaria del dispositivo, como AAAA-MM-DD.
 * Se calcula en el navegador a propósito: el servidor vive en UTC y a las
 * 7 pm en México ya diría que es "mañana".
 */
export function hoyLocal(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Convierte lo que se escribe en el campo de monto a un número con máximo
 * dos decimales. Acepta "85", "85.5", "85,50" y "1,250.00".
 * Devuelve null si no es un monto válido mayor a cero.
 */
export function leerMonto(texto: string): number | null {
  let limpio = texto.trim().replace(/[$\s]/g, "");
  if (/^\d+,\d{1,2}$/.test(limpio)) {
    limpio = limpio.replace(",", "."); // coma usada como punto decimal
  } else {
    limpio = limpio.replace(/,/g, ""); // comas de miles
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const monto = Number(limpio);
  if (!(monto > 0) || monto > 9_999_999_999.99) return null;
  return monto;
}

/** "2026-11-18" → "mié 18 nov" */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(a, m - 1, d));
}
