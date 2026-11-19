import type { FilaBanco } from "./csv";
import { normalizar } from "./texto";

/** Lo que identifica a un renglón, sin contar repeticiones. */
function base(f: FilaBanco): string {
  // Si el banco dio un folio, identifica mejor al movimiento que la
  // descripción (que en un PDF sale de un OCR y podría variar una letra).
  const identidad = f.referencia ? `FOLIO:${f.referencia}` : normalizar(f.descripcion);
  return [f.fecha, Math.round(f.monto * 100), f.tipo, identidad].join("|");
}

/**
 * Numera las repeticiones: si el mismo día hay dos compras idénticas (dos
 * cafés de $45 en el mismo lugar), la primera es la ocurrencia 0 y la segunda
 * la 1. Así son dos movimientos distintos y no se confunden con un duplicado.
 */
export function asignarOcurrencias(filas: FilaBanco[]): number[] {
  const vistas = new Map<string, number>();
  return filas.map((f) => {
    const clave = base(f);
    const n = vistas.get(clave) ?? 0;
    vistas.set(clave, n + 1);
    return n;
  });
}

/**
 * Huella digital del renglón: un hash SHA-256 de fecha + monto + tipo +
 * descripción + número de ocurrencia. El mismo renglón produce siempre la
 * misma huella, y la base tiene una restricción UNIQUE sobre ella: por eso
 * importar dos veces el mismo periodo no duplica nada.
 * Usa Web Crypto, que existe tanto en el navegador como en el servidor.
 */
export async function calcularHuella(f: FilaBanco, ocurrencia: number): Promise<string> {
  const datos = new TextEncoder().encode(`${base(f)}|${ocurrencia}`);
  const hash = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(hash).slice(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
