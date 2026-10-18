import { describe, expect, it } from "vitest";
import { isLicensedHost } from "./origin";

describe("isLicensedHost", () => {
  it("allows the nadrisk.com domain", () => {
    expect(isLicensedHost("nadrisk.com")).toBe(true);
  });
  it("allows the www.nadrisk.com domain", () => {
    expect(isLicensedHost("www.nadrisk.com")).toBe(true);
  });
  it("normalizes domain case and trailing DNS dots", () => {
    expect(isLicensedHost("WWW.NADRISK.COM.")).toBe(true);
  });
  it("does not license lookalikes or other subdomains", () => {
    for (const h of ["nadrisk.com.evil.com", "www.nadrisk.com.evil.com", "fakenadrisk.com", "copy.nadrisk.com"]) expect(isLicensedHost(h)).toBe(false);
  });
  it("allows own hosts", () => {
    for (const h of ["nadrisk.lovable.app", "id-preview--x.lovable.app", "abc.lovableproject.com", "localhost", "nadgroovebox.com", "www.nadgroovebox.com"]) expect(isLicensedHost(h)).toBe(true);
    expect(isLicensedHost("", "capacitor:")).toBe(true);
  });
  it("blocks copies", () => {
    for (const h of ["evil.com", "nadrisk.lovable.app.evil.com", "fakenadgroovebox.com", "lovable.app.io"]) expect(isLicensedHost(h)).toBe(false);
  });
});
