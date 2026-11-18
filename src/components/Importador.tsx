"use client";

import { FileUp } from "lucide-react";
import { useState, useTransition } from "react";
import {
  consultarYaRegistrado,
  importarMovimientos,
  type FilaAImportar,
} from "@/app/importar/actions";
import { fechaCorta, formatoMXN } from "@/lib/formato";
import { sugerirCategoria, type Historial } from "@/lib/importar/categorizar";
import { decodificar, leerCSV } from "@/lib/importar/csv";
import { asignarOcurrencias, calcularHuella } from "@/lib/importar/huella";
import type { Categoria } from "@/lib/tipos";

type Renglon = FilaAImportar & {
  huella: string;
  duplicado: boolean; // ya importado antes: seguro, no se puede volver a guardar
  posibleManual: boolean; // parece una captura manual: tú decides
  incluir: boolean;
};

const DOS_DIAS = 2 * 86_400_000;

type Estado =
  | { paso: "elegir"; error?: string }
  | { paso: "revisar"; archivo: string; renglones: Renglon[]; descartadas: number; error?: string }
  | { paso: "listo"; guardados: number; omitidos: number };

/**
 * Importación en tres pasos: elegir archivo → revisar → guardar.
 * El archivo se lee aquí, en el navegador: nunca se sube. Al servidor solo
 * viajan los renglones que apruebes.
 */
export function Importador({
  categorias,
  historial,
}: {
  categorias: Categoria[];
  historial: Historial;
}) {
  const [estado, setEstado] = useState<Estado>({ paso: "elegir" });
  const [ocupado, iniciar] = useTransition();

  function alElegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    iniciar(async () => {
      const resultado = leerCSV(decodificar(await archivo.arrayBuffer()));
      if (!resultado.ok) {
        setEstado({ paso: "elegir", error: resultado.error });
        return;
      }
      const { filas, descartadas } = resultado;
      const ocurrencias = asignarOcurrencias(filas);
      const huellas = await Promise.all(filas.map((f, i) => calcularHuella(f, ocurrencias[i])));

      const fechas = filas.map((f) => f.fecha).sort();
      const ya = await consultarYaRegistrado(fechas[0], fechas[fechas.length - 1]);
      const existentes = new Set(ya.huellas);
      const manuales = [...ya.manuales];

      setEstado({
        paso: "revisar",
        archivo: archivo.name,
        descartadas,
        renglones: filas.map((f, i) => {
          const duplicado = existentes.has(huellas[i]);
          // ¿Hay una captura manual del mismo monto en fechas cercanas?
          // Cada captura manual solo puede "explicar" un renglón del banco.
          const iManual = duplicado
            ? -1
            : manuales.findIndex(
                (m) =>
                  m.tipo === f.tipo &&
                  Math.round(m.monto * 100) === Math.round(f.monto * 100) &&
                  Math.abs(Date.parse(m.fecha) - Date.parse(f.fecha)) <= DOS_DIAS,
              );
          if (iManual !== -1) manuales.splice(iManual, 1);
          const posibleManual = iManual !== -1;
          return {
            ...f,
            ocurrencia: ocurrencias[i],
            huella: huellas[i],
            duplicado,
            posibleManual,
            incluir: !duplicado && !posibleManual,
            categoriaId: sugerirCategoria(f.descripcion, f.tipo, categorias, historial),
          };
        }),
      });
    });
  }

  if (estado.paso === "elegir") {
    return (
      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
          <FileUp className="size-8 text-neutral-500" strokeWidth={1.5} aria-hidden />
          <span className="font-medium">{ocupado ? "Leyendo archivo…" : "Elegir archivo CSV"}</span>
          <span className="text-sm text-neutral-500">
            El archivo se lee en tu dispositivo; no se sube a ningún servidor.
          </span>
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={alElegir}
            disabled={ocupado}
            className="sr-only"
          />
        </label>
        {estado.error && (
          <p role="alert" className="text-sm text-red-600">
            {estado.error}
          </p>
        )}
      </div>
    );
  }

  if (estado.paso === "listo") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <p className="text-lg font-semibold">
          {estado.guardados === 1
            ? "Se guardó 1 movimiento."
            : `Se guardaron ${estado.guardados} movimientos.`}
        </p>
        {estado.omitidos > 0 && (
          <p className="text-sm text-neutral-500">
            {estado.omitidos} ya existían y no se duplicaron.
          </p>
        )}
        <button
          type="button"
          onClick={() => setEstado({ paso: "elegir" })}
          className="rounded-2xl border border-neutral-300 py-3 text-sm font-semibold dark:border-neutral-700"
        >
          Importar otro archivo
        </button>
      </div>
    );
  }

  // ── Paso "revisar" ──
  const { renglones } = estado;
  const seleccionados = renglones.filter((r) => r.incluir);
  const duplicados = renglones.filter((r) => r.duplicado).length;
  const posibles = renglones.filter((r) => r.posibleManual).length;

  function cambiar(indice: number, cambios: Partial<Renglon>) {
    if (estado.paso !== "revisar") return;
    setEstado({
      ...estado,
      error: undefined,
      renglones: renglones.map((r, i) => (i === indice ? { ...r, ...cambios } : r)),
    });
  }

  function guardar() {
    if (estado.paso !== "revisar") return;
    iniciar(async () => {
      const r = await importarMovimientos(
        seleccionados.map(({ fecha, descripcion, monto, tipo, ocurrencia, categoriaId }) => ({
          fecha,
          descripcion,
          monto,
          tipo,
          ocurrencia,
          categoriaId,
        })),
      );
      if (r.ok) setEstado({ paso: "listo", guardados: r.guardados, omitidos: r.omitidos });
      else setEstado({ ...estado, error: r.error });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-neutral-500">
        <p className="truncate font-medium text-foreground">{estado.archivo}</p>
        <p>
          {renglones.length} movimientos leídos
          {duplicados > 0 && ` · ${duplicados} ya importados`}
          {posibles > 0 && ` · ${posibles} parecen capturas manuales`}
          {estado.descartadas > 0 && ` · ${estado.descartadas} renglones sin movimiento ignorados`}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {renglones.map((r, i) => (
          <li
            key={r.huella}
            className={`rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800 ${
              r.incluir ? "" : "opacity-50"
            }`}
          >
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={r.incluir}
                disabled={r.duplicado}
                onChange={(e) => cambiar(i, { incluir: e.target.checked })}
                className="mt-1 size-5 accent-emerald-600"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-neutral-500">{fechaCorta(r.fecha)}</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      r.tipo === "ingreso" ? "text-emerald-600" : ""
                    }`}
                  >
                    {r.tipo === "ingreso" ? "+" : "−"}
                    {formatoMXN(r.monto)}
                  </span>
                </span>
                <span className="block text-sm break-words">{r.descripcion}</span>
              </span>
            </label>
            {r.posibleManual && (
              <p className="mt-2 pl-8 text-xs font-medium text-amber-600">
                Parece que ya lo capturaste a mano. Márcalo solo si es otro movimiento.
              </p>
            )}
            {r.duplicado ? (
              <p className="mt-2 pl-8 text-xs font-medium text-neutral-500">Ya importado</p>
            ) : (
              <select
                value={r.categoriaId ?? ""}
                onChange={(e) => cambiar(i, { categoriaId: e.target.value || null })}
                disabled={!r.incluir}
                aria-label="Categoría"
                className="mt-2 ml-8 w-[calc(100%-2rem)] rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              >
                <option value="">Sin categoría</option>
                {categorias
                  .filter((c) => c.tipo === r.tipo && !c.archivada)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            )}
          </li>
        ))}
      </ul>

      {estado.error && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      {/* Barra de acción fija sobre la navegación inferior */}
      <div className="sticky bottom-16 flex gap-3 bg-background py-3">
        <button
          type="button"
          onClick={() => setEstado({ paso: "elegir" })}
          disabled={ocupado}
          className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold dark:border-neutral-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={ocupado || seleccionados.length === 0}
          className="flex-1 rounded-2xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-40"
        >
          {ocupado
            ? "Guardando…"
            : seleccionados.length === 0
              ? "Nada nuevo que guardar"
              : `Guardar ${seleccionados.length} ${seleccionados.length === 1 ? "movimiento" : "movimientos"}`}
        </button>
      </div>
    </div>
  );
}
