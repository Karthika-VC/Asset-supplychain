import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertTransfer } from "@shared/routes";
import { authFetch } from "@/lib/auth";

export function useTransfers() {
  return useQuery({
    queryKey: [api.transfers.list.path],
    queryFn: async () => {
      const res = await authFetch(api.transfers.list.path);
      if (!res.ok) throw new Error("Failed to fetch transfers");
      return api.transfers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertTransfer) => {
      const res = await authFetch(api.transfers.create.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to record transfer");
      return api.transfers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transfers.list.path] });
    },
  });
}
