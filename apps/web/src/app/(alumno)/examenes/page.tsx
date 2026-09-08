import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";

export default async function ExamenesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: matriculas } = await supabase
    .from("matriculas")
    .select("grupo_id")
    .eq("estudiante_id", user.id)
    .eq("estado", "activa");

  const grupoIds = (matriculas ?? []).map((m) => m.grupo_id);

  const { data: asignaciones } =
    grupoIds.length === 0
      ? { data: [] }
      : await supabase
          .from("examen_asignaciones")
          .select("abre, cierra, examenes(id, nombre, minutos, publicado)")
          .in("grupo_id", grupoIds);

  const ahora = new Date().getTime();
  const examenes = (asignaciones ?? [])
    .map((a) => ({
      ...a,
      examen: a.examenes as unknown as {
        id: string;
        nombre: string;
        minutos: number;
        publicado: boolean;
      } | null,
    }))
    .filter(
      (a) =>
        a.examen?.publicado &&
        new Date(a.abre).getTime() <= ahora &&
        ahora <= new Date(a.cierra).getTime(),
    );

  return (
    <div>
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
        Exámenes
      </span>
      <h1 className="mt-2 text-[29px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        Simulacros y exámenes
      </h1>

      {examenes.length === 0 ? (
        <div className="mt-5 rounded-[16px] border border-dashed border-white/[.16] bg-panel/60 p-8 text-center text-[13px] text-ink/65">
          No tienes exámenes disponibles en este momento.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {examenes.map((a) => (
            <Link
              key={a.examen!.id}
              href={`/examenes/${a.examen!.id}`}
              className="flex items-center justify-between rounded-[14px] border border-white/[.09] bg-panel px-5 py-4 transition-colors hover:border-accent"
            >
              <div>
                <div className="text-[14px] font-bold text-ink">
                  {a.examen!.nombre}
                </div>
                <div className="mt-1 font-mono text-[11px] text-ink/55">
                  {a.examen!.minutos} minutos · cierra{" "}
                  {new Date(a.cierra).toLocaleDateString("es-CO")}
                </div>
              </div>
              <span className="rounded-[9px] bg-lime px-3.5 py-2 text-[12px] font-bold text-ground">
                Comenzar
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
