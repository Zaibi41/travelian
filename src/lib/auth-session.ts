// Browser session cache for the current Cognito-authenticated user.

const KEY = "travelian.session.v1";

export interface AuthSession {
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  provider?: string;
  sub?: string;
  groups?: string[];
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.email?.endsWith("@travelian-sso.local")) {
      localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(s: AuthSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("travelian:session"));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("travelian:session"));
}

/** Subscribe to session changes (this tab's session event and other tabs' storage). Returns the unsubscribe function. */
export function onSessionEvent(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("travelian:session", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("travelian:session", handler);
    window.removeEventListener("storage", handler);
  };
}
