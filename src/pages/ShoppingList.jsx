import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { guessCategory } from '../utils/guessCategory';
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

const SLOT_LABELS = {
  breakfast: { label: 'Petit-déj', icon: '🌅' },
  snack1: { label: 'Collation', icon: '🍎' },
  lunch: { label: 'Déjeuner', icon: '🍽️' },
  snack2: { label: 'Collation', icon: '🍪' },
  dinner: { label: 'Dîner', icon: '🌙' },
  snack3: { label: 'Collation', icon: '🥛' },
};

// ─── Page liste des plannings ───────────────────────────────────────────────

export default function ShoppingList() {
  const [plannings, setPlannings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plannings'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setPlannings(data);
    });
    return unsub;
  }, []);

  const selected = plannings.find(p => p.id === selectedId);

  if (selected) {
    return <ShoppingListDetail planning={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="shopping-page">
      <div className="page-header">
        <h1>Courses</h1>
        <p>Sélectionnez un planning</p>
      </div>
      <div className="page-content">
        {plannings.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <h3>Aucun planning</h3>
            <p>Créez un planning dans l'onglet Planning pour générer une liste de courses</p>
          </div>
        ) : (
          <div className="plannings-list">
            {plannings.map(p => {
              const itemCount = countAutoItems(p);
              const manualCount = (p.manualItems || []).length;
              return (
                <div key={p.id} className="planning-card card" onClick={() => setSelectedId(p.id)}>
                  <div className="planning-card-header">
                    <h3>{p.name}</h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                  <div className="planning-card-dates">
                    <span>{formatDateLabel(p.startDate)}</span>
                    <span className="date-arrow">→</span>
                    <span>{formatDateLabel(p.endDate)}</span>
                  </div>
                  <div className="planning-card-stats">
                    {itemCount} article{itemCount !== 1 ? 's' : ''} auto
                    {manualCount > 0 && ` · ${manualCount} manuel${manualCount !== 1 ? 's' : ''}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Détail liste de courses d'un planning ──────────────────────────────────

function ShoppingListDetail({ planning, onBack }) {
  const [recipes, setRecipes] = useState([]);
  const [planningData, setPlanningData] = useState(planning);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showMeals, setShowMeals] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [shopMode, setShopMode] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCat, setNewItemCat] = useState('Autres');
  const [newItemCatAuto, setNewItemCatAuto] = useState(true);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      setRecipes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(doc(db, 'plannings', planning.id), (snapshot) => {
      if (snapshot.exists()) setPlanningData({ id: snapshot.id, ...snapshot.data() });
    });
    return () => { unsub1(); unsub2(); };
  }, [planning.id]);

  const recipeMap = useMemo(() => {
    const map = {};
    recipes.forEach(r => { map[r.id] = r; });
    return map;
  }, [recipes]);

  // Génère les items auto depuis les repas (sans doubler les quantités pour une même recette)
  const { autoItems, plannedMeals } = useMemo(() => {
    const ingredientMap = {};
    const meals = [];
    const mealsData = planningData.meals || {};
    const processedRecipeIds = new Set();

    Object.entries(mealsData).forEach(([date, dayData]) => {
      Object.entries(dayData).forEach(([slotId, slotData]) => {
        if (!slotData) return;
        Object.entries(slotData).forEach(([user, meal]) => {
          if (!meal?.id) return;
          const recipe = recipeMap[meal.id];
          if (!recipe) return;
          meals.push({ date, slotId, user, recipe });
          // N'ajouter les ingrédients qu'une seule fois par recette unique
          if (!processedRecipeIds.has(meal.id)) {
            processedRecipeIds.add(meal.id);
            recipe.ingredients?.forEach(ing => {
              if (!ing.name) return;
              const key = ing.name.toLowerCase().trim();
              if (!ingredientMap[key]) {
                const cat = (ing.category && ing.category !== 'Autres') ? ing.category : guessCategory(ing.name);
                ingredientMap[key] = { name: ing.name, quantities: [], category: cat, sources: [] };
              }
              if (ing.quantity) ingredientMap[key].quantities.push(ing.quantity);
            });
          }
          // Toujours ajouter la source pour la traçabilité
          recipe.ingredients?.forEach(ing => {
            if (!ing.name) return;
            const key = ing.name.toLowerCase().trim();
            if (ingredientMap[key]) {
              ingredientMap[key].sources.push({ recipe: recipe.title, user, date });
            }
          });
        });
      });
    });

    const items = Object.entries(ingredientMap).map(([key, item]) => {
      const override = planningData.overrides?.[key];
      if (override?.deleted) return null;
      return {
        key,
        name: item.name,
        quantity: override?.quantity ?? mergeQuantities(item.quantities),
        category: override?.category ?? item.category,
        sources: item.sources,
        isAuto: true,
      };
    }).filter(Boolean);

    items.sort((a, b) => {
      const catA = CATEGORIES.indexOf(a.category);
      const catB = CATEGORIES.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });

    meals.sort((a, b) => a.date.localeCompare(b.date));
    return { autoItems: items, plannedMeals: meals };
  }, [planningData, recipeMap]);

  // Items manuels
  const manualItems = useMemo(() => {
    return (planningData.manualItems || []).map((item, idx) => ({
      ...item,
      key: `manual_${idx}`,
      isAuto: false,
    }));
  }, [planningData]);

  // Tous les items groupés par catégorie
  const allItems = useMemo(() => {
    return [...autoItems, ...manualItems];
  }, [autoItems, manualItems]);

  const grouped = useMemo(() => {
    const groups = {};
    allItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [allItems]);

  const checked = planningData.checked || {};
  const totalItems = allItems.length;
  const checkedCount = allItems.filter(i => checked[i.key]).length;

  const saveToFirestore = async (updates) => {
    await setDoc(doc(db, 'plannings', planning.id), { ...planningData, ...updates }, { merge: true });
  };

  const toggleCheck = async (key) => {
    const updated = { ...checked, [key]: !checked[key] };
    await saveToFirestore({ checked: updated });
  };

  const handleDeleteAuto = async (key) => {
    const updated = { ...(planningData.overrides || {}), [key]: { ...(planningData.overrides?.[key] || {}), deleted: true } };
    await saveToFirestore({ overrides: updated });
  };

  const handleDeleteManual = async (idx) => {
    const updated = [...(planningData.manualItems || [])];
    updated.splice(idx, 1);
    await saveToFirestore({ manualItems: updated });
  };

  const handleChangeCategory = async (item, newCategory) => {
    if (item.isAuto) {
      const updated = { ...(planningData.overrides || {}), [item.key]: { ...(planningData.overrides?.[item.key] || {}), category: newCategory } };
      await saveToFirestore({ overrides: updated });
    } else {
      const idx = parseInt(item.key.replace('manual_', ''));
      const updated = [...(planningData.manualItems || [])];
      updated[idx] = { ...updated[idx], category: newCategory };
      await saveToFirestore({ manualItems: updated });
    }
    setEditingItem(prev => prev ? { ...prev, category: newCategory } : null);
  };

  const handleChangeQuantity = async (item, newQty) => {
    if (item.isAuto) {
      const updated = { ...(planningData.overrides || {}), [item.key]: { ...(planningData.overrides?.[item.key] || {}), quantity: newQty } };
      await saveToFirestore({ overrides: updated });
    } else {
      const idx = parseInt(item.key.replace('manual_', ''));
      const updated = [...(planningData.manualItems || [])];
      updated[idx] = { ...updated[idx], quantity: newQty };
      await saveToFirestore({ manualItems: updated });
    }
  };

  const handleAddManual = async () => {
    if (!newItemName.trim()) return;
    const updated = [...(planningData.manualItems || []), {
      name: newItemName.trim(),
      quantity: newItemQty.trim(),
      category: newItemCat,
    }];
    await saveToFirestore({ manualItems: updated });
    setNewItemName('');
    setNewItemQty('');
    setNewItemCat('Autres');
    setNewItemCatAuto(true);
    setShowAddItem(false);
  };

  const handleReset = async () => {
    await saveToFirestore({ checked: {}, overrides: {} });
  };

  // Mode courses : vue simplifiée plein écran
  if (shopMode) {
    const uncheckedItems = allItems.filter(i => !checked[i.key]);
    const checkedItemsList = allItems.filter(i => checked[i.key]);
    const uncheckedGrouped = {};
    uncheckedItems.forEach(item => {
      if (!uncheckedGrouped[item.category]) uncheckedGrouped[item.category] = [];
      uncheckedGrouped[item.category].push(item);
    });

    return (
      <div className="shop-mode">
        <div className="shop-mode-header">
          <button className="btn-ghost btn-icon" onClick={() => setShopMode(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="shop-mode-title">
            <span>Mode Courses</span>
            <span className="shop-mode-count">{checkedCount}/{totalItems}</span>
          </div>
          <div style={{ width: 40 }} />
        </div>
        <div className="shop-mode-progress">
          <div className="progress-fill" style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }} />
        </div>
        <div className="shop-mode-list">
          {CATEGORIES.map(cat => {
            const items = uncheckedGrouped[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat} className="shop-mode-category">
                <div className="shop-mode-cat-header">
                  {CATEGORY_ICONS[cat]} {cat}
                </div>
                {items.map(item => (
                  <button
                    key={item.key}
                    className="shop-mode-item"
                    onClick={() => toggleCheck(item.key)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="2" width="28" height="28">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <div className="shop-mode-item-info">
                      <span className="shop-mode-item-name">{item.name}</span>
                      {item.quantity && <span className="shop-mode-item-qty">{item.quantity}</span>}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
          {uncheckedItems.length === 0 && (
            <div className="shop-mode-done">
              <span style={{ fontSize: 48 }}>🎉</span>
              <h2>Courses terminées !</h2>
              <p>Tous les articles ont été cochés</p>
            </div>
          )}
          {checkedItemsList.length > 0 && (
            <div className="shop-mode-checked-section">
              <div className="shop-mode-checked-title">
                ✓ Déjà pris ({checkedItemsList.length})
              </div>
              {checkedItemsList.map(item => (
                <button
                  key={item.key}
                  className="shop-mode-item checked"
                  onClick={() => toggleCheck(item.key)}
                >
                  <svg viewBox="0 0 24 24" fill="var(--success)" width="28" height="28">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="shop-mode-item-name">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-page">
      <div className="page-header">
        <div className="shopping-header-row">
          <div className="shopping-back-row">
            <button className="btn-ghost btn-icon" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
            <div>
              <h1>{planning.name}</h1>
              <p>{checkedCount}/{totalItems} cochés</p>
            </div>
          </div>
          <div className="shopping-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setShopMode(true)}>
              🛒 Courses
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMeals(true)}>
              Repas
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleReset} title="Réinitialiser">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="1,4 1,10 7,10"/>
                <path d="M3.51 15a9 9 0 105.64-11.36L1 10"/>
              </svg>
            </button>
          </div>
        </div>
        {totalItems > 0 && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(checkedCount / totalItems) * 100}%` }} />
          </div>
        )}
      </div>

      <div className="page-content">
        {allItems.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <h3>Liste vide</h3>
            <p>Ajoutez des recettes à ce planning ou ajoutez des articles manuellement</p>
          </div>
        ) : (
          <div className="shopping-categories">
            {CATEGORIES.map(cat => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              const allChecked = items.every(i => checked[i.key]);
              return (
                <div key={cat} className={`shopping-category ${allChecked ? 'all-checked' : ''}`}>
                  <div className="category-header">
                    <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                    <span className="category-name">{cat}</span>
                    <span className="category-count">
                      {items.filter(i => checked[i.key]).length}/{items.length}
                    </span>
                  </div>
                  <div className="category-items">
                    {items.map(item => (
                      <div key={item.key} className={`shopping-item ${checked[item.key] ? 'checked' : ''}`}>
                        <button className="check-btn" onClick={() => toggleCheck(item.key)}>
                          {checked[item.key] ? (
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
                          <div className="item-name-row">
                            <span className="item-name">{item.name}</span>
                            {!item.isAuto && <span className="item-manual-badge">manuel</span>}
                          </div>
                          {item.quantity && <span className="item-qty">{item.quantity}</span>}
                        </div>
                        <div className="item-actions">
                          <button className="btn-ghost btn-icon-sm" onClick={() => setEditingItem(item)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn-ghost btn-icon-sm" onClick={() => {
                            if (item.isAuto) handleDeleteAuto(item.key);
                            else handleDeleteManual(parseInt(item.key.replace('manual_', '')));
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <polyline points="3,6 5,6 21,6"/>
                              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
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

      {/* FAB Ajouter article */}
      <button className="fab" onClick={() => setShowAddItem(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Modal Ajouter article manuel */}
      {showAddItem && (
        <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ajouter un article</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowAddItem(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group" style={{ marginBottom: 12 }}>
                <label>Nom</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Ex: Tomates cerises"
                  value={newItemName}
                  onChange={e => {
                    setNewItemName(e.target.value);
                    if (newItemCatAuto) setNewItemCat(guessCategory(e.target.value));
                  }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 12 }}>
                <label>Quantité (optionnel)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Ex: 500g, 1 bouteille..."
                  value={newItemQty}
                  onChange={e => setNewItemQty(e.target.value)}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Catégorie</label>
                <div className="chip-row">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`chip ${newItemCat === cat ? 'active' : ''}`}
                      onClick={() => { setNewItemCat(cat); setNewItemCatAuto(false); }}
                    >
                      {CATEGORY_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddItem(false)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleAddManual}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modifier article */}
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
                  onChange={e => {
                    setEditingItem({ ...editingItem, quantity: e.target.value });
                    handleChangeQuantity(editingItem, e.target.value);
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
                      onClick={() => handleChangeCategory(editingItem, cat)}
                    >
                      {CATEGORY_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>
              {editingItem.isAuto && editingItem.sources?.length > 0 && (
                <div className="item-sources">
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Utilisé dans :
                  </label>
                  {editingItem.sources.map((s, i) => (
                    <div key={i} className="source-item">
                      <span className="source-recipe">{s.recipe}</span>
                      <span className="source-meta">{s.user} · {formatDateShort(s.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal repas planifiés — groupé par jour */}
      {showMeals && (
        <div className="modal-overlay" onClick={() => setShowMeals(false)}>
          <div className="modal-content meals-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Repas planifiés</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowMeals(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body meals-modal-body">
              {plannedMeals.length === 0 ? (
                <p className="no-results">Aucun repas planifié</p>
              ) : (
                <div className="meals-by-day">
                  {groupMealsByDay(plannedMeals).map(({ date, label, slots }) => (
                    <div key={date} className="meals-day-group">
                      <div className="meals-day-header">{label}</div>
                      <div className="meals-day-slots">
                        {slots.map((slot, si) => (
                          <div key={si} className="meals-slot-row">
                            <div className="meals-slot-label">
                              <span className="meals-slot-icon">{slot.icon}</span>
                              <span>{slot.label}</span>
                            </div>
                            <div className="meals-slot-entries">
                              {slot.entries.map((entry, ei) => (
                                <div key={ei} className="meals-entry">
                                  <span className="meals-entry-recipe">{entry.recipe}</span>
                                  <span className="meals-entry-user">{entry.user}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function countAutoItems(planning) {
  const meals = planning.meals || {};
  const keys = new Set();
  Object.values(meals).forEach(day => {
    Object.values(day).forEach(slot => {
      if (!slot) return;
      Object.values(slot).forEach(meal => {
        if (meal?.id) keys.add(meal.id);
      });
    });
  });
  return keys.size;
}

function mergeQuantities(quantities) {
  if (quantities.length === 0) return '';
  if (quantities.length === 1) return quantities[0];
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

function groupMealsByDay(meals) {
  const dayMap = {};
  const slotOrder = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];
  meals.forEach(m => {
    if (!dayMap[m.date]) dayMap[m.date] = {};
    if (!dayMap[m.date][m.slotId]) dayMap[m.date][m.slotId] = [];
    dayMap[m.date][m.slotId].push({ recipe: m.recipe.title, user: m.user });
  });
  return Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slotData]) => ({
      date,
      label: formatDateFull(date),
      slots: slotOrder
        .filter(s => slotData[s])
        .map(s => ({
          icon: SLOT_LABELS[s]?.icon || '',
          label: SLOT_LABELS[s]?.label || s,
          entries: slotData[s],
        })),
    }));
}

function formatDateFull(dateStr) {
  try { return format(parseISO(dateStr), 'EEEE d MMMM', { locale: fr }); }
  catch { return dateStr; }
}

function formatDateLabel(dateStr) {
  try { return format(parseISO(dateStr), 'd MMM yyyy', { locale: fr }); }
  catch { return dateStr; }
}

function formatDateShort(dateStr) {
  try { return format(parseISO(dateStr), 'EEE d MMM', { locale: fr }); }
  catch { return dateStr; }
}
