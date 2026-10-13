import { describe, expect, it } from "vitest";
import { isLicensedHost } from "./origin";

describe("isLicensedHost", () => {
  it("allows own hosts", () => {
    for (const h of ["nadrisk.lovable.app", "id-preview--x.lovable.app", "abc.lovableproject.com", "localhost", "nadgroovebox.com", "www.nadgroovebox.com"]) expect(isLicensedHost(h)).toBe(true);
    expect(isLicensedHost("", "capacitor:")).toBe(true);
  });
  it("blocks copies", () => {
    for (const h of ["evil.com", "nadrisk.lovable.app.evil.com", "fakenadgroovebox.com", "lovable.app.io"]) expect(isLicensedHost(h)).toBe(false);
  });
});
