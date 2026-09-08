import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";
import { EntregarForm } from "@/components/actividades/entregar-form";

const ESTADO_LABEL: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-white/10 text-ink/60" },
  entregada: { label: "Entregada", className: "bg-accent/[.18] text-accent" },
  tarde: { label: "Tarde", className: "bg-warn/[.15] text-warn-text" },
  calificada: { label: "Calificada", className: "bg-lime/[.15] text-lime" },
  devuelta: { label: "Devuelta", className: "bg-white/10 text-ink/60" },
};

export default async function ActividadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: asignacion } = await supabase
    .from("asignaciones")
    .select("id, titulo, instrucciones, tipo, puntos, abre, cierra, cursos(nombre, codigo)")
    .eq("id", id)
    .eq("publicada", true)
    .single();

  if (!asignacion) {
    notFound();
  }

  const curso = asignacion.cursos as unknown as {
    nombre: string;
    codigo: string;
  } | null;

  const { data: entrega } = await supabase
    .from("entregas")
    .select("estado, comentario, entregada_en")
    .eq("asignacion_id", id)
    .eq("estudiante_id", user.id)
    .maybeSingle();

  const { data: calificacion } = await supabase
    .from("calificaciones")
    .select("valor, retroalimentacion")
    .eq("asignacion_id", id)
    .eq("estudiante_id", user.id)
    .eq("publicada", true)
    .maybeSingle();

  const badge = ESTADO_LABEL[entrega?.estado ?? "pendiente"];

  return (
    <div>
      <Link
        href="/actividades"
        className="text-[12px] font-semibold text-ink/55 hover:text-ink/80"
      >
        ← Actividades
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <span className="font-mono text-[11px] text-ink/50">
          {curso?.codigo} — {curso?.nombre}
        </span>
        <span
          className={`rounded-[6px] px-2 py-1 font-mono text-[9px] font-bold uppercase ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        {asignacion.titulo}
      </h1>
      {asignacion.instrucciones ? (
        <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-ink/75">
          {asignacion.instrucciones}
        </p>
      ) : null}
      <p className="mt-2 font-mono text-[11px] text-ink/50">
        {asignacion.puntos} pts · cierra{" "}
        {new Date(asignacion.cierra).toLocaleString("es-CO")}
      </p>

      <div className="mt-5 rounded-[16px] border border-white/[.09] bg-panel p-6">
        {calificacion ? (
          <div>
            <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
              Calificación
            </div>
            <div className="mt-1 text-[32px] font-black text-ink">
              {calificacion.valor.toFixed(1)}
              <span className="text-[15px] font-semibold text-ink/50"> / 5.0</span>
            </div>
            {calificacion.retroalimentacion ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink/75">
                {calificacion.retroalimentacion}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink/55">
              {entrega ? "Tu entrega" : "Aún no has entregado"}
            </div>
            {entrega?.comentario ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink/75">
                {entrega.comentario}
              </p>
            ) : null}
            <EntregarForm
              asignacionId={asignacion.id}
              comentarioInicial={entrega?.comentario ?? ""}
            />
          </>
        )}
      </div>
    </div>
  );
}
