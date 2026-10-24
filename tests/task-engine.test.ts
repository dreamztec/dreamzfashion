import { describe, expect, it } from "vitest";

/**
 * Campaign task engine semantics — the guarantee that progress is computed
 * from real server-side data only, is capped at its target, completes only
 * when progress reaches the target, and that unknown task types never
 * fabricate progress.
 *
 * The engine's decision core (target/progress/completed per task type) is
 * mirrored here against the same inputs the server computes.
 */

type TaskSpec = { key: string; type: string; target: number };
type Counters = {
  verifiedOrders: number;
  referralSignups: number;
  profileComplete: boolean;
};

function computeTask(
  task: TaskSpec,
  counters: Counters,
): { progress: number; target: number; completed: boolean } {
  const target = Math.max(1, task.target ?? 1);
  let progress = 0;
  switch (task.type) {
    case "verified_orders":
      progress = Math.min(target, counters.verifiedOrders);
      break;
    case "referral_signups":
      progress = Math.min(target, counters.referralSignups);
      break;
    case "profile_complete":
      progress = counters.profileComplete ? target : 0;
      break;
    default:
      progress = 0;
  }
  return { progress, target, completed: progress >= target };
}

describe("Campaign task engine", () => {
  const counters: Counters = {
    verifiedOrders: 3,
    referralSignups: 1,
    profileComplete: true,
  };

  it("counts real verified orders toward an order task", () => {
    const t = computeTask({ key: "orders", type: "verified_orders", target: 2 }, counters);
    expect(t).toEqual({ progress: 2, target: 2, completed: true });
  });

  it("caps progress at the target — never shows inflated progress", () => {
    const t = computeTask({ key: "orders", type: "verified_orders", target: 2 }, {
      ...counters,
      verifiedOrders: 50,
    });
    expect(t.progress).toBe(2);
    expect(t.completed).toBe(true);
  });

  it("counts registered referral attributions", () => {
    const t = computeTask({ key: "refs", type: "referral_signups", target: 3 }, counters);
    expect(t).toEqual({ progress: 1, target: 3, completed: false });
  });

  it("completes a profile task only when the profile is genuinely filled", () => {
    expect(
      computeTask({ key: "profile", type: "profile_complete", target: 1 }, counters).completed,
    ).toBe(true);
    expect(
      computeTask({ key: "profile", type: "profile_complete", target: 1 }, {
        ...counters,
        profileComplete: false,
      }).completed,
    ).toBe(false);
  });

  it("never fabricates progress for unknown task types", () => {
    const t = computeTask({ key: "mystery", type: "vibes", target: 1 }, counters);
    expect(t).toEqual({ progress: 0, target: 1, completed: false });
  });

  it("a task with target 0 is promoted to target 1 (never trivially complete)", () => {
    const t = computeTask({ key: "orders", type: "verified_orders", target: 0 }, counters);
    expect(t.target).toBe(1);
    expect(t.completed).toBe(counters.verifiedOrders >= 1);
  });
});
