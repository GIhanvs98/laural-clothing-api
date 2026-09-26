import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  userId?: string | null;
  role?: string | null;
  isAdmin?: boolean;
  branchId?: string | null; // null = Super Admin (all branches), string = restricted to one branch
}

export const requestContext = new AsyncLocalStorage<RequestContextData>();
