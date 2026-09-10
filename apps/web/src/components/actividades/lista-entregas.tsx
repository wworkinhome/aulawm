"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DescargarArchivoBoton } from "./archivos-entrega";

type Archivo = { id: string; nombre: string; mime: string | null; bytes: number | null };

type Entrega = {
  entregaId: string;
  estudianteId: string;
  nombre: string;
  estado: string;
  comentario: string | null;
  entregadaEn: string | null;
  archivos: Archivo[];
  valor: number | null;
  retroalimentacion: string | null;
};

const ESTADO_LABEL: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-white/10 text-ink/60" },
  entregada: { label: "Entregada", className: "bg-accent/[.18] text-accent" },
  tarde: { label: "Tarde", className: "bg-warn/[.15] text-warn-text" },
  calificada: { label: "Calificada", className: "bg-lime/[.15] text-lime" },
  devuelta: { label: "Devuelta", className: "bg-white/10 text-ink/60" },
};

function FilaEntrega({
  entrega,
  onCalificado,
}: {
  entrega: Entrega;
  onCalificado: (entregaId: string, valor: number, retro: string) => void;
}) {
  const [valor, setValor] = useState(entrega.valor?.toString() ?? "");
  const [retro, setRetro] = useState(entrega.retroalimentacion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const guardar = async () => {
    const num = Number(valor);
    if (Number.isNaN(num) || num < 0 || num > 5) {
      setErrorMsg("La nota debe estar entre 0.0 y 5.0");
      return;
    }
    setGuardando(true);
    setErrorMsg("");
    const res = await apiFetch(`/entregas/${entrega.entregaId}/calificar`, {
      method: "PUT",
      body: JSON.stringify({ valor: num, retroalimentacion: retro || undefined }),
    });
    setGuardando(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.message ?? "No se pudo guardar la nota.");
      return;
    }
    onCalificado(entrega.entregaId, num, retro);
  };

  const estado = ESTADO_LABEL[entrega.estado] ?? ESTADO_LABEL.pendiente;

  return (
    <div className="rounded-[14px] border border-white/[.09] bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-bold text-ink">
          {entrega.nombre}
        </span>
        <span
          className={`rounded-[6px] px-2 py-1 font-mono text-[9px] font-bold uppercase ${estado.className}`}
        >
          {estado.label}
        </span>
      </div>
      {entrega.comentario ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink/75">
          {entrega.comentario}
        </p>
      ) : (
        <p className="mt-2 text-[12px] italic text-ink/40">Sin comentario.</p>
      )}
      {entrega.entregadaEn ? (
        <p className="mt-1 font-mono text-[10.5px] text-ink/45">
          Entregada: {new Date(entrega.entregadaEn).toLocaleString("es-CO")}
        </p>
      ) : null}
      {entrega.archivos.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {entrega.archivos.map((a) => (
            <DescargarArchivoBoton key={a.id} archivoId={a.id} nombre={a.nombre} />
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          max={5}
          step={0.1}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0.0–5.0"
          className="w-24 rounded-[8px] border border-white/[.14] bg-ground px-2.5 py-1.5 text-[12.5px] text-ink"
        />
        <input
          type="text"
          value={retro}
          onChange={(e) => setRetro(e.target.value)}
          placeholder="Retroalimentación (opcional)"
          className="min-w-[220px] flex-1 rounded-[8px] border border-white/[.14] bg-ground px-2.5 py-1.5 text-[12.5px] text-ink"
        />
        <button
          onClick={guardar}
          disabled={guardando}
          className="rounded-[8px] bg-lime px-3.5 py-1.5 text-[12px] font-bold text-ground hover:bg-lime-hover disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar nota"}
        </button>
      </div>
      {errorMsg ? (
        <p className="mt-1.5 text-[11.5px] text-warn-text">{errorMsg}</p>
      ) : null}
    </div>
  );
}

export function ListaEntregas({ asignacionId }: { asignacionId: string }) {
  const [entregas, setEntregas] = useState<Entrega[] | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await apiFetch(`/asignaciones/${asignacionId}/entregas`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message ?? "No se pudieron cargar las entregas.");
        return;
      }
      setEntregas(await res.json());
    })();
  }, [asignacionId]);

  const marcarCalificado = (entregaId: string, valor: number, retro: string) => {
    setEntregas((prev) =>
      (prev ?? []).map((e) =>
        e.entregaId === entregaId
          ? { ...e, estado: "calificada", valor, retroalimentacion: retro }
          : e,
      ),
    );
  };

  if (errorMsg) {
    return <p className="text-[13px] text-warn-text">{errorMsg}</p>;
  }
  if (!entregas) {
    return <p className="text-[13px] text-ink/65">Cargando entregas…</p>;
  }
  if (entregas.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-white/[.16] bg-panel/60 p-8 text-center text-[13px] text-ink/65">
        Nadie ha entregado esta actividad todavía.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entregas.map((e) => (
        <FilaEntrega key={e.entregaId} entrega={e} onCalificado={marcarCalificado} />
      ))}
    </div>
  );
}
