import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import './ShoppingList.css';

const CATEGORIES = [
  'Fruits et légumes', 'Viande', 'Poisson', 'Produits laitiers',
  'Épicerie', 'Surgelés', 'Boissons', 'Boulangerie', 'Autres'
];

const CATEGORY_ICONS = {
  'Fruits et légumes': '🥬',
  'Viande': '🥩',
  'Poisson': '🐟',
  'Produits laitiers': '🧀',
  'Épicerie': '🛒',
  'Surgelés': '🧊',
  'Boissons': '🥤',
  'Boulangerie': '🥖',
  'Autres': '📦',
};

export default function ShoppingList() {
  const [recipes, setRecipes] = useState([]);
  const [planning, setPlanning] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const [showMeals, setShowMeals] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [overrides, setOverrides] = useState({}); // { ingredientKey: { category, quantity, deleted } }

  // Load checked items and overrides from Firestore
  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      setRecipes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, 'plannings'), (snapshot) => {
      // Merge all plannings' meals into one flat structure
      const data = {};
      snapshot.docs.forEach(d => {
        const planningData = d.data();
        if (planningData.meals) {
          Object.entries(planningData.meals).forEach(([date, dayData]) => {
            if (!data[date]) data[date] = {};
            Object.entries(dayData).forEach(([slot, slotData]) => {
              if (!data[date][slot]) data[date][slot] = {};
              Object.assign(data[date][slot], slotData);
            });
          });
        }
      });
      setPlanning(data);
    });
    const unsub3 = onSnapshot(doc(db, 'shoppingMeta', 'state'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCheckedItems(data.checked || {});
        setOverrides(data.overrides || {});
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // Build recipe lookup
  const recipeMap = useMemo(() => {
    const map = {};
    recipes.forEach(r => { map[r.id] = r; });
    return map;
  }, [recipes]);

  // Gather all planned meals and their ingredients
  const { shoppingItems, plannedMeals } = useMemo(() => {
    const ingredientMap = {};
    const meals = [];

    Object.entries(planning).forEach(([date, dayData]) => {
      Object.entries(dayData).forEach(([slotId, slotData]) => {
        if (!slotData) return;
        Object.entries(slotData).forEach(([user, meal]) => {
          if (!meal?.id) return;
          const recipe = recipeMap[meal.id];
          if (!recipe) return;

          meals.push({ date, slotId, user, recipe });

          recipe.ingredients?.forEach(ing => {
            if (!ing.name) return;
            const key = ing.name.toLowerCase().trim();
            if (!ingredientMap[key]) {
              ingredientMap[key] = {
                name: ing.name,
                quantities: [],
                category: ing.category || 'Autres',
                sources: [],
              };
            }
            if (ing.quantity) {
              ingredientMap[key].quantities.push(ing.quantity);
            }
            ingredientMap[key].sources.push({
              recipe: recipe.title,
              user,
              date,
            });
          });
        });
      });
    });

    // Apply overrides
    const items = Object.entries(ingredientMap).map(([key, item]) => {
      const override = overrides[key];
      if (override?.deleted) return null;
      return {
        key,
        name: item.name,
        quantity: override?.quantity ?? mergeQuantities(item.quantities),
        category: override?.category ?? item.category,
        sources: item.sources,
      };
    }).filter(Boolean);

    // Sort by category then name
    items.sort((a, b) => {
      const catA = CATEGORIES.indexOf(a.category);
      const catB = CATEGORIES.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });

    // Sort meals by date
    meals.sort((a, b) => a.date.localeCompare(b.date));

    return { shoppingItems: items, plannedMeals: meals };
  }, [planning, recipeMap, overrides]);

  // Group items by category
  const grouped = useMemo(() => {
    const groups = {};
    shoppingItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [shoppingItems]);

  const toggleCheck = async (key) => {
    const updated = { ...checkedItems, [key]: !checkedItems[key] };
    setCheckedItems(updated);
    await setDoc(doc(db, 'shoppingMeta', 'state'), { checked: updated, overrides }, { merge: true });
  };

  const handleDeleteItem = async (key) => {
    const updated = { ...overrides, [key]: { ...overrides[key], deleted: true } };
    setOverrides(updated);
    await setDoc(doc(db, 'shoppingMeta', 'state'), { checked: checkedItems, overrides: updated }, { merge: true });
  };

  const handleChangeCategory = async (key, newCategory) => {
    const updated = { ...overrides, [key]: { ...overrides[key], category: newCategory } };
    setOverrides(updated);
    await setDoc(doc(db, 'shoppingMeta', 'state'), { checked: checkedItems, overrides: updated }, { merge: true });
    setEditingItem(null);
  };

  const handleChangeQuantity = async (key, newQuantity) => {
    const updated = { ...overrides, [key]: { ...overrides[key], quantity: newQuantity } };
    setOverrides(updated);
    await setDoc(doc(db, 'shoppingMeta', 'state'), { checked: checkedItems, overrides: updated }, { merge: true });
  };

  const handleResetList = async () => {
    setCheckedItems({});
    setOverrides({});
    await setDoc(doc(db, 'shoppingMeta', 'state'), { checked: {}, overrides: {} });
  };

  const totalItems = shoppingItems.length;
  const checkedCount = shoppingItems.filter(i => checkedItems[i.key]).length;

  return (
    <div className="shopping-page">
      <div className="page-header">
        <div className="shopping-header-row">
          <div>
            <h1>Liste de courses</h1>
            <p>{checkedCount}/{totalItems} articles cochés</p>
          </div>
          <div className="shopping-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMeals(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Repas
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleResetList} title="Réinitialiser">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/>
              </svg>
            </button>
          </div>
        </div>
        {totalItems > 0 && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }} />
          </div>
        )}
      </div>

      <div className="page-content">
        {totalItems === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <h3>Liste vide</h3>
            <p>Planifiez des repas pour générer automatiquement votre liste de courses</p>
          </div>
        ) : (
          <div className="shopping-categories">
            {CATEGORIES.map(cat => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              const allChecked = items.every(i => checkedItems[i.key]);
              return (
                <div key={cat} className={`shopping-category ${allChecked ? 'all-checked' : ''}`}>
                  <div className="category-header">
                    <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                    <span className="category-name">{cat}</span>
                    <span className="category-count">{items.filter(i => checkedItems[i.key]).length}/{items.length}</span>
                  </div>
                  <div className="category-items">
                    {items.map(item => (
                      <div
                        key={item.key}
                        className={`shopping-item ${checkedItems[item.key] ? 'checked' : ''}`}
                      >
                        <button className="check-btn" onClick={() => toggleCheck(item.key)}>
                          {checkedItems[item.key] ? (
                            <svg viewBox="0 0 24 24" fill="var(--success)" width="22" height="22">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="2" width="22" height="22">
                              <circle cx="12" cy="12" r="10"/>
                            </svg>
                          )}
                        </button>
                        <div className="item-info" onClick={() => setEditingItem(item)}>
                          <span className="item-name">{item.name}</span>
                          {item.quantity && <span className="item-qty">{item.quantity}</span>}
                        </div>
                        <div className="item-actions">
                          <button className="btn-ghost btn-icon-sm" onClick={() => setEditingItem(item)} title="Modifier">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn-ghost btn-icon-sm" onClick={() => handleDeleteItem(item.key)} title="Supprimer">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem.name}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setEditingItem(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Quantité</label>
                <input
                  className="input"
                  type="text"
                  value={editingItem.quantity || ''}
                  onChange={(e) => {
                    setEditingItem({ ...editingItem, quantity: e.target.value });
                    handleChangeQuantity(editingItem.key, e.target.value);
                  }}
                  placeholder="Ex: 500g, 2 pièces..."
                />
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Catégorie</label>
                <div className="chip-row">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`chip ${editingItem.category === cat ? 'active' : ''}`}
                      onClick={() => {
                        setEditingItem({ ...editingItem, category: cat });
                        handleChangeCategory(editingItem.key, cat);
                      }}
                    >
                      {CATEGORY_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="item-sources">
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Utilisé dans :</label>
                {editingItem.sources?.map((s, i) => (
                  <div key={i} className="source-item">
                    <span className="source-recipe">{s.recipe}</span>
                    <span className="source-meta">{s.user} · {formatDateShort(s.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Planned Meals Modal */}
      {showMeals && (
        <div className="modal-overlay" onClick={() => setShowMeals(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Repas planifiés</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowMeals(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {plannedMeals.length === 0 ? (
                <p className="no-results">Aucun repas planifié</p>
              ) : (
                <div className="planned-meals-list">
                  {plannedMeals.map((meal, i) => (
                    <div key={i} className="planned-meal-item">
                      <div className="planned-meal-date">{formatDateShort(meal.date)}</div>
                      <div className="planned-meal-info">
                        <span className="planned-meal-recipe">{meal.recipe.title}</span>
                        <span className="planned-meal-user">{meal.user}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mergeQuantities(quantities) {
  if (quantities.length === 0) return '';
  if (quantities.length === 1) return quantities[0];

  // Try to sum numeric quantities with same unit
  const parsed = quantities.map(q => {
    const match = q.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (match) return { num: parseFloat(match[1].replace(',', '.')), unit: match[2].trim().toLowerCase() };
    return null;
  });

  if (parsed.every(p => p !== null)) {
    const units = [...new Set(parsed.map(p => p.unit))];
    if (units.length === 1) {
      const total = parsed.reduce((sum, p) => sum + p.num, 0);
      const display = Number.isInteger(total) ? total.toString() : total.toFixed(1);
      return units[0] ? `${display} ${units[0]}` : display;
    }
  }

  return quantities.join(' + ');
}

function formatDateShort(dateStr) {
  try {
    return format(parseISO(dateStr), 'EEE d MMM', { locale: fr });
  } catch {
    return dateStr;
  }
}
