import { create } from 'zustand';
import { GroceryList, GroceryItem, Recipe } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface GroceryListState {
  groceryLists: GroceryList[];
  currentList: GroceryList | null;
  loading: boolean;
  error: string | null;
  fetchGroceryLists: () => Promise<void>;
  createGroceryList: (title: string) => Promise<void>;
  addItem: (name: string, amount: string, unit: string, category?: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  toggleItemChecked: (itemId: string) => Promise<void>;
  generateFromRecipes: (recipes: Recipe[]) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
}

export const useGroceryListStore = create<GroceryListState>((set, get) => ({
  groceryLists: [],
  currentList: null,
  loading: false,
  error: null,

  fetchGroceryLists: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('grocery_lists')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('date_created', { ascending: false });

      if (error) throw error;
      
      // Parse the items JSON from the database
      const parsedLists = (data || []).map(list => ({
        id: list.id,
        userId: list.user_id,
        title: list.title,
        dateCreated: list.date_created,
        items: JSON.parse(list.items)
      }));
      
      set({ 
        groceryLists: parsedLists as GroceryList[], 
        currentList: parsedLists.length > 0 ? parsedLists[0] as GroceryList : null,
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch grocery lists', 
        loading: false 
      });
    }
  },

  createGroceryList: async (title: string) => {
    set({ loading: true });
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const newListId = uuidv4();
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('grocery_lists')
        .insert({
          id: newListId,
          user_id: userId,
          title,
          date_created: now,
          items: '[]'
        });

      if (error) throw error;
      
      // Update local state
      const newList = {
        id: newListId,
        userId,
        title,
        dateCreated: now,
        items: []
      };
      
      set({
        groceryLists: [newList, ...get().groceryLists],
        currentList: newList,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create grocery list', 
        loading: false 
      });
    }
  },

  addItem: async (name: string, amount: string, unit: string, category?: string) => {
    try {
      const { currentList } = get();
      if (!currentList) return;
      
      const newItem: GroceryItem = {
        id: uuidv4(),
        name,
        amount,
        unit,
        checked: false,
        category
      };
      
      const updatedItems = [...currentList.items, newItem];
      
      // Update the database
      const { error } = await supabase
        .from('grocery_lists')
        .update({ items: JSON.stringify(updatedItems) })
        .eq('id', currentList.id);

      if (error) throw error;
      
      // Update local state
      set({
        currentList: {
          ...currentList,
          items: updatedItems
        },
        groceryLists: get().groceryLists.map(list => 
          list.id === currentList.id 
            ? { ...list, items: updatedItems } 
            : list
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add item to grocery list' 
      });
    }
  },

  removeItem: async (itemId: string) => {
    try {
      const { currentList } = get();
      if (!currentList) return;
      
      const updatedItems = currentList.items.filter(item => item.id !== itemId);
      
      // Update the database
      const { error } = await supabase
        .from('grocery_lists')
        .update({ items: JSON.stringify(updatedItems) })
        .eq('id', currentList.id);

      if (error) throw error;
      
      // Update local state
      set({
        currentList: {
          ...currentList,
          items: updatedItems
        },
        groceryLists: get().groceryLists.map(list => 
          list.id === currentList.id 
            ? { ...list, items: updatedItems } 
            : list
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove item from grocery list' 
      });
    }
  },

  toggleItemChecked: async (itemId: string) => {
    try {
      const { currentList } = get();
      if (!currentList) return;
      
      const updatedItems = currentList.items.map(item => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      
      // Update the database
      const { error } = await supabase
        .from('grocery_lists')
        .update({ items: JSON.stringify(updatedItems) })
        .eq('id', currentList.id);

      if (error) throw error;
      
      // Update local state
      set({
        currentList: {
          ...currentList,
          items: updatedItems
        },
        groceryLists: get().groceryLists.map(list => 
          list.id === currentList.id 
            ? { ...list, items: updatedItems } 
            : list
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to toggle item checked status' 
      });
    }
  },

  generateFromRecipes: async (recipes: Recipe[]) => {
    try {
      // Extract all ingredients from the recipes
      let allIngredients: { name: string; amount: string; unit: string }[] = [];
      
      recipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
          allIngredients.push({
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit
          });
        });
      });
      
      // Consolidate ingredients (combine duplicates)
      const ingredientMap = new Map();
      
      allIngredients.forEach(ing => {
        const key = ing.name.toLowerCase();
        
        if (ingredientMap.has(key)) {
          // For simplicity, we're not trying to convert units or add amounts
          // In a real app, you would have unit conversion logic here
          const existing = ingredientMap.get(key);
          ingredientMap.set(key, {
            name: ing.name,
            amount: `${existing.amount} + ${ing.amount}`,
            unit: ing.unit
          });
        } else {
          ingredientMap.set(key, ing);
        }
      });
      
      // Create grocery items from the consolidated ingredients
      const groceryItems: GroceryItem[] = Array.from(ingredientMap.values()).map(ing => ({
        id: uuidv4(),
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        checked: false
      }));
      
      // Create a new grocery list
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const newListId = uuidv4();
      const now = new Date().toISOString();
      const title = `Recipe List ${new Date().toLocaleDateString()}`;
      
      const { error } = await supabase
        .from('grocery_lists')
        .insert({
          id: newListId,
          user_id: userId,
          title,
          date_created: now,
          items: JSON.stringify(groceryItems)
        });

      if (error) throw error;
      
      // Update local state
      const newList = {
        id: newListId,
        userId,
        title,
        dateCreated: now,
        items: groceryItems
      };
      
      set({
        groceryLists: [newList, ...get().groceryLists],
        currentList: newList
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to generate grocery list from recipes' 
      });
    }
  },

  clearCheckedItems: async () => {
    try {
      const { currentList } = get();
      if (!currentList) return;
      
      const updatedItems = currentList.items.filter(item => !item.checked);
      
      // Update the database
      const { error } = await supabase
        .from('grocery_lists')
        .update({ items: JSON.stringify(updatedItems) })
        .eq('id', currentList.id);

      if (error) throw error;
      
      // Update local state
      set({
        currentList: {
          ...currentList,
          items: updatedItems
        },
        groceryLists: get().groceryLists.map(list => 
          list.id === currentList.id 
            ? { ...list, items: updatedItems } 
            : list
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to clear checked items' 
      });
    }
  }
}));