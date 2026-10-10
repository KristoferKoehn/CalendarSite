import { errorMessage } from "@/lib/api/error-message";
import type { ApiError } from "@/lib/api";

export function ErrorBanner({ error }: { error: ApiError | string | null }) {
  if (!error) return null;
  const message = typeof error === "string" ? error : errorMessage(error);
  return <p className="text-sm text-red-600">{message}</p>;
}
