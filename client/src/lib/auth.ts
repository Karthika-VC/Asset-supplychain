export function setToken(newToken: string) {
  localStorage.setItem("token", newToken);
  console.log("TOKEN SAVED:", newToken);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = localStorage.getItem("token");
  console.log("TOKEN USED:", token);

  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
