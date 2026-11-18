import {
  BookOpen,
  Briefcase,
  Bus,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  House,
  Package,
  Shirt,
  ShoppingCart,
  Smartphone,
  Tag,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIAS_INICIALES } from "@/lib/categorias-iniciales";

/**
 * En la base, la columna "icono" guarda una clave de texto (p. ej. "bus"),
 * no un dibujo. Aquí se traduce cada clave a su icono de línea.
 */
export const ICONOS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  bus: Bus,
  house: House,
  "book-open": BookOpen,
  "heart-pulse": HeartPulse,
  clapperboard: Clapperboard,
  smartphone: Smartphone,
  shirt: Shirt,
  package: Package,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  wallet: Wallet,
  tag: Tag,
};

type Props = {
  categoria: { nombre: string; icono: string } | null;
  className?: string;
};

export function IconoCategoria({ categoria, className = "size-6" }: Props) {
  // Si la clave guardada no se reconoce (por ejemplo, un emoji de una versión
  // anterior), se usa el icono de la categoría inicial con el mismo nombre,
  // y como último recurso una etiqueta genérica.
  const clave =
    categoria && categoria.icono in ICONOS
      ? categoria.icono
      : CATEGORIAS_INICIALES.find((c) => c.nombre === categoria?.nombre)?.icono;
  const Icono = (clave && ICONOS[clave]) || Tag;
  return <Icono className={className} strokeWidth={1.75} aria-hidden />;
}
