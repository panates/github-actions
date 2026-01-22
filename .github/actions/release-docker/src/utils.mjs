export function coerceToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(/\s*,\s*/);
}
