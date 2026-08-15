import { create } from 'zustand';
import type { ShoppingList, ShoppingListItem, ItemCategory } from '@/types';
import api, { errorMessage } from '@/lib/api';

/**
 * Shopping list state.
 *
 * Like the meal plan store, this previously wrote to Supabase directly from
 * the browser — against a `grocery_lists` table with a JSONB `items` array
 * that was a parallel, duplicate implementation of shopping_lists +
 * shopping_list_items. That table is gone; this now uses the API and the
 * normalized tables.
 *
 * The product still calls this a "grocery list" in the UI. The store and
 * tables use the API's name, shopping_list.
 */

interface GroceryListState {
  lists: ShoppingList[];
  currentList: ShoppingList | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  fetchLists: () => Promise<void>;
  selectList: (listId: string) => void;
  createList: (name: string) => Promise<ShoppingList | null>;
  generateFromMealPlan: (mealPlanId: string) => Promise<ShoppingList | null>;
  addItem: (ingredient: string, quantity: number, unit: string, category?: ItemCategory) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  toggleItemChecked: (itemId: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  clearError: () => void;
}

/** Strips server-owned fields down to what the API accepts. */
function toItemPayload(items: ShoppingListItem[]) {
  return items.map((item) => ({
    ingredient: item.ingredient,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    is_checked: item.is_checked,
  }));
}

export const useGroceryListStore = create<GroceryListState>((set, get) => ({
  lists: [],
  currentList: null,
  loading: false,
  saving: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchLists: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get<ShoppingList[]>('/api/shopping-lists');
      set({
        lists: data,
        // Keep the current selection if it still exists, otherwise fall back
        // to the newest list.
        currentList:
          data.find((list) => list.id === get().currentList?.id) ?? data[0] ?? null,
        loading: false,
      });
    } catch (error) {
      set({ error: errorMessage(error), loading: false });
    }
  },

  selectList: (listId) => {
    const list = get().lists.find((candidate) => candidate.id === listId);
    if (list) set({ currentList: list });
  },

  createList: async (name) => {
    set({ saving: true, error: null });
    try {
      const { data } = await api.post<ShoppingList>('/api/shopping-lists', { name, items: [] });
      set({ lists: [data, ...get().lists], currentList: data, saving: false });
      return data;
    } catch (error) {
      set({ error: errorMessage(error), saving: false });
      return null;
    }
  },

  /**
   * Builds a list from a meal plan's recipes. The API does the aggregating —
   * it parses each ingredient line and sums quantities per ingredient and unit.
   */
  generateFromMealPlan: async (mealPlanId) => {
    set({ saving: true, error: null });
    try {
      const { data } = await api.post<ShoppingList>(`/api/shopping-lists/generate/${mealPlanId}`);
      set({ lists: [data, ...get().lists], currentList: data, saving: false });
      return data;
    } catch (error) {
      set({ error: errorMessage(error), saving: false });
      return null;
    }
  },

  addItem: async (ingredient, quantity, unit, category = 'Other') => {
    const list = get().currentList;
    if (!list) return;

    const nextItems = [
      ...list.items,
      { ingredient, quantity, unit, category, is_checked: false } as ShoppingListItem,
    ];

    await replaceItems(set, get, list.id, nextItems);
  },

  removeItem: async (itemId) => {
    const list = get().currentList;
    if (!list) return;

    await replaceItems(
      set,
      get,
      list.id,
      list.items.filter((item) => item.id !== itemId)
    );
  },

  /**
   * Checking an item has its own endpoint, so it updates a single row rather
   * than rewriting the whole list.
   */
  toggleItemChecked: async (itemId) => {
    const list = get().currentList;
    const item = list?.items.find((candidate) => candidate.id === itemId);
    if (!list || !item) return;

    const nextChecked = !item.is_checked;

    // Optimistic: ticking a box should feel instant.
    const applyChecked = (checked: boolean) => (candidate: ShoppingListItem) =>
      candidate.id === itemId ? { ...candidate, is_checked: checked } : candidate;

    set({
      currentList: { ...list, items: list.items.map(applyChecked(nextChecked)) },
    });

    try {
      await api.put(`/api/shopping-lists/${list.id}/items/${itemId}`, {
        is_checked: nextChecked,
      });
    } catch (error) {
      // Roll the checkbox back so the UI does not claim a change that failed.
      const reverted = get().currentList;
      if (reverted) {
        set({
          currentList: { ...reverted, items: reverted.items.map(applyChecked(item.is_checked)) },
          error: errorMessage(error),
        });
      }
    }
  },

  clearCheckedItems: async () => {
    const list = get().currentList;
    if (!list) return;

    await replaceItems(
      set,
      get,
      list.id,
      list.items.filter((item) => !item.is_checked)
    );
  },

  deleteList: async (listId) => {
    set({ saving: true, error: null });
    try {
      await api.delete(`/api/shopping-lists/${listId}`);
      const remaining = get().lists.filter((list) => list.id !== listId);
      set({
        lists: remaining,
        currentList: get().currentList?.id === listId ? (remaining[0] ?? null) : get().currentList,
        saving: false,
      });
    } catch (error) {
      set({ error: errorMessage(error), saving: false });
    }
  },
}));

/**
 * Sends a full item set for a list and stores the server's response.
 *
 * Add and remove both go through the API's replace-all update, so they share
 * this rather than each reimplementing the round trip and state merge.
 */
async function replaceItems(
  set: (partial: Partial<GroceryListState>) => void,
  get: () => GroceryListState,
  listId: string,
  items: ShoppingListItem[]
) {
  set({ saving: true, error: null });
  try {
    const { data } = await api.put<ShoppingList>(`/api/shopping-lists/${listId}`, {
      items: toItemPayload(items),
    });
    set({
      currentList: data,
      lists: get().lists.map((list) => (list.id === listId ? data : list)),
      saving: false,
    });
  } catch (error) {
    set({ error: errorMessage(error), saving: false });
  }
}
