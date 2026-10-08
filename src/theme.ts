import { createTheme } from "@mui/material/styles";

/** Hides content visually but keeps it available to screen readers. */
export const visuallyHidden = {
  position: "absolute",
  // Explicit px: in `sx`, a bare 1 means 100%, which made this wider than the screen.
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/** Smallest height, in px, of anything the player taps. */
export const TOUCH_TARGET = 44;

/** Width, in px, from which the game becomes a two-column page (tablet). */
export const TABLET_MIN = 600;

/** Width, in px, from which the game becomes a three-column dashboard (desktop). */
export const DESKTOP_MIN = 1024;

/** Digits all the same width, so counters do not jitter as they change. */
export const tabularNumbers = { fontVariantNumeric: "tabular-nums" } as const;

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
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
    // Secondary text stays readable on a phone: 15 px, with room between the lines.
    body2: { fontSize: "0.9375rem", lineHeight: 1.5 },
    caption: { fontSize: "0.8125rem", lineHeight: 1.4 },
  },
  components: {
    // Every control is at least 44 px tall, the size a thumb can hit reliably.
    MuiButton: { styleOverrides: { root: { minHeight: TOUCH_TARGET } } },
    MuiToggleButton: {
      styleOverrides: { root: { minHeight: TOUCH_TARGET, minWidth: TOUCH_TARGET } },
    },
    MuiFormControlLabel: { styleOverrides: { root: { minHeight: TOUCH_TARGET } } },
  },
});
