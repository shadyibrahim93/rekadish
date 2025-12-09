import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

export default function FilterPanel({
  allRecipes = [],
  difficultyOptions = ['easy', 'medium', 'hard'],
  initialTimeRange = { min: 0, max: 60 },
  onFilterChange
}) {
  // ---------------------------
  // INTERNAL STATE
  // ---------------------------
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]); // list of image slugs
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);

  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [maxTime, setMaxTime] = useState(initialTimeRange.max);

  // State for mobile filter modal visibility
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // State to handle SSR (Portals only work on client)
  const [mounted, setMounted] = useState(false);

  const previousIngredients = useRef([]);

  // ---------------------------
  // HELPERS
  // ---------------------------
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

  const getRecipeTime = (rec) => {
    if (typeof rec.total_time === 'number') return rec.total_time;
    if (typeof rec.cook_time === 'number') return rec.cook_time;
    return null;
  };

  // ---------------------------
  // EFFECTS
  // ---------------------------

  // Handle mounting for Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling when mobile filter is open
  useEffect(() => {
    if (showMobileFilter) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileFilter]);

  // Init Time Range
  useEffect(() => {
    if (!allRecipes.length) return;

    let minT = Infinity;
    let maxTLocal = 0;

    allRecipes.forEach((rec) => {
      const t = getRecipeTime(rec);
      if (typeof t === 'number') {
        if (t < minT) minT = t;
        if (t > maxTLocal) maxTLocal = t;
      }
    });

    if (minT === Infinity) minT = 0;
    if (maxTLocal === 0) maxTLocal = initialTimeRange.max ?? 60;

    setTimeRange({ min: minT, max: maxTLocal });
    setMaxTime(maxTLocal);
  }, [allRecipes, initialTimeRange.max]);

  // ---------------------------
  // LOGIC: POOL & OPTIONS
  // ---------------------------
  const pool = useMemo(() => {
    if (!allRecipes.length) return [];

    return allRecipes.filter((rec) => {
      const t = getRecipeTime(rec);
      if (maxTime != null && typeof t === 'number' && t > maxTime) {
        return false;
      }

      if (selectedIngredients.length > 0) {
        const recImageSlugs = getRecipeIngredients(rec)
          .map((i) => i.image)
          .filter(Boolean);

        const hasAllSelected = selectedIngredients.every((slug) =>
          recImageSlugs.includes(slug)
        );
        if (!hasAllSelected) return false;
      }

      return true;
    });
  }, [allRecipes, selectedIngredients, maxTime]);

  const availableDifficulty = useMemo(() => {
    const diffState = { easy: false, medium: false, hard: false };
    pool.forEach((rec) => {
      const d = rec.difficulty?.toLowerCase();
      if (d && diffState[d] !== undefined) {
        diffState[d] = true;
      }
    });
    return diffState;
  }, [pool]);

  const ingredientOptions = useMemo(() => {
    const ingMap = new Map();
    let source = pool;
    if (selectedDifficulty) {
      source = source.filter(
        (r) => r.difficulty?.toLowerCase() === selectedDifficulty
      );
    }
    source.forEach((rec) => {
      const ings = getRecipeIngredients(rec);
      ings.forEach((i) => {
        if (!i?.image) return;
        const key = i.image;
        if (!ingMap.has(key)) {
          ingMap.set(key, { key, label: key.replace(/-/g, ' ') });
        }
      });
    });
    return Array.from(ingMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [pool, selectedDifficulty]);

  const filteredIngredients = useMemo(
    () =>
      ingredientOptions.filter((i) =>
        i.label.toLowerCase().includes(ingredientSearch.toLowerCase())
      ),
    [ingredientOptions, ingredientSearch]
  );

  // Send filter changes up
  useEffect(() => {
    onFilterChange({
      ingredients: selectedIngredients,
      difficulty: selectedDifficulty,
      maxTime
    });
  }, [selectedIngredients, selectedDifficulty, maxTime, onFilterChange]);

  // Fade-out animation
  useEffect(() => {
    const prevKeys = previousIngredients.current.map((i) => i.key);
    const currKeys = ingredientOptions.map((i) => i.key);
    const removed = prevKeys.filter((key) => !currKeys.includes(key));

    removed.forEach((removedKey) => {
      const el = document.querySelector(
        `.vr-filter-pill[data-ing="${removedKey}"]`
      );
      if (el) {
        el.classList.add('vr-filter-pill--fade-out');
        setTimeout(() => {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 250);
      }
    });
    previousIngredients.current = ingredientOptions;
  }, [ingredientOptions]);

  // Clear filters
  const clearFilters = () => {
    setSelectedIngredients([]);
    setSelectedDifficulty(null);
    setIngredientSearch('');
    setMaxTime(timeRange.max);
    if (showMobileFilter) setShowMobileFilter(false);
  };

  // ---------------------------
  // UI: REUSABLE FILTER CONTENT
  // ---------------------------
  // REMOVED: <aside> wrapper. This now only contains the inner content.
  const FilterContent = (
    <div className='vr-filter-panel'>
      {/* SEARCH */}
      <div className='vr-filter-group'>
        <label className='vr-filter-label'>Search Ingredients</label>
        <input
          type='text'
          className='vr-filter-search'
          placeholder='Type to filter ingredients...'
          value={ingredientSearch}
          onChange={(e) => setIngredientSearch(e.target.value)}
        />
      </div>

      {/* INGREDIENT PILLS */}
      <div className='vr-filter-group'>
        <label className='vr-filter-label'>Ingredients</label>
        <div className='vr-filter-multiselect'>
          {filteredIngredients.map((ing) => (
            <button
              key={ing.key}
              data-ing={ing.key}
              className={
                'vr-filter-pill vr-anim-pill ' +
                (selectedIngredients.includes(ing.key)
                  ? 'vr-filter-pill--active'
                  : '') +
                ' vr-filter-pill--fade-in'
              }
              onClick={() =>
                setSelectedIngredients((prev) =>
                  prev.includes(ing.key)
                    ? prev.filter((x) => x !== ing.key)
                    : [...prev, ing.key]
                )
              }
            >
              {ing.label}
            </button>
          ))}
        </div>
      </div>

      {/* DIFFICULTY */}
      <div className='vr-filter-group'>
        <label className='vr-filter-label'>Difficulty</label>
        <div className='vr-filter-multiselect vr-filter-difficulty'>
          {difficultyOptions
            .filter((d) => availableDifficulty[d])
            .map((diff) => (
              <button
                key={diff}
                className={
                  'vr-filter-pill ' +
                  (selectedDifficulty === diff ? 'vr-filter-pill--active' : '')
                }
                onClick={() =>
                  setSelectedDifficulty(
                    selectedDifficulty === diff ? null : diff
                  )
                }
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
        </div>
      </div>

      {/* TIME SLIDER */}
      <div className='vr-filter-group'>
        <label className='vr-filter-label'>
          Max Cook Time:
          <span className='vr-filter-label__value'> {maxTime} min</span>
        </label>
        <input
          type='range'
          className='vr-slider'
          min={timeRange.min}
          max={timeRange.max}
          step='5'
          value={maxTime}
          onChange={(e) => setMaxTime(Number(e.target.value))}
        />
        <div className='vr-filter-slider__scale'>
          <span>{timeRange.min} min</span>
          <span>{timeRange.max} min</span>
        </div>
      </div>

      {/* CLEAR */}
      <div className='vr-filter-actions vr-filter-actions--sticky'>
        <button
          className='vr-meal-planner__clear'
          onClick={clearFilters}
        >
          Clear Filter
        </button>
      </div>
    </div>
  );

  // ---------------------------
  // UI: PORTAL MODAL
  // ---------------------------
  // The content renders directly here, NOT wrapped in the hidden desktop sidebar class
  const MobileDrawerPortal =
    mounted && showMobileFilter
      ? createPortal(
          <div className='vr-filter-drawer-overlay'>
            <div className='vr-filter-drawer'>
              <div className='vr-filter-drawer__header'>
                <h3>Filter Recipes</h3>
                <button
                  className='vr-modal__close'
                  onClick={() => setShowMobileFilter(false)}
                  aria-label='Close modal'
                >
                  ×
                </button>
              </div>
              {FilterContent}
            </div>
          </div>,
          document.body
        )
      : null;

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <>
      {/* 1. Mobile Trigger Button */}
      <div className='vr-category-mobile-filter'>
        <button
          className='vr-category-mobile-filter__btn'
          onClick={() => setShowMobileFilter(true)}
        >
          Filters
        </button>
      </div>

      {/* 2. Desktop Content - Wrapped in sidebar ASIDE here */}
      <aside className='vr-filter-sidebar vr-filter-sidebar--desktop'>
        <h3 className='vr-filter-sidebar__title'>Filter</h3>
        {FilterContent}
      </aside>

      {/* 3. Mobile Modal (Portal) */}
      {MobileDrawerPortal}
    </>
  );
}
