import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { LoginRequest } from "@shared/schema";
import { authFetch, setToken, clearToken } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useLocation } from "wouter";

async function fetchCurrentUser() {
  const res = await authFetch(api.auth.me.path);

  if (!res.ok) {
    if (res.status === 401) return null;
    throw new Error(await getApiErrorMessage(res, "Failed to fetch user"));
  }

  return api.auth.me.responses[200].parse(await res.json());
}

export function useUser() {
  return useQuery({
    queryKey: [api.auth.me.path],
    queryFn: fetchCurrentUser,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Login failed"));
      }

      const data = api.auth.login.responses[200].parse(await res.json());

      setToken(data.token);
      return data.user;
    },
    onSuccess: async (user) => {
      queryClient.setQueryData([api.auth.me.path], user);

      await queryClient.invalidateQueries({
        queryKey: [api.auth.me.path],
      });

      if (user.role === "admin") setLocation("/admin");
      else if (user.role === "customer") setLocation("/portal");
      else setLocation("/dashboard");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.auth.register.path, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Registration failed"));
      }

      const data = api.auth.register.responses[201].parse(await res.json());

      if (data.token) {
        setToken(data.token);
      }

      return data;
    },
    onSuccess: async (result) => {
      if (result.token) {
        queryClient.setQueryData([api.auth.me.path], result.user);

        await queryClient.invalidateQueries({
          queryKey: [api.auth.me.path],
        });

        if (result.user.role === "admin") setLocation("/admin");
        else if (result.user.role === "customer") setLocation("/portal");
        else setLocation("/dashboard");
        return;
      }

      queryClient.setQueryData([api.auth.me.path], null);
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
