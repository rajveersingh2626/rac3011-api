import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestOriginContext {
  origin: string;
}

export const requestOriginStore = new AsyncLocalStorage<RequestOriginContext>();

export function getRequestOrigin(fallback?: string): string {
  const store = requestOriginStore.getStore();
  if (store?.origin && store.origin !== 'null' && store.origin.startsWith('http')) {
    return store.origin;
  }
  return fallback || 'https://rotaract3011.org';
}
