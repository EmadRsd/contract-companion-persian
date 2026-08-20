import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "./auth-middleware";
import type { AppRole, ApprovalStatus, ContractStatus, ItemState } from "./types";

export interface ContractFormInput {
  title: string;
  counterparty: string;
  description: string;
  value: number;
  city: string;
  department: string;
  category: string;
  tags: string[];
  assignees: string[];
  start_date: string | null;
  end_date: string | null;
  signature_date: string | null;
  renewal_alert_days: number;
  status: ContractStatus;
  is_template: boolean;
}

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
      city: string;
      department: string;
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

export const updateUserProfileFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    (input: {
      userId: string;
      full_name: string;
      email: string;
      city: string;
      department: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { updateUserProfile } = await import("./api.server");
    return updateUserProfile(context.user, data.userId, data);
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
  .handler(async ({ context }) => {
    const { dashboardData } = await import("./api.server");
    return dashboardData(context.user);
  });

export const reportsFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { reportsData } = await import("./api.server");
    return reportsData(context.user);
  });

export const listContractsFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { listContracts } = await import("./api.server");
    return listContracts(context.user);
  });

export const listTemplatesFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { listTemplates } = await import("./api.server");
    return listTemplates(context.user);
  });

export const getContractFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string }) => input)
  .handler(async ({ data, context }) => {
    const { getContract } = await import("./api.server");
    return getContract(context.user, data.contractId);
  });

export const createContractFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: ContractFormInput) => input)
  .handler(async ({ data, context }) => {
    const { createContract } = await import("./api.server");
    return createContract(context.user, data);
  });

export const updateContractFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string; values: ContractFormInput }) => input)
  .handler(async ({ data, context }) => {
    const { updateContract } = await import("./api.server");
    return updateContract(context.user, data.contractId, data.values);
  });

export const createFromTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    (input: { templateId: string; title: string; counterparty: string; city: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { createFromTemplate } = await import("./api.server");
    return createFromTemplate(context.user, data.templateId, {
      title: data.title,
      counterparty: data.counterparty,
      city: data.city,
    });
  });

export const assignContractFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string; assignees: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { assignContract } = await import("./api.server");
    return assignContract(context.user, data.contractId, data.assignees);
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

export const addAttachmentFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    (input: {
      contractId: string;
      name: string;
      content_type: string;
      size: number;
      data_url: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { addAttachment } = await import("./api.server");
    return addAttachment(context.user, data.contractId, data);
  });

export const deleteAttachmentFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { attachmentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { deleteAttachment } = await import("./api.server");
    return deleteAttachment(context.user, data.attachmentId);
  });

export const setApprovalFlowFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string; userIds: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { setApprovalFlow } = await import("./api.server");
    return setApprovalFlow(context.user, data.contractId, data.userIds);
  });

export const decideApprovalFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { approvalId: string; status: ApprovalStatus; note: string }) => input)
  .handler(async ({ data, context }) => {
    const { decideApproval } = await import("./api.server");
    return decideApproval(context.user, data.approvalId, data.status, data.note);
  });

export const signContractFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((input: { contractId: string; signerTitle: string }) => input)
  .handler(async ({ data, context }) => {
    const { signContract } = await import("./api.server");
    return signContract(context.user, data.contractId, data.signerTitle);
  });
