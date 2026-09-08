"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function initials(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function TopBar({
  nombre,
  roles,
}: {
  nombre: string;
  roles: string[];
}) {
  const pathname = usePathname();
  const enPanel = pathname.startsWith("/panel");
  const tieneAmbosRoles =
    roles.includes("docente") && roles.includes("estudiante");

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4.5 border-b border-white/[.09] bg-[rgba(20,18,16,.86)] px-5.5 py-3.5 backdrop-blur-[18px]">
      <div className="flex flex-none items-center gap-2.5">
        <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-accent font-sans text-[15px] font-extrabold text-white shadow-[0_0_0_1px_rgba(255,255,255,.14),0_6px_22px_rgba(124,92,255,.45)]">
          W
        </div>
        <div className="flex flex-col gap-px">
          <div className="font-sans text-[14.5px] font-bold leading-[1.1] tracking-[-0.01em] text-ink">
            Aula<span className="text-accent">WM</span>
          </div>
          <div className="font-mono text-[9px] uppercase leading-[1.1] tracking-[0.14em] text-ink/65">
            Wilmer Mosquera
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-w-0 justify-center">
        <div className="flex w-full max-w-[420px] items-center gap-2.5 rounded-[10px] border border-white/[.11] bg-white/[.04] px-3.5 py-2">
          <span className="font-mono text-[11px] text-ink/60">⌘K</span>
          <span className="font-sans text-[12.5px] text-ink/65">
            Buscar cursos, labs, simulacros…
          </span>
        </div>
      </div>

      <div className="flex flex-none items-center gap-2">
        {tieneAmbosRoles ? (
          <div className="flex rounded-[9px] border border-white/[.11] bg-white/[.04] p-[3px]">
            <Link
              href="/inicio"
              className={`rounded-[7px] px-3 py-1.5 text-[12px] font-semibold ${
                !enPanel ? "bg-white/10 text-ink" : "text-ink/60"
              }`}
            >
              Alumno
            </Link>
            <Link
              href="/panel"
              className={`rounded-[7px] px-3 py-1.5 text-[12px] font-semibold ${
                enPanel ? "bg-white/10 text-ink" : "text-ink/60"
              }`}
            >
              Docente
            </Link>
          </div>
        ) : null}
        <div className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(140deg,#C6FF3D,#7C5CFF)] font-mono text-[11px] font-bold text-ground">
          {initials(nombre)}
        </div>
      </div>
    </header>
  );
}
