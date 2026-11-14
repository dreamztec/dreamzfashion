import { createFileRoute } from "@tanstack/react-router";
import { FashionImpactNote } from "@/components/FashionImpactNote";

// Preserve older shared links without exposing Fashion's former receipt ledger.
export const Route = createFileRoute("/our-progress")({
  head: () => ({ meta: [
    { title: "Your Fashion Purchases Help Dreams — DREAMZ Fashion" },
    { name: "description", content: "Explore how DREAMZ Fashion purchases support the DREAMZ Group mission. The Group's tracker now lives on Dreams to Reality." },
  ] }),
  component: () => <main><FashionImpactNote full /></main>,
});
