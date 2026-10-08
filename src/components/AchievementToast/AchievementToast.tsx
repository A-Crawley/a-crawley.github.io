import { Snackbar } from "@mui/material";

export interface AchievementToastProps {
  /** Title of the achievement just earned, or null for none. */
  title: string | null;
  onClose: () => void;
}

/** A brief notice at the bottom of the screen when an achievement is earned. */
export function AchievementToast({ title, onClose }: AchievementToastProps) {
  return (
    <Snackbar
      open={title !== null}
      autoHideDuration={4000}
      onClose={(_event, reason) => {
        if (reason !== "clickaway") onClose();
      }}
      message={title === null ? undefined : `Achievement: ${title}`}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    />
  );
}
