import { createFileRoute } from "@tanstack/react-router";
import { CampaignTracker } from "@/components/CampaignTracker";
import { getCampaignTracker } from "@/server/campaign-tracker.functions";
export const Route = createFileRoute("/billion-naira-dream")({
  loader: () => getCampaignTracker(),
  staleTime: 30_000,
  head: () => ({meta:[{title:"The Billion-Naira Dream · Design Your Dream — DREAMZ"},{name:"description",content:"Follow DREAMZ Fashion toward ₦1 billion and one million people designing their dream outfit. See confirmed deposits and the amount still to receive."}]}),
  component: () => <main className="pt-20"><CampaignTracker data={Route.useLoaderData()} full/></main>,
  errorComponent: () => <main className="pt-32 px-6 pb-24 text-center"><h1 className="font-editorial text-3xl">Progress is temporarily unavailable</h1><p className="mt-4">Please refresh shortly to see the latest confirmed figures.</p></main>,
});
