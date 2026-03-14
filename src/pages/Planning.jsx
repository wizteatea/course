import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, addDays, parseISO, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import './Planning.css';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Petit-déjeuner', icon: '🌅' },
  { id: 'snack1', label: 'Collation', icon: '🍎' },
  { id: 'lunch', label: 'Déjeuner', icon: '🍽️' },
  { id: 'snack2', label: 'Collation', icon: '🍪' },
  { id: 'dinner', label: 'Dîner', icon: '🌙' },
  { id: 'snack3', label: 'Collation', icon: '🥛' },
];

const USERS = ['Teef', 'Maxime'];

export default function Planning() {
  const [plannings, setPlannings] = useState([]);
  const [selectedPlanningId, setSelectedPlanningId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEnd, setNewEnd] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plannings'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setPlannings(data);
    });
    return unsub;
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newStart || !newEnd) return;
    await addDoc(collection(db, 'plannings'), {
      name: newName.trim(),
      startDate: newStart,
      endDate: newEnd,
      meals: {},
      createdAt: new Date().toISOString(),
    });
    setShowCreateModal(false);
    setNewName('');
    setNewStart(format(new Date(), 'yyyy-MM-dd'));
    setNewEnd(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce planning ?')) {
      await deleteDoc(doc(db, 'plannings', id));
    }
  };

  const selectedPlanning = plannings.find(p => p.id === selectedPlanningId);

  if (selectedPlanning) {
    return (
      <PlanningDetail
        planning={selectedPlanning}
        onBack={() => setSelectedPlanningId(null)}
      />
    );
  }

  return (
    <div className="planning-page">
      <div className="page-header">
        <h1>Plannings</h1>
        <p>{plannings.length} planning{plannings.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="page-content">
        {plannings.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h3>Aucun planning</h3>
            <p>Créez votre premier planning de repas</p>
          </div>
        ) : (
          <div className="plannings-list">
            {plannings.map(p => (
              <div key={p.id} className="planning-card card" onClick={() => setSelectedPlanningId(p.id)}>
                <div className="planning-card-header">
                  <h3>{p.name}</h3>
                  <button className="btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                    </svg>
                  </button>
                </div>
                <div className="planning-card-dates">
                  <span>{formatDateLabel(p.startDate)}</span>
                  <span className="date-arrow">→</span>
                  <span>{formatDateLabel(p.endDate)}</span>
                </div>
                <div className="planning-card-stats">
                  {countMeals(p.meals)} repas planifiés
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setShowCreateModal(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau planning</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Nom du planning</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Ex: Semaine du 17 mars"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="date-range">
                <div className="date-input-group">
                  <label>Du</label>
                  <input type="date" className="input" value={newStart} onChange={e => setNewStart(e.target.value)} />
                </div>
                <div className="date-input-group">
                  <label>Au</label>
                  <input type="date" className="input" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreate}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanningDetail({ planning, onBack }) {
  const [recipes, setRecipes] = useState([]);
  const [meals, setMeals] = useState(planning.meals || {});
  const [showRecipePicker, setShowRecipePicker] = useState(null);
  const [showWeekView, setShowWeekView] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [pickerTab, setPickerTab] = useState('recipe'); // 'recipe' | 'free'
  const [freeText, setFreeText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setRecipes(data);
    });
    return unsub;
  }, []);

  // Sync meals from Firestore in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'plannings', planning.id), (snapshot) => {
      if (snapshot.exists()) {
        setMeals(snapshot.data().meals || {});
      }
    });
    return unsub;
  }, [planning.id]);

  const days = (() => {
    try {
      const start = parseISO(planning.startDate);
      const end = parseISO(planning.endDate);
      if (end < start) return [];
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  })();

  const getMeal = (date, slot, user) => {
    const key = format(date, 'yyyy-MM-dd');
    return meals[key]?.[slot]?.[user] || null;
  };

  const setMealData = (date, slot, user, recipe) => {
    const key = format(date, 'yyyy-MM-dd');
    setMeals(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [slot]: {
          ...prev[key]?.[slot],
          [user]: recipe ? { id: recipe.id, title: recipe.title } : null,
        }
      }
    }));
  };

  const removeMeal = (date, slot, user) => {
    setMealData(date, slot, user, null);
  };

  const handlePickRecipe = (recipe) => {
    if (showRecipePicker) {
      setMealData(showRecipePicker.date, showRecipePicker.slot, showRecipePicker.user, recipe);
      closePicker();
    }
  };

  const handlePickFreeText = () => {
    if (!freeText.trim() || !showRecipePicker) return;
    setMealData(showRecipePicker.date, showRecipePicker.slot, showRecipePicker.user, {
      id: null,
      title: freeText.trim(),
    });
    closePicker();
  };

  const closePicker = () => {
    setShowRecipePicker(null);
    setRecipeSearch('');
    setFreeText('');
    setPickerTab('recipe');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'plannings', planning.id), { ...planning, meals }, { merge: true });
    } catch (error) {
      console.error('Save error:', error);
    }
    setSaving(false);
  };

  const filteredRecipes = recipes.filter(r =>
    r.title?.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div className="planning-page">
      <div className="page-header">
        <div className="planning-header-row">
          <div className="planning-back-row">
            <button className="btn-ghost btn-icon" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
            <div>
              <h1>{planning.name}</h1>
              <p>{formatDateLabel(planning.startDate)} → {formatDateLabel(planning.endDate)}</p>
            </div>
          </div>
          <div className="planning-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWeekView(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Vue
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? '...' : 'Sauver'}
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="days-list">
          {days.map(date => (
            <DayCard
              key={format(date, 'yyyy-MM-dd')}
              date={date}
              getMeal={getMeal}
              removeMeal={removeMeal}
              onPickRecipe={(slot, user) => setShowRecipePicker({ date, slot, user })}
            />
          ))}
        </div>
      </div>

      {/* Recipe Picker Modal */}
      {showRecipePicker && (
        <div className="modal-overlay" onClick={closePicker}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ajouter un repas</h2>
              <button className="btn-ghost btn-icon" onClick={closePicker}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="picker-tabs">
              <button
                className={`picker-tab ${pickerTab === 'recipe' ? 'active' : ''}`}
                onClick={() => setPickerTab('recipe')}
              >
                📖 Recette
              </button>
              <button
                className={`picker-tab ${pickerTab === 'free' ? 'active' : ''}`}
                onClick={() => setPickerTab('free')}
              >
                ✏️ Texte libre
              </button>
            </div>
            <div className="modal-body">
              {pickerTab === 'recipe' ? (
                <>
                  <div className="search-bar" style={{ marginBottom: 12 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Rechercher une recette..."
                      value={recipeSearch}
                      onChange={e => setRecipeSearch(e.target.value)}
                      autoFocus={pickerTab === 'recipe'}
                    />
                  </div>
                  <div className="recipe-picker-list">
                    {filteredRecipes.map(recipe => (
                      <button key={recipe.id} className="recipe-pick-item" onClick={() => handlePickRecipe(recipe)}>
                        <span className="recipe-pick-title">{recipe.title}</span>
                        <span className="recipe-pick-count">{recipe.ingredients?.length || 0} ing.</span>
                      </button>
                    ))}
                    {filteredRecipes.length === 0 && (
                      <p className="no-results">Aucune recette trouvée</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="free-text-picker">
                  <div className="input-group">
                    <label>Qu'est-ce que vous mangez ?</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Ex: Pain, yaourt, café..."
                      value={freeText}
                      onChange={e => setFreeText(e.target.value)}
                      autoFocus={pickerTab === 'free'}
                      onKeyDown={e => e.key === 'Enter' && handlePickFreeText()}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-full"
                    style={{ marginTop: 16 }}
                    onClick={handlePickFreeText}
                    disabled={!freeText.trim()}
                  >
                    Ajouter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Week View Modal */}
      {showWeekView && (
        <div className="modal-overlay" onClick={() => setShowWeekView(false)}>
          <div className="modal-content week-view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Vue semaine</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowWeekView(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body week-view-body">
              {days.map(date => {
                const key = format(date, 'yyyy-MM-dd');
                const dayData = meals[key];
                const hasMeals = dayData && Object.values(dayData).some(slot =>
                  slot && Object.values(slot).some(m => m)
                );
                if (!hasMeals) return null;
                return (
                  <div key={key} className="week-day-summary">
                    <h3 className="week-day-title">
                      {format(date, 'EEEE d MMMM', { locale: fr })}
                    </h3>
                    {MEAL_SLOTS.map(slot => {
                      const slotData = dayData?.[slot.id];
                      if (!slotData) return null;
                      const entries = USERS.filter(u => slotData[u]);
                      if (entries.length === 0) return null;
                      return (
                        <div key={slot.id} className="week-slot-summary">
                          <span className="week-slot-label">{slot.icon} {slot.label}</span>
                          <div className="week-slot-meals">
                            {entries.map(user => (
                              <span key={user} className="week-meal-chip">
                                <strong>{user}:</strong> {slotData[user].title}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {!days.some(date => {
                const dayData = meals[format(date, 'yyyy-MM-dd')];
                return dayData && Object.values(dayData).some(slot =>
                  slot && Object.values(slot).some(m => m)
                );
              }) && (
                <div className="empty-state">
                  <p>Aucun repas planifié</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({ date, getMeal, removeMeal, onPickRecipe }) {
  const [expanded, setExpanded] = useState(false);
  const dayName = format(date, 'EEEE', { locale: fr });
  const dayDate = format(date, 'd MMMM', { locale: fr });

  const hasMeals = MEAL_SLOTS.some(slot =>
    USERS.some(user => getMeal(date, slot.id, user))
  );

  return (
    <div className="day-card card">
      <div className="day-card-header" onClick={() => setExpanded(!expanded)}>
        <div>
          <span className="day-name">{dayName}</span>
          <span className="day-date">{dayDate}</span>
        </div>
        <div className="day-header-right">
          {hasMeals && <span className="badge badge-success">Planifié</span>}
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            width="20" height="20"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="day-card-body">
          {MEAL_SLOTS.map(slot => (
            <div key={slot.id} className="meal-slot">
              <div className="meal-slot-label">
                <span>{slot.icon}</span>
                <span>{slot.label}</span>
              </div>
              <div className="meal-users">
                {USERS.map(user => {
                  const meal = getMeal(date, slot.id, user);
                  return (
                    <div key={user} className="meal-user-cell">
                      <span className="meal-user-name">{user}</span>
                      {meal ? (
                        <div className="meal-assigned">
                          <span className="meal-title" onClick={() => onPickRecipe(slot.id, user)}>{meal.title}</span>
                          <button className="meal-remove" onClick={() => removeMeal(date, slot.id, user)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button className="meal-add-btn" onClick={() => onPickRecipe(slot.id, user)}>
                          + Recette
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDateLabel(dateStr) {
  try {
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

function countMeals(meals) {
  if (!meals) return 0;
  let count = 0;
  Object.values(meals).forEach(day => {
    if (day) Object.values(day).forEach(slot => {
      if (slot) Object.values(slot).forEach(m => {
        if (m) count++;
      });
    });
  });
  return count;
}
