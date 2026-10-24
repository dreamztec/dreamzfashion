import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { verifyRequestOrigin } from "@netlify/identity";
import { requireCustomer } from "./auth.server";

export const ensureMyCustomerProfile = createServerFn({ method: "POST" }).handler(async () => {
  verifyRequestOrigin(getRequest());
  await requireCustomer();
  return { ok: true };
});

export const getMyCustomerProfile = createServerFn({ method: "GET" }).handler(async () => {
  const customer = await requireCustomer();
  return { fullName: customer.fullName, email: customer.email, phone: customer.phone,
    city: customer.city, state: customer.state };
});
