import { redirect } from "next/navigation";
import { adminPath } from "@/lib/paths";

/**
 * The admin area's front door.
 *
 * Projects are the reason to come here — the other two surfaces are about the files behind them — so
 * the root sends you to the list rather than showing a fourth page that only links to the other three.
 */
export default function AdminIndexPage() {
  redirect(adminPath("/projects"));
}
