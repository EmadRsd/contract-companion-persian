import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "./auth-middleware";
import type { AppRole, ContractStatus, ItemState } from "./types";

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async ({ data }) => {
    const { login } = await import("./api.server");
    return login(data.username, data.password);
  });

export const meFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => context.user);

export const listUsersFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { listUsers } = await import("./api.server");
    return listUsers(context.user);
  });

export const createUserFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    (input: {
      username: string;
      password: string;
      full_name: string;
      email: string;
      roles: AppRole[];
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { createUser } = await import("./api.server");
    return createUser(context.user, data);
  });

export const updateUserRolesFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { userId: string; roles: AppRole[] }) => input)
  .handler(async ({ data, context }) => {
    const { updateUserRoles } = await import("./api.server");
    return updateUserRoles(context.user, data.userId, data.roles);
  });

export const setUserPasswordFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { userId: string; password: string }) => input)
  .handler(async ({ data, context }) => {
    const { setUserPassword } = await import("./api.server");
    return setUserPassword(context.user, data.userId, data.password);
  });

export const deleteUserFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { deleteUser } = await import("./api.server");
    return deleteUser(context.user, data.userId);
  });

export const dashboardFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async () => {
    const { dashboardData } = await import("./api.server");
    return dashboardData();
  });

export const listContractsFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async () => {
    const { listContracts } = await import("./api.server");
    return listContracts();
  });

export const getContractFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string }) => input)
  .handler(async ({ data }) => {
    const { getContract } = await import("./api.server");
    return getContract(data.contractId);
  });

export const createContractFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    (input: {
      title: string;
      counterparty: string;
      description: string;
      value: number;
      start_date: string | null;
      end_date: string | null;
      status: ContractStatus;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { createContract } = await import("./api.server");
    return createContract(context.user, data);
  });

export const updateContractStatusFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string; status: ContractStatus; label: string }) => input)
  .handler(async ({ data, context }) => {
    const { updateContractStatus } = await import("./api.server");
    return updateContractStatus(context.user, data.contractId, data.status, data.label);
  });

export const deleteContractFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string }) => input)
  .handler(async ({ data, context }) => {
    const { deleteContract } = await import("./api.server");
    return deleteContract(context.user, data.contractId);
  });

export const addItemsFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    (input: { contractId: string; items: { title: string; content: string }[] }) => input,
  )
  .handler(async ({ data, context }) => {
    const { addItems } = await import("./api.server");
    return addItems(context.user, data.contractId, data.items);
  });

export const setItemStateFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { itemId: string; state: ItemState; label: string }) => input)
  .handler(async ({ data, context }) => {
    const { setItemState } = await import("./api.server");
    return setItemState(context.user, data.itemId, data.state, data.label);
  });

export const deleteItemFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { deleteItem } = await import("./api.server");
    return deleteItem(context.user, data.itemId);
  });

export const addCommentFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string; itemId: string | null; body: string }) => input)
  .handler(async ({ data, context }) => {
    const { addComment } = await import("./api.server");
    return addComment(context.user, data.contractId, data.itemId, data.body);
  });
