import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
  const [recipes, setRecipes] = useState([]);
  const [planning, setPlanning] = useState({});
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [showRecipePicker, setShowRecipePicker] = useState(null); // { date, slot, user }
  const [showWeekView, setShowWeekView] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setRecipes(data);
    });

    const unsub2 = onSnapshot(collection(db, 'planning'), (snapshot) => {
      const data = {};
      snapshot.docs.forEach(d => {
        data[d.id] = d.data();
      });
      setPlanning(data);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const days = (() => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (end < start) return [];
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  })();

  const getMeal = (date, slot, user) => {
    const key = format(date, 'yyyy-MM-dd');
    return planning[key]?.[slot]?.[user] || null;
  };

  const setMeal = (date, slot, user, recipe) => {
    const key = format(date, 'yyyy-MM-dd');
    setPlanning(prev => ({
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
    setMeal(date, slot, user, null);
  };

  const handlePickRecipe = (recipe) => {
    if (showRecipePicker) {
      setMeal(showRecipePicker.date, showRecipePicker.slot, showRecipePicker.user, recipe);
      setShowRecipePicker(null);
      setRecipeSearch('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(planning).map(([date, data]) =>
        setDoc(doc(db, 'planning', date), data)
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Save error:', error);
    }
    setSaving(false);
  };

  const filteredRecipes = recipes.filter(r =>
    r.title?.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  const getRecipeTitle = (meal) => {
    if (!meal) return null;
    return meal.title || 'Recette';
  };

  return (
    <div className="planning-page">
      <div className="page-header">
        <div className="planning-header-row">
          <div>
            <h1>Planning</h1>
            <p>Planifiez vos repas</p>
          </div>
          <div className="planning-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWeekView(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Vue
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
        <div className="date-range">
          <div className="date-input-group">
            <label>Du</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="date-input-group">
            <label>Au</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="page-content">
        {days.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h3>Choisissez vos dates</h3>
            <p>Sélectionnez une période pour planifier vos repas</p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Recipe Picker Modal */}
      {showRecipePicker && (
        <div className="modal-overlay" onClick={() => { setShowRecipePicker(null); setRecipeSearch(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Choisir une recette</h2>
              <button className="btn-ghost btn-icon" onClick={() => { setShowRecipePicker(null); setRecipeSearch(''); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="search-bar" style={{ marginBottom: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  autoFocus
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
                const dayData = planning[key];
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
                const dayData = planning[format(date, 'yyyy-MM-dd')];
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
  const [expanded, setExpanded] = useState(true);
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
