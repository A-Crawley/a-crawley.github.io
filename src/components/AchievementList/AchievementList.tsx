import { Box, Typography } from "@mui/material";
import { visuallyHidden } from "../../theme";

export interface AchievementItem {
  id: string;
  title: string;
  /** What to do, shown while locked. */
  hint: string;
  /** A dry line shown once earned. */
  flavour: string;
  earned: boolean;
}

export interface AchievementListProps {
  items: readonly AchievementItem[];
}

/** Every achievement, earned or locked. Locked ones show only a hint, not their name. */
export function AchievementList({ items }: AchievementListProps) {
  const earned = items.filter((item) => item.earned).length;
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {earned} of {items.length} earned
      </Typography>
      <Box component="ul" aria-label="Achievements" sx={{ m: 0, p: 0, listStyle: "none" }}>
        {items.map((item) => (
          <Box component="li" key={item.id} sx={{ py: 0.75, opacity: item.earned ? 1 : 0.6 }}>
            <Typography sx={{ fontWeight: item.earned ? 600 : 400 }}>
              {item.earned ? item.title : "Locked"}
              {item.earned && (
                <Box component="span" sx={visuallyHidden}>
                  {" "}
                  (earned)
                </Box>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.earned ? item.flavour : item.hint}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
