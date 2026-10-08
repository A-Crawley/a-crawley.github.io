import type { ReactNode } from "react";
import { Box } from "@mui/material";

export interface PanelProps {
  children: ReactNode;
}

/** A raised surface that groups related things, so the eye reads them as one block. */
export function Panel({ children }: PanelProps) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
      }}
    >
      {children}
    </Box>
  );
}
