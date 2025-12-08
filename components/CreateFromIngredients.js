// components/CreateFromIngredients.js
import { useState, useEffect } from 'react';
import RecipeCard from './RecipeCard';
import AdSlot from './AdSlot';
import { useModal } from './ModalContext'; // 1. Import the hook

export default function CreateFromIngredients() {
  const [ingredientInput, setIngredientInput] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  // 2. Get the close function from context
  const { setShowIngredientsModal } = useModal();

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function addIngredient(e) {
    e.preventDefault();
    const val = ingredientInput.trim();
    if (!val) return;

    const slug = slugify(val);

    if (!selectedIngredients.includes(slug)) {
      setSelectedIngredients([...selectedIngredients, slug]);
    }

    setIngredientInput('');
  }

  function removeIngredient(slug) {
    setSelectedIngredients(selectedIngredients.filter((i) => i !== slug));
  }

  useEffect(() => {
    if (!selectedIngredients.length) {
      setRecipes([]);
      return;
    }

    async function fetchRecipes() {
      setLoading(true);
      const list = selectedIngredients.join(',');

      const res = await fetch(
        `/api/recipes?ingredients=${list}&match_type=all`
      );
      const json = await res.json();

      setRecipes(json.data || []);
      setLoading(false);
    }

    fetchRecipes();
  }, [selectedIngredients]);

  return (
    <section className='vr-create-ing'>
      <h2 className='vr-category__title'>Create Recipes From Ingredients</h2>
      <p className='vr-modal-subtitle'>
        Add the ingredients you have, and we’ll show you matching recipes.
      </p>
      <div
        className={`${
          selectedIngredients.length > 0 ? 'vr-filter-container' : ''
        }`}
      >
        <form
          className='vr-create-ing__input-row'
          onSubmit={addIngredient}
        >
          <input
            type='text'
            placeholder='Add ingredients…'
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
          />
          <button type='submit'>Add</button>
        </form>
        {selectedIngredients.length > 0 && (
          <div className='vr-create-ing__tags'>
            {selectedIngredients.map((tag) => (
              <button
                key={tag}
                className='vr-create-ing__tag'
                onClick={() => removeIngredient(tag)}
                type='button'
              >
                {tag.replace(/-/g, ' ')} <span>×</span>
              </button>
            ))}

            <button
              type='button'
              className='vr-create-ing__tag vr-create-ing__tag--clear'
              onClick={() => setSelectedIngredients([])}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {loading && <p>Loading recipes…</p>}

      {!loading && recipes.length > 0 && (
        <div className='vr-category__grid'>
          {recipes.map((r, index) => (
            /* 3. Wrap Card in a generic container that handles the click. 
               display: 'contents' preserves your grid layout. */
            <div
              key={r.id}
              onClick={() => setShowIngredientsModal(false)}
            >
              <RecipeCard recipe={r} />

              <AdSlot
                id='101'
                position='in-feed'
                index={index}
                every={5}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
