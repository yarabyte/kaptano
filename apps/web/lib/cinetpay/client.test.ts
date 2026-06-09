import { describe, it, expect } from "vitest";
import { verifyCinetPayHmac, isPaymentAccepted } from "@/lib/cinetpay/client";

describe("isPaymentAccepted", () => {
  it("accepts SUCCESS and ACCEPTED", () => {
    expect(isPaymentAccepted("SUCCESS")).toBe(true);
    expect(isPaymentAccepted("ACCEPTED")).toBe(true);
    expect(isPaymentAccepted("accepted")).toBe(true);
  });

  it("rejects REFUSED", () => {
    expect(isPaymentAccepted("REFUSED")).toBe(false);
  });
});

describe("verifyCinetPayHmac", () => {
  it("rejects when secret is missing", () => {
    const payload = {
      cpm_site_id: "1",
      cpm_trans_id: "tx1",
      cpm_trans_date: "2024-01-01",
      cpm_amount: "1000",
      cpm_currency: "XAF",
      signature: "sig",
      payment_method: "MOMO",
      cel_phone_num: "670000000",
      cpm_phone_prefixe: "237",
      cpm_language: "fr",
      cpm_version: "V4",
      cpm_payment_config: "Single",
      cpm_page_action: "Payment",
      cpm_custom: "",
      cpm_designation: "Test",
      cpm_error_message: "",
    };
    expect(verifyCinetPayHmac(payload, "abc")).toBe(false);
  });
});
