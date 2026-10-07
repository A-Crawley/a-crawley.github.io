import { createTheme } from "@mui/material/styles";

/** Hides content visually but keeps it available to screen readers. */
export const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/**
 * Theme for the game. A dusk-lit village: deep blue-green ground, warm lamplight for the things the
 * player can act on, and a cold pale blue reserved for the one thing that is not what it seems.
 */
export const gameTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#14201f", paper: "#1c2c2a" },
    primary: { main: "#f0b35a", contrastText: "#1a1206" },
    secondary: { main: "#9cc7e8" },
    text: { primary: "#eef0e6", secondary: "#aab8b0" },
    divider: "#35504b",
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
});
