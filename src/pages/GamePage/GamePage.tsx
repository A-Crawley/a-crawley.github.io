import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { CONFIG, ITEMS } from "../../game/config.ts";
import type { ItemDef, ItemId } from "../../game/config.ts";
import {
  BUY_QUANTITIES,
  canRest,
  costOf,
  foodPerClick,
  isAvailable,
  isResting,
  isWalkingOut,
  quotePurchase,
  ratesFor,
} from "../../game/engine.ts";
import type { BuyQuantity } from "../../game/engine.ts";
import { CURRENCY_NAME, ITEM_COPY } from "../../game/itemCopy.ts";
import { logLines } from "../../game/log.ts";
import { useGame } from "../../hooks/useGame.ts";
import type { UseGameOptions } from "../../hooks/useGame.ts";
import { useLatchedSet } from "../../hooks/useLatchedSet.ts";
import { EventLog } from "../../components/EventLog";
import { GatherButton } from "../../components/GatherButton";
import { LockedAction } from "../../components/LockedAction";
import { MoraleMeter } from "../../components/MoraleMeter";
import { PolicyToggle } from "../../components/PolicyToggle";
import { QuantitySelector } from "../../components/QuantitySelector";
import { ResourceCounter } from "../../components/ResourceCounter";
import { SaveControls } from "../../components/SaveControls";
import { ShopItem } from "../../components/ShopItem";

/** A job, machine or project is offered once the player has half of what the first unit costs. */
const REVEAL_FRACTION = 0.5;

/** Total villagers hired before the efficiency policies are offered. */
const POLICIES_AFTER_JOBS = 10;

const SECTIONS: ReadonlyArray<{ title: string; ids: readonly ItemId[] }> = [
  { title: "Jobs", ids: ["forager", "woodcutter", "builder"] },
  { title: "Machines", ids: ["autoForager", "sawmillBot", "builderDrone"] },
  { title: "Projects", ids: ["research", "exploit"] },
];

export interface GamePageProps {
  /** Passed to `useGame`. Tests use it to control the clock and storage. */
  options?: UseGameOptions;
}

/** The game screen. A container: it owns the game state and wires it into presentational parts. */
export function GamePage({ options }: GamePageProps) {
  const game = useGame(options);
  const { state } = game;
  const [quantity, setQuantity] = useState<BuyQuantity>(1);
  const rates = ratesFor(state, state.owned, false);
  const jobs = state.owned.forager + state.owned.woodcutter + state.owned.builder;

  // Things appear once and then stay, even after the money that revealed them is spent.
  const revealed = useLatchedSet<string>([
    ...ITEMS.filter(
      (def) =>
        isAvailable(state, def) &&
        (state.owned[def.id] > 0 || state[def.currency] >= costOf(state, def) * REVEAL_FRACTION),
    ).map((def) => `item:${def.id}`),
    ...(state.wood > 0 || state.owned.woodcutter > 0 ? ["wood"] : []),
    ...(state.infra > 0 || state.owned.builder > 0 ? ["infra"] : []),
    ...(jobs >= 1 ? ["morale"] : []),
    ...(jobs >= POLICIES_AFTER_JOBS ? ["policies"] : []),
  ]);

  const visible = (def: ItemDef) => isAvailable(state, def) && revealed.has(`item:${def.id}`);
  const shop = SECTIONS.map((section) => ({
    title: section.title,
    defs: section.ids
      .map((id) => ITEMS.find((def) => def.id === id))
      .filter((def): def is ItemDef => def !== undefined && visible(def)),
  }));
  const policies = CONFIG.policies;
  const restCooldown = Math.ceil(state.restReadyAt - state.time);

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
        {(revealed.has("wood") || revealed.has("infra")) && (
          <Stack direction="row" spacing={4}>
            {revealed.has("wood") && (
              <ResourceCounter
                label="Wood"
                value={state.wood}
                perSecond={rates.wood}
                size="small"
              />
            )}
            {revealed.has("infra") && (
              <ResourceCounter
                label="Infrastructure"
                value={state.infra}
                perSecond={rates.infra}
                size="small"
              />
            )}
          </Stack>
        )}
        <GatherButton label="Gather food" gain={foodPerClick(state)} onGather={game.gatherFood} />
        <LockedAction label="Look up" hint="Not ready yet." />
        {revealed.has("morale") && (
          <MoraleMeter
            morale={state.morale}
            status={isResting(state) ? "resting" : isWalkingOut(state) ? "walkout" : undefined}
          />
        )}
        {shop.some((section) => section.defs.length > 0) && (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <QuantitySelector value={quantity} options={BUY_QUANTITIES} onChange={setQuantity} />
          </Box>
        )}
        {shop.map(({ title, defs }) =>
          defs.length === 0 ? null : (
            <Box component="section" key={title}>
              <Typography component="h2" variant="h6">
                {title}
              </Typography>
              <Box component="ul" sx={{ m: 0, p: 0 }}>
                {defs.map((def) => {
                  const quote = quotePurchase(state, def, quantity);
                  const copy = ITEM_COPY[def.id];
                  return (
                    <ShopItem
                      key={def.id}
                      name={def.label}
                      description={copy.description}
                      owned={state.owned[def.id]}
                      actionLabel={copy.action}
                      count={quote.count}
                      cost={quote.cost}
                      currency={CURRENCY_NAME[def.currency]}
                      output={copy.output}
                      affordable={quote.affordable}
                      onBuy={() => game.buyItem(def.id, quantity)}
                    />
                  );
                })}
              </Box>
            </Box>
          ),
        )}
        {revealed.has("policies") && (
          <Box component="section">
            <Typography component="h2" variant="h6">
              Policies
            </Typography>
            <PolicyToggle
              label="Extended Shifts"
              description={`+${Math.round((policies.extendedShifts.outputFactor - 1) * 100)}% output. Drains morale, and the village will remember.`}
              checked={state.policies.extendedShifts}
              onChange={(on) => game.setPolicy("extendedShifts", on)}
            />
            <PolicyToggle
              label="Rations Optimisation"
              description={`Food purchases cost ${Math.round((1 - policies.rationsOptimisation.foodCostFactor) * 100)}% less. Drains morale.`}
              checked={state.policies.rationsOptimisation}
              onChange={(on) => game.setPolicy("rationsOptimisation", on)}
            />
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                color="inherit"
                disabled={!canRest(state)}
                onClick={game.takeRestDay}
              >
                Take a rest day
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isResting(state)
                  ? "Resting. Nothing is produced, and nobody minds."
                  : canRest(state)
                    ? `Output stops for ${policies.restDay.duration} seconds. Morale recovers, and the village remembers that too.`
                    : `Available again in ${Math.max(0, restCooldown)} seconds.`}
              </Typography>
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
