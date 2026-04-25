export interface SessionUser {
  userId: string;
  displayName?: string;
  role?: string;
  pictureUrl?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export type DashboardTabLoader = () => Promise<unknown> | unknown;

export type DashboardTabLoaderMap = Record<
  string,
  DashboardTabLoader | undefined
>;

export interface DashboardSwalLike {
  fire: (...args: unknown[]) => Promise<unknown> | unknown;
  showLoading?: () => void;
  close?: () => void;
}

export interface DashboardSessionServices {
  API_URL: string;
  authFetch: (
    input: string,
    init?: RequestInit,
  ) => Promise<{ json: () => Promise<unknown> }>;
  Swal: DashboardSwalLike;
  loginWithLineFn: (redirectUri: string, stateKey: string) => unknown;
  lineRedirect: string;
  getDashboardTabLoaders?: () => DashboardTabLoaderMap;
  loadInitialData?: () => Promise<unknown> | unknown;
  defaultTab?: string;
  tabs?: string[];
  loginStateKey?: string;
  adminStorageKey?: string;
  jwtStorageKey?: string;
}
