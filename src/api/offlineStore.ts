/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Recipe, Collection, PantryItem, MealPlan, GroceryItem, GrocerySettings } from "../types";

export interface QueuedMutation {
  id: string;
  endpoint: "collections" | "recipes" | "pantry" | "mealPlan" | "grocery" | "grocerySettings";
  action: "create" | "update" | "delete" | "save" | "saveSettings";
  payload: any;
  targetId?: string;
  timestamp: number;
}

const CACHE_PREFIX = "recipe_offline_cache:";
const QUEUE_KEY = "recipe_offline_mutation_queue";

// Helper to generate temporary offline IDs
export function generateTempId(prefix: string): string {
  return `temp_${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

export class OfflineStore {
  private listeners: Set<(isOffline: boolean, pendingCount: number) => void> = new Set();
  private isOnlineState: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
    }
  }

  public subscribe(callback: (isOffline: boolean, pendingCount: number) => void): () => void {
    this.listeners.add(callback);
    callback(!this.isOnlineState, this.getQueue().length);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const isOffline = !this.isOnlineState;
    const pendingCount = this.getQueue().length;
    this.listeners.forEach((listener) => listener(isOffline, pendingCount));
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineState = online;
    this.notify();
    if (online) {
      // Trigger sync automatically when back online
      this.syncWithServer();
    }
  }

  public isOffline(): boolean {
    return !this.isOnlineState;
  }

  // --- User Preferences layer ---
  public getUserPreferences(): { ageRange?: string; biologicalSex?: string; mainGoal?: string } | null {
    return this.getCache<{ ageRange?: string; biologicalSex?: string; mainGoal?: string }>("user_preferences");
  }

  public saveUserPreferences(prefs: { ageRange?: string; biologicalSex?: string; mainGoal?: string }): void {
    this.setCache("user_preferences", prefs);
  }

  // --- Caching layer ---
  public getCache<T>(key: string): T | null {
    try {
      const val = localStorage.getItem(CACHE_PREFIX + key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  public setCache<T>(key: string, data: T): void {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to write to offline cache", e);
    }
  }

  // --- Queue layer ---
  public getQueue(): QueuedMutation[] {
    try {
      const val = localStorage.getItem(QUEUE_KEY);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedMutation[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      this.notify();
    } catch (e) {
      console.error("Failed to save offline queue", e);
    }
  }

  public enqueueMutation(
    endpoint: QueuedMutation["endpoint"],
    action: QueuedMutation["action"],
    payload: any,
    targetId?: string
  ): void {
    const queue = this.getQueue();

    // Optimizations for temporary (not-yet-created-on-server) items:
    if (targetId && targetId.startsWith("temp_")) {
      if (action === "delete") {
        // If we're deleting an item that was created offline and hasn't synced yet,
        // we can simply remove its "create" action from the queue and bypass the server completely!
        const filtered = queue.filter(
          (m) => !(m.endpoint === endpoint && m.action === "create" && m.payload?.id === targetId)
        );
        this.saveQueue(filtered);
        this.removeCachedItem(endpoint, targetId);
        return;
      }

      if (action === "update") {
        // If we're updating an item that was created offline, find the original "create" action
        // and update its payload instead of adding a new mutation to the queue!
        const createMutation = queue.find(
          (m) => m.endpoint === endpoint && m.action === "create" && m.payload?.id === targetId
        );
        if (createMutation) {
          createMutation.payload = { ...createMutation.payload, ...payload };
          this.saveQueue(queue);
          this.updateCachedItem(endpoint, targetId, payload);
          return;
        }
      }
    }

    // Default: Add mutation to queue
    const newMutation: QueuedMutation = {
      id: "mut_" + Math.random().toString(36).substring(2, 11),
      endpoint,
      action,
      payload,
      targetId,
      timestamp: Date.now(),
    };

    queue.push(newMutation);
    this.saveQueue(queue);

    // Apply change optimistically to the cache
    this.applyOptimisticUpdate(endpoint, action, payload, targetId);
  }

  // Optimistically updates local cache before sync
  private applyOptimisticUpdate(
    endpoint: QueuedMutation["endpoint"],
    action: QueuedMutation["action"],
    payload: any,
    targetId?: string
  ) {
    if (endpoint === "mealPlan") {
      this.setCache("mealplan", payload);
      return;
    }
    if (endpoint === "grocerySettings") {
      this.setCache("grocery_settings", payload);
      return;
    }

    const cacheKey = this.getCacheKeyForEndpoint(endpoint);
    const cachedList: any[] = this.getCache<any[]>(cacheKey) || [];

    if (action === "create") {
      const newList = [payload, ...cachedList];
      this.setCache(cacheKey, newList);
    } else if (action === "update" && targetId) {
      const newList = cachedList.map((item) =>
        item.id === targetId ? { ...item, ...payload } : item
      );
      this.setCache(cacheKey, newList);
    } else if (action === "delete" && targetId) {
      const newList = cachedList.filter((item) => item.id !== targetId);
      this.setCache(cacheKey, newList);
    }
  }

  private removeCachedItem(endpoint: QueuedMutation["endpoint"], id: string) {
    const cacheKey = this.getCacheKeyForEndpoint(endpoint);
    const cachedList: any[] = this.getCache<any[]>(cacheKey) || [];
    const newList = cachedList.filter((item) => item.id !== id);
    this.setCache(cacheKey, newList);
  }

  private updateCachedItem(endpoint: QueuedMutation["endpoint"], id: string, payload: any) {
    const cacheKey = this.getCacheKeyForEndpoint(endpoint);
    const cachedList: any[] = this.getCache<any[]>(cacheKey) || [];
    const newList = cachedList.map((item) => (item.id === id ? { ...item, ...payload } : item));
    this.setCache(cacheKey, newList);
  }

  private getCacheKeyForEndpoint(endpoint: string): string {
    switch (endpoint) {
      case "recipes":
        return "recipes_list";
      case "collections":
        return "collections_list";
      case "pantry":
        return "pantry_list";
      case "grocery":
        return "grocery_list";
      default:
        return endpoint;
    }
  }

  // --- Synchronization Engine ---
  private isSyncing = false;

  public async syncWithServer(): Promise<void> {
    if (this.isSyncing || !this.isOnlineState) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    console.log(`Starting background offline sync. Syncing ${queue.length} action(s)...`);

    const idMap: Record<string, string> = {};

    try {
      for (const mutation of queue) {
        // Apply any ID mappings from previous offline creates
        let resolvedPayload = this.resolveIdMappings(mutation.payload, idMap);
        let resolvedTargetId = mutation.targetId;
        if (resolvedTargetId && idMap[resolvedTargetId]) {
          resolvedTargetId = idMap[resolvedTargetId];
        }

        try {
          // Execute mutation request
          const result = await this.executeMutationRequest(
            mutation.endpoint,
            mutation.action,
            resolvedPayload,
            resolvedTargetId
          );

          // If it was a create, it returned the actual database entity with the real ID.
          // Map the temporary ID to the real database ID for subsequent actions in the queue!
          if (mutation.action === "create" && mutation.payload?.id?.startsWith("temp_") && result?.id) {
            idMap[mutation.payload.id] = result.id;
          }
        } catch (err) {
          console.error(`Offline sync failed for action: ${mutation.action} on ${mutation.endpoint}`, err);
          // If server fails (e.g., bad request or schema change), we should log and continue
          // to prevent blocking the entire queue. Or retry later if it is a transient error.
        }
      }

      // Sync complete, clear queue
      this.saveQueue([]);
      console.log("Offline synchronization completed successfully!");

      // Update cached values to match fresh server database truth
      if (typeof window !== "undefined") {
        // Dispatch custom event to trigger React Query refetches automatically
        window.dispatchEvent(new CustomEvent("offline-sync-complete"));
      }
    } catch (e) {
      console.error("Sync process error", e);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  // Deeply replaces all instances of old temp IDs with new server IDs in objects and arrays
  private resolveIdMappings(val: any, idMap: Record<string, string>): any {
    if (!val) return val;
    if (typeof val === "string") {
      return idMap[val] || val;
    }
    if (Array.isArray(val)) {
      return val.map((item) => this.resolveIdMappings(item, idMap));
    }
    if (typeof val === "object") {
      const copy: any = {};
      for (const k in val) {
        copy[k] = this.resolveIdMappings(val[k], idMap);
      }
      return copy;
    }
    return val;
  }

  private async executeMutationRequest(
    endpoint: QueuedMutation["endpoint"],
    action: QueuedMutation["action"],
    payload: any,
    targetId?: string
  ): Promise<any> {
    const urlMap: Record<string, string> = {
      recipes: "/api/recipes",
      collections: "/api/collections",
      pantry: "/api/pantry",
      grocery: "/api/grocery",
      mealPlan: "/api/mealplan",
      grocerySettings: "/api/grocery/settings",
    };

    const baseUrl = urlMap[endpoint];
    let url = baseUrl;
    let method = "POST";

    if (action === "create") {
      method = "POST";
      // Ensure we don't send the temporary ID to the backend
      const { id, ...dataToSend } = payload;
      payload = dataToSend;
    } else if (action === "update" && targetId) {
      method = "PUT";
      url = `${baseUrl}/${targetId}`;
    } else if (action === "delete" && targetId) {
      method = "DELETE";
      url = `${baseUrl}/${targetId}`;
    } else if (action === "save") {
      method = "POST";
    } else if (action === "saveSettings") {
      method = "POST";
    }

    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (method !== "GET" && method !== "DELETE") {
      options.body = JSON.stringify(payload);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`Sync request to ${url} failed with status ${res.status}`);
    }

    if (method === "DELETE") return { success: true };
    return res.json();
  }
}

export const offlineStore = new OfflineStore();
