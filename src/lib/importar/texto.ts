/** Mayúsculas, sin acentos y con espacios simples: "Café  Niño" → "CAFE NINO". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clave para reconocer al mismo comercio en distintos estados de cuenta.
 * Quita números (folios, referencias, sucursales) que cambian en cada compra:
 * "OXXO REFORMA 4521 REF 998812" → "OXXO REFORMA REF".
 */
export function claveComercio(descripcion: string): string {
  return normalizar(descripcion)
    .replace(/[0-9]+/g, " ")
    .replace(/[^A-Z& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
