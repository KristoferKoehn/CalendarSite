import { Suspense } from "react";
import { RescheduleContent } from "./reschedule-content";

export default function ReschedulePage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
      <RescheduleContent />
    </Suspense>
  );
}
