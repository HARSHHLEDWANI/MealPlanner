import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ShoppingCart, CheckCheck } from 'lucide-react';
import { useGroceryListStore } from '@/store/groceryListStore';
import type { ItemCategory, ShoppingListItem } from '@/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Input,
  PageHeader,
  Spinner,
} from '@/components/ui';

/** Aisle order, so the list reads the way a shop is walked. */
const CATEGORY_ORDER: ItemCategory[] = [
  'Produce',
  'Meat',
  'Dairy',
  'Frozen',
  'Pantry',
  'Other',
];

const GroceryList = () => {
  const {
    lists,
    currentList,
    loading,
    saving,
    error,
    fetchLists,
    selectList,
    createList,
    addItem,
    removeItem,
    toggleItemChecked,
    clearCheckedItems,
    clearError,
  } = useGroceryListStore();

  const [newItem, setNewItem] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  /** Groups items by aisle, dropping empty categories. */
  const grouped = useMemo(() => {
    const buckets = new Map<ItemCategory, ShoppingListItem[]>();
    for (const item of currentList?.items ?? []) {
      const bucket = buckets.get(item.category) ?? [];
      bucket.push(item);
      buckets.set(item.category, bucket);
    }
    return CATEGORY_ORDER.filter((category) => buckets.has(category)).map((category) => ({
      category,
      items: buckets.get(category)!,
    }));
  }, [currentList]);

  const checkedCount = (currentList?.items ?? []).filter((item) => item.is_checked).length;
  const totalCount = currentList?.items.length ?? 0;

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const ingredient = newItem.trim();
    if (!ingredient) return;

    const quantity = Number(newQuantity);
    addItem(ingredient, Number.isFinite(quantity) && quantity > 0 ? quantity : 1, 'unit');
    setNewItem('');
    setNewQuantity('1');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner className="w-8 h-8" />
        <p className="text-neutral-600">Loading your lists…</p>
      </div>
    );
  }

  if (error && lists.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          clearError();
          fetchLists();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grocery List"
        description={
          totalCount > 0 ? `${checkedCount} of ${totalCount} items checked off` : undefined
        }
        action={
          <Button
            variant="outline"
            onClick={() => createList(`Shopping List ${new Date().toLocaleDateString()}`)}
            loading={saving}
          >
            <Plus size={16} aria-hidden />
            New list
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {lists.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart className="w-7 h-7" />}
            title="No grocery lists yet"
            description="Create a list by hand, or build one automatically from a meal plan."
            action={
              <Button onClick={() => createList(`Shopping List ${new Date().toLocaleDateString()}`)}>
                <Plus size={16} aria-hidden />
                Create a list
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {lists.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => selectList(list.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    currentList?.id === list.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {list.name}
                </button>
              ))}
            </div>
          )}

          <Card className="p-5">
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newQuantity}
                onChange={(event) => setNewQuantity(event.target.value)}
                type="number"
                min="0"
                step="any"
                aria-label="Quantity"
                className="sm:w-24"
              />
              <Input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                placeholder="Add an item…"
                aria-label="Item name"
              />
              <Button type="submit" disabled={!newItem.trim() || saving}>
                <Plus size={16} aria-hidden />
                Add
              </Button>
            </form>
          </Card>

          {totalCount === 0 ? (
            <Card>
              <EmptyState
                icon={<ShoppingCart className="w-7 h-7" />}
                title="This list is empty"
                description="Add items above, or generate a list from your meal plan."
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ category, items }) => (
                <Card key={category} className="overflow-hidden">
                  <h2 className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 font-display font-semibold text-sm text-neutral-700">
                    {category}
                  </h2>
                  <ul className="divide-y divide-neutral-100">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-5 py-3 group">
                        <input
                          type="checkbox"
                          checked={item.is_checked}
                          onChange={() => toggleItemChecked(item.id)}
                          id={`item-${item.id}`}
                          className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <label
                          htmlFor={`item-${item.id}`}
                          className={`flex-1 cursor-pointer ${
                            item.is_checked ? 'line-through text-neutral-400' : 'text-neutral-800'
                          }`}
                        >
                          <span className="font-medium">
                            {item.quantity}
                            {item.unit && item.unit !== 'unit' ? ` ${item.unit}` : ''}
                          </span>{' '}
                          {item.ingredient}
                        </label>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.ingredient}`}
                          className="p-1 text-neutral-300 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}

              {checkedCount > 0 && (
                <Button variant="outline" onClick={clearCheckedItems} loading={saving} fullWidth>
                  {!saving && <CheckCheck size={16} aria-hidden />}
                  Clear {checkedCount} checked {checkedCount === 1 ? 'item' : 'items'}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GroceryList;
