import { Snackbar } from "@mui/material";

export interface AchievementToastProps {
  /** Title of the achievement just earned, or null for none. */
  title: string | null;
  onClose: () => void;
  /** Lift the notice clear of a bar fixed to the bottom of the screen. */
  raised?: boolean;
}

/** A brief notice at the bottom of the screen when an achievement is earned. */
export function AchievementToast({ title, onClose, raised = false }: AchievementToastProps) {
  return (
    <Snackbar
      open={title !== null}
      autoHideDuration={4000}
      onClose={(_event, reason) => {
        if (reason !== "clickaway") onClose();
      }}
      message={title === null ? undefined : `Achievement: ${title}`}
      sx={raised ? { bottom: "calc(176px + env(safe-area-inset-bottom))" } : undefined}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    />
  );
}
