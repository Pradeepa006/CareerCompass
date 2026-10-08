let redirectClaimed = false;

/**
 * Claims the single allowed OAuth navigation for the current document lifetime.
 * Concurrent failed protected queries must share one nonce; otherwise a later
 * startLogin call overwrites the state cookie before the first callback returns.
 */
export function claimOAuthRedirect() {
  if (redirectClaimed) return false;
  redirectClaimed = true;
  return true;
}

// Exported only to make the redirect guard deterministic under unit test.
export function resetOAuthRedirectGuard() {
  redirectClaimed = false;
}
