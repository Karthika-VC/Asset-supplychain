import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertFeedback } from "@shared/schema";
import { authFetch } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertFeedback) => {
      const res = await authFetch(api.feedback.create.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to submit feedback"));
      return api.feedback.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.feedback.list.path] });
    },
  });
}
