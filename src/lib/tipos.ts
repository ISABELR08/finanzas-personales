// Tipos que reflejan las tablas de supabase/migrations.

export type TipoMovimiento = "gasto" | "ingreso";
export type MetodoPago = "efectivo" | "debito" | "credito" | "transferencia";
export type Origen = "manual" | "banco";

export type Categoria = {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
  icono: string;
  orden: number;
  archivada: boolean;
};

export type Movimiento = {
  id: string;
  monto: number;
  tipo: TipoMovimiento;
  categoria_id: string | null;
  fecha: string; // AAAA-MM-DD
  descripcion: string | null;
  metodo_pago: MetodoPago | null;
  origen: Origen;
};

/** Movimiento con los datos de su categoría ya unidos (para mostrar listas). */
export type MovimientoConCategoria = Movimiento & {
  categorias: Pick<Categoria, "nombre" | "icono"> | null;
};

export const METODOS_PAGO: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "debito", etiqueta: "Débito" },
  { valor: "credito", etiqueta: "Crédito" },
  { valor: "transferencia", etiqueta: "Transferencia" },
];

/** Columnas que se piden a Supabase para obtener un MovimientoConCategoria. */
export const COLUMNAS_MOVIMIENTO =
  "id, monto, tipo, categoria_id, fecha, descripcion, metodo_pago, origen, categorias(nombre, icono)";
