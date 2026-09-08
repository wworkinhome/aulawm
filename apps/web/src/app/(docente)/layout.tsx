import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_DOCENTE } from "@/components/shell/nav-items";
import { requireUser } from "@/lib/auth/current-user";

export default async function DocenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (!user.roles.includes("docente") && !user.roles.includes("coordinacion")) {
    redirect("/inicio");
  }

  return (
    <AppShell nombre={user.nombre} roles={user.roles} navItems={NAV_DOCENTE}>
      {children}
    </AppShell>
  );
}
