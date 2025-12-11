import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiPlus, FiX, FiArrowRight } from 'react-icons/fi'; // Added FiArrowRight
import { isFavorite, toggleFavorite } from '../lib/favorites';
import { useMealPlanner } from './MealPlannerContext';
import RecipeCategoryMenu from './RecipeCategoryMenu';
import RatingWidget from './RatingWidget';
import { useModal } from '../components/ModalContext';

export default function RecipeCard({ recipe, hideDifficulty, hideTime }) {
  const difficulty = (recipe.difficulty || '').toLowerCase();
  const { setShowMealPlanner } = useModal();
  const [showDrawer, setShowDrawer] = useState(false); // State for the drawer

  const difficultyClass =
    {
      easy: 'vr-recipe-card__difficulty--easy',
      medium: 'vr-recipe-card__difficulty--medium',
      hard: 'vr-recipe-card__difficulty--hard'
    }[difficulty] || '';

  const [favorite, setFavorite] = useState(false);

  const { plannerItems, addRecipeToPlanner, removeRecipeFromPlanner } =
    useMealPlanner();

  const isInPlanner = plannerItems.some((it) => it.id === recipe.id);

  // Init favorite
  useEffect(() => {
    if (!recipe?.id) return;
    if (typeof window === 'undefined') return;
    setFavorite(isFavorite(recipe.id));
  }, [recipe?.id]);

  // Auto-hide the drawer after 4 seconds
  useEffect(() => {
    if (showDrawer) {
      const timer = setTimeout(() => setShowDrawer(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showDrawer]);

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!recipe?.id) return;

    const nowFav = toggleFavorite(recipe.id);
    setFavorite(nowFav);
  };

  const handlePlannerToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!recipe?.id) return;

    if (isInPlanner) {
      removeRecipeFromPlanner(recipe.id);
      setShowDrawer(false); // Hide if removing
    } else {
      addRecipeToPlanner(recipe);
      setShowDrawer(true); // Show if adding
    }
  };

  const openPlanner = () => {
    setShowDrawer(false);
    setShowMealPlanner(true);
  };

  return (
    <>
      <article
        className='vr-card vr-recipe-card'
        aria-labelledby={`title-${recipe.slug}`}
      >
        <div className='vr-recipe-card'>
          <Link
            href={`/recipes/${recipe.slug || recipe.id}`}
            className='vr-recipe-card__media'
            aria-hidden='true'
          >
            <Image
              src={`/images/recipes/${recipe.image_url}.webp`}
              alt={recipe.title}
              width={300}
              height={300}
            />
          </Link>

          {/* Add/remove to planner */}
          <button
            type='button'
            className={`vr-recipe-card__add-modern ${
              isInPlanner ? 'is-active' : ''
            }`}
            onClick={handlePlannerToggle}
            aria-label={
              isInPlanner ? 'Remove from meal planner' : 'Add to meal planner'
            }
          >
            {isInPlanner ? <FiX /> : <FiPlus />}
          </button>
        </div>

        <div className='vr-recipe-card__body'>
          <div className='vr-recipe-card__top'>
            <Link href={`/recipes/${recipe.slug}`}>
              <h3 className='vr-recipe-card__title'>{recipe.title}</h3>
            </Link>
            <div className='vr-recipe-card__actions'>
              <RecipeCategoryMenu recipeId={recipe.id} />
            </div>
          </div>
          <p className='vr-tips-card__excerpt'>{recipe.description}</p>

          <div className='vr-recipe-card__meta'>
            <RatingWidget
              recipeId={recipe.id}
              initialRating={recipe.rating || 0}
              initialCount={recipe.rating_count || 0}
              disableSubmit={true}
              hideCount={true}
            />
            {!hideTime && (
              <span>{recipe.total_time ? `${recipe.total_time}m` : '—'}</span>
            )}
            {!hideDifficulty && (
              <span className={`vr-recipe-card__difficulty ${difficultyClass}`}>
                {recipe.difficulty}
              </span>
            )}
          </div>
        </div>
      </article>

      {/* 📱 MOBILE DRAWER NOTIFICATION */}
      <div className={`vr-mobile-drawer ${showDrawer ? 'is-visible' : ''}`}>
        <div className='vr-mobile-drawer__content'>
          <div className='vr-mobile-drawer__text'>
            <span className='vr-emoji'>👀</span>
            <div>
              <strong>Yoink!</strong>
              <p>Recipe's trapped in your menu.</p>
            </div>
          </div>
          <button
            onClick={openPlanner}
            className='vr-mobile-drawer__btn'
          >
            View It <FiArrowRight />
          </button>
        </div>
      </div>
    </>
  );
}
