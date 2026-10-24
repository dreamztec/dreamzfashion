import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminListUsers, adminSaveUser, adminRemoveUser } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type AdminUserRow = Awaited<ReturnType<typeof adminListUsers>>[number];

/**
 * Admin team management (owner only). Team members sign in with their own
 * DREAMZ account; the email below grants their role. The master access key
 * always retains owner-level access.
 */
function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ email: "", displayName: "", role: "operations" });

  const load = useCallback(async () => {
    try {
      setUsers(await adminCall(adminListUsers));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await adminCall(adminSaveUser, { ...form, active: true });
      setForm({ email: "", displayName: "", role: "operations" });
      setMessage("Team member added. They sign in with their DREAMZ account.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add user.");
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Remove this admin's access?")) return;
    await adminCall(adminRemoveUser, { id });
    await load();
  };

  const setRole = async (id: number, role: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    await adminCall(adminSaveUser, {
      id,
      email: u.email,
      displayName: u.displayName,
      role,
      active: u.active,
    });
    await load();
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-2">Admin Team</h1>
      <p className="text-sm text-stone mb-8">
        Roles: <strong>owner</strong> — everything including settings and team.
        <strong> sales</strong> — orders, corporate, partners, enquiries.
        <strong> operations</strong> — production, products, media, inventory.
        Every privileged action is re-verified server-side.
      </p>
      {error && <p className="mb-4 text-sm text-oxblood">{error}</p>}
      {message && <p className="mb-4 text-sm border border-ink/15 px-4 py-3">{message}</p>}

      <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end mb-10">
        <div>
          <label className="input-lux-label">Email (their DREAMZ account)</label>
          <input
            className="input-lux"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="input-lux-label">Display name</label>
          <input
            className="input-lux"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          />
        </div>
        <div>
          <label className="input-lux-label">Role</label>
          <select
            className="input-lux"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="owner">Owner</option>
            <option value="sales">Sales</option>
            <option value="operations">Operations</option>
          </select>
        </div>
        <button type="submit" className="btn-lux btn-lux-primary !py-3 !px-6">
          Add
        </button>
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-stone border border-ink/10 px-5 py-8 text-center">
          No team members yet — the master access key grants owner-level access
          on its own.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10">
          {users.map((u) => (
            <li key={u.id} className="px-5 py-3.5 flex flex-wrap justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{u.displayName || u.email}</p>
                <p className="text-xs text-stone">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="input-lux !py-1.5 text-xs w-36"
                  value={u.role}
                  onChange={(e) => setRole(u.id, e.target.value)}
                  aria-label={`Role for ${u.email}`}
                >
                  <option value="owner">Owner</option>
                  <option value="sales">Sales</option>
                  <option value="operations">Operations</option>
                </select>
                <button onClick={() => remove(u.id)} className="text-xs uppercase tracking-btn text-oxblood hover:underline">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
