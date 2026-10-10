import { Typography, useMediaQuery } from "@mui/material";
import type { Stage } from "../../game/config.ts";

export interface StageTitleProps {
  stage: Stage;
  children: string;
}

const FLICKER = {
  "0%, 92%, 100%": { opacity: 1, transform: "none" },
  "94%": { opacity: 0.55, transform: "translateX(-1px)" },
  "96%": { opacity: 1, transform: "translateX(1px)" },
  "98%": { opacity: 0.7, transform: "none" },
};

/**
 * The game's heading. From stage 3 the sim is cracking, so it flickers now and then. For people who
 * ask for reduced motion it stays still and shows a fixed, faintly offset shadow instead.
 */
export function StageTitle({ stage, children }: StageTitleProps) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", { noSsr: true });
  const cracking = stage === 3;
  const effect = !cracking ? "none" : reduceMotion ? "static" : "flicker";

  return (
    <Typography
      component="h1"
      variant="h5"
      data-effect={effect}
      sx={{
        fontWeight: 700,
        ...(effect === "static" && { textShadow: "2px 0 rgba(180, 0, 60, 0.35)" }),
        ...(effect === "flicker" && {
          textShadow: "1px 0 rgba(180, 0, 60, 0.35)",
          animation: "look-up-flicker 6s steps(1, end) infinite",
          "@keyframes look-up-flicker": FLICKER,
        }),
      }}
    >
      {children}
    </Typography>
  );
}
