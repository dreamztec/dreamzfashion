import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listMyPassports } from "@/server/passports.functions";
export const Route = createFileRoute("/account/passports")({ component: MyPassports });
function MyPassports() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listMyPassports>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { listMyPassports().then(setRows).catch(() => setError("Could not load your passports. Refresh to try again.")); }, []);
  return <section><p className="overline-label mb-3">Your DREAMZ collection</p><h1 className="font-editorial text-4xl mb-5">My product passports</h1><p className="text-stone mb-8">Your saved and registered pieces, their stories and ongoing support.</p>{error && <p role="alert">{error}</p>}{!rows && !error && <p role="status">Loading…</p>}{rows?.length === 0 && <p>Scan the QR on your package and choose “Save to my passports” to keep it here.</p>}<div className="grid sm:grid-cols-2 gap-5">{rows?.map(p => <Link key={p.code} to="/p/$code" params={{ code: p.code }} className="border border-ink/15 p-6"><p className="font-mono text-xs mb-3">{p.code}</p><h2 className="font-editorial text-3xl">{p.title}</h2><p className="mt-5 underline text-sm">Open passport →</p></Link>)}</div></section>;
}
