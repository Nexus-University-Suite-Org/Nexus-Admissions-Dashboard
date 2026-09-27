import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * Rendered when a list query fails. Without this, a failed query is
 * indistinguishable from an empty one: the page shows "no records yet" and
 * invites the admin to create a record that will then fail to save.
 */
export function QueryErrorState({
  resource,
  error,
  onRetry,
}: {
  resource: string;
  error: unknown;
  onRetry?: () => void;
}) {
  const status = (error as { status?: number } | null)?.status;
  const isAuth = status === 401 || status === 403;

  const detail = isAuth
    ? "Your admin session is not valid for the admissions backend. This is a " +
      "signing-key mismatch between services, not missing data — nothing " +
      "needs creating. Sign out and back in, and confirm both services were " +
      "started with the same JWT_SECRET."
    : (error as { message?: string })?.message ||
      "The request did not complete.";

  return (
    <div
      role="alert"
      className="nexus-card rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center"
    >
      <AlertCircle
        size={36}
        className="mx-auto mb-3 text-red-600 dark:text-red-400"
      />
      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
        Couldn&apos;t load {resource}
        {status ? ` (HTTP ${status})` : ""}
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-xs text-[hsl(var(--muted-foreground))]">
        {detail}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium hover:bg-[hsl(var(--muted))]"
        >
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  );
}
