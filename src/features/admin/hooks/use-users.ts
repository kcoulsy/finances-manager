"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsersAction } from "../actions/get-users.action";
import type { GetUsersInput } from "../schemas/admin.schema";

export function useUsers(input?: GetUsersInput) {
  const page = input?.page ?? 1;
  const limit = input?.limit ?? 10;
  const search = input?.search;
  const role = input?.role;
  const emailVerified = input?.emailVerified;
  const sortBy = input?.sortBy;
  const sortOrder = input?.sortOrder;

  return useQuery({
    queryKey: [
      "users",
      page,
      limit,
      search,
      role,
      emailVerified,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const result = await getUsersAction({
        page,
        limit,
        search,
        role,
        emailVerified,
        sortBy,
        sortOrder,
      });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return {
          users: result.data.users,
          pagination: result.data.pagination,
        };
      }

      throw new Error("Failed to fetch users");
    },
  });
}
