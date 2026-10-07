# Look Up: engine overview (GAME-9)

The game core lives in `src/game/` as pure TypeScript with no React or DOM imports. React only
touches it through `src/hooks/useGame.ts`.

| Module       | Responsibility                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `config.ts`  | Every tunable number and the item list (shared with the simulation)                                               |
| `economy.ts` | Cost and bulk-buy maths                                                                                           |
| `engine.ts`  | Rules: production, morale, policies, drift, stages. Mutates the state it is given, so it is only called on copies |
| `state.ts`   | `GameState`: plain serialisable data plus `version` and `lastTickAt`                                              |
| `tick.ts`    | `tick(state, now)`: advance to a wall-clock time and return a new state                                           |
| `actions.ts` | `gatherFood`, `buyItem`, `setPolicy`, `takeRestDay`: each returns a new state, or the same object for a no-op     |
| `store.ts`   | A small external store: `getState`, `subscribe`, `tick`, `dispatch`                                               |
| `sim/`       | The greedy-player simulation and `npm run sim` (GAME-6)                                                           |

## How time works

- `tick` takes elapsed time from timestamp deltas, never from counting timer calls, because browsers throttle
  timers in background tabs.
- A gap is replayed in steps of at most one second, because morale, walkouts and rest days are not linear. A
  two-hour gap is 7,200 steps and takes milliseconds.
- One long tick matches many one-second ticks exactly. Uneven splits agree within a fraction of a percent.
- A clock that goes backwards adds no time. One tick replays at most 7 days.
- `useGame` refreshes every 250 ms and also ticks the moment a hidden tab becomes visible.
- Clicks are real actions in the game. The simulation instead assumes two clicks a second.

## For later tickets

- **Save system (GAME-10):** `GameState` survives `JSON.stringify` and `structuredClone` unchanged. Bump
  `STATE_VERSION` when the shape changes and migrate older saves.
- **Offline progress (GAME-13):** a long `tick` already replays the gap in full. Open decisions: a cap, and
  whether policies such as Extended Shifts keep draining morale while the player is away.
- **Bulk buying (GAME-12):** `buyItem` buys one unit. The closed-form helpers in `economy.ts` are ready for it.
