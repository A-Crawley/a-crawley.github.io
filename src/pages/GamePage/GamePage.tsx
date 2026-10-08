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
import { TOUCH_TARGET } from "../../theme";
import { CONFIG, ITEMS } from "../../game/config.ts";
import type { ItemDef, ItemId } from "../../game/config.ts";
import {
  BUY_QUANTITIES,
  bedsOf,
  idleHands,
  retrainCost,
  staffedOperators,
  capOf,
  compassionIndex,
  netFoodRate,
  canRest,
  foodPerClick,
  isAvailable,
  isHungry,
  isJob,
  isResting,
  moraleDrivers,
  isWalkingOut,
  quotePurchase,
  ratesFor,
  unemployed,
  upkeepPerSecond,
} from "../../game/engine.ts";
import type { BuyQuantity } from "../../game/engine.ts";
import {
  CURRENCY_NAME,
  ITEM_COPY,
  MORALE_DRIVER_LABELS,
  POLICY_LABELS,
  sighting,
} from "../../game/itemCopy.ts";
import { logLines } from "../../game/log.ts";
import { ACHIEVEMENTS } from "../../game/achievements.ts";
import { endStats, finalOddsWord, phaseOf, temperamentOf } from "../../game/ending.ts";
import { ENDING_COPY, FINAL_CHOICE, REVEAL, VERDICT } from "../../game/endingCopy.ts";
import { formatDuration } from "../../game/format.ts";
import { isUnlocked } from "../../game/unlocks.ts";
import { useGame } from "../../hooks/useGame.ts";
import type { UseGameOptions } from "../../hooks/useGame.ts";
import { useNewAchievements } from "../../hooks/useNewAchievements.ts";
import { useSettings } from "../../hooks/useSettings.ts";
import { AchievementList } from "../../components/AchievementList";
import { AchievementToast } from "../../components/AchievementToast";
import { AwaySummaryDialog } from "../../components/AwaySummaryDialog";
import { EndingScreen } from "../../components/EndingScreen";
import { EventLog } from "../../components/EventLog";
import { FinalChoice } from "../../components/FinalChoice";
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
import { UpgradeList } from "../../components/UpgradeList";
import { isUpgradeAvailable, upgradeDef, UPGRADES } from "../../game/upgrades.ts";
import type { UpgradeId } from "../../game/upgrades.ts";
import { DevTools } from "../../components/DevTools";
import {
  addVillagers,
  autoplay,
  BOT_NAMES,
  grantResources,
  refreshVillage,
  setDriftKind,
  skipTime,
} from "../../game/dev.ts";
import type { BotName } from "../../game/dev.ts";
import { readDevMode, DEV_KEY } from "../../game/devMode.ts";
import { VillagePanel } from "../../components/VillagePanel";
import { WorkforcePanel } from "../../components/WorkforcePanel";

const SECTIONS: ReadonlyArray<{ title: string; ids: readonly ItemId[] }> = [
  { title: "Jobs", ids: ["forager", "woodcutter", "builder"] },
  { title: "Housing", ids: ["hut", "house"] },
  { title: "Storage", ids: ["granary", "woodshed"] },
  { title: "Machines", ids: ["autoForager", "sawmillBot", "builderDrone"] },
  { title: "Projects", ids: ["research", "exploit"] },
];

export interface GamePageProps {
  /** Passed to `useGame`. Tests use it to control the clock and storage. */
  options?: UseGameOptions;
  /** Force developer tools on or off. Defaults to the address and the saved choice. */
  dev?: boolean;
}

/** The game screen. A container: it owns the game state and wires it into presentational parts. */
export function GamePage({ options, dev }: GamePageProps) {
  const game = useGame(options);
  const { settings, setNotation } = useSettings(options?.storage);
  const { state } = game;
  const [quantity, setQuantity] = useState<BuyQuantity>(1);
  const [devMode, setDevMode] = useState(() => dev ?? readDevMode(window.location.search));
  const [bot, setBot] = useState<BotName>("balanced");
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
  const offeredUpgrades = UPGRADES.filter((def) =>
    isUpgradeAvailable(state, def) ? unlocked(`upgrade:${def.id}`) : false,
  ).map((def) => ({
    id: def.id,
    name: def.label,
    description: def.description,
    effect: def.effect,
    cost: def.cost,
    currency: CURRENCY_NAME[def.currency],
    affordable: state[def.currency] >= def.cost,
  }));
  const policies = CONFIG.policies;
  const news = useNewAchievements(state.achievements, game.away !== null);
  const toastTitle = ACHIEVEMENTS.find((a) => a.id === news.current)?.title ?? null;
  const achievementItems = ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    hint: a.hint,
    flavour: a.flavour,
    earned: state.achievements.includes(a.id),
  }));
  const phase = phaseOf(state);
  const devReadout = [
    { label: "Game time", value: formatDuration(state.time) },
    { label: "Stage", value: String(state.stage) },
    {
      label: "Villagers",
      value: `${state.population} of ${bedsOf(state.owned, state.upgrades)} beds`,
    },
    { label: "Idle hands", value: String(idleHands(state)) },
    { label: "Morale", value: state.morale.toFixed(1) },
    {
      label: "Drift",
      value: `${Math.round(state.drift)} (compassion ${compassionIndex(state.drift).toFixed(2)})`,
    },
    { label: "Food per second, net", value: netFoodRate(state).toFixed(2) },
    { label: "Food cap", value: String(Math.round(capOf(state, "food"))) },
    { label: "Wood cap", value: String(Math.round(capOf(state, "wood"))) },
    { label: "Walkouts", value: String(state.walkouts) },
  ];
  const stats = endStats(state);
  const statRows = [
    { label: "Time played", value: formatDuration(stats.seconds) },
    { label: "Villagers hired", value: String(stats.villagers) },
    { label: "Machines built", value: String(stats.machines) },
    { label: "Rest days taken", value: String(stats.restDays) },
    { label: "Walkouts", value: String(stats.walkouts) },
    { label: "Research levels", value: String(stats.researchLevels) },
    { label: "Exploits", value: String(stats.exploits) },
  ];
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
          <Link
            href="../"
            color="text.secondary"
            underline="hover"
            sx={{ display: "inline-flex", alignItems: "center", minHeight: TOUCH_TARGET }}
          >
            Back to a-crawley.com
          </Link>
        </Box>
        <AwaySummaryDialog summary={game.away} onClose={game.dismissAway} />
        <AchievementToast title={toastTitle} onClose={news.dismiss} />
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
          {phase !== "ended" && (
            <ResourceCounter
              label="Food"
              value={state.food}
              perSecond={rates.food}
              upkeep={upkeepPerSecond(state)}
              capacity={unlocked("storage") ? capOf(state, "food") : undefined}
            />
          )}
          {phase !== "ended" && (unlocked("wood") || unlocked("infra")) && (
            <Stack direction="row" spacing={4}>
              {unlocked("wood") && (
                <ResourceCounter
                  label="Wood"
                  value={state.wood}
                  perSecond={rates.wood}
                  capacity={unlocked("storage") ? capOf(state, "wood") : undefined}
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
          {phase === "playing" && (
            <>
              <GatherButton
                label="Gather food"
                gain={foodPerClick(state)}
                onGather={game.gatherFood}
              />
              <LookUpAction
                unlocked={unlocked("lookUp")}
                sighting={unlocked("lookedUp") ? sighting(state.stage, state.time) : null}
                onLookUp={game.lookUp}
              />
              {unlocked("morale") && (
                <MoraleMeter
                  morale={state.morale}
                  reasons={moraleDrivers(state).map((d) => ({
                    label: MORALE_DRIVER_LABELS[d.id],
                    lifting: d.perSecond > 0,
                  }))}
                  status={
                    isResting(state) ? "resting" : isWalkingOut(state) ? "walkout" : undefined
                  }
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
              {unlocked("village") && (
                <VillagePanel
                  population={state.population}
                  beds={bedsOf(state.owned, state.upgrades)}
                  unemployed={unemployed(state)}
                  foodMade={rates.food}
                  foodEaten={upkeepPerSecond(state)}
                  hungry={isHungry(state)}
                />
              )}
              {unlocked("workforce") && (
                <WorkforcePanel
                  idle={idleHands(state)}
                  operators={staffedOperators(state)}
                  retrainCost={retrainCost(state)}
                  canRetrain={state.food >= retrainCost(state)}
                  onRedeploy={game.redeploy}
                  onRetrain={game.retrain}
                  onRelease={game.release}
                />
              )}
              {unlocked("bulkBuying") && shop.some((section) => section.defs.length > 0) && (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <QuantitySelector
                    value={quantity}
                    options={BUY_QUANTITIES}
                    onChange={setQuantity}
                  />
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
                        const noOneFree = isJob(def.id) && unemployed(state) === 0;
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
                            blockedReason={
                              noOneFree
                                ? "Nobody is free to take the job. More villagers move in when there are beds."
                                : undefined
                            }
                            onBuy={() => game.buyItem(def.id, quantity)}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                ),
              )}
              {(offeredUpgrades.length > 0 || state.upgrades.length > 0) && (
                <UpgradeList
                  items={offeredUpgrades}
                  bought={state.upgrades.map((id) => upgradeDef(id).label)}
                  onBuy={(id) => game.buyUpgrade(id as UpgradeId)}
                />
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
                      description={`Food purchases cost ${Math.round((1 - policies.rationsOptimisation.foodCostFactor) * 100)}% less and villagers eat ${Math.round((1 - policies.rationsOptimisation.upkeepFactor) * 100)}% less. Drains morale.`}
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
            </>
          )}
          {phase === "choice" && (
            <FinalChoice
              title={FINAL_CHOICE.title}
              body={FINAL_CHOICE.body}
              action={FINAL_CHOICE.action}
              odds={finalOddsWord(state)}
              onChoose={game.breakOut}
            />
          )}
          {state.ending !== null && (
            <EndingScreen
              title={ENDING_COPY[state.ending].title}
              paragraphs={ENDING_COPY[state.ending].paragraphs}
              reveal={REVEAL}
              verdict={VERDICT[temperamentOf(state.drift)]}
              stats={statRows}
              onNewGame={game.resetGame}
            />
          )}
          <EventLog title="Village log" lines={logLines(state)} />
          <Accordion disableGutters variant="outlined">
            <AccordionSummary>
              Achievements ({state.achievements.length}/{ACHIEVEMENTS.length})
            </AccordionSummary>
            <AccordionDetails>
              <AchievementList items={achievementItems} />
            </AccordionDetails>
          </Accordion>
          <Accordion disableGutters variant="outlined">
            <AccordionSummary>Settings</AccordionSummary>
            <AccordionDetails>
              <NotationPicker value={settings.notation} onChange={setNotation} />
            </AccordionDetails>
          </Accordion>
          {devMode && (
            <Accordion disableGutters variant="outlined">
              <AccordionSummary>Developer tools</AccordionSummary>
              <AccordionDetails>
                <DevTools
                  readout={devReadout}
                  bots={BOT_NAMES}
                  bot={bot}
                  onBotChange={(name) => setBot(name as BotName)}
                  onSkip={(seconds) => game.apply((s) => skipTime(s, seconds))}
                  onPlay={(goal) =>
                    game.apply((s) =>
                      autoplay(
                        s,
                        bot,
                        goal === "ten-minutes"
                          ? { kind: "seconds", seconds: 600 }
                          : goal === "stage-2"
                            ? { kind: "stage", stage: 2 }
                            : goal === "stage-3"
                              ? { kind: "stage", stage: 3 }
                              : { kind: "choice" },
                      ),
                    )
                  }
                  onGrant={() => game.apply(grantResources)}
                  onRefresh={() => game.apply(refreshVillage)}
                  onVillagers={() => game.apply((s) => addVillagers(s, 10))}
                  onDrift={(kind) => game.apply((s) => setDriftKind(s, kind))}
                  onTurnOff={() => {
                    try {
                      window.localStorage.removeItem(DEV_KEY);
                    } catch {
                      // Nothing to clear when storage is blocked.
                    }
                    setDevMode(false);
                  }}
                />
              </AccordionDetails>
            </Accordion>
          )}
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
