import type { ActionConfig } from "./action-config.ts";
import { adminActions } from "./actions/admin-actions.ts";
import { authenticatedActions } from "./actions/auth-actions.ts";
import { publicActions } from "./actions/public-actions.ts";

export * from "./action-config.ts";

export const actionMap: Record<string, ActionConfig> = {
  ...publicActions,
  ...authenticatedActions,
  ...adminActions,
};
