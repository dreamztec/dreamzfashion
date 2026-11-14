import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { settings } from "../../db/schema";
import { CampaignSchema, INITIAL_CAMPAIGN, mergeStatementReceiptSnapshot } from "@/lib/campaign-tracker";
import { requireAdminRole } from "./admin-auth.server";
const key = "billion_naira_campaign";
export const getCampaignTracker = createServerFn({ method: "GET" }).handler(async () => {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!row) return INITIAL_CAMPAIGN;
  const saved = CampaignSchema.parse(row.value);
  // Public data can be an old two- or five-receipt database snapshot. Add
  // the newly reviewed individual credits once, preserving later owner edits.
  // The owner may explicitly correct/remove entries after this revision.
  return mergeStatementReceiptSnapshot({
    ...saved,
    updatedAt: row.updatedAt?.toISOString() || "1970-01-01T00:00:00.000Z",
  });
});
export const saveCampaignTracker = createServerFn({ method: "POST" })
  .validator(CampaignSchema)
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    const updatedAt = new Date();
    await db.insert(settings).values({ key, value: data, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value: data, updatedAt } });
    return { ...data, updatedAt: updatedAt.toISOString() };
  });
