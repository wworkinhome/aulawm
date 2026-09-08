import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  video: { label: "VIDEO", className: "bg-accent/[.18] text-accent" },
  lab: { label: "LAB", className: "bg-lime/[.15] text-lime" },
  quiz: { label: "QUIZ", className: "bg-white/10 text-ink/70" },
  lectura: { label: "LECTURA", className: "bg-warn/[.15] text-warn-text" },
};

export default async function CursoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: curso } = await supabase
    .from("cursos")
    .select(
      "id, nombre, codigo, descripcion, color, perfiles!docente_id(nombres, apellidos)",
    )
    .eq("id", id)
    .single();

  if (!curso) {
    notFound();
  }

  const docente = curso.perfiles as unknown as {
    nombres: string;
    apellidos: string;
  } | null;

  const { data: modulos } = await supabase
    .from("modulos")
    .select(
      "id, orden, titulo, clases(id, orden, tipo, titulo, descripcion, duracion_seg, publicada)",
    )
    .eq("curso_id", id)
    .order("orden")
    .order("orden", { referencedTable: "clases" });

  const { data: progresoRows } = await supabase
    .from("progreso_clase")
    .select("clase_id, completada")
    .eq("estudiante_id", user.id);

  const completadas = new Set(
    (progresoRows ?? []).filter((p) => p.completada).map((p) => p.clase_id),
  );

  return (
    <div>
      <div
        className="rounded-[18px] p-6"
        style={{
          background: `linear-gradient(135deg, ${curso.color ?? "#7C5CFF"}4D, rgba(20,18,16,0) 70%)`,
        }}
      >
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
          {curso.codigo}
        </span>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
          {curso.nombre}
        </h1>
        {curso.descripcion ? (
          <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-ink/70">
            {curso.descripcion}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-3">
          {(modulos ?? []).map((modulo) => (
            <div
              key={modulo.id}
              className="rounded-[14px] border border-white/[.09] bg-panel"
            >
              <div className="border-b border-white/[.09] px-4 py-3 text-[13px] font-bold text-ink">
                {modulo.titulo}
              </div>
              <div className="flex flex-col divide-y divide-white/[.06]">
                {(modulo.clases ?? [])
                  .filter((c) => c.publicada)
                  .map((clase) => {
                    const badge = TIPO_BADGE[clase.tipo] ?? TIPO_BADGE.quiz;
                    const hecha = completadas.has(clase.id);
                    return (
                      <div
                        key={clase.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span
                          className={`rounded-[6px] px-1.5 py-0.5 font-mono text-[9px] font-bold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink/85">
                          {clase.titulo}
                        </span>
                        {clase.duracion_seg ? (
                          <span className="font-mono text-[11px] text-ink/50">
                            {Math.round(clase.duracion_seg / 60)} min
                          </span>
                        ) : null}
                        <span
                          className={`h-1.5 w-1.5 flex-none rounded-full ${
                            hecha ? "bg-lime" : "bg-white/20"
                          }`}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {docente ? (
          <div className="h-fit rounded-[14px] border border-white/[.09] bg-panel p-4">
            <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/55">
              Docente
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(140deg,#C6FF3D,#7C5CFF)] font-mono text-[11px] font-bold text-ground">
                {docente.nombres[0]}
                {docente.apellidos[0]}
              </div>
              <div className="text-[13px] font-semibold text-ink">
                {docente.nombres} {docente.apellidos}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
