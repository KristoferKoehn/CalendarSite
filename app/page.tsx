"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/session-context";

/**
 * Entry point. Signed-in users land on today's agenda; everyone else goes to
 * sign-in. The agenda itself lives inside the (app) route group so it inherits
 * the same shell and guard as the rest of the signed-in pages.
 */
export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/today");
    else if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
}
