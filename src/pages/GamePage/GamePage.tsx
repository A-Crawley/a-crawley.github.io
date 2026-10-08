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
  foodPerClick,
  isAvailable,
  isResting,
  isWalkingOut,
  quotePurchase,
  ratesFor,
} from "../../game/engine.ts";
import type { BuyQuantity } from "../../game/engine.ts";
import { CURRENCY_NAME, ITEM_COPY, POLICY_LABELS, sighting } from "../../game/itemCopy.ts";
import { logLines } from "../../game/log.ts";
import { isUnlocked } from "../../game/unlocks.ts";
import { useGame } from "../../hooks/useGame.ts";
import type { UseGameOptions } from "../../hooks/useGame.ts";
import { useSettings } from "../../hooks/useSettings.ts";
import { AwaySummaryDialog } from "../../components/AwaySummaryDialog";
import { EventLog } from "../../components/EventLog";
import { GatherButton } from "../../components/GatherButton";
import { LookUpAction } from "../../components/LookUpAction";
import { MoraleMeter } from "../../components/MoraleMeter";
import { NotationPicker } from "../../components/NotationPicker";
import { NotationProvider } from "../../components/NotationProvider";
import { PolicyToggle } from "../../components/PolicyToggle";
import { QuantitySelector } from "../../components/QuantitySelector";
import { ProjectProgress } from "../../components/ProjectProgress";
import { ResourceCounter } from "../../components/ResourceCounter";
import { SaveControls } from "../../components/SaveControls";
import { ShopItem } from "../../components/ShopItem";

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
  const { settings, setNotation } = useSettings(options?.storage);
  const { state } = game;
  const [quantity, setQuantity] = useState<BuyQuantity>(1);
  const rates = ratesFor(state, state.owned, false);
  // What is on screen comes from the saved unlocks, so it survives a reload.
  const unlocked = (id: Parameters<typeof isUnlocked>[1]) => isUnlocked(state, id);

  const visible = (def: ItemDef) => isAvailable(state, def) && unlocked(`item:${def.id}`);
  const shop = SECTIONS.map((section) => ({
    title: section.title,
    defs: section.ids
      .map((id) => ITEMS.find((def) => def.id === id))
      .filter((def): def is ItemDef => def !== undefined && visible(def)),
  }));
  const policies = CONFIG.policies;
  const restCooldown = Math.ceil(state.restReadyAt - state.time);

  return (
    <NotationProvider notation={settings.notation}>
      <Box component="main" sx={{ maxWidth: 560, mx: "auto", px: 2, py: 3 }}>
        <Box
          sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 2 }}
        >
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
            Look Up
          </Typography>
          <Link href="../" color="text.secondary" underline="hover">
            Back to a-crawley.com
          </Link>
        </Box>
        <AwaySummaryDialog summary={game.away} onClose={game.dismissAway} />
        <Stack spacing={3}>
          {game.loadStatus === "corrupt" && (
            <Alert severity="warning">
              Your saved game could not be read, so a new one was started. The old save was kept as
              a backup.
            </Alert>
          )}
          {game.loadStatus === "unavailable" && (
            <Alert severity="info">
              This browser is not letting the game save. Progress will be lost when you leave.
            </Alert>
          )}
          <ResourceCounter label="Food" value={state.food} perSecond={rates.food} />
          {(unlocked("wood") || unlocked("infra")) && (
            <Stack direction="row" spacing={4}>
              {unlocked("wood") && (
                <ResourceCounter
                  label="Wood"
                  value={state.wood}
                  perSecond={rates.wood}
                  size="small"
                />
              )}
              {unlocked("infra") && (
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
          <LookUpAction
            unlocked={unlocked("lookUp")}
            sighting={unlocked("lookedUp") ? sighting(state.stage, state.time) : null}
            onLookUp={game.lookUp}
          />
          {unlocked("morale") && (
            <MoraleMeter
              morale={state.morale}
              status={isResting(state) ? "resting" : isWalkingOut(state) ? "walkout" : undefined}
            />
          )}
          {state.stage === 1 && unlocked("horizon") && (
            <ProjectProgress
              label="Project Horizon"
              fraction={state.infra / CONFIG.infraGate}
              caption="On schedule. Nobody will say what it is a schedule for."
            />
          )}
          {state.stage === 2 && unlocked("researchStarted") && (
            <ProjectProgress
              label="Accidental Intelligence"
              fraction={state.owned.research / CONFIG.researchLevels}
              caption="Progress is measured in levels of research. Nobody has defined a level."
            />
          )}
          {unlocked("bulkBuying") && shop.some((section) => section.defs.length > 0) && (
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
          {(unlocked("policy:rationsOptimisation") ||
            unlocked("policy:restDay") ||
            unlocked("policy:extendedShifts")) && (
            <Box component="section">
              <Typography component="h2" variant="h6">
                Policies
              </Typography>
              {unlocked("policy:extendedShifts") && (
                <PolicyToggle
                  label={POLICY_LABELS.extendedShifts}
                  description={`+${Math.round((policies.extendedShifts.outputFactor - 1) * 100)}% output. Drains morale, and the village will remember.`}
                  checked={state.policies.extendedShifts}
                  onChange={(on) => game.setPolicy("extendedShifts", on)}
                />
              )}
              {unlocked("policy:rationsOptimisation") && (
                <PolicyToggle
                  label={POLICY_LABELS.rationsOptimisation}
                  description={`Food purchases cost ${Math.round((1 - policies.rationsOptimisation.foodCostFactor) * 100)}% less. Drains morale.`}
                  checked={state.policies.rationsOptimisation}
                  onChange={(on) => game.setPolicy("rationsOptimisation", on)}
                />
              )}
              {unlocked("policy:restDay") && (
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
              )}
            </Box>
          )}
          <EventLog title="Village log" lines={logLines(state)} />
          <Accordion disableGutters variant="outlined">
            <AccordionSummary>Settings</AccordionSummary>
            <AccordionDetails>
              <NotationPicker value={settings.notation} onChange={setNotation} />
            </AccordionDetails>
          </Accordion>
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
    </NotationProvider>
  );
}
