"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const TIPOS = [
  { value: "taller", label: "Taller" },
  { value: "actividad", label: "Actividad" },
  { value: "laboratorio", label: "Laboratorio" },
  { value: "video", label: "Video" },
  { value: "lectura", label: "Lectura" },
  { value: "examen", label: "Examen" },
];

const CATEGORIAS = [
  { value: "talleres", label: "Talleres" },
  { value: "labs", label: "Labs" },
  { value: "simulacros", label: "Simulacros" },
  { value: "actitudinal", label: "Actitudinal" },
];

function aFechaLocal(offsetDias: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 16);
}

export function CrearAsignacionForm({
  cursos,
}: {
  cursos: { id: string; nombre: string; codigo: string }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const enviar = async (formData: FormData) => {
    setEnviando(true);
    setErrorMsg("");

    const cursoId = formData.get("cursoId") as string;
    const res = await apiFetch(`/cursos/${cursoId}/asignaciones`, {
      method: "POST",
      body: JSON.stringify({
        tipo: formData.get("tipo"),
        categoria: formData.get("categoria"),
        titulo: formData.get("titulo"),
        instrucciones: formData.get("instrucciones") || undefined,
        puntos: Number(formData.get("puntos")) || 100,
        abre: new Date(formData.get("abre") as string).toISOString(),
        cierra: new Date(formData.get("cierra") as string).toISOString(),
        publicada: formData.get("publicada") === "on",
      }),
    });

    setEnviando(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.message ?? "No se pudo crear la actividad.");
      return;
    }
    setAbierto(false);
    router.refresh();
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-[10px] bg-lime px-4 py-2.5 text-[12.5px] font-bold text-ground hover:bg-lime-hover"
      >
        + Nueva actividad
      </button>
    );
  }

  return (
    <form
      action={enviar}
      className="flex flex-col gap-3 rounded-[16px] border border-white/[.09] bg-panel p-5"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select
          name="cursoId"
          required
          className="rounded-[9px] border border-white/[.14] bg-ground px-3 py-2 text-[13px] text-ink"
        >
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nombre}
            </option>
          ))}
        </select>

        <select
          name="tipo"
          required
          className="rounded-[9px] border border-white/[.14] bg-ground px-3 py-2 text-[13px] text-ink"
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          name="categoria"
          required
          className="rounded-[9px] border border-white/[.14] bg-ground px-3 py-2 text-[13px] text-ink"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          name="puntos"
          type="number"
          min={1}
          defaultValue={100}
          placeholder="Puntos"
          className="rounded-[9px] border border-white/[.14] bg-ground px-3 py-2 text-[13px] text-ink"
        />
      </div>

      <input
        name="titulo"
        required
        placeholder="Título de la actividad"
        className="rounded-[9px] border border-white/[.14] bg-ground px-3 py-2 text-[13px] text-ink"
      />

      <textarea
        name="instrucciones"
        rows={3}
        placeholder="Instrucciones para el estudiante"
        className="rounded-[9px] border border-white/[.14] bg-ground px-3 py-2 text-[13px] text-ink"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] text-ink/60">
          Abre
          <input
            name="abre"
            type="datetime-local"
            defaultValue={aFechaLocal(0)}
            required
            className="rounded-[9px] border border-white/[.14] bg-ground px-3 py-2 text-[13px] text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-ink/60">
          Cierra
          <input
            name="cierra"
            type="datetime-local"
            defaultValue={aFechaLocal(14)}
            required
            className="rounded-[9px] border border-white/[.14] bg-ground px-3 py-2 text-[13px] text-ink"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-[12.5px] text-ink/75">
        <input name="publicada" type="checkbox" defaultChecked />
        Publicar de inmediato (visible para los estudiantes)
      </label>

      {errorMsg ? (
        <p className="text-[12px] text-warn-text">{errorMsg}</p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-[10px] bg-lime px-4 py-2.5 text-[12.5px] font-bold text-ground hover:bg-lime-hover disabled:opacity-60"
        >
          {enviando ? "Creando…" : "Crear actividad"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-[10px] border border-white/[.16] px-4 py-2.5 text-[12.5px] font-semibold text-ink/75"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
