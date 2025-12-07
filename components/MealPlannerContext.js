// MealPlannerContext.js
import { createContext, useContext, useEffect, useState } from 'react';

const MealPlannerContext = createContext();

const STORAGE_KEY = 'vr-meal-planner-items';
const CHECKED_KEY = 'vr-meal-planner-checked';

// ⬇️ helper to fetch full recipe if needed
async function fetchFullRecipeIfNeeded(recipe) {
  // already has ingredients → just use it
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

  // fallback: return original object
  return recipe;
}

export function MealPlannerProvider({ children }) {
  const [plannerItems, setPlannerItems] = useState([]);
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // ... your existing load/save effects stay the same ...

  // 🔁 REPLACE addRecipeToPlanner WITH THIS VERSION
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
          ingredients: fullRecipe.ingredients || [], // ✅ guaranteed field
          includeIngredients: true
        }
      ];
    });
  };

  // ... rest of the context stays the same ...
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
