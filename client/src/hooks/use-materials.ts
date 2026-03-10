import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertMaterial } from "@shared/schema";
import { authFetch } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";

export function useMaterials() {
  return useQuery({
    queryKey: [api.materials.list.path],
    queryFn: async () => {
      const res = await authFetch(api.materials.list.path);
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch materials"));
      return api.materials.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertMaterial) => {
      const res = await authFetch(api.materials.create.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to create material"));
      return api.materials.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.materials.list.path] });
    },
  });
}

