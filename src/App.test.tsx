import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
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
  }),
}));

test("renders the logo and loaded projects", async () => {
  render(<App />);
  expect(screen.getByText("AC")).toBeInTheDocument();
  expect(await screen.findByText("Test project")).toBeInTheDocument();
});

test("watermark shows the current year", () => {
  render(<App />);
  expect(screen.getByText(`a-crawley ${new Date().getFullYear()}`)).toBeInTheDocument();
});
