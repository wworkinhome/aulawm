"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export function MarcarCompletadaButton({
  claseId,
  completadaInicial,
  segundoAlcanzado,
}: {
  claseId: string;
  completadaInicial: boolean;
  segundoAlcanzado?: number;
}) {
  const router = useRouter();
  const [completada, setCompletada] = useState(completadaInicial);
  const [guardando, setGuardando] = useState(false);

  const alternar = async () => {
    setGuardando(true);
    const nuevoValor = !completada;
    const res = await apiFetch(`/clases/${claseId}/progreso`, {
      method: "PUT",
      body: JSON.stringify({
        completada: nuevoValor,
        segundoAlcanzado: segundoAlcanzado ?? 0,
      }),
    });
    if (res.ok) {
      setCompletada(nuevoValor);
      router.refresh();
    }
    setGuardando(false);
  };

  return (
    <button
      onClick={alternar}
      disabled={guardando}
      className={`flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[12.5px] font-bold transition-colors disabled:opacity-60 ${
        completada
          ? "border border-lime/40 bg-lime/[.15] text-lime"
          : "bg-lime text-ground hover:bg-lime-hover"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${completada ? "bg-lime" : "bg-ground"}`}
      />
      {completada ? "Completada" : "Marcar como completada"}
    </button>
  );
}
