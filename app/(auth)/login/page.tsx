"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { loginInputSchema } from "@/contract";
import { useSession } from "@/lib/session/session-context";
import { firstZodMessage } from "@/lib/validation";

export default function LoginPage() {
  const { status, login } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/appointments");
  }, [status, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = loginInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await login(parsed.data);
    setPending(false);
    if (result) {
      setError(result.message);
      return;
    }
    router.replace("/appointments");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-zinc-600">
        No account?{" "}
        <Link href="/register" className="underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
