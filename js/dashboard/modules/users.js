export function createUsersTabLoaders(deps) {
  return {
    users: () => deps.loadUsers(),
    blacklist: () => deps.loadBlacklist(),
  };
}
