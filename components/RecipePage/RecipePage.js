import { useState, useEffect, useMemo, useRef } from 'react';
import RecipeBanner from './RecipeBanner';
import Preparations from './Preparations/Preparations';
import IngredientsSection from './Ingredients';
import InstructionsSection from './Instructions';
import QuestionsSection from './Questions';
import NutritionSidebar from './NutritionSidebar';
import CookingMode from '../CookingMode';
import Breadcrumb from '../Breadcrumb.js';
import RecipeCard from '../RecipeCard';
import AdSlot from '../AdSlot';
import Comments from '../Comments/Comments';
import { useUser } from '../UserContext';
import { BRAND_NAME } from '../../lib/constants';
import { getRecipeEquipmentForInstructions } from '../../utils/getRecipeEquipment.js';
import ProductsWeUse from './ProductsWeUse.js';

export default function RecipePage({ recipe }) {
  /* -----------------------------------------------------
     STABILIZE RECIPE OBJECT – prevents infinite re-fetches
  ----------------------------------------------------- */
  const stableRecipe = useMemo(() => recipe, [recipe.id]);
  const hasLoadedRef = useRef(false);

  const [showCook, setShowCook] = useState(false);
  const [servings, setServings] = useState(1);
  const [cookingMode, setCookingMode] = useState(null);

  // Related lists
  const [ingredientMatchRecipes, setIngredientMatchRecipes] = useState([]);
  const [servingTimeRecipes, setServingTimeRecipes] = useState([]);
  const [cuisineMatchRecipes, setCuisineMatchRecipes] = useState([]);

  const { user, loading } = useUser();

  /* -----------------------------------------------------
     Restore cooking mode
  ----------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('vr-cooking-mode');
    setCookingMode(stored || 'beginner');
  }, []);

  useEffect(() => {
    if (cookingMode) {
      localStorage.setItem('vr-cooking-mode', cookingMode);
    }
  }, [cookingMode]);

  /* -----------------------------------------------------
     Restore serving preference
  ----------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('vr-default-servings');
    if (stored) setServings(parseInt(stored, 10));
  }, []);

  /* -----------------------------------------------------
     SHARE HANDLER
  ----------------------------------------------------- */
  const handleShareRecipe = async () => {
    const url = window.location.href;
    const title = stableRecipe.title;
    const text = `Check out this recipe on ${BRAND_NAME}: ${title}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert('Recipe link copied to your clipboard.');
      } else {
        alert(url);
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const formatServingTimeLabel = (value) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  // -----------------------------------------------------
  // 🧰 Products / Equipment we use (from instructions)
  // -----------------------------------------------------
  const equipmentProducts = useMemo(
    () => getRecipeEquipmentForInstructions(stableRecipe, 3),
    [stableRecipe.id]
  );

  /* -----------------------------------------------------
     🔥 ONE EFFECT TO FETCH ALL RELATED DATA
     (Runs only ONCE per recipe load)
  ----------------------------------------------------- */
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    if (!stableRecipe) return;

    const loadRelated = async () => {
      try {
        // ✅ TRACK USED IDs LOCALLY
        // State updates are async, so we can't rely on state to filter duplicates immediately.
        const usedIds = new Set();
        usedIds.add(stableRecipe.id); // Exclude the current recipe itself

        /* -----------------------------------------
           1️⃣ Similar Ingredient Recipes
        ----------------------------------------- */
        if (stableRecipe.ingredients?.length) {
          const ingredientNames = stableRecipe.ingredients
            .slice(0, 3)
            .map((i) => i.image)
            .filter(Boolean)
            .join(',');

          const resIng = await fetch(
            `/api/recipes?ingredients=${encodeURIComponent(
              ingredientNames
            )}&match_type=any&page=1&per_page=9`
          );
          const jsonIng = await resIng.json();

          // Filter against usedIds
          const ingList = (jsonIng.data || []).filter(
            (r) => !usedIds.has(r.id)
          );

          // Add these new results to usedIds so subsequent fetches don't use them
          ingList.forEach((r) => usedIds.add(r.id));

          setIngredientMatchRecipes(ingList);
        }

        /* -----------------------------------------
           2️⃣ Serving Time Recipes
        ----------------------------------------- */
        if (stableRecipe.serving_time) {
          const resServe = await fetch(
            `/api/recipes?serving_time=${encodeURIComponent(
              stableRecipe.serving_time
            )}&page=1&per_page=9`
          );
          const jsonServe = await resServe.json();

          // Filter against usedIds (which now contains current recipe + ingredient matches)
          const serveList = (jsonServe.data || []).filter(
            (r) => !usedIds.has(r.id)
          );

          // Add to usedIds
          serveList.forEach((r) => usedIds.add(r.id));

          setServingTimeRecipes(serveList);
        }

        /* -----------------------------------------
           3️⃣ Cuisine Recipes
        ----------------------------------------- */
        if (stableRecipe.cuisine) {
          const resCui = await fetch(
            `/api/recipes?cuisine=${encodeURIComponent(
              stableRecipe.cuisine
            )}&page=1&per_page=9`
          );
          const jsonCui = await resCui.json();

          // Filter against usedIds (contains current + ingredients + serving time)
          const cuisineList = (jsonCui.data || []).filter(
            (r) => !usedIds.has(r.id)
          );

          // We don't need to add to usedIds here since it's the last fetch, but good practice
          cuisineList.forEach((r) => usedIds.add(r.id));

          setCuisineMatchRecipes(cuisineList);
        }
      } catch (err) {
        console.error('Failed to load related recipes:', err);
      }
    };

    loadRelated();
  }, [stableRecipe.id]);

  /* -----------------------------------------------------
     RENDER UI
  ----------------------------------------------------- */
  return (
    <div className='vr-recipe'>
      <Breadcrumb recipe={stableRecipe} />

      <RecipeBanner
        recipe={stableRecipe}
        onStartCooking={() => setShowCook(true)}
        onShare={handleShareRecipe}
      />

      {cookingMode && (
        <Preparations
          recipe={stableRecipe}
          servings={servings}
          setServings={setServings}
          cookingMode={cookingMode}
          setCookingMode={setCookingMode}
        />
      )}

      <div className='vr-layout'>
        <div className='vr-layout__main'>
          <IngredientsSection
            recipe={stableRecipe}
            servings={servings}
          />
          <InstructionsSection
            recipe={stableRecipe}
            cookingMode={cookingMode}
          />
          <QuestionsSection recipe={stableRecipe} />

          {/* PRODUCTS / EQUIPMENT WE USE */}
          <ProductsWeUse
            products={equipmentProducts}
            recipeTitle={stableRecipe.title}
          />

          {/* INGREDIENT MATCH */}
          {ingredientMatchRecipes.length > 0 && (
            <section
              className='vr-category--related vr-card'
              itemScope
              itemType='https://schema.org/ItemList'
            >
              <h3 className='vr-category__title'>
                Recipes Using Similar Ingredients
              </h3>

              <p className='vr-category__description'>
                Explore delicious recipes that use ingredients similar to{' '}
                {stableRecipe.title}. These selections help you make the most of
                your pantry.
              </p>

              <div className='vr-category__grid'>
                {ingredientMatchRecipes.map((r, index) => (
                  <>
                    <RecipeCard
                      key={r.id}
                      recipe={r}
                    />

                    <AdSlot
                      id='101'
                      position='in-feed'
                      index={index}
                      every={6}
                    />
                  </>
                ))}
              </div>
            </section>
          )}

          {/* SERVING TIME */}
          {servingTimeRecipes.length > 0 && (
            <section
              className='vr-category--related vr-card'
              itemScope
              itemType='https://schema.org/ItemList'
            >
              <h3 className='vr-category__title'>
                More {formatServingTimeLabel(stableRecipe.serving_time)} Recipes
              </h3>

              <p className='vr-category__description'>
                Browse additional{' '}
                {formatServingTimeLabel(
                  stableRecipe.serving_time
                ).toLowerCase()}{' '}
                recipes perfect for any day of the week.
              </p>

              <div className='vr-category__grid'>
                {servingTimeRecipes.map((r, index) => (
                  <>
                    <RecipeCard
                      key={r.id}
                      recipe={r}
                    />

                    <AdSlot
                      id='101'
                      position='in-feed'
                      index={index}
                      every={6}
                    />
                  </>
                ))}
              </div>
            </section>
          )}

          {/* CUISINE */}
          {cuisineMatchRecipes.length > 0 && (
            <section
              className='vr-category--related vr-card'
              itemScope
              itemType='https://schema.org/ItemList'
            >
              <h3 className='vr-category__title'>
                Popular {stableRecipe.cuisine} Recipes
              </h3>

              <p className='vr-category__description'>
                Discover more authentic {stableRecipe.cuisine} recipes similar
                to {stableRecipe.title}. Perfect for exploring the flavors of
                this cuisine.
              </p>

              <div className='vr-category__grid'>
                {cuisineMatchRecipes.map((r, index) => (
                  <>
                    <RecipeCard
                      key={r.id}
                      recipe={r}
                    />

                    <AdSlot
                      id='101'
                      position='in-feed'
                      index={index}
                      every={6}
                    />
                  </>
                ))}
              </div>
            </section>
          )}
          <Comments
            recipeId={stableRecipe.id}
            user={user}
            initialRating={stableRecipe.rating}
            initialRatingCount={stableRecipe.rating_count}
          />
        </div>

        <aside className='vr-sidebar'>
          <NutritionSidebar
            recipe={stableRecipe}
            servings={servings}
          />
          <AdSlot
            id='102'
            className='vr-card'
            position='sidebar'
            placement='sticky'
          />
        </aside>
      </div>

      {showCook && (
        <CookingMode
          instructions={
            cookingMode === 'beginner'
              ? stableRecipe.instructions
              : stableRecipe.instructions_condensed
          }
          ingredients={stableRecipe.ingredients}
          onClose={() => setShowCook(false)}
        />
      )}
    </div>
  );
}
