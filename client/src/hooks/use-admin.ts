import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch } from "@/lib/auth";

export function useUsers() {
  return useQuery({
    queryKey: [api.admin.users.path],
    queryFn: async () => {
      const res = await authFetch(api.admin.users.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.admin.users.responses[200].parse(await res.json());
    },
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isApproved, walletAddress }: { id: number, isApproved: boolean, walletAddress?: string }) => {
      const url = buildUrl(api.admin.approveUser.path, { id });
      const res = await authFetch(url, {
        method: "PATCH",
        body: JSON.stringify({ isApproved, walletAddress }),
      });
      if (!res.ok) throw new Error("Failed to approve user");
      return api.admin.approveUser.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
    },
  });
}
