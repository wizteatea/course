import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { guessCategory } from '../utils/guessCategory';
import './Recipes.css';

const CATEGORIES = [
  'Fruits et légumes', 'Viande', 'Poisson', 'Produits laitiers',
  'Épicerie', 'Surgelés', 'Boissons', 'Boulangerie', 'Autres'
];

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', category: 'Autres' }]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setRecipes(data);
    });
    return unsub;
  }, []);

  const openNew = () => {
    setEditingRecipe(null);
    setTitle('');
    setIngredients([{ name: '', quantity: '', category: 'Autres' }]);
    setShowModal(true);
  };

  const openEdit = (recipe) => {
    setEditingRecipe(recipe);
    setTitle(recipe.title);
    setIngredients(recipe.ingredients?.length ? recipe.ingredients.map(i => ({ ...i })) : [{ name: '', quantity: '', category: 'Autres' }]);
    setShowModal(true);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', category: 'Autres' }]);
  };

  const removeIngredient = (index) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index, field, value) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'name') {
      const current = updated[index].category;
      // Auto-catégorisation tant que l'utilisateur n'a pas choisi lui-même
      if (!current || current === 'Autres' || updated[index]._autoCat) {
        const guess = guessCategory(value);
        updated[index].category = guess;
        updated[index]._autoCat = true;
      }
    }
    if (field === 'category') {
      updated[index]._autoCat = false;
    }
    setIngredients(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    const validIngredients = ingredients
      .filter(i => i.name.trim())
      .map(i => { const { _autoCat: _, ...rest } = i; return rest; });
    const data = { title: title.trim(), ingredients: validIngredients };

    if (editingRecipe) {
      await updateDoc(doc(db, 'recipes', editingRecipe.id), data);
    } else {
      await addDoc(collection(db, 'recipes'), data);
    }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette recette ?')) {
      await deleteDoc(doc(db, 'recipes', id));
    }
  };

  const filtered = recipes.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="recipes-page">
      <div className="page-header">
        <h1>Recettes</h1>
        <p>{recipes.length} recette{recipes.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="page-content">
        <div className="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Rechercher une recette..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <h3>Aucune recette</h3>
            <p>Ajoutez votre première recette pour commencer</p>
          </div>
        ) : (
          <div className="recipes-list">
            {filtered.map(recipe => (
              <div key={recipe.id} className="recipe-card card" onClick={() => openEdit(recipe)}>
                <div className="recipe-card-header">
                  <h3>{recipe.title}</h3>
                  <button className="btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                    </svg>
                  </button>
                </div>
                <div className="recipe-ingredients-preview">
                  {recipe.ingredients?.slice(0, 4).map((ing, i) => (
                    <span key={i} className="badge badge-primary">{ing.name}</span>
                  ))}
                  {recipe.ingredients?.length > 4 && (
                    <span className="badge">+{recipe.ingredients.length - 4}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={openNew}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRecipe ? 'Modifier la recette' : 'Nouvelle recette'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Nom de la recette</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Ex: Poulet rôti aux légumes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="ingredients-section">
                <div className="ingredients-header">
                  <label>Ingrédients</label>
                  <button className="btn btn-secondary btn-sm" onClick={addIngredient}>+ Ajouter</button>
                </div>
                {ingredients.map((ing, index) => (
                  <div key={index} className="ingredient-row">
                    <div className="ingredient-inputs">
                      <input
                        className="input"
                        type="text"
                        placeholder="Ingrédient"
                        value={ing.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      />
                      <input
                        className="input input-qty"
                        type="text"
                        placeholder="Qté"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="ingredient-meta">
                      <select
                        className="input input-category"
                        value={ing.category || 'Autres'}
                        onChange={(e) => updateIngredient(index, 'category', e.target.value)}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button className="btn-ghost btn-icon-sm" onClick={() => removeIngredient(index)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{flex: 1}} onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" style={{flex: 2}} onClick={handleSave}>
                {editingRecipe ? 'Enregistrer' : 'Créer la recette'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
