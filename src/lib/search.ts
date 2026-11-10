/** Strip characters that have meaning in PostgREST filter syntax. */
export function cleanQuery(q: unknown, max = 80) {
  return typeof q === "string" ? q.replace(/[,()%*\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}
export function sp(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}
export function pageOf(v: string | string[] | undefined) {
  const n = Number(sp(v));
  return Number.isInteger(n) && n > 0 && n < 10000 ? n : 1;
}
