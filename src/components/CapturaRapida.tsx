"use client";

import { useRef, useState, useTransition } from "react";
import { crearMovimiento } from "@/app/actions";
import { IconoCategoria } from "@/components/IconoCategoria";
import { formatoMXN, hoyLocal, leerMonto } from "@/lib/formato";
import {
  METODOS_PAGO,
  type Categoria,
  type MetodoPago,
  type TipoMovimiento,
} from "@/lib/tipos";

type Aviso = { clase: "ok" | "error"; texto: string } | null;

/**
 * Captura rápida: monto → categoría → Guardar.
 * Fecha, descripción y método de pago son opcionales y viven en "Más detalles".
 */
export function CapturaRapida({
  categorias,
  demo = false,
}: {
  categorias: Categoria[];
  demo?: boolean; // en la demo pública no se guarda nada
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>("gasto");
  const [montoTexto, setMontoTexto] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(""); // vacío significa "hoy"
  const [descripcion, setDescripcion] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [guardando, iniciarGuardado] = useTransition();
  const campoMonto = useRef<HTMLInputElement>(null);

  const visibles = categorias.filter((c) => c.tipo === tipo);
  const monto = leerMonto(montoTexto);
  const listo = monto !== null && categoriaId !== null && !guardando;

  function cambiarTipo(nuevo: TipoMovimiento) {
    setTipo(nuevo);
    setCategoriaId(null); // las categorías de gasto e ingreso son distintas
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (monto === null || categoriaId === null) return;
    const categoria = categorias.find((c) => c.id === categoriaId);

    if (demo) {
      setAviso({
        clase: "ok",
        texto: `Demo: aquí se guardaría ${formatoMXN(monto)} en ${categoria?.nombre ?? "—"}`,
      });
      setMontoTexto("");
      setCategoriaId(null);
      return;
    }

    iniciarGuardado(async () => {
      const resultado = await crearMovimiento({
        monto,
        tipo,
        categoriaId,
        fecha: fecha || hoyLocal(),
        descripcion,
        metodoPago,
      });

      if (!resultado.ok) {
        setAviso({ clase: "error", texto: resultado.error });
        return;
      }
      setAviso({
        clase: "ok",
        texto: `Guardado: ${formatoMXN(monto)} en ${categoria?.nombre ?? "—"}`,
      });
      // Listo para el siguiente: se limpia lo que cambia en cada captura y se
      // conserva el método de pago, que suele repetirse.
      setMontoTexto("");
      setCategoriaId(null);
      setDescripcion("");
      setFecha("");
      campoMonto.current?.focus();
    });
  }

  const colorTipo = tipo === "gasto" ? "bg-rose-600" : "bg-emerald-600";

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      {/* Gasto / Ingreso */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-900">
        {(["gasto", "ingreso"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => cambiarTipo(t)}
            aria-pressed={tipo === t}
            className={`rounded-xl py-2 text-sm font-semibold capitalize transition-colors ${
              tipo === t
                ? `${t === "gasto" ? "bg-rose-600" : "bg-emerald-600"} text-white`
                : "text-neutral-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Monto */}
      <label className="flex items-baseline justify-center gap-1 py-2">
        <span className="text-5xl font-semibold text-neutral-400">$</span>
        <input
          ref={campoMonto}
          value={montoTexto}
          onChange={(e) => {
            setMontoTexto(e.target.value);
            setAviso(null);
          }}
          inputMode="decimal"
          autoFocus
          autoComplete="off"
          placeholder="0"
          aria-label="Monto en pesos"
          // El ancho sigue al número de caracteres ("ch") para que el signo
          // de pesos quede pegado a la cifra y el conjunto se vea centrado.
          style={{ width: `${Math.min(Math.max(montoTexto.length, 1), 9)}ch` }}
          className="min-w-0 bg-transparent text-6xl font-semibold tabular-nums outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
        />
      </label>

      {/* Categorías */}
      <div
        className="grid grid-cols-3 gap-2"
        role="group"
        aria-label="Categoría"
      >
        {visibles.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoriaId(c.id)}
            aria-pressed={categoriaId === c.id}
            className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-xs font-medium transition-colors ${
              categoriaId === c.id
                ? `${colorTipo} border-transparent text-white`
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <IconoCategoria categoria={c} />
            <span className="text-center leading-tight">{c.nombre}</span>
          </button>
        ))}
      </div>

      {/* Opcionales */}
      <details className="rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <summary className="cursor-pointer text-sm font-medium text-neutral-500">
          Más detalles (opcional)
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Descripción
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={200}
              placeholder="Ej. tacos con amigos"
              className="rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-emerald-600 dark:border-neutral-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Fecha{" "}
            {fecha === "" && (
              <span className="font-normal text-neutral-500">(hoy)</span>
            )}
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-emerald-600 dark:border-neutral-700"
            />
          </label>

          <div className="flex flex-col gap-1 text-sm font-medium">
            Método de pago
            <div className="flex flex-wrap gap-2">
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  onClick={() =>
                    setMetodoPago(metodoPago === m.valor ? null : m.valor)
                  }
                  aria-pressed={metodoPago === m.valor}
                  className={`rounded-full border px-3 py-1.5 text-sm font-normal ${
                    metodoPago === m.valor
                      ? "border-transparent bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {m.etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* Guardar queda fijo sobre la barra inferior: siempre a la vista, sin
          tener que desplazar la pantalla (clave para registrar en segundos). */}
      <div className="sticky bottom-[calc(4.25rem+var(--seguro-abajo))] flex flex-col gap-2 bg-background pt-2 pb-1">
        <button
          type="submit"
          disabled={!listo}
          className={`rounded-2xl py-4 text-lg font-semibold text-white transition-opacity disabled:opacity-40 ${colorTipo}`}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>

        <p
          role="status"
          className={`min-h-5 text-center text-sm ${
            aviso?.clase === "error" ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {aviso?.texto}
        </p>
      </div>
    </form>
  );
}
