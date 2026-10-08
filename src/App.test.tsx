import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import App from "./App";

vi.mock("@supabase/supabase-js", () => ({
  // Like the real library, refuse to build a client without a URL.
  createClient: (url: string) => {
    if (!url) throw new Error("supabaseUrl is required.");
    return {
      from: () => ({
        select: () => ({
          order: () => ({
            overrideTypes: () =>
              Promise.resolve({
                data: [
                  { title: "Test project", body: "A thing I made", link: "https://example.com" },
                ],
                error: null,
              }),
          }),
        }),
      }),
    };
  },
}));

beforeEach(() => {
  vi.stubEnv("REACT_APP_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("REACT_APP_SUPABASE_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("renders the logo and loaded projects", async () => {
  render(<App />);
  expect(screen.getByText("AC")).toBeInTheDocument();
  expect(await screen.findByText("Test project")).toBeInTheDocument();
});

test("watermark shows the current year", () => {
  render(<App />);
  expect(screen.getByText(`a-crawley ${new Date().getFullYear()}`)).toBeInTheDocument();
});

test("links to the game", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: "Look Up" })).toHaveAttribute("href", "./game/");
});

test("still renders the page when Supabase is not configured", async () => {
  vi.stubEnv("REACT_APP_SUPABASE_URL", "");
  vi.stubEnv("REACT_APP_SUPABASE_KEY", "");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  render(<App />);
  expect(screen.getByText("AC")).toBeInTheDocument();
  expect(screen.getByText(`a-crawley ${new Date().getFullYear()}`)).toBeInTheDocument();
  await vi.waitFor(() => expect(warn).toHaveBeenCalled());
  expect(screen.queryByText("Test project")).not.toBeInTheDocument();
});
