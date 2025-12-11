import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import RecipeCard from '../components/RecipeCard';
import Breadcrumb from '../components/Breadcrumb';
import FilterPanel from '../components/FilterPanel';
import { BRAND_NAME } from '../lib/constants';
import SideBar from '../components/SideBar';
import AdSlot from '../components/AdSlot';
import { useModal } from '../components/ModalContext';

const PER_PAGE = 24;

// Central config so you can control title/hero per serving_time
const SERVING_CONFIG = {
  breakfast: {
    servingTime: 'breakfast',
    pageTitle: 'Easy Breakfast Recipes: Quick, Healthy & Savory Ideas',
    heroImage: '/images/categories/breakfast-category.webp',
    heading: 'Breakfast Recipes',
    metaDescription:
      'Start your day right with our collection of easy breakfast recipes. Explore quick eggs, fluffy pancakes, healthy smoothies, and meal-prep ideas for busy mornings.'
  },
  lunch: {
    servingTime: 'lunch',
    pageTitle: 'Lunch Recipes for Work & Home: Quick, Healthy & Tasty',
    heroImage: '/images/categories/lunch-category.webp',
    heading: 'Lunch Recipes',
    metaDescription:
      'Upgrade your midday meal with our best lunch recipes. Find quick sandwiches, fresh salads, healthy meal-prep bowls, and kid-friendly ideas everyone will love.'
  },
  dinner: {
    servingTime: 'dinner',
    pageTitle: 'Easy Dinner Recipes: Quick Weeknight Meals & Family Favorites',
    heroImage: '/images/categories/dinner-category.webp',
    heading: 'Dinner Recipes',
    metaDescription:
      'Stuck on what to cook? Explore our easy dinner recipes for every night of the week. From 30-minute meals and one-pot wonders to comforting family favorites.'
  },
  dessert: {
    servingTime: 'dessert',
    pageTitle: 'Dessert Recipes: Easy Sweets, Baking & Chocolate Treats',
    heroImage: '/images/categories/dessert-category.webp',
    heading: 'Dessert Recipes',
    metaDescription:
      'Satisfy your sweet tooth with our delicious dessert recipes. Discover easy cookies, decadent cakes, no-bake treats, and chocolate desserts for any occasion.'
  }
};

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR) - Replaces ISR
// ----------------------------------------
export async function getServerSideProps({ params, res }) {
  // Manual Caching Strategy to bypass ISR Queue issues
  // s-maxage=3600: Cache in CDN for 1 hour
  // stale-while-revalidate=86400: If stale, show old version for up to 1 day while updating in background
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );

  const rawSlug = params.slug;
  const slug = String(rawSlug).toLowerCase();
  const config = SERVING_CONFIG[slug];

  if (!config) {
    return { notFound: true };
  }

  const { servingTime } = config;
  const SAFE_COLUMNS =
    'id, title, slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine, ingredients';

  const {
    data: allRecipes,
    count,
    error
  } = await supabase
    .from('recipes')
    .select(SAFE_COLUMNS, { count: 'exact' })
    .ilike('serving_time', servingTime)
    .limit(300);

  if (error) {
    console.error('SSR Error:', error);
    return { notFound: true };
  }

  const safeAll = allRecipes || [];
  const initialRecipes = safeAll.slice(0, PER_PAGE);

  const initialMaxTime =
    safeAll.length > 0
      ? Math.max(...safeAll.map((r) => r.total_time || r.cook_time || 0))
      : 60;

  return {
    props: {
      slug,
      servingTime,
      initialRecipes,
      initialTotalCount: count || safeAll.length || 0,
      initialMaxTime: Number.isFinite(initialMaxTime) ? initialMaxTime : 60,
      initialAllRecipes: safeAll
    }
  };
}

// ----------------------------------------
// 2. CLIENT SIDE COMPONENT
// ----------------------------------------
export default function ServingTimePage({
  slug,
  servingTime,
  initialRecipes = [],
  initialTotalCount = 0,
  initialMaxTime = 60,
  initialAllRecipes = []
}) {
  const config = SERVING_CONFIG[slug];
  const { setShowIngredientsModal, setShowMealPlanner } = useModal();

  // Hydration Safety State
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [recipes, setRecipes] = useState(initialRecipes);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [allRecipes, setAllRecipes] = useState(initialAllRecipes);

  const [filters, setFilters] = useState({
    ingredients: [],
    difficulty: null,
    maxTime: initialMaxTime
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialRecipes.length < initialTotalCount
  );
  const [page, setPage] = useState(1);

  const listRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Early return if invalid (client-side safety)
  if (!config) {
    return <div className='vr-container'>Invalid serving time.</div>;
  }

  const { pageTitle, heroImage, heading, metaDescription } = config;

  // ----------------------------------------
  // HELPER: BUILD QUERY STRING
  // ----------------------------------------
  const buildQueryString = (pageNumber) => {
    const params = new URLSearchParams();
    params.set('page', pageNumber);
    params.set('per_page', PER_PAGE);
    params.set('serving_time', servingTime);

    if (filters.ingredients.length > 0)
      params.set('ingredients', filters.ingredients.join(','));

    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.maxTime) params.set('max_time', filters.maxTime);

    return params.toString();
  };

  // ----------------------------------------
  // FETCH RECIPES PAGE (Client Logic)
  // ----------------------------------------
  const fetchRecipesPage = async (pageNumber, replace = false) => {
    if (replace && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    const qs = buildQueryString(pageNumber);

    try {
      const res = await fetch(`/api/recipes?${qs}`, {
        signal: controller.signal
      });
      const json = await res.json();
      const data = json.data || [];
      const serverTotal = json.total_count || json.count || 0;

      setRecipes((prev) => {
        const base = replace || pageNumber === 1 ? [] : prev;
        const existingIds = new Set(base.map((r) => r.id));
        const uniqueNewData = data.filter((r) => !existingIds.has(r.id));
        const next = [...base, ...uniqueNewData];
        const currentCount = next.length;

        if (
          data.length < PER_PAGE ||
          (serverTotal > 0 && currentCount >= serverTotal)
        ) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        if (replace || pageNumber === 1) {
          setTotalCount(serverTotal);
        }

        return next;
      });

      setPage(pageNumber);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch recipes', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------
  // RESET + LOAD WHEN FILTERS CHANGE
  // ----------------------------------------
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    setPage(1);
    setHasMore(true);
    fetchRecipesPage(1, true); // replace = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, servingTime]);

  // ----------------------------------------
  // LOAD MORE BUTTON HANDLER (replaces infinite scroll)
  // ----------------------------------------
  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    fetchRecipesPage(nextPage);
  };

  return (
    <>
      <Head>
        <title>
          {pageTitle} | {BRAND_NAME}
        </title>
        <meta
          name='description'
          content={metaDescription}
        />
      </Head>

      <Breadcrumb />

      <div className='vr-category-hero'>
        <img
          src={heroImage}
          alt={pageTitle}
          className='vr-category-hero__image'
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/hero-banner2.webp';
          }}
        />
        <div className='vr-category-hero__overlay'>
          <h1 className='vr-category-hero__title'>{pageTitle}</h1>
          <p className='vr-hero__desc'>{metaDescription}</p>

          <div className='vr-hero__actions'>
            <button
              className='vr-hero__badge'
              onClick={() => setShowIngredientsModal(true)}
            >
              What Can I Cook?
            </button>

            <button
              className='vr-hero__badge--light'
              onClick={() => setShowMealPlanner(true)}
            >
              Open Planner 👀
            </button>
          </div>
        </div>
      </div>

      <div className='vr-category-layout'>
        <FilterPanel
          allRecipes={allRecipes}
          difficultyOptions={['easy', 'medium', 'hard']}
          initialTimeRange={{ min: 0, max: initialMaxTime }}
          onFilterChange={setFilters}
        />

        <main
          className='vr-category-main'
          ref={listRef}
        >
          <div className='vr-category__header'>
            <h3 className='vr-category__title'>{heading}</h3>
            <span className='vr-category-main__meta'>{totalCount} Recipes</span>
          </div>

          <div className='vr-category__grid'>
            {recipes.map((r, index) => (
              <Fragment key={r.id}>
                <RecipeCard recipe={r} />
                {isMounted && (
                  <AdSlot
                    id='101'
                    position='in-feed'
                    index={index}
                    every={6}
                  />
                )}
              </Fragment>
            ))}
          </div>

          {/* Load More Button (replaces infinite scroll sentinel) */}
          {recipes.length > 0 && hasMore && (
            <div className='vr-load-more-wrapper'>
              <button
                type='button'
                className='vr-load-more-btn'
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? 'Loading…' : 'Load more recipes'}
              </button>
            </div>
          )}

          {!hasMore && recipes.length > 0 && (
            <div className='vr-end-message'>You've reached the end!</div>
          )}

          {!isLoading && recipes.length === 0 && (
            <div className='vr-no-results'>No {servingTime} recipes found.</div>
          )}
        </main>

        <SideBar />
      </div>
    </>
  );
}
