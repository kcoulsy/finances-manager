import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/features/shared/lib/auth/config";

export const { POST, GET } = toNextJsHandler(auth);
