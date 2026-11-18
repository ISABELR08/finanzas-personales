import type { Categoria, TipoMovimiento } from "@/lib/tipos";
import { claveComercio, normalizar } from "./texto";

/**
 * Reglas por palabras clave. Se revisan en orden y gana la primera que
 * coincide (por eso "UBER EATS" va antes que "UBER"). El nombre debe coincidir
 * con el de una categoría del usuario; si la renombró, la regla no aplica.
 */
const REGLAS: { tipo: TipoMovimiento; categoria: string; palabras: string[] }[] = [
  { tipo: "gasto", categoria: "Suscripciones", palabras: ["NETFLIX", "SPOTIFY", "DISNEY", "HBO", "PRIME VIDEO", "AMAZON PRIME", "YOUTUBE", "APPLE.COM", "ICLOUD", "GOOGLE ONE", "OPENAI", "CHATGPT", "CRUNCHYROLL", "PARAMOUNT"] },
  { tipo: "gasto", categoria: "Comida", palabras: ["UBER EATS", "UBEREATS", "DIDI FOOD", "RAPPI", "RESTAUR", "TAQUER", "TACOS", "PIZZA", "STARBUCKS", "CAFE", "MCDONALD", "BURGER", "KFC", "SUBWAY", "DOMINOS", "LITTLE CAESARS", "VIPS", "TOKS", "SUSHI", "CAFETERIA", "COMEDOR"] },
  { tipo: "gasto", categoria: "Súper", palabras: ["WALMART", "WAL MART", "SORIANA", "CHEDRAUI", "AURRERA", "H-E-B", "HEB ", "COSTCO", "SAMS", "LA COMER", "SUPERAMA", "OXXO", "7 ELEVEN", "7-ELEVEN", "SUPERMERCADO"] },
  { tipo: "gasto", categoria: "Transporte", palabras: ["UBER", "DIDI", "CABIFY", "GASOLIN", "PEMEX", "METROBUS", "METRO ", "ADO ", "CASETA", "ESTACIONAMIENTO", "MOVILIDAD INTEGRADA", "SHELL", "ECOBICI"] },
  { tipo: "gasto", categoria: "Renta y servicios", palabras: ["CFE", "TELMEX", "IZZI", "TOTALPLAY", "TELCEL", "AT&T", "MOVISTAR", "MEGACABLE", "NATURGY", "GAS NATURAL", "RENTA", "AGUA "] },
  { tipo: "gasto", categoria: "Escuela", palabras: ["COLEGIATURA", "UNIVERSIDAD", "UNAM", "IPN ", "LIBRERIA", "GANDHI", "PAPELERIA", "OFFICE DEPOT", "OFFICEMAX", "LUMEN", "COURSERA", "UDEMY", "PLATZI", "INSCRIPCION"] },
  { tipo: "gasto", categoria: "Salud", palabras: ["FARMACIA", "FARM ", "BENAVIDES", "DEL AHORRO", "SIMILARES", "HOSPITAL", "DENTAL", "DENTISTA", "LABORATORIO", "CLINICA", "OPTICA"] },
  { tipo: "gasto", categoria: "Entretenimiento", palabras: ["CINEPOLIS", "CINEMEX", "TICKETMASTER", "STEAM", "PLAYSTATION", "XBOX", "NINTENDO", "BOLETIA"] },
  { tipo: "gasto", categoria: "Ropa y personal", palabras: ["ZARA", "H&M", "SHEIN", "BERSHKA", "PULL&BEAR", "LIVERPOOL", "SUBURBIA", "COPPEL", "C&A", "NIKE", "ADIDAS", "BARBER", "ESTETICA", "SEPHORA"] },
  { tipo: "ingreso", categoria: "Trabajo", palabras: ["NOMINA", "SUELDO", "SALARIO", "HONORARIOS"] },
  { tipo: "ingreso", categoria: "Beca / Mesada", palabras: ["BECA", "MESADA"] },
];

const POR_DEFECTO: Record<TipoMovimiento, string> = {
  gasto: "Otros",
  ingreso: "Otros ingresos",
};

/** clave de comercio → id de la categoría que el usuario le dio la última vez. */
export type Historial = Record<string, string>;

/**
 * Sugiere una categoría para un renglón del banco, en este orden:
 *  1. Lo aprendido: si antes ya categorizaste a ese comercio, se repite.
 *  2. Reglas por palabras clave.
 *  3. La categoría "Otros" del tipo correspondiente.
 * Devuelve null si no hay ninguna categoría aplicable.
 */
export function sugerirCategoria(
  descripcion: string,
  tipo: TipoMovimiento,
  categorias: Categoria[],
  historial: Historial,
): string | null {
  const activas = categorias.filter((c) => c.tipo === tipo && !c.archivada);
  const porNombre = (nombre: string) => activas.find((c) => c.nombre === nombre)?.id ?? null;

  const aprendida = historial[claveComercio(descripcion)];
  if (aprendida && activas.some((c) => c.id === aprendida)) return aprendida;

  const texto = ` ${normalizar(descripcion)} `;
  for (const regla of REGLAS) {
    if (regla.tipo !== tipo) continue;
    if (regla.palabras.some((p) => texto.includes(p))) {
      const id = porNombre(regla.categoria);
      if (id) return id;
    }
  }
  return porNombre(POR_DEFECTO[tipo]);
}
