import { splitString } from "fast-tokenizer";

export function coerceToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  value = String(value);
  return splitString(value, {
    delimiters: value.includes("\n") ? "\n" : ",",
  }).filter((v) => !!v);
}
