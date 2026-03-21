import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";

export function usePendingUsers() {
  return useQuery({
    queryKey: [api.admin.pendingUsers.path],
    queryFn: async () => {
      const res = await authFetch(api.admin.pendingUsers.path);
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Failed to fetch pending users"));
      }
      return api.admin.pendingUsers.responses[200].parse(await res.json());
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: [api.admin.users.path],
    queryFn: async () => {
      const res = await authFetch(api.admin.users.path);
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Failed to fetch users"));
      }
      return api.admin.users.responses[200].parse(await res.json());
    },
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.approveUser.path, { id });
      const res = await authFetch(url, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Failed to approve user"));
      }
      return api.admin.approveUser.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.pendingUsers.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    },
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.rejectUser.path, { id });
      const res = await authFetch(url, {
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Failed to reject user"));
      }
      return api.admin.rejectUser.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.pendingUsers.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    },
  });
}
