import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";
import { AdjuntarRecursoForm } from "@/components/recursos/adjuntar-recurso-form";
import { DescargarRecursoBoton } from "@/components/recursos/descargar-recurso-boton";

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  video: { label: "VIDEO", className: "bg-accent/[.18] text-accent" },
  lab: { label: "LAB", className: "bg-lime/[.15] text-lime" },
  quiz: { label: "QUIZ", className: "bg-white/10 text-ink/70" },
  lectura: { label: "LECTURA", className: "bg-warn/[.15] text-warn-text" },
};

export default async function PanelContenidoPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: cursos } = await supabase
    .from("cursos")
    .select(
      "id, nombre, codigo, modulos(id, orden, titulo, clases(id, orden, titulo, tipo, publicada, recursos(id, titulo, tipo)))",
    )
    .eq("docente_id", user.id)
    .order("orden", { referencedTable: "modulos" });

  return (
    <div>
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
        Panel docente
      </span>
      <h1 className="mt-2 text-[29px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        Contenido
      </h1>

      {(cursos ?? []).length === 0 ? (
        <div className="mt-5 rounded-[16px] border border-dashed border-white/[.16] bg-panel/60 p-8 text-center text-[13px] text-ink/65">
          No tienes cursos a tu cargo todavía.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {(cursos ?? []).map((curso) => (
            <div
              key={curso.id}
              className="rounded-[16px] border border-white/[.09] bg-panel p-5"
            >
              <div className="text-[14px] font-bold text-ink">
                {curso.codigo} — {curso.nombre}
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {(curso.modulos ?? []).map((modulo) => (
                  <div key={modulo.id}>
                    <div className="text-[12px] font-semibold text-ink/70">
                      {modulo.titulo}
                    </div>
                    <div className="mt-1.5 flex flex-col gap-2">
                      {(modulo.clases ?? []).map((clase) => {
                        const badge = TIPO_BADGE[clase.tipo] ?? TIPO_BADGE.quiz;
                        return (
                          <div
                            key={clase.id}
                            className="rounded-[10px] border border-white/[.07] bg-ground/40 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-[6px] px-1.5 py-0.5 font-mono text-[9px] font-bold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                              <span className="text-[12.5px] text-ink/85">
                                {clase.titulo}
                              </span>
                              {!clase.publicada ? (
                                <span className="font-mono text-[9px] uppercase text-ink/40">
                                  borrador
                                </span>
                              ) : null}
                            </div>

                            {(clase.recursos ?? []).length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(clase.recursos ?? []).map((r: { id: string; titulo: string }) => (
                                  <DescargarRecursoBoton
                                    key={r.id}
                                    recursoId={r.id}
                                    titulo={r.titulo}
                                  />
                                ))}
                              </div>
                            ) : null}

                            <AdjuntarRecursoForm claseId={clase.id} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
