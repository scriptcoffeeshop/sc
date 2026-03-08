export function createUsersActionHandlers(deps) {
  return {
    "search-users": () => deps.loadUsers(),
    "toggle-user-blacklist": (el) => {
      if (el.dataset.userId) {
        deps.toggleUserBlacklist(
          el.dataset.userId,
          el.dataset.blocked === "true",
        );
      }
    },
    "toggle-user-role": (el) => {
      if (el.dataset.userId && el.dataset.newRole) {
        deps.toggleUserRole(el.dataset.userId, el.dataset.newRole);
      }
    },
  };
}

export function createUsersTabLoaders(deps) {
  return {
    users: () => deps.loadUsers(),
    blacklist: () => deps.loadBlacklist(),
  };
}
