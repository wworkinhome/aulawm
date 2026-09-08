import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ESTUDIANTE } from "@/components/shell/nav-items";
import { requireUser } from "@/lib/auth/current-user";

export default async function AlumnoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // A docente-only account (no estudiante role) has nothing to do under the
  // student shell — send them to their own.
  if (user.roles.includes("docente") && !user.roles.includes("estudiante")) {
    redirect("/panel");
  }

  return (
    <AppShell nombre={user.nombre} roles={user.roles} navItems={NAV_ESTUDIANTE}>
      {children}
    </AppShell>
  );
}
