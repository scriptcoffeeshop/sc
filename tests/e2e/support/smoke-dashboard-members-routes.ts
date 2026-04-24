import { fulfillJson } from "./smoke-shared.ts";
import {
  asString,
  getRequestBody,
  type DashboardRouteContext,
} from "./smoke-dashboard-state.ts";

export async function handleDashboardMembersRoutes(
  ctx: DashboardRouteContext,
): Promise<boolean> {
  const { action, request, route, state, url } = ctx;

  if (action === "getUsers") {
    const search = String(url.searchParams.get("search") || "").trim()
      .toLowerCase();
    const filteredUsers = search
      ? state.users.filter((user) =>
        [user.displayName, user.phone, user.email].some((value) =>
          String(value || "").toLowerCase().includes(search)
        )
      )
      : state.users;
    await fulfillJson(route, {
      success: true,
      users: filteredUsers,
    });
    return true;
  }

  if (action === "getBlacklist") {
    await fulfillJson(route, {
      success: true,
      blacklist: state.blacklist,
    });
    return true;
  }

  if (action === "updateUserRole") {
    const body = getRequestBody(request);
    state.users = state.users.map((user) =>
      user.userId === asString(body.targetUserId)
        ? { ...user, role: asString(body.newRole || user.role || "USER") }
        : user
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "addToBlacklist") {
    const body = getRequestBody(request);
    const targetUserId = asString(body.targetUserId);
    const reason = asString(body.reason);
    state.users = state.users.map((user) =>
      user.userId === targetUserId
        ? { ...user, status: "BLACKLISTED" }
        : user
    );
    const existingEntry = state.blacklist.find((entry) =>
      entry.lineUserId === targetUserId
    );
    if (existingEntry) {
      state.blacklist = state.blacklist.map((entry) =>
        entry.lineUserId === targetUserId
          ? {
            ...entry,
            reason,
            blockedAt: "2026-04-21T01:00:00.000Z",
          }
          : entry
      );
    } else {
      const targetUser = state.users.find((user) => user.userId === targetUserId);
      state.blacklist.push({
        lineUserId: targetUserId,
        displayName: asString(targetUser?.displayName),
        blockedAt: "2026-04-21T01:00:00.000Z",
        reason,
      });
    }
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "removeFromBlacklist") {
    const body = getRequestBody(request);
    const targetUserId = asString(body.targetUserId);
    state.users = state.users.map((user) =>
      user.userId === targetUserId
        ? { ...user, status: "ACTIVE" }
        : user
    );
    state.blacklist = state.blacklist.filter((entry) =>
      entry.lineUserId !== targetUserId
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  return false;
}
