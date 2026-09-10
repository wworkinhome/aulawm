"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const TIPOS_ARCHIVO = ["pdf", "xlsx", "docx", "pptx", "sql", "repo", "slides"];

export function AdjuntarRecursoForm({ claseId }: { claseId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<"archivo" | "enlace">("archivo");
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const enviar = async (formData: FormData) => {
    setEnviando(true);
    setErrorMsg("");

    let res: Response;
    if (modo === "archivo") {
      const archivo = formData.get("archivo") as File;
      if (!archivo || archivo.size === 0) {
        setErrorMsg("Selecciona un archivo.");
        setEnviando(false);
        return;
      }
      const body = new FormData();
      body.append("archivo", archivo);
      body.append("titulo", formData.get("titulo") as string);
      body.append("tipo", formData.get("tipo") as string);
      res = await apiFetch(`/clases/${claseId}/recursos/archivo`, {
        method: "POST",
        body,
      });
    } else {
      res = await apiFetch(`/clases/${claseId}/recursos/enlace`, {
        method: "POST",
        body: JSON.stringify({
          titulo: formData.get("titulo"),
          tipo: formData.get("tipoEnlace"),
          urlExterna: formData.get("urlExterna"),
        }),
      });
    }

    setEnviando(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.message ?? "No se pudo adjuntar el material.");
      return;
    }
    setAbierto(false);
    router.refresh();
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-[7px] border border-dashed border-white/[.2] px-2.5 py-1 text-[11px] font-semibold text-ink/65 hover:border-accent"
      >
        + Adjuntar material
      </button>
    );
  }

  return (
    <form
      action={enviar}
      className="mt-2 flex flex-col gap-2 rounded-[10px] border border-white/[.09] bg-ground/60 p-3"
    >
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setModo("archivo")}
          className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold ${modo === "archivo" ? "bg-accent text-white" : "text-ink/60"}`}
        >
          Archivo
        </button>
        <button
          type="button"
          onClick={() => setModo("enlace")}
          className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold ${modo === "enlace" ? "bg-accent text-white" : "text-ink/60"}`}
        >
          Enlace
        </button>
      </div>

      <input
        name="titulo"
        required
        placeholder="Título del material"
        className="rounded-[7px] border border-white/[.14] bg-ground px-2.5 py-1.5 text-[12px] text-ink"
      />

      {modo === "archivo" ? (
        <>
          <select
            name="tipo"
            className="rounded-[7px] border border-white/[.14] bg-ground px-2.5 py-1.5 text-[12px] text-ink"
          >
            {TIPOS_ARCHIVO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="archivo"
            type="file"
            className="text-[11px] text-ink/70"
          />
        </>
      ) : (
        <>
          <select
            name="tipoEnlace"
            className="rounded-[7px] border border-white/[.14] bg-ground px-2.5 py-1.5 text-[12px] text-ink"
          >
            <option value="enlace">Enlace</option>
            <option value="video">Video</option>
          </select>
          <input
            name="urlExterna"
            type="url"
            required
            placeholder="https://…"
            className="rounded-[7px] border border-white/[.14] bg-ground px-2.5 py-1.5 text-[12px] text-ink"
          />
        </>
      )}

      {errorMsg ? <p className="text-[11px] text-warn-text">{errorMsg}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-[7px] bg-lime px-3 py-1.5 text-[11.5px] font-bold text-ground hover:bg-lime-hover disabled:opacity-60"
        >
          {enviando ? "Subiendo…" : "Adjuntar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-[7px] border border-white/[.16] px-3 py-1.5 text-[11.5px] font-semibold text-ink/70"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
