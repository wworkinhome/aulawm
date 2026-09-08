import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";
import { MarcarCompletadaButton } from "@/components/cursos/marcar-completada-button";

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  video: { label: "VIDEO", className: "bg-accent/[.18] text-accent" },
  lab: { label: "LAB", className: "bg-lime/[.15] text-lime" },
  quiz: { label: "QUIZ", className: "bg-white/10 text-ink/70" },
  lectura: { label: "LECTURA", className: "bg-warn/[.15] text-warn-text" },
};

export default async function ClaseDetallePage({
  params,
}: {
  params: Promise<{ id: string; claseId: string }>;
}) {
  const { id: cursoId, claseId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: curso } = await supabase
    .from("cursos")
    .select("id, nombre, color")
    .eq("id", cursoId)
    .single();

  if (!curso) {
    notFound();
  }

  const { data: modulos } = await supabase
    .from("modulos")
    .select(
      "id, orden, titulo, clases(id, orden, tipo, titulo, descripcion, duracion_seg, video_asset_id, publicada)",
    )
    .eq("curso_id", cursoId)
    .order("orden")
    .order("orden", { referencedTable: "clases" });

  const clasesOrdenadas = (modulos ?? []).flatMap((m) =>
    (m.clases ?? [])
      .filter((c) => c.publicada)
      .map((c) => ({ ...c, moduloTitulo: m.titulo })),
  );

  const indiceActual = clasesOrdenadas.findIndex((c) => c.id === claseId);
  const clase = clasesOrdenadas[indiceActual];

  if (!clase) {
    notFound();
  }

  const anterior = indiceActual > 0 ? clasesOrdenadas[indiceActual - 1] : null;
  const siguiente =
    indiceActual < clasesOrdenadas.length - 1
      ? clasesOrdenadas[indiceActual + 1]
      : null;

  const { data: progreso } = await supabase
    .from("progreso_clase")
    .select("completada, segundo_alcanzado")
    .eq("clase_id", claseId)
    .eq("estudiante_id", user.id)
    .maybeSingle();

  const badge = TIPO_BADGE[clase.tipo] ?? TIPO_BADGE.quiz;

  return (
    <div>
      <Link
        href={`/cursos/${cursoId}`}
        className="text-[12px] font-semibold text-ink/55 hover:text-ink/80"
      >
        ← {curso.nombre}
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`rounded-[6px] px-1.5 py-0.5 font-mono text-[9px] font-bold ${badge.className}`}
        >
          {badge.label}
        </span>
        <span className="font-mono text-[11px] text-ink/50">
          {clase.moduloTitulo}
        </span>
      </div>
      <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        {clase.titulo}
      </h1>

      <div className="mt-5 rounded-[16px] border border-white/[.09] bg-panel p-6">
        {clase.tipo === "video" ? (
          clase.video_asset_id ? (
            <div className="aspect-video overflow-hidden rounded-[10px] bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${clase.video_asset_id}`}
                title={clase.titulo}
                allowFullScreen
              />
            </div>
          ) : (
            <div className="grid aspect-video place-items-center rounded-[10px] border border-dashed border-white/[.16] text-[13px] text-ink/50">
              Video pendiente de publicar
            </div>
          )
        ) : null}

        {clase.descripcion ? (
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink/80">
            {clase.descripcion}
          </p>
        ) : null}

        <div className="mt-5">
          <MarcarCompletadaButton
            claseId={clase.id}
            completadaInicial={progreso?.completada ?? false}
            segundoAlcanzado={clase.duracion_seg ?? 0}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        {anterior ? (
          <Link
            href={`/cursos/${cursoId}/clases/${anterior.id}`}
            className="rounded-[9px] border border-white/[.16] px-3.5 py-2 text-[12px] font-semibold text-ink/75 hover:border-white/30"
          >
            ← {anterior.titulo}
          </Link>
        ) : (
          <span />
        )}
        {siguiente ? (
          <Link
            href={`/cursos/${cursoId}/clases/${siguiente.id}`}
            className="rounded-[9px] border border-white/[.16] px-3.5 py-2 text-[12px] font-semibold text-ink/75 hover:border-white/30"
          >
            {siguiente.titulo} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
