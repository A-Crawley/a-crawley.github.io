import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { CONFIG } from "../../game/config.ts";
import { costOf, foodPerClick, itemDef, ratesFor } from "../../game/engine.ts";
import { logLines } from "../../game/log.ts";
import { useGame } from "../../hooks/useGame.ts";
import type { UseGameOptions } from "../../hooks/useGame.ts";
import { EventLog } from "../../components/EventLog";
import { GatherButton } from "../../components/GatherButton";
import { LockedAction } from "../../components/LockedAction";
import { ResourceCounter } from "../../components/ResourceCounter";
import { SaveControls } from "../../components/SaveControls";
import { ShopItem } from "../../components/ShopItem";
import { formatRate } from "../../game/format.ts";

/** Food needed before the first job is offered. */
const SHOP_REVEAL_FOOD = 5;

export interface GamePageProps {
  /** Passed to `useGame`. Tests use it to control the clock and storage. */
  options?: UseGameOptions;
}

/** The game screen. A container: it owns the game state and wires it into presentational parts. */
export function GamePage({ options }: GamePageProps) {
  const game = useGame(options);
  const { state } = game;
  const forager = itemDef("forager");
  const rates = ratesFor(state, state.owned, false);
  const showShop = state.food >= SHOP_REVEAL_FOOD || state.owned.forager > 0;

  return (
    <Box component="main" sx={{ maxWidth: 560, mx: "auto", px: 2, py: 3 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 2 }}>
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
          Look Up
        </Typography>
        <Link href="../" color="text.secondary" underline="hover">
          Back to a-crawley.com
        </Link>
      </Box>
      <Stack spacing={3}>
        {game.loadStatus === "corrupt" && (
          <Alert severity="warning">
            Your saved game could not be read, so a new one was started. The old save was kept as a
            backup.
          </Alert>
        )}
        {game.loadStatus === "unavailable" && (
          <Alert severity="info">
            This browser is not letting the game save. Progress will be lost when you leave.
          </Alert>
        )}
        <ResourceCounter label="Food" value={state.food} perSecond={rates.food} />
        <GatherButton label="Gather food" gain={foodPerClick(state)} onGather={game.gatherFood} />
        <LockedAction label="Look up" hint="Not ready yet." />
        {showShop && (
          <Box component="section">
            <Typography component="h2" variant="h6">
              Jobs
            </Typography>
            <Box component="ul" sx={{ m: 0, p: 0 }}>
              <ShopItem
                name={forager.label}
                description="Walks to where the food is."
                owned={state.owned.forager}
                cost={costOf(state, forager)}
                currency="food"
                output={`${formatRate(CONFIG.output.forager)} food per second`}
                affordable={state.food >= costOf(state, forager)}
                onBuy={() => game.buyItem("forager")}
              />
            </Box>
          </Box>
        )}
        <EventLog title="Village log" lines={logLines(state)} />
        <Accordion disableGutters variant="outlined">
          <AccordionSummary>Save and reset</AccordionSummary>
          <AccordionDetails>
            <SaveControls
              onExport={game.exportSave}
              onImport={(text) => game.importSave(text)}
              onReset={game.resetGame}
            />
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
}
