const KEY = "unixcorn_auth";
const PASSWORD = process.env.NEXT_PUBLIC_AUTH_PASSWORD ?? "unixcorn";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function login(password: string): boolean {
  if (password !== PASSWORD) return false;
  localStorage.setItem(KEY, "1");
  return true;
}

export function logout(): void {
  localStorage.removeItem(KEY);
}
