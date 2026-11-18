"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = { error: null };

const campo =
  "w-full rounded-xl border border-neutral-300 bg-transparent px-4 py-3 text-base outline-none focus:border-emerald-600 dark:border-neutral-700";

export default function LoginPage() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, estadoInicial);

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <form action={accion} className="flex w-full max-w-sm flex-col gap-4">
        <div className="mb-2 text-center">
          <h1 className="text-2xl font-semibold">Finanzas personales</h1>
          <p className="text-sm text-neutral-500">Inicia sesión para continuar</p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Correo
          <input
            className={campo}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Contraseña
          <input
            className={campo}
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>

        {estado.error && (
          <p role="alert" className="text-sm text-red-600">
            {estado.error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white active:bg-emerald-700 disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
