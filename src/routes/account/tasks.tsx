import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyTasks } from "@/server/account.functions";

export const Route = createFileRoute("/account/tasks")({
  component: MyTasks,
});

interface CampaignView {
  id: number;
  name: string;
  description: string;
  reward: string | null;
  endsAt: string | null;
  tasks: Array<{ key: string; label: string; progress: number; target: number; completed: boolean }>;
  completedCount: number;
  totalTasks: number;
}

function MyTasks() {
  const [campaigns, setCampaigns] = useState<CampaignView[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyTasks()
      .then((res) => {
        if (cancelled) return;
        if ("unauthenticated" in res) setFailed(true);
        else setCampaigns(res.campaigns);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p className="text-stone">Please sign in to view your tasks.</p>;
  if (!campaigns) return <div className="skeleton h-48 w-full" />;

  if (campaigns.length === 0) {
    return (
      <div>
        <h1 className="font-editorial text-3xl mb-4">Tasks & Progress</h1>
        <p className="text-stone leading-relaxed max-w-lg">
          No reward campaigns are running right now. When the house opens a
          campaign, your tasks and progress will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-editorial text-3xl mb-8">Tasks & Progress</h1>
      <div className="space-y-8">
        {campaigns.map((c) => {
          const pct = c.totalTasks > 0 ? Math.round((c.completedCount / c.totalTasks) * 100) : 0;
          return (
            <div key={c.id} className="border border-ink/10 px-5 py-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <h2 className="font-editorial text-2xl">{c.name}</h2>
                <p className="text-xs uppercase tracking-btn text-stone">
                  {c.completedCount} of {c.totalTasks} tasks completed
                </p>
              </div>
              {c.description && <p className="text-sm text-stone mb-4">{c.description}</p>}
              <div className="h-1.5 bg-linen mb-5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
              </div>
              <ul className="space-y-2.5 mb-5">
                {c.tasks.map((t) => (
                  <li key={t.key} className="flex items-center gap-3 text-sm">
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 items-center justify-center border ${
                        t.completed ? "bg-forest text-ivory border-forest" : "border-stone text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className={t.completed ? "text-stone line-through" : ""}>
                      {t.label}
                      {t.target > 1 && !t.completed ? ` (${t.progress}/${t.target})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs uppercase tracking-btn text-gold">
                {c.reward ? `Reward: ${c.reward}` : "Reward: to be confirmed"}
              </p>
              {(() => {
                const next = c.tasks.find((t) => !t.completed);
                if (!next) return null;
                const pct = next.target > 0 ? Math.round((next.progress / next.target) * 100) : 0;
                return (
                  <p className="text-xs text-stone mt-2">
                    Next milestone: {next.label} ({next.progress}/{next.target} — {pct}%)
                  </p>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
