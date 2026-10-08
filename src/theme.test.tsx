import { render, screen } from "@testing-library/react";
import { Box } from "@mui/material";
import { visuallyHidden } from "./theme";

describe("visuallyHidden", () => {
  it("is one pixel square, so it can never widen the page", () => {
    render(
      <Box component="span" sx={visuallyHidden}>
        Hidden text
      </Box>,
    );
    const style = getComputedStyle(screen.getByText("Hidden text"));
    expect(style.width).toBe("1px");
    expect(style.height).toBe("1px");
  });
});
