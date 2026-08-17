import { createMiddleware } from "@tanstack/react-start";
import { getToken } from "./session";

/** Attaches the locally stored session token to every server function call. */
export const attachSessionToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = getToken();
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
