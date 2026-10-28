/** Pause bars (while playing) or a play triangle (while paused) — drawn, not font glyphs, so they look the same everywhere. */
export function PlayPauseIcon({ playing, size = 12 }: { playing: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {playing ? (
        <>
          <rect x="2" y="1.5" width="2.8" height="9" rx="0.8" fill="currentColor" />
          <rect x="7.2" y="1.5" width="2.8" height="9" rx="0.8" fill="currentColor" />
        </>
      ) : (
        <path d="M3 1.6v8.8l7.4-4.4z" fill="currentColor" />
      )}
    </svg>
  );
}
