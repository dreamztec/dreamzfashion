import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./helpers/pglite-db";
import { CampaignSchema, INITIAL_CAMPAIGN, campaignTotals } from "../src/lib/campaign-tracker";
const m = vi.hoisted(() => ({ admin: vi.fn(), db: null as any }));
vi.mock("../db/index", () => ({ get db() { return m.db; } }));
vi.mock("../src/server/admin-auth.server", () => ({ requireAdminRole: m.admin }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { let schema: any; const builder: any = { validator: (s: any) => { schema = s; return builder; }, handler: (fn: any) => (args?: any) => fn({ data: schema ? schema.parse(args?.data) : args?.data }) }; return builder; } }));
import { getCampaignTracker, saveCampaignTracker } from "../src/server/campaign-tracker.functions";
let testDb: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { testDb = await createTestDb(); m.db = testDb.db; }, 30000);
afterAll(async () => { await testDb?.client.close(); });
beforeEach(() => { vi.clearAllMocks(); m.admin.mockResolvedValue(undefined); });
describe("public campaign receipts", () => {
 it("counts received deposits only and counts the two customers once each", () => {
  const totals=campaignTotals(INITIAL_CAMPAIGN);
  expect(totals.receivedKobo).toBe(51_499_200);
  expect(totals.dreamersRemaining).toBe(999_998);
  expect(INITIAL_CAMPAIGN.entries.map(e=>e.depositPercent)).toEqual([50,50]);
 });
 it("rejects negative amounts, impossible percentages and duplicate projects",()=>{
  const [a]=INITIAL_CAMPAIGN.entries;
  expect(CampaignSchema.safeParse({...INITIAL_CAMPAIGN,entries:[{...a,receivedKobo:-1}]}).success).toBe(false);
  expect(CampaignSchema.safeParse({...INITIAL_CAMPAIGN,entries:[{...a,depositPercent:101}]}).success).toBe(false);
  expect(CampaignSchema.safeParse({...INITIAL_CAMPAIGN,entries:[a,a]}).success).toBe(false);
 });
 it("starts with the confirmed snapshot without exposing bank details",async()=>{
  const data=await getCampaignTracker();expect(data).toEqual(INITIAL_CAMPAIGN);
  expect(JSON.stringify(data)).not.toMatch(/3000155823|NXG|SULEIMAN|accountNumber|sessionId/);
 });
 it("blocks writes without owner access",async()=>{
  m.admin.mockRejectedValue(new Error("Forbidden"));
  await expect(saveCampaignTracker({data:INITIAL_CAMPAIGN})).rejects.toThrow("Forbidden");
  expect(await getCampaignTracker()).toEqual(INITIAL_CAMPAIGN);
 });
 it("persists a confirmed owner update and strips unexpected fields",async()=>{
  const next={dreamers:3,entries:[...INITIAL_CAMPAIGN.entries,{id:"test-project",project:"Test project",receivedKobo:10000,depositPercent:50,receivedOn:"2026-11-13",bankReference:"PRIVATE"}]};
  await saveCampaignTracker({data:next});const saved=await getCampaignTracker();
  expect(m.admin).toHaveBeenCalledWith(["owner"]);expect(saved.dreamers).toBe(3);
  expect(campaignTotals(saved).receivedKobo).toBe(51_509_200);
  expect(JSON.stringify(saved)).not.toContain("PRIVATE");
 });
});
