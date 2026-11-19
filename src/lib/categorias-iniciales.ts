import type { TipoMovimiento } from "./tipos";

/**
 * Categorías con las que arranca una cuenta nueva. Luego son editables.
 * "icono" es una clave de src/components/IconoCategoria.tsx.
 */
export const CATEGORIAS_INICIALES: {
  nombre: string;
  tipo: TipoMovimiento;
  icono: string;
  es_ahorro?: boolean;
}[] = [
  { nombre: "Comida", tipo: "gasto", icono: "utensils" },
  { nombre: "Súper", tipo: "gasto", icono: "shopping-cart" },
  { nombre: "Transporte", tipo: "gasto", icono: "bus" },
  { nombre: "Renta y servicios", tipo: "gasto", icono: "house" },
  { nombre: "Escuela", tipo: "gasto", icono: "book-open" },
  { nombre: "Salud", tipo: "gasto", icono: "heart-pulse" },
  { nombre: "Entretenimiento", tipo: "gasto", icono: "clapperboard" },
  { nombre: "Suscripciones", tipo: "gasto", icono: "smartphone" },
  { nombre: "Ropa y personal", tipo: "gasto", icono: "shirt" },
  { nombre: "Otros", tipo: "gasto", icono: "package" },
  // No es un gasto: es el dinero que se pasa a la cuenta de ahorro.
  { nombre: "Ahorro", tipo: "gasto", icono: "piggy-bank", es_ahorro: true },
  { nombre: "Beca / Mesada", tipo: "ingreso", icono: "graduation-cap" },
  { nombre: "Trabajo", tipo: "ingreso", icono: "briefcase" },
  { nombre: "Otros ingresos", tipo: "ingreso", icono: "wallet" },
];
