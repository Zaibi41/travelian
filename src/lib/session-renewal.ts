// What happens when the gateway says the session is no longer valid (401): one refresh attempt,
// shared by every request that hits the 401 at the same time; if it fails the session is cleared
// and the admin guard sends the person to sign-in with "Your session expired. Sign in again."

import { clearSession } from "@/lib/auth-session";
import { refreshCognitoSession } from "@/lib/cognito-auth";

let inflight: Promise<boolean> | null = null;

/** Try the normal token refresh once. True when a new access token is stored. */
export function renewSession(): Promise<boolean> {
  inflight ??= refreshCognitoSession()
    .then(session => Boolean(session?.accessToken))
    .catch(() => false)
    .finally(() => {
      setTimeout(() => {
        inflight = null;
      }, 0);
    });
  return inflight;
}

/** The session can't be renewed: clear it (the admin guard then redirects to sign-in). */
export function expireSession() {
  clearSession();
}

let signingOut = false;
/** The person chose Sign out (not an expiry): the guard shows no "expired" message. */
export function markUserSignOut() {
  signingOut = true;
  setTimeout(() => {
    signingOut = false;
  }, 2000);
}
export const isUserSignOut = () => signingOut;
