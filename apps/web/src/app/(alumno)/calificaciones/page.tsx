import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";

export default async function CalificacionesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: calificaciones } = await supabase
    .from("calificaciones")
    .select("valor, retroalimentacion, creada_en, asignaciones(titulo, categoria, cursos(nombre, codigo))")
    .eq("estudiante_id", user.id)
    .eq("publicada", true)
    .order("creada_en", { ascending: false });

  const { data: definitivas } = await supabase
    .from("notas_definitivas")
    .select("valor, desglose, curso_id, periodo_id, cursos(nombre, codigo), periodos(nombre)")
    .eq("estudiante_id", user.id);

  return (
    <div>
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
        Calificaciones
      </span>
      <h1 className="mt-2 text-[29px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        Mis notas
      </h1>

      {(definitivas ?? []).length > 0 ? (
        <div className="mt-5 flex flex-col gap-3">
          {(definitivas ?? []).map((d) => {
            const curso = d.cursos as unknown as {
              nombre: string;
              codigo: string;
            } | null;
            const periodo = d.periodos as unknown as { nombre: string } | null;
            const desglose = d.desglose as Record<string, number>;
            return (
              <div
                key={`${d.curso_id}-${d.periodo_id}`}
                className="rounded-[14px] border border-white/[.09] bg-panel p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-bold text-ink">
                      {curso?.codigo} — {curso?.nombre}
                    </div>
                    <div className="font-mono text-[10.5px] text-ink/50">
                      {periodo?.nombre}
                    </div>
                  </div>
                  <div className="text-[26px] font-black text-lime">
                    {d.valor.toFixed(1)}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(desglose).map(([categoria, promedio]) => (
                    <span
                      key={categoria}
                      className="rounded-[6px] bg-white/[.06] px-2 py-1 font-mono text-[10px] text-ink/65"
                    >
                      {categoria}: {promedio.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <h2 className="mt-6 mb-3 text-[15px] font-bold text-ink">
        Notas por actividad
      </h2>
      {(calificaciones ?? []).length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-white/[.16] bg-panel/60 p-8 text-center text-[13px] text-ink/65">
          Todavía no tienes calificaciones publicadas.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {(calificaciones ?? []).map((c, i) => {
            const asignacion = c.asignaciones as unknown as {
              titulo: string;
              categoria: string;
              cursos: { nombre: string; codigo: string } | null;
            } | null;
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-[12px] border border-white/[.09] bg-panel px-4 py-3"
              >
                <div>
                  <div className="text-[13px] font-semibold text-ink">
                    {asignacion?.titulo}
                  </div>
                  <div className="font-mono text-[10.5px] text-ink/50">
                    {asignacion?.cursos?.codigo} · {asignacion?.categoria}
                  </div>
                </div>
                <div className="font-mono text-[16px] font-bold text-ink">
                  {c.valor.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
