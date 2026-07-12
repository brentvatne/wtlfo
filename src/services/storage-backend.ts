/**
 * Storage backend for the settings service.
 *
 * Native: expo-sqlite kv-store (synchronous SQLite reads/writes).
 * Web (storage-backend.web.ts): window.localStorage — the sqlite web build
 * needs COOP/COEP headers + wasm setup and is alpha; localStorage is
 * synchronous and more than enough for our ~20 small keys.
 */
export { Storage } from 'expo-sqlite/kv-store';
