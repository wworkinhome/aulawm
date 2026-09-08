"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export function EntregarForm({
  asignacionId,
  comentarioInicial,
}: {
  asignacionId: string;
  comentarioInicial: string;
}) {
  const router = useRouter();
  const [comentario, setComentario] = useState(comentarioInicial);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const enviar = async () => {
    setEnviando(true);
    setErrorMsg("");
    const res = await apiFetch(`/asignaciones/${asignacionId}/entregas`, {
      method: "POST",
      body: JSON.stringify({ comentario: comentario || undefined }),
    });
    setEnviando(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.message ?? "No se pudo enviar la entrega.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-4">
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={4}
        placeholder="Escribe tu respuesta o pega el enlace de tu trabajo…"
        className="w-full rounded-[10px] border border-white/[.14] bg-ground px-3.5 py-2.5 text-[13px] text-ink"
      />
      {errorMsg ? (
        <p className="mt-1.5 text-[12px] text-warn-text">{errorMsg}</p>
      ) : null}
      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-3 rounded-[10px] bg-lime px-4 py-2.5 text-[12.5px] font-bold text-ground hover:bg-lime-hover disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Entregar"}
      </button>
    </div>
  );
}
