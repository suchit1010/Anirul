import { PROVIDER_ORDER, type Provider } from "./aiClients";

let cursor = 0;

export function nextProvider(hint?: Provider | "auto"): Provider {
  if (hint && hint !== "auto" && PROVIDER_ORDER.includes(hint)) return hint;
  const p = PROVIDER_ORDER[cursor % PROVIDER_ORDER.length] as Provider;
  cursor = (cursor + 1) % PROVIDER_ORDER.length;
  return p;
}

export function fallbackOrder(start: Provider): Provider[] {
  const i = PROVIDER_ORDER.indexOf(start);
  if (i < 0) return PROVIDER_ORDER;
  return [...PROVIDER_ORDER.slice(i), ...PROVIDER_ORDER.slice(0, i)];
}
