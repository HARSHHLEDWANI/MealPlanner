import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, Trash2, Plus, Edit, Save, X } from 'lucide-react';
import { useGroceryListStore } from '../store/groceryListStore';

const GroceryList: React.FC = () => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  
  const { 
    currentList, 
    fetchGroceryLists, 
    createGroceryList, 
    addItem, 
    removeItem, 
    toggleItemChecked,
    clearCheckedItems
  } = useGroceryListStore();

  useEffect(() => {
    fetchGroceryLists();
  }, [fetchGroceryLists]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newItemName.trim()) {
      addItem(
        newItemName.trim(), 
        newItemAmount.trim() || '1', 
        newItemUnit.trim() || 'item'
      );
      setNewItemName('');
      setNewItemAmount('');
      setNewItemUnit('');
    }
  };

  const handleCreateList = () => {
    createGroceryList(`Grocery List ${new Date().toLocaleDateString()}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Grocery List</h1>
        <p className="text-gray-600 mt-2">Manage your shopping list and never forget an ingredient</p>
      </div>
      
      {currentList ? (
        <div className="bg-white rounded-lg shadow-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{currentList.title}</h2>
            <button 
              className="btn-outline text-sm px-3"
              onClick={clearCheckedItems}
            >
              Clear Checked
            </button>
          </div>
          
          {/* Add Item Form */}
          <form onSubmit={handleAddItem} className="mb-6">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                className="input md:flex-grow"
                placeholder="Item name (e.g., Tomatoes)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                required
              />
              <input
                type="text"
                className="input w-full md:w-24"
                placeholder="Amount"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
              />
              <input
                type="text"
                className="input w-full md:w-24"
                placeholder="Unit"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                <Plus size={18} className="mr-2" />
                Add
              </button>
            </div>
          </form>
          
          {/* Grocery Items */}
          <div className="space-y-2">
            {currentList.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Your grocery list is empty. Add some items!
              </div>
            ) : (
              <>
                {currentList.items.map(item => (
                  <div 
                    key={item.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      item.checked ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <button 
                        className="mr-3 text-gray-400 hover:text-primary-500 focus:outline-none"
                        onClick={() => toggleItemChecked(item.id)}
                      >
                        {item.checked ? (
                          <CheckCircle size={20} className="text-primary-500" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>
                      <div className={item.checked ? 'line-through text-gray-400' : ''}>
                        <span className="font-medium">{item.name}</span>
                        {(item.amount || item.unit) && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({item.amount} {item.unit})
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-red-500 focus:outline-none"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-card p-6 text-center">
          <p className="text-gray-600 mb-4">You don't have any grocery lists yet.</p>
          <button 
            className="btn-primary"
            onClick={handleCreateList}
          >
            <Plus size={18} className="mr-2" />
            Create Grocery List
          </button>
        </div>
      )}
    </div>
  );
};

export default GroceryList;