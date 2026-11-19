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
  /** Los movimientos de esta categoría son ahorro, no gasto (ver 0002_ahorro.sql). */
  es_ahorro: boolean;
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
  categorias: Pick<Categoria, "nombre" | "icono" | "es_ahorro"> | null;
};

export const METODOS_PAGO: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "debito", etiqueta: "Débito" },
  { valor: "credito", etiqueta: "Crédito" },
  { valor: "transferencia", etiqueta: "Transferencia" },
];

/** Columnas que se piden a Supabase para obtener un MovimientoConCategoria. */
export const COLUMNAS_MOVIMIENTO =
  "id, monto, tipo, categoria_id, fecha, descripcion, metodo_pago, origen, categorias(nombre, icono, es_ahorro)";

/** Columnas que se piden a Supabase para obtener una Categoria. */
export const COLUMNAS_CATEGORIA = "id, nombre, tipo, icono, orden, archivada, es_ahorro";

/** Fila de la tabla "ajustes": preferencias de ahorro del usuario. */
export type Ajustes = {
  porcentaje_ahorro: number;
  dia_ingreso: number; // 0 = lunes ... 6 = domingo
  saldo_inicial: number | null;
  saldo_fecha: string | null; // AAAA-MM-DD
  saldo_marca: string | null; // fecha y hora exactas en que se anotó el saldo
  ahorro_inicial: number;
};
