"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Archivo = {
  id: string;
  nombre: string;
  mime: string | null;
  bytes: number | null;
};

function formatoBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DescargarArchivoBoton({
  archivoId,
  nombre,
}: {
  archivoId: string;
  nombre: string;
}) {
  const [cargando, setCargando] = useState(false);

  const descargar = async () => {
    setCargando(true);
    const res = await apiFetch(`/entrega-archivos/${archivoId}/url`);
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
      {cargando ? "…" : `⬇ ${nombre}`}
    </button>
  );
}

export function ArchivosEntrega({ asignacionId }: { asignacionId: string }) {
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const cargar = async () => {
    const res = await apiFetch(`/asignaciones/${asignacionId}/mis-archivos`);
    if (res.ok) setArchivos(await res.json());
  };

  useEffect(() => {
    (async () => {
      await cargar();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asignacionId]);

  const subir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setSubiendo(true);
    setErrorMsg("");
    const formData = new FormData();
    formData.append("archivo", archivo);
    const res = await apiFetch(`/asignaciones/${asignacionId}/entregas/archivo`, {
      method: "POST",
      body: formData,
    });
    setSubiendo(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.message ?? "No se pudo subir el archivo.");
      return;
    }
    await cargar();
  };

  return (
    <div className="mt-3">
      {archivos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {archivos.map((a) => (
            <div key={a.id} className="flex items-center gap-1.5">
              <DescargarArchivoBoton archivoId={a.id} nombre={a.nombre} />
              <span className="font-mono text-[10px] text-ink/40">
                {formatoBytes(a.bytes)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <label className="mt-2 inline-block cursor-pointer rounded-[9px] border border-dashed border-white/[.2] px-3.5 py-2 text-[12px] font-semibold text-ink/65 hover:border-accent">
        {subiendo ? "Subiendo…" : "+ Adjuntar archivo (PDF, Word, Excel, imagen, ZIP — máx. 15 MB)"}
        <input type="file" className="hidden" onChange={subir} disabled={subiendo} />
      </label>
      {errorMsg ? (
        <p className="mt-1.5 text-[11.5px] text-warn-text">{errorMsg}</p>
      ) : null}
    </div>
  );
}
