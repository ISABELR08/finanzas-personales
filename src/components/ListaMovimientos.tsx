"use client";

import { useRef, useState, useTransition } from "react";
import { actualizarMovimiento, borrarMovimiento } from "@/app/actions";
import { IconoCategoria } from "@/components/IconoCategoria";
import { nombreDia } from "@/lib/fechas";
import { formatoMXN, leerMonto } from "@/lib/formato";
import {
  METODOS_PAGO,
  type Categoria,
  type MetodoPago,
  type MovimientoConCategoria,
  type TipoMovimiento,
} from "@/lib/tipos";

type Props = {
  movimientos: MovimientoConCategoria[]; // ya ordenados del más reciente al más antiguo
  categorias: Categoria[];
  soloLectura?: boolean; // en la demo: se ve igual, pero no abre la edición
};

/** Lista agrupada por día. Tocar un movimiento abre su edición. */
export function ListaMovimientos({ movimientos, categorias, soloLectura = false }: Props) {
  const [enEdicion, setEnEdicion] = useState<MovimientoConCategoria | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  // Agrupar por fecha conservando el orden.
  const dias: { fecha: string; items: MovimientoConCategoria[] }[] = [];
  for (const m of movimientos) {
    const ultimo = dias[dias.length - 1];
    if (ultimo?.fecha === m.fecha) ultimo.items.push(m);
    else dias.push({ fecha: m.fecha, items: [m] });
  }

  function abrir(m: MovimientoConCategoria) {
    setEnEdicion(m);
    dialogo.current?.showModal();
  }

  function cerrar() {
    dialogo.current?.close();
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {dias.map(({ fecha, items }) => {
          const gastoDelDia = items
            .filter((m) => m.tipo === "gasto")
            .reduce((suma, m) => suma + Number(m.monto), 0);
          return (
            <section key={fecha}>
              <h3 className="flex items-baseline justify-between border-b border-neutral-200 pb-1 text-xs font-semibold text-neutral-500 dark:border-neutral-800">
                <span className="first-letter:uppercase">{nombreDia(fecha)}</span>
                {gastoDelDia > 0 && (
                  <span className="tabular-nums">−{formatoMXN(gastoDelDia)}</span>
                )}
              </h3>
              <ul>
                {items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => abrir(m)}
                      disabled={soloLectura}
                      className="flex w-full items-center gap-3 py-2.5 text-left"
                    >
                      <IconoCategoria
                        categoria={m.categorias}
                        className="size-5 shrink-0 text-neutral-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {m.descripcion || m.categorias?.nombre || "Sin categoría"}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {[
                            m.descripcion ? m.categorias?.nombre : null,
                            METODOS_PAGO.find((x) => x.valor === m.metodo_pago)?.etiqueta,
                            m.origen === "banco" ? "Banco" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Captura manual"}
                        </span>
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          m.tipo === "ingreso" ? "text-emerald-600" : ""
                        }`}
                      >
                        {m.tipo === "ingreso" ? "+" : "−"}
                        {formatoMXN(Number(m.monto))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Hoja inferior de edición. <dialog> es el elemento nativo del navegador:
          ya trae el fondo oscuro, la tecla Esc y el manejo del foco. */}
      <dialog
        ref={dialogo}
        onClose={() => setEnEdicion(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar(); // toque fuera de la hoja
        }}
        className="fixed inset-x-0 top-auto bottom-0 mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-0 text-foreground backdrop:bg-black/50"
      >
        {enEdicion && (
          <FormularioEdicion
            key={enEdicion.id}
            movimiento={enEdicion}
            categorias={categorias}
            alTerminar={cerrar}
          />
        )}
      </dialog>
    </>
  );
}

const campo =
  "rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-emerald-600 dark:border-neutral-700";

function FormularioEdicion({
  movimiento,
  categorias,
  alTerminar,
}: {
  movimiento: MovimientoConCategoria;
  categorias: Categoria[];
  alTerminar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>(movimiento.tipo);
  const [montoTexto, setMontoTexto] = useState(String(Number(movimiento.monto)));
  const [categoriaId, setCategoriaId] = useState(movimiento.categoria_id ?? "");
  const [fecha, setFecha] = useState(movimiento.fecha);
  const [descripcion, setDescripcion] = useState(movimiento.descripcion ?? "");
  const [metodoPago, setMetodoPago] = useState<MetodoPago | "">(movimiento.metodo_pago ?? "");
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  // Categorías del tipo elegido; una archivada solo aparece si es la actual.
  const opciones = categorias.filter(
    (c) => c.tipo === tipo && (!c.archivada || c.id === movimiento.categoria_id),
  );
  const monto = leerMonto(montoTexto);

  function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (monto === null) return setError("Escribe un monto válido.");
    if (!categoriaId) return setError("Elige una categoría.");
    iniciar(async () => {
      const r = await actualizarMovimiento(movimiento.id, {
        monto,
        tipo,
        categoriaId,
        fecha,
        descripcion,
        metodoPago: metodoPago || null,
      });
      if (r.ok) alTerminar();
      else setError(r.error);
    });
  }

  function borrar() {
    if (!confirmarBorrado) return setConfirmarBorrado(true);
    iniciar(async () => {
      const r = await borrarMovimiento(movimiento.id);
      if (r.ok) alTerminar();
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Editar movimiento</h2>
        <button type="button" onClick={alTerminar} className="text-sm text-neutral-500">
          Cancelar
        </button>
      </div>

      {movimiento.origen === "banco" && (
        <p className="text-xs text-neutral-500">Importado del estado de cuenta.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Monto
          <input
            value={montoTexto}
            onChange={(e) => setMontoTexto(e.target.value)}
            inputMode="decimal"
            className={`${campo} tabular-nums`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Tipo
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoMovimiento);
              setCategoriaId("");
            }}
            className={campo}
          >
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Categoría
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className={campo}
        >
          <option value="" disabled>
            Elige una categoría
          </option>
          {opciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Descripción
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={200}
          className={campo}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className={campo}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Método de pago
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago | "")}
            className={campo}
          >
            <option value="">Sin especificar</option>
            {METODOS_PAGO.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-1 flex gap-3">
        <button
          type="button"
          onClick={borrar}
          disabled={ocupado}
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold disabled:opacity-50 ${
            confirmarBorrado
              ? "border-transparent bg-red-600 text-white"
              : "border-red-300 text-red-600 dark:border-red-900"
          }`}
        >
          {confirmarBorrado ? "Sí, borrar" : "Borrar"}
        </button>
        <button
          type="submit"
          disabled={ocupado}
          className="flex-1 rounded-2xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {ocupado ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
