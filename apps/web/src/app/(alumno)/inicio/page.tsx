import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function InicioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Direct Supabase read, RLS-scoped to "my own row" — see ADR-0008.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombres, apellidos")
    .eq("id", user.id)
    .single();

  const { data: roles } = await supabase
    .from("roles_usuario")
    .select("rol")
    .eq("usuario_id", user.id);

  const esDocente = roles?.some((r) => r.rol === "docente") ?? false;

  const { data: matricula } = esDocente
    ? { data: null }
    : await supabase
        .from("matriculas")
        .select("estado, grupos(nombre)")
        .eq("estudiante_id", user.id)
        .eq("estado", "activa")
        .maybeSingle();

  return (
    <main className="min-h-screen bg-ground px-8 py-10 text-ink">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-lime">
            {esDocente ? "Panel docente" : "Inicio"}
          </span>
          <h1 className="mt-2 text-[34px] font-extrabold leading-none tracking-[-0.03em]">
            Hola, {perfil?.nombres ?? user.email}
          </h1>
          <p className="mt-2 text-[13px] text-ink/70">
            {esDocente
              ? "Rol: docente"
              : matricula
                ? `Grupo: ${(matricula.grupos as unknown as { nombre: string })?.nombre ?? "—"}`
                : "Sin matrícula activa."}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-10 rounded-[16px] border border-white/[.09] bg-panel p-6 text-[13px] text-ink/70">
        Fase 1 en construcción: cursos, matrículas y calificaciones todavía
        no tienen pantalla propia. Esto confirma que el login real contra
        Supabase Auth y la lectura de tu perfil (protegida por RLS)
        funcionan de punta a punta.
      </div>
    </main>
  );
}
