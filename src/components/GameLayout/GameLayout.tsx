import { useState } from "react";
import type { ReactNode } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import type { LayoutMode } from "../../hooks/useLayout.ts";

export interface GameLayoutProps {
  mode: LayoutMode;
  /** Title row. Scrolls away. */
  header: ReactNode;
  /** Notices that span the page, such as a save warning. */
  notices?: ReactNode;
  /**
   * Something that needs an answer, such as a village event. It floats over the page (above the
   * dock on a phone, in the bottom corner elsewhere) so showing or hiding it never moves the page.
   */
  sheet?: ReactNode;
  /** Resources, always in view: a sticky strip on a phone, the top of the left rail on a desktop. */
  hud?: ReactNode;
  /** Village state: morale, population, workforce. The rest of the left rail. */
  status?: ReactNode;
  /** The main action. The top of the Build tab on a phone, the top of the middle column elsewhere. */
  actions?: ReactNode;
  /** The shop and everything the player spends on. */
  main: ReactNode;
  /** The log, achievements, settings. */
  side: ReactNode;
}

type TabId = "build" | "village" | "more";

const RAIL_WIDTH = 320;
const SIDE_WIDTH = 340;
// The tab bar is 52 px, plus some air above it so the last row is never tucked behind it.
const DOCK_SPACE = "calc(76px + env(safe-area-inset-bottom))";

/**
 * Arranges the game's parts for the window. The same parts, three arrangements:
 * - phone: one column. Resources stick to the top, the tab bar sits at the bottom within
 *   thumb reach and never goes away, the main action leads the Build tab, and the tabs fold the rest away so the page is not one long scroll.
 * - tablet: resources across the top, then the shop beside the village state and the log.
 * - desktop: a dashboard. A left rail of resources and village state that stays in view, the shop
 *   in the middle and the log and settings on the right. Nothing is hidden behind a tap.
 */
export function GameLayout({
  mode,
  header,
  notices,
  sheet,
  hud,
  status,
  actions,
  main,
  side,
}: GameLayoutProps) {
  if (mode === "phone") {
    return (
      <PhoneLayout
        header={header}
        notices={notices}
        sheet={sheet}
        hud={hud}
        status={status}
        actions={actions}
        main={main}
        side={side}
      />
    );
  }
  if (mode === "tablet") {
    return (
      <Box sx={{ maxWidth: 880, mx: "auto", px: 3, py: 3 }}>
        {header}
        {notices}
        <Box
          sx={{ display: "grid", gap: 3, gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)" }}
        >
          {hud && <Box sx={{ gridColumn: "1 / -1" }}>{hud}</Box>}
          <Box sx={{ display: "grid", gap: 3, alignContent: "start" }}>
            {actions}
            {main}
          </Box>
          <Box sx={{ display: "grid", gap: 3, alignContent: "start" }}>
            {status}
            {side}
          </Box>
        </Box>
        <FloatingSheet>{sheet}</FloatingSheet>
      </Box>
    );
  }
  const hasRail = Boolean(hud || status);
  return (
    <Box sx={{ maxWidth: 1360, mx: "auto", px: 4, py: 3 }}>
      {header}
      {notices}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: hasRail
            ? `${RAIL_WIDTH}px minmax(0, 1fr) ${SIDE_WIDTH}px`
            : `minmax(0, 1fr) ${SIDE_WIDTH}px`,
        }}
      >
        {hasRail && (
          <Box sx={{ display: "grid", gap: 3, alignContent: "start" }}>
            {/* Only the resources stay put: a rail taller than the window could not be scrolled to its end. */}
            {hud && <Box sx={{ position: "sticky", top: 16, zIndex: 1 }}>{hud}</Box>}
            {status}
          </Box>
        )}
        <Box sx={{ display: "grid", gap: 3, alignContent: "start" }}>
          {actions}
          {main}
        </Box>
        <Box sx={{ display: "grid", gap: 3, alignContent: "start" }}>{side}</Box>
      </Box>
      <FloatingSheet>{sheet}</FloatingSheet>
    </Box>
  );
}

const TAB_LABELS: Record<TabId, string> = {
  build: "Build",
  village: "Village",
  more: "Log and more",
};

/** Pinned to the bottom corner on wider windows. Out of the flow, so nothing moves under it. */
function FloatingSheet({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Box
      sx={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 3,
        width: "min(400px, calc(100vw - 32px))",
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        borderRadius: 2,
        boxShadow: 8,
      }}
    >
      {children}
    </Box>
  );
}

type PhoneProps = Omit<GameLayoutProps, "mode">;

function PhoneLayout({ header, notices, sheet, hud, status, actions, main, side }: PhoneProps) {
  const [tab, setTab] = useState<TabId>("build");
  const panels: Array<{ id: TabId; content: ReactNode }> = [
    {
      id: "build",
      content: (
        <>
          {actions}
          {main}
        </>
      ),
    },
    ...(status ? [{ id: "village" as const, content: status }] : []),
    { id: "more", content: side },
  ];
  // A tab can vanish (the village panel leaves at the ending); fall back to the first one.
  const current = panels.some((panel) => panel.id === tab) ? tab : "build";
  return (
    <Box sx={{ maxWidth: 560, mx: "auto", px: 2, pt: 2, pb: DOCK_SPACE }}>
      {header}
      {notices}
      {hud && (
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            bgcolor: "background.default",
            mx: -2,
            px: 2,
            py: 1,
            mb: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          {hud}
        </Box>
      )}
      {panels.map((panel) => (
        <Box
          key={panel.id}
          role="tabpanel"
          id={`game-panel-${panel.id}`}
          aria-labelledby={`game-tab-${panel.id}`}
          hidden={current !== panel.id}
          sx={{ "&:not([hidden])": { display: "grid", gap: 2, alignContent: "start" } }}
        >
          {panel.content}
        </Box>
      ))}
      <Box
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 3,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        <Box sx={{ maxWidth: 560, mx: "auto" }}>
          {/* Grows upward from the dock, so it covers the page instead of pushing it down. */}
          {sheet && (
            <Box sx={{ px: 2, pt: 1.5, maxHeight: "55vh", overflowY: "auto" }}>{sheet}</Box>
          )}
          <Tabs
            value={current}
            onChange={(_event, next: TabId) => setTab(next)}
            variant="fullWidth"
            aria-label="Game sections"
          >
            {panels.map((panel) => (
              <Tab
                key={panel.id}
                value={panel.id}
                label={TAB_LABELS[panel.id]}
                id={`game-tab-${panel.id}`}
                aria-controls={`game-panel-${panel.id}`}
                sx={{ minHeight: 52 }}
              />
            ))}
          </Tabs>
        </Box>
      </Box>
    </Box>
  );
}
