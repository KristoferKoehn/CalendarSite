"use client";

import Link from "next/link";
import { userLabel } from "@/contract";
import { cal } from "@/lib/paths";
import { useSession } from "@/lib/session/session-context";

/**
 * The account control on the landing page.
 *
 * Public page, so this is the only place a visitor can reach the app from. Signed out it offers
 * sign-in; signed in it shows who you are and, for an admin, the way to publish a project.
 *
 * Nothing renders while the session is being restored. That is one frame of nothing rather than a
 * frame of "Sign in" followed by your own name, which is worse than a brief gap — it reads as having
 * been signed out.
 *
 * The admin check is a convenience, not a boundary. The page it links to is guarded on the client and
 * the upload endpoints refuse a non-admin server-side, so hiding the link is about not offering
 * something that would fail rather than about protecting it.
 */
export function PortfolioAccount() {
  const { status, user } = useSession();

  if (status === "loading") {
    // Same height as the controls it becomes, so the header does not jump when it resolves.
    return <span className="inline-block h-[1.6rem] w-24" aria-hidden="true" />;
  }

  if (status === "anonymous") {
    return (
      <Link
        href={cal("/login")}
        className="rounded border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Sign in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-4">
      {user?.role === "admin" && (
        <Link
          href={cal("/projects")}
          className="text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Manage projects
        </Link>
      )}
      <Link
        href={cal("/kiosk")}
        className="text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {user ? userLabel(user) : ""}
      </Link>
    </span>
  );
}
