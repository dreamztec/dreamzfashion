import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { adminListFeedback } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedback,
});

type FeedbackItem = Awaited<ReturnType<typeof adminListFeedback>>[number];

function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await adminCall(adminListFeedback));
    } catch {
      setError("Could not load feedback.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-8">Feedback</h1>
      {error && <p className="mb-6 text-sm text-oxblood">{error}</p>}
      {items.length === 0 ? (
        <p className="text-center text-stone text-sm py-16 border border-ink/10">
          No feedback yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((f) => (
            <li key={f.id} className="border border-ink/10 px-5 py-5">
              <div className="flex flex-wrap justify-between gap-3 mb-2">
                <p className="font-medium">
                  {f.feedbackType} — {f.name}
                </p>
                <p className="text-xs text-stone">
                  {f.createdAt ? new Date(f.createdAt).toLocaleString("en-NG") : ""}
                </p>
              </div>
              <p className="text-xs text-stone mb-3">
                {f.email}
                {f.orderNumber && ` · Order ${f.orderNumber}`}
              </p>
              <p className="text-sm leading-relaxed">{f.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}