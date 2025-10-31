import { createSafeActionClient } from "next-safe-action";
import { errorToastMiddleware } from "./middleware";

export const actionClient = createSafeActionClient({
  handleServerError: errorToastMiddleware,
});
