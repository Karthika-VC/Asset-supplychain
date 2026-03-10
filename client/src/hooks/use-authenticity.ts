import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertAuthenticityReport } from "@shared/schema";
import { authFetch } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";

export function useAuthenticityReports() {
  return useQuery({
    queryKey: [api.authenticity.list.path],
    queryFn: async () => {
      const res = await authFetch(api.authenticity.list.path);
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch authenticity reports"));
      return api.authenticity.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAuthenticityReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertAuthenticityReport) => {
      const res = await authFetch(api.authenticity.create.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to create authenticity report"));
      return api.authenticity.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.authenticity.list.path] });
    },
  });
}
