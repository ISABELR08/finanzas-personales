"use client";

import { Plus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import {
  actualizarCategoria,
  archivarCategoria,
  crearCategoria,
} from "@/app/actions";
import { ICONOS, IconoCategoria } from "@/components/IconoCategoria";
import type { Categoria, TipoMovimiento } from "@/lib/tipos";

/** Qué muestra la hoja: una categoría existente o una nueva de cierto tipo. */
type EnEdicion = { categoria: Categoria } | { nuevaDeTipo: TipoMovimiento } | null;

const SECCIONES: { tipo: TipoMovimiento; titulo: string }[] = [
  { tipo: "gasto", titulo: "Gastos" },
  { tipo: "ingreso", titulo: "Ingresos" },
];

export function GestorCategorias({ categorias }: { categorias: Categoria[] }) {
  const [enEdicion, setEnEdicion] = useState<EnEdicion>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const dialogo = useRef<HTMLDialogElement>(null);

  const archivadas = categorias.filter((c) => c.archivada);

  function abrir(que: EnEdicion) {
    setEnEdicion(que);
    dialogo.current?.showModal();
  }
  const cerrar = () => dialogo.current?.close();

  function restaurar(id: string) {
    setError(null);
    iniciar(async () => {
      const r = await archivarCategoria(id, false);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <>
      {SECCIONES.map(({ tipo, titulo }) => (
        <section key={tipo} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-500">{titulo}</h2>
          <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {categorias
              .filter((c) => c.tipo === tipo && !c.archivada)
              .map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => abrir({ categoria: c })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <IconoCategoria categoria={c} className="size-5 text-neutral-500" />
                    <span className="flex-1 text-sm font-medium">{c.nombre}</span>
                    <span className="text-xs text-neutral-500">Editar</span>
                  </button>
                </li>
              ))}
            <li>
              <button
                type="button"
                onClick={() => abrir({ nuevaDeTipo: tipo })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-emerald-600"
              >
                <Plus className="size-5" aria-hidden />
                Nueva categoría
              </button>
            </li>
          </ul>
        </section>
      ))}

      {archivadas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-500">Archivadas</h2>
          <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {archivadas.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <IconoCategoria categoria={c} className="size-5 text-neutral-400" />
                <span className="flex-1 text-sm text-neutral-500">
                  {c.nombre}
                  <span className="ml-2 text-xs">({c.tipo})</span>
                </span>
                <button
                  type="button"
                  onClick={() => restaurar(c.id)}
                  disabled={ocupado}
                  className="text-xs font-medium text-emerald-600 disabled:opacity-50"
                >
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </section>
      )}

      <dialog
        ref={dialogo}
        onClose={() => setEnEdicion(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar();
        }}
        className="fixed inset-x-0 top-auto bottom-0 mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-0 text-foreground backdrop:bg-black/50"
      >
        {enEdicion && (
          <FormularioCategoria
            key={"categoria" in enEdicion ? enEdicion.categoria.id : enEdicion.nuevaDeTipo}
            enEdicion={enEdicion}
            alTerminar={cerrar}
          />
        )}
      </dialog>
    </>
  );
}

function FormularioCategoria({
  enEdicion,
  alTerminar,
}: {
  enEdicion: NonNullable<EnEdicion>;
  alTerminar: () => void;
}) {
  const existente = "categoria" in enEdicion ? enEdicion.categoria : null;
  const [nombre, setNombre] = useState(existente?.nombre ?? "");
  const [icono, setIcono] = useState(
    existente && existente.icono in ICONOS ? existente.icono : "tag",
  );
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function ejecutar(accion: () => ReturnType<typeof crearCategoria>) {
    setError(null);
    iniciar(async () => {
      const r = await accion();
      if (r.ok) alTerminar();
      else setError(r.error);
    });
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!nombre.trim()) return setError("Escribe un nombre.");
    ejecutar(() =>
      existente
        ? actualizarCategoria(existente.id, { nombre, icono })
        : crearCategoria((enEdicion as { nuevaDeTipo: TipoMovimiento }).nuevaDeTipo, {
            nombre,
            icono,
          }),
    );
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {existente ? "Editar categoría" : "Nueva categoría"}
        </h2>
        <button type="button" onClick={alTerminar} className="text-sm text-neutral-500">
          Cancelar
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Nombre
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={40}
          className="rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-emerald-600 dark:border-neutral-700"
        />
      </label>

      <div className="flex flex-col gap-2 text-sm font-medium">
        Icono
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Icono">
          {Object.keys(ICONOS).map((clave) => (
            <button
              key={clave}
              type="button"
              onClick={() => setIcono(clave)}
              aria-pressed={icono === clave}
              aria-label={clave}
              className={`flex aspect-square items-center justify-center rounded-xl border ${
                icono === clave
                  ? "border-transparent bg-emerald-600 text-white"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <IconoCategoria categoria={{ nombre: "", icono: clave }} className="size-5" />
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-1 flex gap-3">
        {existente && (
          <button
            type="button"
            onClick={() => ejecutar(() => archivarCategoria(existente.id, true))}
            disabled={ocupado}
            className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-600 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            Archivar
          </button>
        )}
        <button
          type="submit"
          disabled={ocupado}
          className="flex-1 rounded-2xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {ocupado ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
