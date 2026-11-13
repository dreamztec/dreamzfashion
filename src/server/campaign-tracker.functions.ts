import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { settings } from "../../db/schema";
import { CampaignSchema, INITIAL_CAMPAIGN } from "@/lib/campaign-tracker";
import { requireAdminRole } from "./admin-auth.server";
const key = "billion_naira_campaign";
export const getCampaignTracker = createServerFn({ method: "GET" }).handler(async () => {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!row) return INITIAL_CAMPAIGN;
  return { ...CampaignSchema.parse(row.value), updatedAt: row.updatedAt?.toISOString() || INITIAL_CAMPAIGN.updatedAt };
});
export const saveCampaignTracker = createServerFn({ method: "POST" })
  .validator(CampaignSchema)
  .handler(async ({ data }) => {
    await requireAdminRole(["owner"]);
    const updatedAt = new Date();
    await db.insert(settings).values({ key, value: data, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value: data, updatedAt } });
    return { ...data, updatedAt: updatedAt.toISOString() };
  });
