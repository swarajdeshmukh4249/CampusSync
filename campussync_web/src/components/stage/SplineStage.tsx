import { useCallback, useEffect, useRef, useState } from 'react';
import type { Application } from '@splinetool/runtime';
import { STAGE_PRESETS } from './presets';
import type { StageName } from './presets';
import './stage.css';

/** The scene every screen is designed around. */
export const SPLINE_SCENE = 'https://prod.spline.design/zw0fyywQ5pROWJr4/scene.splinecode';

type Status = 'idle' | 'loading' | 'ready' | 'failed';

interface SplineStageProps {
  /** Which framing the scene should hold. Changing this re-frames it smoothly. */
  stage: StageName;
  theme: 'dark' | 'light';
  /**
   * 0 → 1. Pushed into the scene as a `scrollProgress` variable so a scene
   * that was authored with one animates along with the page. Scenes without
   * that variable simply ignore it.
   */
  scrollProgress?: number;
}

/** Reasons to never start a WebGL scene at all. */
function shouldSkipWebGL(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  // Phones pay the most for a 3D scene and gain the least — the layouts below
  // are designed to stand on their own there.
  if (window.matchMedia('(max-width: 720px)').matches) return true;
  const connection = (navigator as { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return true;
  return false;
}

/**
 * One Spline scene, mounted once and kept alive for the whole session.
 *
 * Every page re-frames this same instance instead of mounting its own, which
 * is the only way the 3D layer can be everywhere without costing a ~2MB
 * download and a fresh WebGL context on every navigation. The page transition
 * then reads as a camera move rather than a cut.
 */
export default function SplineStage({ stage, theme, scrollProgress = 0 }: SplineStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  // Decided once, on mount: the answer cannot change without a reload, and
  // settling it here keeps the effect below from having to set state on its
  // very first run.
  const [webglAllowed] = useState(() => !shouldSkipWebGL());
  const [status, setStatus] = useState<Status>(() => (shouldSkipWebGL() ? 'failed' : 'loading'));
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const preset = STAGE_PRESETS[stage];

  /* --- Boot the scene once ------------------------------------------- */
  useEffect(() => {
    if (!webglAllowed) return;

    let cancelled = false;

    (async () => {
      try {
        const { Application } = await import('@splinetool/runtime');
        if (cancelled || !canvasRef.current) return;

        const app = new Application(canvasRef.current);
        await app.load(SPLINE_SCENE);
        if (cancelled) {
          app.dispose();
          return;
        }
        appRef.current = app;
        setStatus('ready');
      } catch {
        // A blocked CDN, a WebGL-less browser, a corrupted scene — all end the
        // same way: the CSS field below carries the design instead.
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
      appRef.current?.dispose();
      appRef.current = null;
    };
  }, [webglAllowed]);

  /* --- Feed the scene the page's scroll ------------------------------- */
  useEffect(() => {
    if (status !== 'ready') return;
    try {
      appRef.current?.setVariable('scrollProgress', scrollProgress);
    } catch {
      // Scene has no such variable. Nothing to do.
    }
  }, [scrollProgress, status]);

  /* --- Parallax --------------------------------------------------------
   * On app screens the scene is pointer-transparent so the UI stays clickable,
   * which also means Spline never sees the mouse. Drifting the whole layer by
   * a few pixels gives that depth back without stealing a single click.      */
  const onPointerMove = useCallback((event: PointerEvent) => {
    setPointer({
      x: event.clientX / window.innerWidth - 0.5,
      y: event.clientY / window.innerHeight - 0.5,
    });
  }, []);

  useEffect(() => {
    if (preset.interactive || !webglAllowed) return;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [preset.interactive, webglAllowed, onPointerMove]);

  const drift = preset.interactive ? 0 : preset.parallax;

  return (
    <div
      className="stage"
      data-stage={stage}
      data-status={status}
      data-theme={theme}
      aria-hidden="true"
    >
      {/* The live scene. */}
      <div
        className="stage__frame"
        style={{
          transform: `translate3d(calc(${preset.x} + ${(-pointer.x * drift).toFixed(2)}px), calc(${preset.y} + ${(-pointer.y * drift).toFixed(2)}px), 0) scale(${preset.scale})`,
          opacity: status === 'ready' ? preset.opacity : 0,
          filter: `blur(${preset.blur}px)`,
          pointerEvents: preset.interactive && status === 'ready' ? 'auto' : 'none',
        }}
      >
        <canvas ref={canvasRef} className="stage__canvas" />
      </div>

      {/* Depth field. Present always: under the scene it is the atmosphere the
          object sits in, and without the scene it is the whole backdrop. */}
      <div
        className="stage__field"
        data-standalone={status === 'failed' ? 'true' : 'false'}
        style={{ opacity: status === 'ready' ? preset.field : 1 }}
      >
        <span className="stage__aurora stage__aurora--violet" />
        <span className="stage__aurora stage__aurora--cyan" />
        <span className="stage__grid" />
      </div>

      {/* Readability veil — how much of the scene each screen can afford. */}
      <div className="stage__veil" style={{ opacity: preset.veil }} />

      {/* Vignette keeps the edges of the frame dark so floating panels read. */}
      <div className="stage__vignette" style={{ opacity: preset.vignette }} />

      {status === 'loading' && <div className="stage__loading" />}
    </div>
  );
}
