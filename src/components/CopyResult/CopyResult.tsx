import { useState } from "react";
import type { FocusEvent } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { copyText } from "../../hooks/copyText.ts";

export interface CopyResultProps {
  /** The text to put on the clipboard. */
  text: string;
}

type Status = "idle" | "copied" | "failed";

/**
 * A button that copies a short result to the clipboard. When the browser will not allow it, the
 * text is shown selected in a box so the player can copy it by hand. Nothing leaves the page.
 */
export function CopyResult({ text }: CopyResultProps) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleCopy() {
    setStatus((await copyText(text)) ? "copied" : "failed");
  }

  return (
    <Stack component="section" aria-labelledby="copy-result-title" spacing={1}>
      <Typography id="copy-result-title" component="h3" variant="h6">
        Share your result
      </Typography>
      <Box>
        <Button variant="outlined" onClick={handleCopy}>
          Copy result
        </Button>
      </Box>
      {/* Always in the page, so a screen reader announces the change when it fills in. */}
      <Typography role="status" variant="body2" color="text.secondary" sx={{ minHeight: "1.5em" }}>
        {status === "copied" && "Result copied."}
        {status === "failed" &&
          "Could not copy automatically. Select the text and copy it yourself."}
      </Typography>
      {status === "failed" && (
        <TextField
          label="Your result"
          value={text}
          multiline
          fullWidth
          slotProps={{
            htmlInput: {
              readOnly: true,
              onFocus: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                event.currentTarget.select(),
            },
          }}
        />
      )}
    </Stack>
  );
}
