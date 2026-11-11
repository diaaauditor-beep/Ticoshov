export function fmt(template: string, vars: Record<string, unknown>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}
