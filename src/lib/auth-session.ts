// Frontend-only mock auth session backed by localStorage.

const KEY = "travelian.session.v1";

export interface AuthSession {
  email: string;
  name: string;
  createdAt: string;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
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

export function useSessionEvent(cb: () => void) {
  // For React: subscribe to storage + custom session event
  const handler = () => cb();
  window.addEventListener("travelian:session", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("travelian:session", handler);
    window.removeEventListener("storage", handler);
  };
}
