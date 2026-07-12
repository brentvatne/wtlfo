/**
 * Web storage backend: localStorage exposed through the same synchronous
 * surface the settings service uses from expo-sqlite/kv-store on native.
 * See storage-backend.ts for why we don't use sqlite's web build.
 */
export const Storage = {
  getItemSync(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      // Private browsing / storage disabled - behave like an empty store
      return null;
    }
  },
  setItemSync(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Quota exceeded / storage disabled - drop the write, matching the
      // native path's warn-and-continue behavior
    }
  },
};
