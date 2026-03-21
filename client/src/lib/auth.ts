export function setToken(newToken: string) {
  localStorage.setItem("token", newToken);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(init.headers || {});

  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
