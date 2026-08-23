import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  userId?: string | null;
  role?: string | null;
  isAdmin?: boolean;
}

export const requestContext = new AsyncLocalStorage<RequestContextData>();
