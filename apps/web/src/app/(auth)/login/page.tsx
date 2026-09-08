"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div
        className="flex min-w-0 flex-col justify-between p-11 border-r border-white/10"
        style={{
          background:
            "#0E0C0B radial-gradient(760px 420px at 12% 8%, rgba(124,92,255,.32), transparent 62%), radial-gradient(620px 380px at 92% 96%, rgba(198,255,61,.14), transparent 60%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-accent font-sans text-[15px] font-extrabold text-white">
            W
          </div>
          <div className="font-sans text-[15px] font-bold text-ink">
            Aula<span className="text-accent">WM</span>
          </div>
        </div>

        <div className="py-10">
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-lime">
            Media técnica · Sistemas de información
          </div>
          <h1 className="mt-4 max-w-[16ch] text-[clamp(34px,4.6vw,58px)] font-black leading-none tracking-[-0.045em] text-ink text-wrap-pretty">
            Aprende haciendo.
            <br />
            Evalúate como en el ICFES.
          </h1>
          <p className="mt-5 max-w-[44ch] text-[14px] leading-relaxed text-ink/70 text-wrap-pretty">
            Cursos, laboratorios de programación y ofimática, simulacros
            cronometrados y material de apoyo del profesor Wilmer Mosquera.
          </p>
        </div>

        <div className="font-mono text-[10.5px] leading-relaxed text-ink/55">
          I.E. Tulio Ospina — Medellín, Antioquia · 2026
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-center bg-ground p-11">
        <div className="w-full max-w-[404px]">
          <h2 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
            Entra a tu aula
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink/70">
            Usa el correo institucional que te asignó el colegio.
          </p>

          <form action={formAction} className="mt-6 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/70">
                Correo
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="sara.mena@colegio.edu.co"
                className="w-full rounded-[11px] border border-white/[.13] bg-white/[.05] px-3.5 py-3 text-[13.5px] text-ink outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/70">
                Contraseña
              </span>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-[11px] border border-white/[.13] bg-white/[.05] px-3.5 py-3 text-[13.5px] text-ink outline-none focus:border-accent"
              />
            </label>

            {error ? (
              <div className="rounded-[11px] border border-warn/40 bg-warn/10 px-3.5 py-3 text-[12.5px] text-warn-text">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-1.5 rounded-[11px] bg-lime py-3.5 text-center text-[13.5px] font-bold text-ground transition-colors hover:bg-lime-hover disabled:opacity-60"
            >
              {pending ? "Entrando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
