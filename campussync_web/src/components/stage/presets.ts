/**
 * How the one shared 3D scene is framed on each screen.
 *
 * The rule behind these numbers: the scene gets exactly as much of the frame
 * as the screen's content can spare. A landing page has nothing to read, so
 * the scene is the subject. A settings form is all small text and inputs, so
 * the scene is pushed almost entirely out of the way. Everything in between
 * gives the scene one edge of the frame and keeps the content on the other.
 */

export type StageName =
  | 'landing' | 'login' | 'dashboard' | 'courses'
  | 'assignments' | 'calendar' | 'friends' | 'settings';

export interface StagePreset {
  /** Opacity of the live scene. */
  opacity: number;
  scale: number;
  /** Offsets, as CSS lengths — percentages resolve against the viewport box. */
  x: string;
  y: string;
  /** Depth-of-field. Anything above ~4px reads as "behind the glass". */
  blur: number;
  /** Flat wash of page colour over the scene — the readability dial. */
  veil: number;
  /** Darkened edges, so panels floating over the scene keep their outline. */
  vignette: number;
  /** How much of the CSS aurora shows through while the scene is up. */
  field: number;
  /** Pixels the layer drifts with the pointer on non-interactive screens. */
  parallax: number;
  /** Whether the scene itself receives clicks and hovers. */
  interactive: boolean;
}

export const STAGE_PRESETS: Record<StageName, StagePreset> = {
  /* The scene is the product shot. Full frame, live to the cursor, barely
     veiled — the copy sits in the left third where the layout keeps it clear. */
  landing: {
    opacity: 1, scale: 1.04, x: '14%', y: '0%', blur: 0,
    veil: 0.16, vignette: 0.55, field: 0.5, parallax: 0, interactive: true,
  },

  /* One card, dead centre. The scene is blown up and thrown out of focus so it
     becomes texture behind the form rather than competition for it. */
  login: {
    opacity: 0.85, scale: 1.55, x: '0%', y: '-4%', blur: 7,
    veil: 0.62, vignette: 0.85, field: 0.7, parallax: 14, interactive: false,
  },

  /* A companion in the top-right corner: present while you read your morning
     numbers, never over the column of deadlines on the left. */
  dashboard: {
    opacity: 0.55, scale: 0.95, x: '30%', y: '-16%', blur: 2,
    veil: 0.52, vignette: 0.7, field: 0.65, parallax: 18, interactive: false,
  },

  /* A three-column card grid fills the frame, so the scene drops back to a
     faint glow low on the page. */
  courses: {
    opacity: 0.3, scale: 1.25, x: '-22%', y: '26%', blur: 9,
    veil: 0.72, vignette: 0.8, field: 0.85, parallax: 10, interactive: false,
  },

  /* A rail down the right edge. The list is long and left-aligned; the scene
     holds the margin and gives the page somewhere to breathe. */
  assignments: {
    opacity: 0.4, scale: 0.8, x: '38%', y: '6%', blur: 5,
    veil: 0.62, vignette: 0.78, field: 0.75, parallax: 16, interactive: false,
  },

  /* A dense 7×6 grid of small numbers — the least room of any screen. The
     scene sinks to the bottom-left and stays out of the grid entirely. */
  calendar: {
    opacity: 0.26, scale: 1.1, x: '-30%', y: '30%', blur: 11,
    veil: 0.76, vignette: 0.82, field: 0.9, parallax: 8, interactive: false,
  },

  /* Centred and open, like a room the people on this page are standing in. */
  friends: {
    opacity: 0.42, scale: 1.3, x: '0%', y: '-6%', blur: 8,
    veil: 0.7, vignette: 0.78, field: 0.8, parallax: 12, interactive: false,
  },

  /* Toggles, a phone number, a delete-my-data button. Nothing here benefits
     from a moving object behind it. */
  settings: {
    opacity: 0.16, scale: 1.6, x: '34%', y: '34%', blur: 16,
    veil: 0.84, vignette: 0.86, field: 0.95, parallax: 6, interactive: false,
  },
};
