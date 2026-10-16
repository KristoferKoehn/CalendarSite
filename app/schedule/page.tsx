import { redirect } from "next/navigation";

/**
 * Redirect from the old flat URL.
 *
 * The calendar used to live at the site root; it now sits under a prefix because the root is the
 * portfolio. This keeps the old address working, which matters most for the two paths the backend
 * puts in emails — verification and password reset — where links already sent cannot be updated.
 */
export default function RedirectPage() {
  redirect("/calendar/schedule");
}
