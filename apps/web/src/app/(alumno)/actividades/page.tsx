import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";

const TIPO_LABEL: Record<string, string> = {
  taller: "Taller",
  actividad: "Actividad",
  laboratorio: "Laboratorio",
  video: "Video",
  lectura: "Lectura",
  examen: "Examen",
};

const ESTADO_LABEL: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-white/10 text-ink/60" },
  entregada: { label: "Entregada", className: "bg-accent/[.18] text-accent" },
  tarde: { label: "Tarde", className: "bg-warn/[.15] text-warn-text" },
  calificada: { label: "Calificada", className: "bg-lime/[.15] text-lime" },
  devuelta: { label: "Devuelta", className: "bg-white/10 text-ink/60" },
};

export default async function ActividadesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: matriculas } = await supabase
    .from("matriculas")
    .select("grupo_id")
    .eq("estudiante_id", user.id)
    .eq("estado", "activa");

  const grupoIds = (matriculas ?? []).map((m) => m.grupo_id);

  const { data: cursoGrupos } =
    grupoIds.length === 0
      ? { data: [] }
      : await supabase
          .from("curso_grupos")
          .select("curso_id")
          .in("grupo_id", grupoIds);

  const cursoIds = [...new Set((cursoGrupos ?? []).map((cg) => cg.curso_id))];

  const { data: asignaciones } =
    cursoIds.length === 0
      ? { data: [] }
      : await supabase
          .from("asignaciones")
          .select("id, titulo, tipo, cierra, cursos(nombre, codigo)")
          .in("curso_id", cursoIds)
          .eq("publicada", true)
          .order("cierra");

  const { data: entregas } = await supabase
    .from("entregas")
    .select("asignacion_id, estado")
    .eq("estudiante_id", user.id);

  const estadoPorAsignacion = new Map(
    (entregas ?? []).map((e) => [e.asignacion_id, e.estado]),
  );

  return (
    <div>
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
        Actividades
      </span>
      <h1 className="mt-2 text-[29px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        Talleres y actividades
      </h1>

      {(asignaciones ?? []).length === 0 ? (
        <div className="mt-5 rounded-[16px] border border-dashed border-white/[.16] bg-panel/60 p-8 text-center text-[13px] text-ink/65">
          No tienes actividades asignadas por ahora.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {(asignaciones ?? []).map((a) => {
            const curso = a.cursos as unknown as {
              nombre: string;
              codigo: string;
            } | null;
            const estado = estadoPorAsignacion.get(a.id) ?? "pendiente";
            const badge = ESTADO_LABEL[estado] ?? ESTADO_LABEL.pendiente;
            return (
              <Link
                key={a.id}
                href={`/actividades/${a.id}`}
                className="flex items-center justify-between rounded-[14px] border border-white/[.09] bg-panel px-5 py-4 transition-colors hover:border-accent"
              >
                <div>
                  <div className="text-[14px] font-bold text-ink">
                    {a.titulo}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-ink/55">
                    {curso?.codigo} · {TIPO_LABEL[a.tipo] ?? a.tipo} · cierra{" "}
                    {new Date(a.cierra).toLocaleDateString("es-CO")}
                  </div>
                </div>
                <span
                  className={`rounded-[6px] px-2 py-1 font-mono text-[9px] font-bold uppercase ${badge.className}`}
                >
                  {badge.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
