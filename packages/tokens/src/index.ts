// Re-exports the AulaWM design tokens (color, type, spacing, radius, motion,
// layout) extracted from the design handoff's `tokens.json`. Consume the CSS
// custom properties via `@aulawm/tokens/css` (imported once in the web app's
// root layout); consume typed values here for anything read in TS/JS (e.g.
// building a Tailwind theme from the same source of truth).
import tokens from "./tokens.json" with { type: "json" };

export default tokens;
export type AulaWmTokens = typeof tokens;
