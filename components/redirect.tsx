"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Sends the browser to another route, replacing the history entry.
 *
 * `replace` rather than a push so Back does not land on the redirect and bounce forward again,
 * which would make Back appear broken.
 */
export function Redirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [to, router]);

  return <p className="text-sm text-zinc-500 dark:text-zinc-400">Redirecting…</p>;
}
