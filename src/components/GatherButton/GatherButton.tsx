import { useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";

export interface GatherButtonProps {
  label: string;
  /** Amount one click adds. Shown in the floating "+N" pop-ups. */
  gain: number;
  onGather: () => void;
}

interface Pop {
  id: number;
  offset: number;
}

const MAX_POPS = 6;

/** The main button. Each click floats a "+N" up from it; the pop-ups are decoration only. */
export function GatherButton({ label, gain, onGather }: GatherButtonProps) {
  const format = useNumberFormat();
  const [pops, setPops] = useState<Pop[]>([]);
  const nextId = useRef(0);

  function handleClick() {
    onGather();
    const id = nextId.current++;
    const offset = ((id * 37) % 61) - 30;
    setPops((current) => [...current.slice(-(MAX_POPS - 1)), { id, offset }]);
  }

  function remove(id: number) {
    setPops((current) => current.filter((pop) => pop.id !== id));
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleClick}
        sx={{
          py: 2.5,
          fontSize: "1.4rem",
          transition: "transform 80ms",
          "&:active": { transform: "scale(0.98)" },
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
      >
        {label}
      </Button>
      <Box aria-hidden sx={{ pointerEvents: "none", position: "absolute", inset: 0 }}>
        {pops.map((pop) => (
          <Box
            key={pop.id}
            onAnimationEnd={() => remove(pop.id)}
            sx={{
              position: "absolute",
              top: 0,
              left: `calc(50% + ${pop.offset}px)`,
              fontWeight: 700,
              color: "primary.main",
              animation: "gather-pop 0.9s ease-out forwards",
              "@keyframes gather-pop": {
                from: { opacity: 1, transform: "translateY(0)" },
                to: { opacity: 0, transform: "translateY(-48px)" },
              },
              "@media (prefers-reduced-motion: reduce)": { animationDuration: "0.01s" },
            }}
          >
            +{format.amount(gain)}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
