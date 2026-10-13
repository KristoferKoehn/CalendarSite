"use client";

import { useSession } from "@/lib/session/session-context";
import {
  AccountSummary,
  DangerZone,
  ProfileForm,
} from "@/components/profile-form";

export default function SettingsPage() {
  const { user, status } = useSession();

  if (status === "loading") {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }
  if (!user) {
    return <p className="text-sm text-zinc-500">Not signed in.</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Settings</h1>
      <AccountSummary user={user} />
      <ProfileForm user={user} />
      <DangerZone user={user} />
    </div>
  );
}
