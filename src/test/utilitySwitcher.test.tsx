import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UtilitySwitcher, { INITIAL_UTILITY, utilityBank, type Utility } from "@/components/UtilitySwitcher";

afterEach(cleanup);
describe("utility bank selection", () => {
  it("starts on SOUND / FX even if the previous visit saved a system tool", () => {
    localStorage.setItem("nadrisk.utility.v1", "tape");
    expect(INITIAL_UTILITY).toBe("fx");
    expect(utilityBank(INITIAL_UTILITY)).toBe("sound");
    localStorage.removeItem("nadrisk.utility.v1");
  });
  it("places the five sound tools and four system tools in their own banks", () => {
    for (const value of ["fx", "phrase", "seq", "mixer", "master"] as const) expect(utilityBank(value)).toBe("sound");
    for (const value of ["tape", "sets", "patch", "midi"] as const) expect(utilityBank(value)).toBe("sys");
  });
  it("returns to the last used tool in each bank and follows external changes", () => {
    const onChange = vi.fn();
    const props = { onChange, perfOpen: false, onPerformance: vi.fn() };
    const view = render(<UtilitySwitcher {...props} value="phrase" />);
    fireEvent.click(view.getByRole("button", { name: "SYS" }));
    expect(onChange).toHaveBeenLastCalledWith("tape");
    view.rerender(<UtilitySwitcher {...props} value="patch" />);
    fireEvent.click(view.getByRole("button", { name: "SOUND" }));
    expect(onChange).toHaveBeenLastCalledWith("phrase");
    view.rerender(<UtilitySwitcher {...props} value={"seq" as Utility} />);
    fireEvent.click(view.getByRole("button", { name: "SYS" }));
    expect(onChange).toHaveBeenLastCalledWith("patch");
  });
  it("opens performance without switching the active utility", () => {
    const onChange = vi.fn(), onPerformance = vi.fn();
    const view = render(<UtilitySwitcher value="mixer" onChange={onChange} perfOpen={false} onPerformance={onPerformance} />);
    fireEvent.click(view.getByRole("button", { name: "Performance mode" }));
    expect(onPerformance).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });
});