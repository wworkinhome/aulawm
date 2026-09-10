"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function DescargarRecursoBoton({
  recursoId,
  titulo,
}: {
  recursoId: string;
  titulo: string;
}) {
  const [cargando, setCargando] = useState(false);

  const descargar = async () => {
    setCargando(true);
    const res = await apiFetch(`/recursos/${recursoId}/url`);
    setCargando(false);
    if (!res.ok) return;
    const { url } = await res.json();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={descargar}
      disabled={cargando}
      className="rounded-[7px] border border-white/[.14] px-2.5 py-1 text-[11px] font-semibold text-ink/75 hover:border-accent disabled:opacity-60"
    >
      {cargando ? "…" : `⬇ ${titulo}`}
    </button>
  );
}
