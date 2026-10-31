import { useEffect, useState, type ReactNode } from 'react';
import { debugEnabled, setDebug } from '@/lib/debug';

/**
 * Wraps authenticated admin pages and renders a collapsible debug panel.
 * Only visible when NAD debug logging is enabled.
 */
export default function DebugBoundary({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(() => debugEnabled());
  const [open, setOpen] = useState(false);

  // Keep in sync if another tab flips the flag.
  useEffect(() => {
    const sync = () => setOn(debugEnabled());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  if (!on) return <>{children}</>;

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold text-[hsl(var(--card-foreground))]"
        >
          <span>NAD debug</span>
          <span className="flex items-center gap-2 text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
            ON
            <span aria-hidden>{open ? '▲' : '▼'}</span>
          </span>
        </button>

        {open && (
          <div className="space-y-2 border-t border-[hsl(var(--border))] px-4 py-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
            <p>
              Open DevTools → Console and filter <code className="text-[hsl(var(--primary))]">NAD-DEBUG</code>.
              Every cross-origin request is logged with status and timing.
            </p>
            <p>Auth failures usually mean:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>403 → origin not in the backend CORS list</li>
              <li>401 → token missing or expired</li>
              <li>400 → backend proxy call failed (check its own logs)</li>
              <li>Network error → blocked, offline, or preflight</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setDebug(false);
                setOn(false);
                location.reload();
              }}
              className="mt-1 w-full rounded-md border border-[hsl(var(--border))] px-2 py-1.5 text-[10px] font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"
            >
              Disable and reload
            </button>
          </div>
        )}
      </div>
    </>
  );
}