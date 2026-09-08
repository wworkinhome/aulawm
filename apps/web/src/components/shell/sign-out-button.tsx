"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      onClick={() =>
        startTransition(async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/login");
          router.refresh();
        })
      }
      className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 font-sans text-[12px] font-semibold text-ink/65 hover:bg-white/[.07]"
    >
      <span className="w-4 flex-none font-mono text-[10px]">↩</span>
      <span>{pending ? "Saliendo…" : "Cerrar sesión"}</span>
    </div>
  );
}
