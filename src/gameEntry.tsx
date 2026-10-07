import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { GamePage } from "./pages/GamePage";
import { gameTheme } from "./theme.ts";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ThemeProvider theme={gameTheme}>
      <CssBaseline />
      <GamePage />
    </ThemeProvider>
  </StrictMode>,
);
