import { useState, useEffect, useMemo } from 'react';
import RecipeCard from './RecipeCard';
import AdSlot from './AdSlot';
import { useModal } from './ModalContext';

const PER_PAGE = 24;

export default function CreateFromIngredients() {
  const [ingredientInput, setIngredientInput] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]);

  // Store the full recipe pool locally for accurate filtering
  const [allRecipes, setAllRecipes] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Hydration Safety
  const [isMounted, setIsMounted] = useState(false);

  // Pagination for matched recipes (Load More)
  const [visibleCount, setVisibleCount] = useState(PER_PAGE);

  const { setShowIngredientsModal } = useModal();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ----------------------------------------------------
  // 1. HELPER: PARSE INGREDIENTS (Copied from FilterPanel)
  // ----------------------------------------------------
  const getRecipeIngredients = (rec) => {
    let ings = rec.ingredients;
    if (typeof ings === 'string') {
      try {
        ings = JSON.parse(ings);
      } catch {
        ings = [];
      }
    }
    return Array.isArray(ings) ? ings : [];
  };

  // ----------------------------------------------------
  // 2. FETCH DATA ONCE (Lazy Load Pattern)
  // ----------------------------------------------------
  useEffect(() => {
    async function loadRecipePool() {
      try {
        // Fetch a large batch to ensure we have a good pool for filtering.
        const res = await fetch('/api/recipes?page=1&per_page=1000');
        const json = await res.json();

        setAllRecipes(json.data || []);
        setIsDataLoaded(true);
      } catch (err) {
        console.error('Failed to load recipe database', err);
        setIsDataLoaded(true);
      }
    }

    loadRecipePool();
  }, []);

  // ----------------------------------------------------
  // 3. FILTER LOGIC (Matches FilterPanel exactly)
  // ----------------------------------------------------
  const matchedRecipes = useMemo(() => {
    if (!selectedIngredients.length || !allRecipes.length) {
      return [];
    }

    return allRecipes.filter((rec) => {
      // Get valid slugs from the recipe's ingredient list
      const recImageSlugs = getRecipeIngredients(rec)
        .map((i) => i.image)
        .filter(Boolean);

      // Strict Check: Recipe must contain ALL selected ingredients
      const hasAllSelected = selectedIngredients.every((slug) =>
        recImageSlugs.includes(slug)
      );

      return hasAllSelected;
    });
  }, [allRecipes, selectedIngredients]);

  // Reset pagination when filters (selectedIngredients) change
  useEffect(() => {
    setVisibleCount(PER_PAGE);
  }, [selectedIngredients, matchedRecipes.length]);

  const visibleRecipes = useMemo(() => {
    return matchedRecipes.slice(0, visibleCount);
  }, [matchedRecipes, visibleCount]);

  const hasMore = visibleCount < matchedRecipes.length;

  // Input Handlers
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

  const handleLoadMore = () => {
    if (!hasMore) return;
    setVisibleCount((prev) => prev + PER_PAGE);
  };

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
            placeholder='Add ingredients (e.g. salt, chicken)...'
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

      {/* FEEDBACK STATES */}
      {!isDataLoaded && (
        <p className='vr-search-results__empty'>Loading recipe database...</p>
      )}

      {isDataLoaded &&
        selectedIngredients.length > 0 &&
        matchedRecipes.length === 0 && (
          <p className='vr-search-results__empty'>
            No recipes found containing all of these ingredients. Try removing
            one.
          </p>
        )}

      {/* RESULTS GRID */}
      {visibleRecipes.length > 0 && (
        <>
          <div className='vr-category__grid'>
            {visibleRecipes.map((r, index) => (
              <div
                key={r.id}
                onClick={() => setShowIngredientsModal(false)}
                style={{ display: 'contents', cursor: 'pointer' }}
              >
                <RecipeCard recipe={r} />

                {isMounted && (
                  <AdSlot
                    id='101'
                    position='in-feed'
                    index={index}
                    every={5}
                  />
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <div className='vr-load-more-wrapper'>
              <button
                type='button'
                className='vr-load-more-btn'
                onClick={handleLoadMore}
              >
                Load More Recipes
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
