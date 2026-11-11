export type ActionState = {
  ok?: boolean;
  /** dictionary key under `errors` or a raw message */
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** echo of the submitted values so forms can repopulate after errors */
  values?: Record<string, string>;
};

export const initialState: ActionState = {};

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}
export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
export function list(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim());
}
export function file(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}
export function files(fd: FormData, key: string): File[] {
  return fd.getAll(key).filter((v): v is File => v instanceof File && v.size > 0);
}
export function valuesOf(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  });
  return out;
}
