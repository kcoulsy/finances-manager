import { useQuery } from "@tanstack/react-query";
import { getTransactionsAction } from "../actions/get-transactions.action";
import type { GetTransactionsInput } from "../schemas/transaction.schema";

type TransactionWithRelations = {
  id: string;
  date: Date | string;
  amount: number;
  description: string;
  type: "DEBIT" | "CREDIT" | "TRANSFER";
  isTransfer: boolean;
  notes: string | null;
  tags: string[] | null;
  financialAccount: { id: string; name: string; currency: string | null };
  category: { id: string; name: string; color: string | null } | null;
};

export function useTransactions(input: GetTransactionsInput) {
  return useQuery({
    queryKey: ["transactions", input],
    queryFn: async () => {
      const result = await getTransactionsAction(input);
      if (result?.serverError) {
        throw new Error(result.serverError);
      }
      if (!result?.data?.success) {
        throw new Error("Failed to fetch transactions");
      }
      return {
        transactions: result.data.transactions as TransactionWithRelations[],
        total: result.data.total,
      };
    },
  });
}

