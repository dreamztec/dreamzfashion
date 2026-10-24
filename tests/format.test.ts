import { describe, expect, it } from "vitest";
import {
  formatNaira,
  parseNairaToKobo,
  generateOrderNumber,
  generateRequestNumber,
  isValidNigerianPhone,
  normalizeProductLine,
  TRACKING_FLOW,
  ORDER_STATUS_LABELS,
  PRODUCT_LINES,
} from "../src/lib/format";

describe("Naira formatting", () => {
  it("formats kobo into Naira with thousands separators", () => {
    expect(formatNaira(15000000)).toBe("₦150,000");
    expect(formatNaira(2999900)).toBe("₦29,999");
    expect(formatNaira(25000000)).toBe("₦250,000");
    expect(formatNaira(0)).toBe("₦0");
  });

  it("supports prices far above the old ₦100,000 ceiling", () => {
    expect(formatNaira(500000000)).toBe("₦5,000,000");
    expect(formatNaira(100000000)).toBe("₦1,000,000");
  });
});

describe("Naira → kobo conversion", () => {
  it("converts plain naira amounts", () => {
    expect(parseNairaToKobo("25000")).toBe(2500000);
    expect(parseNairaToKobo("150000")).toBe(15000000);
  });

  it("accepts ₦ and comma separators", () => {
    expect(parseNairaToKobo("₦25,000")).toBe(2500000);
    expect(parseNairaToKobo("₦1,000,000")).toBe(100000000);
  });

  it("rounds fractional kobo correctly", () => {
    expect(parseNairaToKobo("10.5")).toBe(1050);
    expect(parseNairaToKobo("10.55")).toBe(1055);
    expect(parseNairaToKobo("10.555")).toBe(null);
  });

  it("rejects invalid input", () => {
    expect(parseNairaToKobo("")).toBe(null);
    expect(parseNairaToKobo("abc")).toBe(null);
    expect(parseNairaToKobo("-5")).toBe(null);
    expect(parseNairaToKobo("12abc")).toBe(null);
  });

  it("imposes no maximum price", () => {
    expect(parseNairaToKobo("5000000")).toBe(500000000);
    expect(parseNairaToKobo("10000000")).toBe(1000000000);
  });
});

describe("Order and request numbers", () => {
  it("generates DFK order numbers in the safe public format", () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber).toMatch(/^DFK-\d{6}-[A-Z0-9]{5}$/);
  });

  it("generates DR design-request numbers", () => {
    const requestNumber = generateRequestNumber();
    expect(requestNumber).toMatch(/^DR-\d{6}-[A-Z0-9]{5}$/);
  });

  it("does not produce sequential numbers", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).not.toBe(b);
  });
});

describe("Nigerian phone validation", () => {
  it("accepts valid local and international formats", () => {
    expect(isValidNigerianPhone("08031234567")).toBe(true);
    expect(isValidNigerianPhone("+2348031234567")).toBe(true);
    expect(isValidNigerianPhone("2349038560517".replace("903", "903"))).toBe(true);
    expect(isValidNigerianPhone("0903 856 0517")).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(isValidNigerianPhone("12345")).toBe(false);
    expect(isValidNigerianPhone("01031234567")).toBe(false);
    expect(isValidNigerianPhone("notaphone")).toBe(false);
  });
});

describe("Product lines", () => {
  it("recognises exactly the three official lines", () => {
    expect(PRODUCT_LINES).toEqual(["essentials", "originals", "royale"]);
  });

  it("normalises unknown values to essentials", () => {
    expect(normalizeProductLine("essentials")).toBe("essentials");
    expect(normalizeProductLine("originals")).toBe("originals");
    expect(normalizeProductLine("royale")).toBe("royale");
    expect(normalizeProductLine("signature")).toBe("essentials");
    expect(normalizeProductLine("prestige")).toBe("essentials");
    expect(normalizeProductLine("bogus")).toBe("essentials");
    expect(normalizeProductLine(null)).toBe("essentials");
    expect(normalizeProductLine(undefined)).toBe("essentials");
  });
});

describe("Order status flow", () => {
  it("has a label for every tracking status", () => {
    for (const status of TRACKING_FLOW) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("orders the lifecycle from order received to delivered", () => {
    expect(TRACKING_FLOW[0]).toBe("order_received");
    expect(TRACKING_FLOW[TRACKING_FLOW.length - 1]).toBe("completed");
    expect(TRACKING_FLOW).not.toContain("cancelled");
  });
});
