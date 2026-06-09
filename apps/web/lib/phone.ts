import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhoneToE164(
  phone: string,
  defaultCountry: "CM" | "FR" = "CM"
): string | null {
  const parsed = parsePhoneNumberFromString(phone, defaultCountry);
  if (!parsed?.isValid()) return null;
  return parsed.format("E.164");
}

export function formatPhoneDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed?.formatInternational() ?? e164;
}
