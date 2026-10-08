import { Box, LinearProgress, Typography } from "@mui/material";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";

export interface VillagePanelProps {
  population: number;
  beds: number;
  /** Villagers without a job: free to be hired. */
  unemployed: number;
  /** Food the village makes each second (clicks left out). */
  foodMade: number;
  /** Food the villagers eat each second. */
  foodEaten: number;
  /** True once the village has been short of food long enough to notice. */
  hungry: boolean;
}

type FoodState = "growing" | "steady" | "falling" | "hungry";

function foodState(made: number, eaten: number, hungry: boolean): FoodState {
  if (hungry) return "hungry";
  const net = made - eaten;
  if (net > 0.005) return "growing";
  if (net < -0.005) return "falling";
  return "steady";
}

const FOOD_TEXT: Record<FoodState, string> = {
  growing: "Fed, with some to spare",
  steady: "Fed, with nothing to spare",
  falling: "Eating into the stores",
  hungry: "Hungry",
};

/** The village at a glance: how many people, how many beds, who needs work and whether they are fed. */
export function VillagePanel({
  population,
  beds,
  unemployed,
  foodMade,
  foodEaten,
  hungry,
}: VillagePanelProps) {
  const format = useNumberFormat();
  const free = Math.max(0, beds - population);
  const filled = beds > 0 ? Math.min(100, Math.round((population / beds) * 100)) : 100;
  const state = foodState(foodMade, foodEaten, hungry);
  const rows: Array<{ label: string; value: string; note?: string }> = [
    { label: "Villagers", value: format.amount(population) },
    {
      label: "Without a job",
      value: format.amount(unemployed),
      note: unemployed > 0 ? "free to hire" : "everyone is working",
    },
    {
      label: "Beds",
      value: format.amount(beds),
      note: free > 0 ? `${format.amount(free)} free` : "full: build more to let people in",
    },
    {
      label: "Food",
      value: FOOD_TEXT[state],
      note:
        foodEaten > 0
          ? `${format.rate(foodMade)} made, ${format.rate(foodEaten)} eaten per second`
          : undefined,
    },
  ];
  return (
    <Box component="section" aria-labelledby="village-title">
      <Typography component="h2" variant="h6" id="village-title">
        Village
      </Typography>
      <LinearProgress
        variant="determinate"
        value={filled}
        color={hungry ? "error" : "primary"}
        aria-label="Beds filled"
        aria-valuetext={`${format.amount(population)} villagers in ${format.amount(beds)} beds`}
        sx={{ height: 8, borderRadius: 4, my: 1 }}
      />
      <Box component="dl" sx={{ m: 0, display: "grid", rowGap: 0.75 }}>
        {rows.map((row) => (
          <Box
            key={row.label}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              alignItems: "baseline",
            }}
          >
            <Typography component="dt" color="text.secondary">
              {row.label}
            </Typography>
            <Box component="dd" sx={{ m: 0, textAlign: "right" }}>
              <Typography
                component="span"
                sx={{ display: "block", fontWeight: 700 }}
                color={row.label === "Food" && hungry ? "error.light" : "text.primary"}
              >
                {row.value}
              </Typography>
              {row.note && (
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  {row.note}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
