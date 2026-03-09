import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertMedicineBatch } from "@shared/routes";
import { authFetch } from "@/lib/auth";

export function useBatches() {
  return useQuery({
    queryKey: [api.batches.list.path],
    queryFn: async () => {
      const res = await authFetch(api.batches.list.path);
      if (!res.ok) throw new Error("Failed to fetch batches");
      return api.batches.list.responses[200].parse(await res.json());
    },
  });
}

export function useBatch(batchId: string) {
  return useQuery({
    queryKey: [api.batches.get.path, batchId],
    queryFn: async () => {
      const url = buildUrl(api.batches.get.path, { batchId });
      const res = await authFetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch batch details");
      return api.batches.get.responses[200].parse(await res.json());
    },
    enabled: !!batchId,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertMedicineBatch) => {
      const res = await authFetch(api.batches.create.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create medicine batch");
      return api.batches.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.batches.list.path] });
    },
  });
}

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      batchId,
      status,
      txHash,
      chainId,
      blockNumber,
      contractAddress,
    }: {
      batchId: string;
      status: string;
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    }) => {
      const url = buildUrl(api.batches.updateStatus.path, { batchId });
      const res = await authFetch(url, {
        method: "PATCH",
        body: JSON.stringify({ status, txHash, chainId, blockNumber, contractAddress }),
      });
      if (!res.ok) throw new Error("Failed to update batch status");
      return api.batches.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.batches.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.batches.get.path, data.batchId] });
    },
  });
}
