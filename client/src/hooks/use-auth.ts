import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest, type RegisterRequest } from "@shared/routes";
import { authFetch, setToken, clearToken } from "@/lib/auth";
import { useLocation } from "wouter";

export function useUser() {
  return useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await authFetch(api.auth.me.path);
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to fetch user");
      }
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await authFetch(api.auth.login.path, {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(err.message || "Login failed");
      }
      const data = api.auth.login.responses[200].parse(await res.json());
      setToken(data.token);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      if (user.role === 'customer') setLocation("/portal");
      else setLocation("/dashboard");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await authFetch(api.auth.register.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(err.message || "Registration failed");
      }
      const responseData = api.auth.register.responses[201].parse(await res.json());
      setToken(responseData.token);
      return responseData.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      if (user.role === 'customer') setLocation("/portal");
      else setLocation("/dashboard");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return () => {
    clearToken();
    queryClient.setQueryData([api.auth.me.path], null);
    setLocation("/");
  };
}
