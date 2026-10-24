import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookie: vi.fn(), header: vi.fn(), validate: vi.fn(), select: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@tanstack/react-start/server", () => ({ getCookie: mocks.cookie, getRequestHeader: mocks.header }));
vi.mock("../src/server/identity.server", () => ({ validateIdentitySession: mocks.validate }));
vi.mock("../db/index", () => ({ db: { select: mocks.select, insert: mocks.insert, update: mocks.update } }));
vi.mock("drizzle-orm", async (original) => {
  const module = await original<typeof import("drizzle-orm")>();
  return { ...module, eq: mocks.eq.mockImplementation(module.eq) };
});

import { getCurrentCustomer, requireCustomer, UnauthorizedError } from "../src/server/auth.server";
import { customers, rewardAccounts } from "../db/schema";

const verifiedIdentity = { id: "verified-identity-id", email: "customer@example.com", confirmed_at: "2026-10-05", user_metadata: { full_name: "DREAMZ Test", phone: "08031234567" } };
const customer = { id: 21, identityUserId: verifiedIdentity.id, email: verifiedIdentity.email };

function selectedRows(rows: unknown[]) {
  return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }) }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookie.mockReturnValue("opaque-session");
  mocks.header.mockReturnValue(undefined);
  mocks.validate.mockResolvedValue(verifiedIdentity);
  mocks.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([customer]) }) }) });
});

describe("Verified customer ownership and profile creation", () => {
  it("does not query customer data when there is no session", async () => {
    mocks.cookie.mockReturnValue(undefined);
    expect(await getCurrentCustomer()).toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.validate).not.toHaveBeenCalled();
  });
  it("rejects forged sessions before querying private data", async () => {
    mocks.validate.mockResolvedValue(null);
    await expect(requireCustomer()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("looks up the authenticated Identity ID, not a supplied email or customer ID", async () => {
    mocks.select.mockReturnValue(selectedRows([customer]));
    expect(await getCurrentCustomer()).toEqual(customer);
    expect(mocks.eq).toHaveBeenCalledWith(customers.identityUserId, verifiedIdentity.id);
    expect(mocks.validate).toHaveBeenCalledWith("opaque-session");
    expect(mocks.insert).toHaveBeenCalledWith(rewardAccounts);
    expect(mocks.insert).not.toHaveBeenCalledWith(customers);
  });
  it("creates a profile with name and phone only after authenticated Identity validation", async () => {
    mocks.select.mockReturnValue(selectedRows([]));
    expect(await getCurrentCustomer()).toEqual(customer);
    const customerInsert = mocks.insert.mock.results[0].value;
    expect(customerInsert.values).toHaveBeenCalledWith(expect.objectContaining({ identityUserId: verifiedIdentity.id, email: verifiedIdentity.email, fullName: "DREAMZ Test", phone: "08031234567" }));
    expect(customerInsert.values.mock.calls[0][0]).not.toHaveProperty("password");
    expect(customerInsert.values.mock.results[0].value.onConflictDoNothing).toHaveBeenCalled();
  });
  it("does not create duplicate profiles on repeated logins", async () => {
    mocks.select.mockReturnValue(selectedRows([customer]));
    await getCurrentCustomer();
    await getCurrentCustomer();
    expect(mocks.insert).not.toHaveBeenCalledWith(customers);
  });
  it("resolves the same profile after a concurrent insert conflict", async () => {
    mocks.select.mockReturnValueOnce(selectedRows([])).mockReturnValueOnce(selectedRows([customer]));
    mocks.insert.mockReturnValueOnce({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) });
    expect(await getCurrentCustomer()).toEqual(customer);
  });
  it("accepts a bearer token only after Identity validates it", async () => {
    mocks.header.mockReturnValue("Bearer bearer-session");
    mocks.select.mockReturnValue(selectedRows([customer]));
    await getCurrentCustomer();
    expect(mocks.validate).toHaveBeenCalledWith("bearer-session");
  });
});
