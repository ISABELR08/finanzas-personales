"use client";

import { useState, useTransition } from "react";
import { guardarPreferencias, guardarSaldo, registrarAhorro } from "@/app/ahorro/actions";
import type { Resultado } from "@/app/actions";
import type { ResumenAhorro } from "@/lib/ahorro/calculo";
import { formatoMXN, hoyLocal, leerMonto } from "@/lib/formato";

type Props = {
  resumen: ResumenAhorro;
  totalAhorrado: number;
  diaIngreso: number;
  ahorroInicial: number;
  nombreDelMes: string; // "noviembre de 2026"
  demo?: boolean; // en la demo pública los formularios no guardan
};

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const tarjeta = "rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800";
const campo =
  "min-w-0 flex-1 rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-base tabular-nums outline-none focus:border-emerald-600 dark:border-neutral-700";
const boton =
  "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

export function PanelAhorro({
  resumen,
  totalAhorrado,
  diaIngreso,
  ahorroInicial,
  nombreDelMes,
  demo = false,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  // Los formularios guardan texto; se convierten a número al enviar.
  const [saldoTexto, setSaldoTexto] = useState("");
  const [editandoSaldo, setEditandoSaldo] = useState(resumen.saldo === null);
  const [ahorroTexto, setAhorroTexto] = useState("");
  const [porcentajeTexto, setPorcentajeTexto] = useState(String(resumen.porcentaje));
  const [dia, setDia] = useState(diaIngreso);
  const [inicialTexto, setInicialTexto] = useState(ahorroInicial ? String(ahorroInicial) : "");

  function ejecutar(accion: () => Promise<Resultado>, alTerminar?: () => void) {
    if (demo) return setError("Demo: aquí no se guarda nada.");
    setError(null);
    iniciar(async () => {
      const r = await accion();
      if (r.ok) alTerminar?.();
      else setError(r.error);
    });
  }

  function enviarSaldo(e: React.FormEvent) {
    e.preventDefault();
    const monto = saldoTexto.trim() === "0" ? 0 : leerMonto(saldoTexto);
    if (monto === null) return setError("Escribe cuánto dinero tienes hoy.");
    ejecutar(
      () => guardarSaldo(monto, hoyLocal()),
      () => {
        setSaldoTexto("");
        setEditandoSaldo(false);
      },
    );
  }

  function enviarAhorro(e: React.FormEvent) {
    e.preventDefault();
    // Si no se escribe nada, se registra exactamente lo que falta apartar.
    const monto = ahorroTexto.trim() ? leerMonto(ahorroTexto) : resumen.faltaApartar || null;
    if (monto === null) return setError("Escribe cuánto pasaste a tu ahorro.");
    ejecutar(
      () => registrarAhorro(monto, hoyLocal()),
      () => setAhorroTexto(""),
    );
  }

  function enviarPreferencias(e: React.FormEvent) {
    e.preventDefault();
    const porcentaje = Number(porcentajeTexto.replace(",", "."));
    const inicial = inicialTexto.trim() ? leerMonto(inicialTexto) : 0;
    if (!Number.isFinite(porcentaje)) return setError("Escribe un porcentaje válido.");
    if (inicial === null) return setError("Escribe un monto válido.");
    ejecutar(() => guardarPreferencias({ porcentaje, diaIngreso: dia, ahorroInicial: inicial }));
  }

  const avance = resumen.metaMes > 0 ? Math.min(1, resumen.ahorradoMes / resumen.metaMes) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Cuánto dinero tengo */}
      <section className={tarjeta}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm text-neutral-500">Tengo disponible</h2>
          {resumen.saldo !== null && !editandoSaldo && (
            <button
              type="button"
              onClick={() => setEditandoSaldo(true)}
              className="text-sm font-medium text-emerald-600"
            >
              Corregir
            </button>
          )}
        </div>
        {resumen.saldo !== null && (
          <p className="text-4xl font-semibold tabular-nums">{formatoMXN(resumen.saldo)}</p>
        )}
        {editandoSaldo && (
          <form onSubmit={enviarSaldo} className="mt-2 flex flex-col gap-2">
            <label className="text-sm text-neutral-500" htmlFor="saldo">
              ¿Cuánto dinero tienes hoy, sin contar tus ahorros?
            </label>
            <div className="flex gap-2">
              <input
                id="saldo"
                value={saldoTexto}
                onChange={(e) => setSaldoTexto(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className={campo}
              />
              <button type="submit" disabled={ocupado} className={boton}>
                Guardar
              </button>
            </div>
          </form>
        )}
        {resumen.saldo !== null && !editandoSaldo && (
          <p className="mt-1 text-xs text-neutral-500">
            Se actualiza solo con cada gasto, ingreso o ahorro que registres.
          </p>
        )}
      </section>

      {/* 2. Meta del mes */}
      <section className={tarjeta}>
        <h2 className="text-sm text-neutral-500 first-letter:uppercase">Meta de {nombreDelMes}</h2>
        {resumen.metaMes === 0 ? (
          <p className="mt-1 text-sm">
            Registra un ingreso y aquí verás cuánto apartar: el {resumen.porcentaje}% de lo que
            recibas.
          </p>
        ) : (
          <>
            <p className="text-2xl font-semibold tabular-nums">
              {formatoMXN(resumen.ahorradoMes)}
              <span className="text-base font-normal text-neutral-500">
                {" "}
                de {formatoMXN(resumen.metaMes)}
              </span>
            </p>
            <div
              className="mt-2 h-2 rounded-full bg-neutral-100 dark:bg-neutral-900"
              role="progressbar"
              aria-valuenow={Math.round(avance * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Avance de la meta de ahorro"
            >
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${avance * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              La meta es el {resumen.porcentaje}% de tus ingresos del mes (
              {formatoMXN(resumen.ingresosMes)}).
            </p>
            <p className="mt-3 text-sm font-medium">
              {resumen.faltaApartar > 0
                ? `Te falta pasar ${formatoMXN(resumen.faltaApartar)} a tu cuenta de ahorro.`
                : "Meta cumplida: ya apartaste lo de este mes."}
            </p>
          </>
        )}
        <form onSubmit={enviarAhorro} className="mt-3 flex gap-2">
          <input
            value={ahorroTexto}
            onChange={(e) => setAhorroTexto(e.target.value)}
            inputMode="decimal"
            placeholder={resumen.faltaApartar > 0 ? resumen.faltaApartar.toFixed(2) : "Monto"}
            aria-label="Monto que pasaste a tu ahorro"
            className={campo}
          />
          <button type="submit" disabled={ocupado} className={boton}>
            Ya lo pasé
          </button>
        </form>
      </section>

      {/* 3. Cuánto puedo gastar */}
      {resumen.disponible !== null && resumen.porDia !== null && (
        <section className={tarjeta}>
          <h2 className="text-sm text-neutral-500">Puedes gastar</h2>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              resumen.disponible < 0 ? "text-rose-600" : ""
            }`}
          >
            {resumen.disponible < 0 ? "−" : ""}
            {formatoMXN(Math.abs(resumen.disponible))}
          </p>
          <p className="mt-1 text-sm">
            {resumen.disponible < 0
              ? "Tu dinero no alcanza para cubrir lo que falta apartar este mes."
              : `${formatoMXN(resumen.porDia)} por día durante ${resumen.diasHastaIngreso} ${
                  resumen.diasHastaIngreso === 1 ? "día" : "días"
                }, hasta tu próximo ingreso.`}
          </p>
          {resumen.faltaApartar > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              Ya descuenta los {formatoMXN(resumen.faltaApartar)} que faltan apartar.
            </p>
          )}
        </section>
      )}

      {/* 4. Total ahorrado */}
      <section className={tarjeta}>
        <h2 className="text-sm text-neutral-500">Total ahorrado</h2>
        <p className="text-2xl font-semibold tabular-nums text-emerald-600">
          {formatoMXN(totalAhorrado)}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Lo que ya tenías más todo lo que has registrado como ahorro.
        </p>
      </section>

      {error && (
        <p role="alert" className={`text-sm ${demo ? "text-neutral-500" : "text-red-600"}`}>
          {error}
        </p>
      )}

      {/* 5. Ajustes */}
      <details className={tarjeta}>
        <summary className="cursor-pointer text-sm font-medium text-neutral-500">Ajustes</summary>
        <form onSubmit={enviarPreferencias} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Porcentaje de cada ingreso que quiero ahorrar
            <span className="flex items-center gap-2">
              <input
                value={porcentajeTexto}
                onChange={(e) => setPorcentajeTexto(e.target.value)}
                inputMode="decimal"
                className={campo}
              />
              <span className="text-neutral-500">%</span>
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Día en que normalmente recibo dinero
            <select
              value={dia}
              onChange={(e) => setDia(Number(e.target.value))}
              className={campo}
            >
              {DIAS.map((nombre, i) => (
                <option key={nombre} value={i}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Ahorro que ya tenía antes de usar la app
            <input
              value={inicialTexto}
              onChange={(e) => setInicialTexto(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className={campo}
            />
          </label>
          <button type="submit" disabled={ocupado} className={`${boton} py-3`}>
            {ocupado ? "Guardando…" : "Guardar ajustes"}
          </button>
        </form>
      </details>
    </div>
  );
}
