import { Box, Button, Typography } from "@mui/material";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";

export interface WorkforcePanelProps {
  /** Villagers a machine has displaced and who are still between opportunities. */
  idle: number;
  /** Villagers already retrained to run machines. */
  operators: number;
  /** Food to retrain one villager. */
  retrainCost: number;
  /** Whether the village can pay for a retrain right now. */
  canRetrain: boolean;
  onRedeploy: () => void;
  onRetrain: () => void;
  onRelease: () => void;
}

/** What to do with the people machines have replaced. Each choice moves the village a little. */
export function WorkforcePanel({
  idle,
  operators,
  retrainCost,
  canRetrain,
  onRedeploy,
  onRetrain,
  onRelease,
}: WorkforcePanelProps) {
  const format = useNumberFormat();
  return (
    <Box component="section" aria-labelledby="workforce-title">
      <Typography component="h2" variant="h6" id="workforce-title">
        Workforce transition
      </Typography>
      <Typography color="text.secondary">
        {idle > 0
          ? `${format.amount(idle)} ${idle === 1 ? "villager is" : "villagers are"} between opportunities. They still eat and still need a bed.`
          : "Nobody is between opportunities at the moment."}
        {operators > 0 && ` ${format.amount(operators)} now run machines.`}
      </Typography>
      {idle > 0 && (
        <Box sx={{ display: "grid", gap: 1.5, mt: 1.5 }}>
          <Box>
            <Button variant="outlined" onClick={onRedeploy}>
              Redeploy to odd jobs
            </Button>
            <Typography variant="body2" color="text.secondary">
              Free. They find a little food each, nowhere near a proper hire.
            </Typography>
          </Box>
          <Box>
            <Button variant="contained" disabled={!canRetrain} onClick={onRetrain}>
              Retrain as operator ({format.amount(retrainCost)} food)
            </Button>
            <Typography variant="body2" color="text.secondary">
              Operators make machines produce more.
            </Typography>
          </Box>
          <Box>
            <Button variant="outlined" color="inherit" onClick={onRelease}>
              Release
            </Button>
            <Typography variant="body2" color="text.secondary">
              They leave. The village eats less and morale drops.
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
