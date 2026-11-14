import { createFileRoute } from "@tanstack/react-router";
// The Group's single progress source is now administered on Dreams to Reality.
export const Route = createFileRoute("/admin/dream-tracker")({
  component: () => <div className="mx-auto max-w-3xl py-14 px-5">
    <h1 className="font-editorial text-3xl">The DREAMZ Group tracker has moved</h1>
    <p className="mt-4 text-stone">Financial progress is managed centrally on Dreams to Reality, not separately on DREAMZ Fashion. Historical Fashion receipts remain archived, but no longer control public figures here.</p>
    <a className="btn-lux btn-lux-primary mt-5" href="https://mydreamnetwork.dreamz-gc.com/admin/dreamz-group" rel="noopener noreferrer">
      Manage Group progress ↗
    </a>
  </div>,
});
