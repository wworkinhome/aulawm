"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Pregunta = {
  id: string;
  orden: number;
  competencia: string | null;
  enunciado: string;
  opciones: string[];
};

type IntentoData = {
  intentoId: string;
  examen: { nombre: string; minutos: number; cronometroVisible: boolean };
  restanteSeg: number;
  preguntas: Pregunta[];
  respuestas: Array<{ preguntaId: string; opcion: number | null }>;
};

type Reporte = {
  estado: string;
  puntajeGlobal: number | null;
  respondidas: number;
  total: number;
  competencias: Array<{
    nombre: string;
    sigla: string;
    puntaje: number;
    nivel: number;
  }>;
};

function formatoTiempo(totalSeg: number) {
  const m = Math.floor(totalSeg / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ExamenTomarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [fase, setFase] = useState<"cargando" | "error" | "presentando" | "resultado">(
    "cargando",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [intento, setIntento] = useState<IntentoData | null>(null);
  const [respuestas, setRespuestas] = useState<Map<string, number | null>>(
    new Map(),
  );
  const [indice, setIndice] = useState(0);
  const [restante, setRestante] = useState(0);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const finalizando = useRef(false);

  useEffect(() => {
    (async () => {
      const res = await apiFetch(`/examenes/${id}/intento`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message ?? "No se pudo cargar el examen.");
        setFase("error");
        return;
      }
      const data: IntentoData = await res.json();
      setIntento(data);
      setRespuestas(
        new Map(data.respuestas.map((r) => [r.preguntaId, r.opcion])),
      );
      setRestante(data.restanteSeg);
      setFase("presentando");
    })();
  }, [id]);

  const finalizar = async () => {
    if (finalizando.current || !intento) return;
    finalizando.current = true;
    const res = await apiFetch(`/intentos/${intento.intentoId}/finalizar`, {
      method: "POST",
    });
    if (res.ok) {
      const data: Reporte = await res.json();
      setReporte(data);
      setFase("resultado");
    }
    finalizando.current = false;
  };

  useEffect(() => {
    if (fase !== "presentando") return;
    if (restante <= 0) {
      const t = setTimeout(() => {
        finalizar();
      }, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, restante]);

  const seleccionar = async (preguntaId: string, opcion: number) => {
    if (!intento) return;
    setRespuestas((prev) => new Map(prev).set(preguntaId, opcion));
    const res = await apiFetch(`/intentos/${intento.intentoId}/respuestas`, {
      method: "PATCH",
      body: JSON.stringify({
        respuestas: [{ preguntaId, opcion, segundosEmpleados: 0 }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.restanteSeg === "number") setRestante(data.restanteSeg);
    }
  };

  if (fase === "cargando") {
    return <p className="text-[13px] text-ink/65">Cargando examen…</p>;
  }

  if (fase === "error") {
    return (
      <div className="rounded-[14px] border border-warn/40 bg-warn/10 p-6 text-[13px] text-warn-text">
        {errorMsg}
      </div>
    );
  }

  if (fase === "resultado" && reporte) {
    return (
      <div>
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
          Resultado
        </span>
        <div
          className="mt-2 text-[76px] font-black leading-[0.85] tracking-[-0.05em]"
          style={{
            backgroundImage:
              "linear-gradient(150deg, var(--lime), var(--ink))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {reporte.puntajeGlobal ?? 0}
        </div>
        <p className="mt-1 text-[13px] text-ink/65">
          {reporte.respondidas}/{reporte.total} preguntas respondidas
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {reporte.competencias.map((c) => (
            <div key={c.sigla}>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-ink/85">{c.nombre}</span>
                <span className="font-mono text-ink/55">
                  {c.puntaje} / 100 · nivel {c.nivel}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-lime"
                  style={{ width: `${c.puntaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push("/examenes")}
          className="mt-8 rounded-[11px] border border-white/[.16] px-4 py-2.5 text-[12.5px] font-semibold text-ink/80 hover:border-accent"
        >
          Volver a exámenes
        </button>
      </div>
    );
  }

  if (!intento) return null;
  const pregunta = intento.preguntas[indice];
  const respondidasCount = Array.from(respuestas.values()).filter(
    (v) => v !== null && v !== undefined,
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <span className="rounded-[6px] bg-warn/[.15] px-2 py-1 font-mono text-[10px] font-bold uppercase text-warn-text">
            En curso
          </span>
          <h1 className="mt-2 text-[20px] font-bold text-ink">
            {intento.examen.nombre}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {intento.examen.cronometroVisible ? (
            <span
              className={`font-mono text-[24px] font-bold ${
                restante < 300 ? "text-warn-text" : "text-ink"
              }`}
            >
              {formatoTiempo(restante)}
            </span>
          ) : null}
          <button
            onClick={finalizar}
            className="rounded-[10px] bg-lime px-4 py-2.5 text-[12.5px] font-bold text-ground hover:bg-lime-hover"
          >
            Finalizar examen
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
        <div className="rounded-[16px] border border-white/[.09] bg-panel p-6">
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
            Pregunta {indice + 1} de {intento.preguntas.length}
            {pregunta.competencia ? ` · ${pregunta.competencia}` : ""}
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink">
            {pregunta.enunciado}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {pregunta.opciones.map((opcion, i) => {
              const marcada = respuestas.get(pregunta.id) === i;
              return (
                <button
                  key={i}
                  onClick={() => seleccionar(pregunta.id, i)}
                  className={`rounded-[11px] border px-4 py-3 text-left text-[13.5px] transition-colors ${
                    marcada
                      ? "border-accent bg-accent/[.15] text-ink"
                      : "border-white/[.11] text-ink/80 hover:border-white/25"
                  }`}
                >
                  {opcion}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setIndice((i) => Math.max(0, i - 1))}
              disabled={indice === 0}
              className="rounded-[9px] border border-white/[.16] px-3.5 py-2 text-[12px] font-semibold text-ink/75 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() =>
                setIndice((i) => Math.min(intento.preguntas.length - 1, i + 1))
              }
              disabled={indice === intento.preguntas.length - 1}
              className="rounded-[9px] border border-white/[.16] px-3.5 py-2 text-[12px] font-semibold text-ink/75 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="h-fit rounded-[16px] border border-white/[.09] bg-panel p-4">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/55">
            Navegador · {respondidasCount}/{intento.preguntas.length}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {intento.preguntas.map((p, i) => {
              const respondida = respuestas.get(p.id) != null;
              const actual = i === indice;
              return (
                <button
                  key={p.id}
                  onClick={() => setIndice(i)}
                  className={`aspect-square rounded-[7px] text-[11px] font-bold ${
                    actual
                      ? "bg-accent text-white"
                      : respondida
                        ? "bg-lime/[.65] text-ground"
                        : "bg-white/10 text-ink/60"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
