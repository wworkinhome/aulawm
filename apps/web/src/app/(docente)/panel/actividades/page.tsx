import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";
import { CrearAsignacionForm } from "@/components/actividades/crear-asignacion-form";

const TIPO_LABEL: Record<string, string> = {
  taller: "Taller",
  actividad: "Actividad",
  laboratorio: "Laboratorio",
  video: "Video",
  lectura: "Lectura",
  examen: "Examen",
};

export default async function PanelActividadesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: cursos } = await supabase
    .from("cursos")
    .select("id, nombre, codigo")
    .eq("docente_id", user.id);

  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, titulo, tipo, categoria, publicada, cierra, cursos(nombre, codigo)")
    .eq("autor_id", user.id)
    .order("creada_en", { ascending: false });

  return (
    <div>
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
        Panel docente
      </span>
      <h1 className="mt-2 text-[29px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        Actividades
      </h1>

      <div className="mt-5">
        <CrearAsignacionForm cursos={cursos ?? []} />
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        {(asignaciones ?? []).length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-white/[.16] bg-panel/60 p-8 text-center text-[13px] text-ink/65">
            Todavía no has creado ninguna actividad.
          </div>
        ) : (
          (asignaciones ?? []).map((a) => {
            const curso = a.cursos as unknown as {
              nombre: string;
              codigo: string;
            } | null;
            return (
              <Link
                key={a.id}
                href={`/panel/actividades/${a.id}`}
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
                  className={`rounded-[6px] px-2 py-1 font-mono text-[9px] font-bold uppercase ${
                    a.publicada
                      ? "bg-lime/[.15] text-lime"
                      : "bg-white/10 text-ink/60"
                  }`}
                >
                  {a.publicada ? "Publicada" : "Borrador"}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
