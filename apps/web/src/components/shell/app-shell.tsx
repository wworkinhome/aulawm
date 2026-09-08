import type { ReactNode } from "react";
import type { NavItem } from "./nav-items";
import { TopBar } from "./top-bar";
import { Rail } from "./rail";

export function AppShell({
  nombre,
  roles,
  navItems,
  children,
}: {
  nombre: string;
  roles: string[];
  navItems: NavItem[];
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-ground"
      style={{ backgroundImage: "var(--grad-app)" }}
    >
      <TopBar nombre={nombre} roles={roles} />
      <div className="flex items-stretch">
        <Rail items={navItems} />
        <div className="om-sb flex-1 min-w-0 px-7 py-6.5">{children}</div>
      </div>
    </div>
  );
}
