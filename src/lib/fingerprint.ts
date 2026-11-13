// Inspection deterrent only: client-side fingerprints are not authentication.
export type Fingerprint = readonly [number, number];

export function fingerprint(value: string): Fingerprint {
  let a = 2166136261;
  let b = 5381;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619) >>> 0;
    b = (Math.imul(b, 33) ^ c) >>> 0;
  }
  return [a, b];
}

export function matches(value: string, expected: Fingerprint): boolean {
  const actual = fingerprint(value);
  return actual[0] === expected[0] && actual[1] === expected[1];
}

export function inputSignal(buffer: string): 0 | 1 | 2 {
  if (buffer.length === 7 && matches(buffer, [3884421935, 3227430157])) return 1;
  if (buffer.length >= 4 && matches(buffer.slice(-4), [1426490280, 2087559498])) return 2;
  return 0;
}