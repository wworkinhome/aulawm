import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";
import { getCursoProgreso } from "@/lib/cursos/progreso";

export default async function CursosPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: cursos } = await supabase
    .from("cursos")
    .select("id, nombre, codigo, color, perfiles!docente_id(nombres, apellidos)")
    .order("nombre");

  const cursosConProgreso = await Promise.all(
    (cursos ?? []).map(async (curso) => ({
      ...curso,
      progreso: await getCursoProgreso(supabase, curso.id, user.id),
    })),
  );

  return (
    <div>
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
        Cursos
      </span>
      <h1 className="mt-2 text-[29px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
        Mis cursos
      </h1>

      {cursosConProgreso.length === 0 ? (
        <div className="mt-5 rounded-[16px] border border-dashed border-white/[.16] bg-panel/60 p-8 text-center text-[13px] text-ink/65">
          Todavía no tienes cursos asignados.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursosConProgreso.map((curso) => {
            const docente = curso.perfiles as unknown as {
              nombres: string;
              apellidos: string;
            } | null;
            return (
              <Link
                key={curso.id}
                href={`/cursos/${curso.id}`}
                className="rounded-[14px] border border-white/[.09] bg-panel p-5 transition-colors hover:border-accent"
              >
                <span
                  className="inline-block rounded-[6px] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    background: `${curso.color ?? "#7C5CFF"}26`,
                    color: curso.color ?? "#7C5CFF",
                  }}
                >
                  {curso.codigo}
                </span>
                <h2 className="mt-3 text-[16px] font-bold text-ink">
                  {curso.nombre}
                </h2>
                {docente ? (
                  <p className="mt-1 text-[12px] text-ink/60">
                    {docente.nombres} {docente.apellidos}
                  </p>
                ) : null}

                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-lime"
                      style={{ width: `${curso.progreso.porcentaje}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-ink/55">
                    {curso.progreso.porcentaje}% completado ·{" "}
                    {curso.progreso.completadas}/{curso.progreso.total} clases
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
