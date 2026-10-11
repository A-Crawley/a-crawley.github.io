import { Snackbar } from "@mui/material";

export interface AchievementToastProps {
  /** Title of the achievement just earned, or null for none. */
  title: string | null;
  onClose: () => void;
  /** Lift the notice just above the tab bar fixed to the bottom of the screen. */
  raised?: boolean;
}

/**
 * A brief notice at the bottom of the screen when an achievement is earned. It is only a notice,
 * so it ignores taps: whatever is underneath stays tappable while it shows.
 */
export function AchievementToast({ title, onClose, raised = false }: AchievementToastProps) {
  return (
    <Snackbar
      // One Snackbar per achievement: its hide timer only starts when it opens, so reusing one for
      // the next in the queue left that next toast on screen for good.
      key={title ?? "none"}
      open={title !== null}
      autoHideDuration={4000}
      onClose={(_event, reason) => {
        if (reason !== "clickaway") onClose();
      }}
      message={title === null ? undefined : `Achievement: ${title}`}
      sx={{
        pointerEvents: "none",
        ...(raised && { bottom: "calc(64px + env(safe-area-inset-bottom))" }),
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    />
  );
}
