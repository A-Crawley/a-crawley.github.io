import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { reviewCopy } from "../../game/reviewCopy.ts";
import type { Review } from "../../game/review.ts";

export interface PerformanceReviewDialogProps {
  /** The review waiting to be shown. The dialog is open while this is set. */
  review: Review | null;
  onClose: () => void;
}

/** The "Performance review" shown once on entering stage 2 and once on entering stage 3. */
export function PerformanceReviewDialog({ review, onClose }: PerformanceReviewDialogProps) {
  // Keep showing the last review while the dialog fades out, so it doesn't go blank.
  const [shown, setShown] = useState(review);
  if (review && review.stage !== shown?.stage) setShown(review);
  if (!shown) return null;
  const copy = reviewCopy(shown);

  return (
    <Dialog
      open={review !== null}
      onClose={onClose}
      aria-labelledby="review-title"
      aria-describedby="review-body"
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id="review-title">{copy.title}</DialogTitle>
      <DialogContent id="review-body">
        <Typography sx={{ mb: 1 }}>{copy.opener}</Typography>
        <List dense aria-label="Review findings" sx={{ my: 1 }}>
          {copy.facts.map((fact) => (
            <ListItem key={fact} disableGutters>
              {fact}
            </ListItem>
          ))}
        </List>
        <Typography sx={{ mb: 1 }}>{copy.drift}</Typography>
        <Typography color="text.secondary">{copy.closer}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          Acknowledge
        </Button>
      </DialogActions>
    </Dialog>
  );
}
