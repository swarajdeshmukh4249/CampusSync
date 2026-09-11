# CampusSync — web

React + TypeScript + Vite front end for CampusSync.

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api → FastAPI on :8081
npm run build    # tsc -b && vite build
npm run lint
```

---

## The design: one 3D scene, eight framings

The whole UI is built around a single Spline scene that sits behind every
screen. It is mounted **once**, in `App.tsx`, and never unmounts — pages
re-frame the same instance instead of each mounting their own. That is what
lets the 3D layer be everywhere without paying a multi-megabyte download and a
fresh WebGL context on every navigation, and it is why moving between pages
reads as a camera move rather than a cut.

```
src/components/stage/
  SplineStage.tsx   the single live scene + its fallbacks
  presets.ts        how each page frames it   ← tune the design here
  stage.css         the fixed layer, atmosphere, veil, vignette
```

### Changing the scene

One constant, in `SplineStage.tsx`:

```ts
export const SPLINE_SCENE = 'https://prod.spline.design/<id>/scene.splinecode';
```

Re-exporting from Spline produces a new id, so paste the new URL here. If the
CDN gives you CORS trouble, download the `.splinecode`, drop it in `public/`
and point the constant at `/scene.splinecode`.

### Tuning how a page uses the scene

`presets.ts` holds one entry per screen. The rule behind the numbers: **the
scene gets exactly as much of the frame as the screen's content can spare.**

| Screen | What the scene does |
|---|---|
| `landing` | Full frame, live to the cursor. It *is* the product shot. |
| `login` | Blown up and thrown out of focus behind one centred card. |
| `dashboard` | A companion in the top-right, clear of the deadline column. |
| `courses` | A faint glow low on the page — the card grid owns the frame. |
| `assignments` | A rail down the right edge; the list owns the left. |
| `calendar` | Sunk bottom-left, out of the dense month grid entirely. |
| `friends` | Centred and open, like a room the people are standing in. |
| `settings` | Almost entirely off. Nothing on a form wants a moving object. |

Each preset controls `opacity`, `scale`, `x`/`y`, `blur`, `veil` (flat wash of
page colour — the readability dial), `vignette`, `field` (how much of the CSS
aurora shows through), `parallax`, and `interactive`.

**If the scene hijacks page scroll on the landing page**, set
`landing.interactive` to `false`. The pointer-parallax in `SplineStage` then
carries the sense of depth instead, and nothing can eat a wheel event.

### When there is no scene

`SplineStage` never assumes WebGL. It skips the scene entirely under
`prefers-reduced-motion`, on viewports under 720px, and with Save-Data on; and
it falls back if the load fails for any reason. In all of those cases the CSS
depth field (aurora + coordinate grid) carries the backdrop on its own, so
every layout still reads as designed. **This is worth testing** — throttle the
network or set `shouldSkipWebGL` to `true` and click through the app.

### Scroll-driven scenes

`App.tsx` measures page scroll and `SplineStage` pushes it into the scene as a
`scrollProgress` variable (0 → 1). If your Spline scene declares a variable by
that name, animations bound to it stay in step with the page. Scenes without
it ignore the write.

---

## The token layer

`src/styles/design-system.css` is the single source of colour, type, spacing
and motion. Two things there are easy to get wrong:

- **`--color-*` vs `--state-*`.** `--color-*` are the brand values, tuned for
  the dark void and used for glows, gradients and fills. `--state-*` are the
  same meanings tuned for *contrast* and they change with the theme — the mid
  amber that sings on near-black is unreadable on porcelain. Anything that
  carries meaning as text or as a badge should use `--state-*`.
- **Alpha.** The state colours are CSS variables, so `${color}1F` is not a
  colour. Use `tint(color, percent)` from `src/lib/format.ts`, which builds a
  `color-mix()`.

Surfaces are glass by default (`Card variant="glass"`) because the scene has to
show through. Use `variant="solid"` or the `.panel-opaque` class for anything
with dense small text or a password field.

## Component map

```
components/
  ui/AppShell.tsx   signed-in chrome: floating nav capsule, mobile tab bar,
                    notification panel, and the shared page header
  ui/Bits.tsx       Badge, Metric, SectionTitle, Empty, Meter
  ui/Modal.tsx      the one dialog, plus fieldClass / Label / ErrorNote
  ui/Card.tsx       glass | solid | elevated | accent
  ui/Button.tsx     primary | secondary | ghost | outline | danger
  ui/DataState.tsx  loading / error / empty, in the shape of the real rows
```
