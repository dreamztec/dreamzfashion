import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { adminListMessages, adminSaveMessage } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { MEANING_THEMES, MESSAGE_PLACEMENTS, PLACEMENT_LABELS } from "@/lib/meaning";

export const Route = createFileRoute("/admin/messages")({
  component: AdminMessages,
});

type MessageRow = Awaited<ReturnType<typeof adminListMessages>>[number];

const STATUSES = ["draft", "approved", "archived"] as const;
const SOURCES = [
  ["dreamz", "DREAMZ Quote"],
  ["bible", "Bible"],
  ["quran", "Qur’an"],
] as const;

function AdminMessages() {
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<MessageRow> | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await adminCall(adminListMessages));
    } catch {
      setMessage("Could not load the message catalogue. Is ADMIN_SECRET configured?");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    try {
      await adminCall(adminSaveMessage, {
        id: editing?.id,
        messageId: String(fd.get("messageId") || "").toUpperCase(),
        version: Number(fd.get("version") || 1),
        theme: String(fd.get("theme") || ""),
        source: String(fd.get("source") || "dreamz"),
        text: String(fd.get("text") || ""),
        reference: String(fd.get("reference") || ""),
        translation: String(fd.get("translation") || ""),
        attribution: String(fd.get("attribution") || ""),
        verificationUrl: String(fd.get("verificationUrl") || ""),
        reproductionPermission: String(fd.get("reproductionPermission") || "unverified"),
        isExcerpt: fd.get("isExcerpt") === "on",
        status: String(fd.get("status") || "draft"),
        rtl: fd.get("rtl") === "on",
        eligiblePlacements: MESSAGE_PLACEMENTS.filter((p) => fd.get(`placement-${p}`) === "on"),
      });
      setEditing(null);
      setMessage(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-3">Inspiration Messages</h1>
      <p className="text-sm text-stone mb-8 max-w-2xl">
        The MAKE IT MEANINGFUL catalogue. Only <strong>approved</strong> messages
        appear publicly. Scripture stays in draft until wording, reference,
        translation, source URL and reproduction permission are verified —
        archived versions remain on historic orders through the immutable
        order snapshot.
      </p>

      <button type="button" onClick={() => setEditing({ source: "dreamz", status: "draft", version: 1, reproductionPermission: "unverified" })} className="btn-lux btn-lux-primary mb-6">
        New Message
      </button>

      {message && <p role="alert" className="mb-6 text-sm border border-oxblood/40 bg-oxblood/5 text-oxblood px-4 py-3">{message}</p>}

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(e.currentTarget);
          }}
          className="border border-ink/15 bg-white/50 p-6 mb-8 grid gap-4 sm:grid-cols-2"
        >
          <div>
            <label className="input-lux-label" htmlFor="m-id">Message ID</label>
            <input id="m-id" name="messageId" className="input-lux" defaultValue={editing.messageId ?? ""} required pattern="[A-Z0-9-]+" />
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-version">Version</label>
            <input id="m-version" name="version" type="number" min={1} max={99} className="input-lux" defaultValue={editing.version ?? 1} required />
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-theme">Theme</label>
            <select id="m-theme" name="theme" className="input-lux" defaultValue={editing.theme ?? "Vision"} required>
              {MEANING_THEMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-source">Source</label>
            <select id="m-source" name="source" className="input-lux" defaultValue={editing.source ?? "dreamz"}>
              {SOURCES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="input-lux-label" htmlFor="m-text">Exact wording</label>
            <textarea id="m-text" name="text" rows={3} className="input-lux" defaultValue={editing.text ?? ""} dir={(editing as { rtl?: boolean }).rtl ? "rtl" : "ltr"} />
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-reference">Reference</label>
            <input id="m-reference" name="reference" className="input-lux" defaultValue={editing.reference ?? ""} />
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-translation">Translation</label>
            <input id="m-translation" name="translation" className="input-lux" defaultValue={editing.translation ?? ""} />
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-attribution">Attribution</label>
            <input id="m-attribution" name="attribution" className="input-lux" defaultValue={editing.attribution ?? ""} />
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-verify">Verification URL</label>
            <input id="m-verify" name="verificationUrl" className="input-lux" defaultValue={editing.verificationUrl ?? ""} />
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-permission">Reproduction permission</label>
            <select id="m-permission" name="reproductionPermission" className="input-lux" defaultValue={editing.reproductionPermission ?? "unverified"}>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
              <option value="not_permitted">Not permitted</option>
            </select>
          </div>
          <div>
            <label className="input-lux-label" htmlFor="m-status">Status</label>
            <select id="m-status" name="status" className="input-lux" defaultValue={editing.status ?? "draft"}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="input-lux-label">Eligible placements (none = house default)</legend>
            <div className="flex flex-wrap gap-3 mt-1">
              {MESSAGE_PLACEMENTS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name={`placement-${p}`} defaultChecked={editing.eligiblePlacements?.includes(p)} />
                  {PLACEMENT_LABELS[p]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="isExcerpt" defaultChecked={editing.isExcerpt} /> Mark as excerpt
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="rtl" defaultChecked={editing.rtl} /> Right-to-left script (e.g. Arabic)
          </label>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" className="btn-lux btn-lux-primary">Save Message</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-lux btn-lux-outline">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-stone text-sm">No messages yet.</p>}
        {rows.map((m) => (
          <div key={m.id} className="border border-ink/10 p-4 bg-white/40">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">
                  {m.messageId} · v{m.version} · {m.theme} · {SOURCES.find(([v]) => v === m.source)?.[1] ?? m.source}
                </p>
                <p className="text-sm mt-1" dir={m.rtl ? "rtl" : "ltr"}>
                  {m.text || <em className="text-stone">(wording not yet recorded — draft)</em>}
                </p>
                <p className="text-[0.66rem] text-stone mt-1">
                  {m.reference ?? ""} {m.translation ? `· ${m.translation}` : ""} {m.isExcerpt ? "· excerpt" : ""} · permission: {m.reproductionPermission}
                  {m.eligiblePlacements.length > 0 ? ` · placements: ${m.eligiblePlacements.map((p) => PLACEMENT_LABELS[p as keyof typeof PLACEMENT_LABELS] ?? p).join(", ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[0.62rem] uppercase tracking-btn px-2 py-1 border ${
                    m.status === "approved"
                      ? "border-forest/40 text-forest"
                      : m.status === "archived"
                        ? "border-ink/20 text-stone"
                        : "border-gold/50 text-gold-soft"
                  }`}
                >
                  {m.status}
                </span>
                <button type="button" onClick={() => setEditing(m)} className="text-xs underline text-stone hover:text-ink">
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
