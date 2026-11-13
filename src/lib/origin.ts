import { matches, type Fingerprint } from "./fingerprint";

// Numeric allowlist avoids readable addresses; it does not secure client code.
const EXACT: readonly Fingerprint[] = [
  [376924161, 1254552787], [3086950720, 4206873762],
  [2727302169, 4275536923], [22050618, 3210828456],
  [144953630, 1417155086],
];
const SUFFIX: readonly Fingerprint[] = [
  [1915453207, 2134720789], [3794072684, 333605216],
  [271622912, 3882446226],
];
const ROOT: Fingerprint = [271622912, 3882446226];

export function isLicensedHost(host: string, protocol = "https:", native = false): boolean {
  if (native || matches(protocol, [3295532599, 3978170255]) || matches(protocol, [2280108923, 171232537])) return true;
  const h = host.toLowerCase().replace(/\.$/, "");
  if (!h || EXACT.some(value => matches(h, value)) || matches(h, ROOT)) return true;
  // Walk only DNS label boundaries, never arbitrary substring matches.
  for (let i = h.indexOf("."); i >= 0; i = h.indexOf(".", i + 1)) {
    if (SUFFIX.some(value => matches(h.slice(i + 1), value))) return true;
  }
  return false;
}
