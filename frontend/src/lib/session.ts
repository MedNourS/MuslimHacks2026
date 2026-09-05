export interface SessionUser {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface AuthResponse {
  user: SessionUser;
}

const USER_KEY = "care_circle_user";

// The actual credential lives in an httpOnly cookie the backend sets on login/signup — it's
// never readable from JS, so it can't be stored here. This only ever holds the (non-sensitive)
// user info the UI displays; it is not the security boundary. That's the cookie, checked
// server-side on every protected request.
export function saveSession(user: SessionUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
}
