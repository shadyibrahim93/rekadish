// MealPlannerContext.js
import { createContext, useContext, useEffect, useState } from 'react';

const MealPlannerContext = createContext();

const STORAGE_KEY = 'vr-meal-planner-items';
const CHECKED_KEY = 'vr-meal-planner-checked';

// Fetch full recipe if we don't have ingredients yet
async function fetchFullRecipeIfNeeded(recipe) {
  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    return recipe;
  }

  try {
    const res = await fetch(`/api/recipes/${recipe.id}`);
    const json = await res.json();
    if (json?.data) {
      return json.data;
    }
  } catch (err) {
    console.error('Failed to fetch full recipe for planner:', err);
  }

  return recipe;
}

export function MealPlannerProvider({ children }) {
  const [plannerItems, setPlannerItems] = useState([]);
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // -----------------------------------------------------
  // LOAD FROM LOCAL STORAGE (ONCE)
  // -----------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawItems = window.localStorage.getItem(STORAGE_KEY);
      if (rawItems) {
        const parsed = JSON.parse(rawItems);
        if (Array.isArray(parsed)) {
          setPlannerItems(parsed);
        }
      }

      const rawChecked = window.localStorage.getItem(CHECKED_KEY);
      if (rawChecked) {
        const parsed = JSON.parse(rawChecked);
        if (Array.isArray(parsed)) {
          setCheckedIngredients(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load planner:', err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // -----------------------------------------------------
  // SAVE TO LOCAL STORAGE (AFTER INITIAL LOAD)
  // -----------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerItems));
      window.localStorage.setItem(
        CHECKED_KEY,
        JSON.stringify(checkedIngredients)
      );
    } catch (err) {
      console.error('Failed to save planner:', err);
    }
  }, [plannerItems, checkedIngredients, isInitialized]);

  // -----------------------------------------------------
  // ACTIONS
  // -----------------------------------------------------
  const addRecipeToPlanner = async (recipe) => {
    if (!recipe?.id) return;

    const fullRecipe = await fetchFullRecipeIfNeeded(recipe);

    setPlannerItems((prev) => {
      if (prev.some((p) => p.id === fullRecipe.id)) return prev;

      return [
        ...prev,
        {
          id: fullRecipe.id,
          slug: fullRecipe.slug,
          title: fullRecipe.title,
          cuisine: fullRecipe.cuisine,
          ingredients: fullRecipe.ingredients || [],
          includeIngredients: true
        }
      ];
    });
  };

  const removeRecipeFromPlanner = (id) => {
    setPlannerItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleIncludeIngredients = (id) => {
    setPlannerItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, includeIngredients: !item.includeIngredients }
          : item
      )
    );
  };

  const toggleIngredientCheck = (ingredientName) => {
    setCheckedIngredients((prev) => {
      const name = ingredientName.trim().toLowerCase();
      if (prev.includes(name)) {
        return prev.filter((i) => i !== name);
      }
      return [...prev, name];
    });
  };

  const clearPlanner = () => {
    setPlannerItems([]);
    setCheckedIngredients([]);
  };

  const isInPlanner = (id) => plannerItems.some((item) => item.id === id);

  return (
    <MealPlannerContext.Provider
      value={{
        plannerItems,
        checkedIngredients,
        toggleIngredientCheck,
        addRecipeToPlanner,
        removeRecipeFromPlanner,
        toggleIncludeIngredients,
        clearPlanner,
        isInPlanner
      }}
    >
      {children}
    </MealPlannerContext.Provider>
  );
}

export const useMealPlanner = () => useContext(MealPlannerContext);
