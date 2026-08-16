import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { UserDTO } from "./types";

/** Requires a valid bearer session token; puts the current user on context. */
export const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const header = request?.headers?.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Unauthorized: وارد حساب کاربری شوید");

  const { verifyToken } = await import("./auth.server");
  const userId = await verifyToken(token);
  if (!userId) throw new Error("Unauthorized: نشست شما منقضی شده است");

  const { findUserById } = await import("./api.server");
  const user = await findUserById(userId);
  if (!user) throw new Error("Unauthorized: کاربر یافت نشد");

  return next({ context: { user: user as UserDTO } });
});
