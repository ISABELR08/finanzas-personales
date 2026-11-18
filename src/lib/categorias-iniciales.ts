import type { TipoMovimiento } from "./tipos";

/** Categorías con las que arranca una cuenta nueva. Luego son editables. */
export const CATEGORIAS_INICIALES: {
  nombre: string;
  tipo: TipoMovimiento;
  icono: string;
}[] = [
  { nombre: "Comida", tipo: "gasto", icono: "🌮" },
  { nombre: "Súper", tipo: "gasto", icono: "🛒" },
  { nombre: "Transporte", tipo: "gasto", icono: "🚌" },
  { nombre: "Renta y servicios", tipo: "gasto", icono: "🏠" },
  { nombre: "Escuela", tipo: "gasto", icono: "📚" },
  { nombre: "Salud", tipo: "gasto", icono: "💊" },
  { nombre: "Entretenimiento", tipo: "gasto", icono: "🎬" },
  { nombre: "Suscripciones", tipo: "gasto", icono: "📱" },
  { nombre: "Ropa y personal", tipo: "gasto", icono: "👕" },
  { nombre: "Otros", tipo: "gasto", icono: "📦" },
  { nombre: "Beca / Mesada", tipo: "ingreso", icono: "🎓" },
  { nombre: "Trabajo", tipo: "ingreso", icono: "💼" },
  { nombre: "Otros ingresos", tipo: "ingreso", icono: "💰" },
];
