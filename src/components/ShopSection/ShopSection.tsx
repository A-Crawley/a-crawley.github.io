import { useId } from "react";
import type { ReactNode } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import { Panel } from "../Panel";

export interface ShopSectionProps {
  title: string;
  /** A few words shown beside the title when collapsed, e.g. "2 you can afford". */
  summary?: string;
  /** Fold the section away behind its heading. Used on a phone, where space is short. */
  collapsible?: boolean;
  /** Whether a collapsible section starts open. */
  defaultExpanded?: boolean;
  children: ReactNode;
}

/** A titled group in the shop. A panel with a heading, or an accordion when space is short. */
export function ShopSection({
  title,
  summary,
  collapsible = false,
  defaultExpanded = false,
  children,
}: ShopSectionProps) {
  const summaryId = useId();
  if (!collapsible) {
    return (
      <Box component="section">
        <Panel>
          <Typography component="h2" variant="h6">
            {title}
          </Typography>
          {children}
        </Panel>
      </Box>
    );
  }
  return (
    <Accordion
      disableGutters
      variant="outlined"
      defaultExpanded={defaultExpanded}
      slotProps={{
        heading: { component: "h2" },
        // Several sections can be open at once, so each region needs its own name.
        region: { "aria-labelledby": summaryId },
      }}
    >
      <AccordionSummary id={summaryId} sx={{ minHeight: 48 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 2 }}>
          <Typography component="span" variant="h6">
            {title}
          </Typography>
          {summary && (
            <Typography component="span" color="text.secondary" sx={{ alignSelf: "center" }}>
              {summary}
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
