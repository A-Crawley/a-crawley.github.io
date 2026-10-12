import { copyText } from "./copyText.ts";

describe("copyText", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("writes to the clipboard and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("says no when the clipboard refuses", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
    });
    await expect(copyText("hello")).resolves.toBe(false);
  });

  it("says no when there is no clipboard at all", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyText("hello")).resolves.toBe(false);
  });
});
