// Licensed hosts. Unknown hosts boot into a permanent NADRISK lock (copy protection).
const d = (c: number[]) => String.fromCharCode(...c);
// "nadrisk.lovable.app", "nadgroovebox.com"
const EXACT = [d([110,97,100,114,105,115,107,46,108,111,118,97,98,108,101,46,97,112,112]), "localhost", "127.0.0.1"];
const SUFFIX = [d([46,108,111,118,97,98,108,101,46,97,112,112]), d([46,108,111,118,97,98,108,101,112,114,111,106,101,99,116,46,99,111,109]), d([110,97,100,103,114,111,111,118,101,98,111,120,46,99,111,109])];

export function isLicensedHost(host: string, protocol = "https:", native = false): boolean {
  if (native || protocol === "capacitor:" || protocol === "file:") return true;
  const h = host.toLowerCase().replace(/\.$/, "");
  if (!h || EXACT.includes(h)) return true;
  return SUFFIX.some(s => s.startsWith(".") ? h.endsWith(s) : h === s || h.endsWith("." + s));
}
