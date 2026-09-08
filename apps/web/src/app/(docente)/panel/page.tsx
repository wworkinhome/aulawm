import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";

export default async function PanelPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { count: totalCursos } = await supabase
    .from("cursos")
    .select("id", { count: "exact", head: true })
    .eq("docente_id", user.id);

  return (
    <div>
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
        Panel docente
      </span>
      <h1 className="mt-2 text-[34px] font-extrabold leading-none tracking-[-0.03em] text-ink">
        Hola, {user.nombre}
      </h1>
      <p className="mt-2 text-[13px] text-ink/70">
        Cursos a tu cargo: {totalCursos ?? 0}
      </p>

      <div className="mt-8 rounded-[16px] border border-white/[.09] bg-panel p-6 text-[13px] text-ink/70">
        Fase 1 en construcción: el shell docente ya funciona con su propia
        navegación. Estudiantes, calificaciones y analítica todavía son
        pantallas &quot;Próximamente&quot;.
      </div>
    </div>
  );
}
