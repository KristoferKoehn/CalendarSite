"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/session-context";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/appointments");
    else if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  return <div className="p-8 text-sm text-zinc-500">Loading...</div>;
}
