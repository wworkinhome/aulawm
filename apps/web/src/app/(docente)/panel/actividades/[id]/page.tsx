import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/current-user";
import { ListaEntregas } from "@/components/actividades/lista-entregas";

export default async function PanelActividadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: asignacion } = await supabase
    .from("asignaciones")
    .select("id, titulo, instrucciones, tipo, puntos, abre, cierra, cursos(nombre, codigo)")
    .eq("id", id)
    .single();

  if (!asignacion) {
    notFound();
  }

  const curso = asignacion.cursos as unknown as {
    nombre: string;
    codigo: string;
  } | null;

  return (
    <div>
      <Link
        href="/panel/actividades"
        className="text-[12px] font-semibold text-ink/55 hover:text-ink/80"
      >
        ← Actividades
      </Link>

      <div className="mt-3 font-mono text-[11px] text-ink/50">
        {curso?.codigo} — {curso?.nombre}
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

      <h2 className="mt-6 mb-3 text-[15px] font-bold text-ink">Entregas</h2>
      <ListaEntregas asignacionId={asignacion.id} />
    </div>
  );
}
