/**
 * Maps authentication failures to user-facing notifications.
 *
 * Security notes:
 * - Messages never include backend URLs, HTTP status codes, tokens, or stack
 *   traces. The detailed cause is only written to the debug console.
 * - The 401 copy is deliberately generic so it cannot be used to discover
 *   whether a given email belongs to an account (no user enumeration).
 */

export type FeedbackVariant = 'default' | 'destructive';

export interface AuthFeedback {
  title: string;
  description: string;
  variant: FeedbackVariant;
}

function getStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  return (error as { name?: unknown } | null)?.name === 'TypeError';
}

export function loginFailureFeedback(error: unknown): AuthFeedback {
  const status = getStatus(error);

  if (status === 401) {
    return {
      variant: 'destructive',
      title: 'Sign-in failed',
      description:
        "We couldn't verify those credentials. Check your email and password, then try again.",
    };
  }

  if (status === 403) {
    return {
      variant: 'destructive',
      title: 'Access denied',
      description:
        "This account isn't authorised for the admissions workspace. Contact an administrator.",
    };
  }

  if (status === 429) {
    return {
      variant: 'destructive',
      title: 'Too many attempts',
      description:
        'Sign-in is paused briefly to protect the account. Please wait a moment and try again.',
    };
  }

  if (status !== null && status >= 500) {
    return {
      variant: 'destructive',
      title: 'Service unavailable',
      description:
        'The admissions service is temporarily unavailable. Please try again in a moment.',
    };
  }

  if (isNetworkFailure(error)) {
    return {
      variant: 'destructive',
      title: "Can't reach the service",
      description:
        "We couldn't connect to the admissions service. Check your connection and try again.",
    };
  }

  return {
    variant: 'destructive',
    title: 'Sign-in failed',
    description: 'Something went wrong while signing you in. Please try again.',
  };
}

export function sessionExpiredFeedback(): AuthFeedback {
  return {
    variant: 'destructive',
    title: 'Session expired',
    description: 'For your security, please sign in again to continue.',
  };
}
