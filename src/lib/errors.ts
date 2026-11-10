/** Map database / auth errors to dictionary keys under `errors`. Unknown errors become "generic". */
const known: Array<[RegExp, string]> = [
  [/row-level security|permission denied|not allowed|42501|staff only|administrators only/i, "forbidden"],
  [/already belong to a company/i, "alreadyHasCompany"],
  [/upload at least one document/i, "needDocuments"],
  [/quotation has expired/i, "quotationExpired"],
  [/rfq is no longer open/i, "rfqClosed"],
  [/validity date is in the past/i, "validityPast"],
  [/duplicate key|already exists|23505/i, "duplicate"],
  [/transition .* not allowed/i, "transitionNotAllowed"],
  [/invalid login credentials/i, "invalidCredentials"],
  [/email not confirmed/i, "emailNotConfirmed"],
  [/user already registered/i, "emailTaken"],
  [/password should be|weak password/i, "weakPassword"],
  [/rate limit|too many/i, "rateLimited"],
  [/mime type|file size|payload too large|exceeded the maximum/i, "fileRejected"],
  [/not yet open in this country|country is not available/i, "countryUnavailable"],
  [/dispute already exists/i, "disputeExists"],
];

export function errorKey(err: unknown): string {
  const msg =
    typeof err === "string" ? err : (err as { message?: string; code?: string })?.message ?? String(err ?? "");
  const code = (err as { code?: string })?.code ?? "";
  for (const [re, key] of known) if (re.test(msg) || re.test(code)) return key;
  if (process.env.NODE_ENV !== "production") console.error("[ticoshov] unmapped error:", err);
  return "generic";
}
