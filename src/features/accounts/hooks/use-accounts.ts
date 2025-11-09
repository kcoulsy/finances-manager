import { useQuery } from "@tanstack/react-query";
import { getAccountsAction } from "../actions/get-accounts.action";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await getAccountsAction({});
      if (result?.serverError) {
        throw new Error(result.serverError);
      }
      if (!result?.data?.success) {
        throw new Error("Failed to fetch accounts");
      }
      return result.data.accounts;
    },
  });
}

