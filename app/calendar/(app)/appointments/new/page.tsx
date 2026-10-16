import { Suspense } from "react";
import { NewAppointmentContent } from "./new-appointment-content";

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
      <NewAppointmentContent />
    </Suspense>
  );
}
