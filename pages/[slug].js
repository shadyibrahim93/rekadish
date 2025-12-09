import Head from 'next/head';
import React, { Fragment, useEffect, useState, useRef } from 'react'; // Added React import
import { supabase } from '../lib/supabaseClient';
import RecipeCard from '../components/RecipeCard';
import Breadcrumb from '../components/Breadcrumb';
import FilterPanel from '../components/FilterPanel';
import { REVALIDATE_TIME, BRAND_NAME } from '../lib/constants';
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
// 1. STATIC PATHS
// ----------------------------------------
export async function getStaticPaths() {
  const slugs = Object.keys(SERVING_CONFIG);
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: 'blocking'
  };
}

// ----------------------------------------
// 2. SERVER SIDE BUILD (ISR)
// ----------------------------------------
export async function getStaticProps({ params }) {
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
    console.error('ISR Error:', error);
    return { notFound: true };
  }

  const safeAll = allRecipes || [];
  const initialRecipes = safeAll.slice(0, PER_PAGE);

  // 🆕 FIX: Safety check for Math.max to prevent -Infinity crash
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
    },
    revalidate: REVALIDATE_TIME || 3600
  };
}

// ----------------------------------------
// 3. CLIENT SIDE COMPONENT
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

  // Early return if invalid (client-side safety)
  if (!config) {
    return <div className='vr-container'>Invalid serving time.</div>;
  }

  const { pageTitle, heroImage, heading, metaDescription } = config;
  const { setShowIngredientsModal, setShowMealPlanner } = useModal();

  const [recipes, setRecipes] = useState(initialRecipes);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [allRecipes] = useState(initialAllRecipes);

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
  const sentinelRef = useRef(null);
  const isLoadingRef = useRef(false);

  // 🆕 FIX: AbortController ref
  const abortControllerRef = useRef(null);

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
    // 🆕 FIX: Cancel previous pending request
    if (replace && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    isLoadingRef.current = true;

    const qs = buildQueryString(pageNumber);

    try {
      const res = await fetch(`/api/recipes?${qs}`, {
        signal: controller.signal
      });
      const json = await res.json();
      const data = json.data || [];

      if (replace || pageNumber === 1) {
        setTotalCount(json.total_count || json.count || 0);
      }

      // 🆕 FIX: Deduplicate recipes based on ID
      setRecipes((prev) => {
        const currentList = replace ? [] : prev;
        const existingIds = new Set(currentList.map((r) => r.id));
        const uniqueNewData = data.filter((r) => !existingIds.has(r.id));
        return [...currentList, ...uniqueNewData];
      });

      const currentCount = replace ? data.length : recipes.length + data.length;
      const serverTotal = json.total_count || json.count || 0;

      if (
        data.length < PER_PAGE ||
        (serverTotal > 0 && currentCount >= serverTotal)
      ) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setPage(pageNumber);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch recipes', err);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
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
  // INFINITE SCROLL
  // ----------------------------------------
  useEffect(() => {
    if (!hasMore) return;
    if (!sentinelRef.current) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        if (isLoadingRef.current) return;

        fetchRecipesPage(page + 1);
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, page, filters, servingTime]);

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
              /* 🆕 FIX: Use Fragment with explicit key, fixed spelling typo */
              <Fragment key={r.id}>
                <RecipeCard recipe={r} />
                <AdSlot
                  id='101'
                  position='in-feed'
                  index={index}
                  every={6}
                />
              </Fragment>
            ))}
          </div>

          {hasMore && (
            <div
              ref={sentinelRef}
              className='vr-infinite-sentinel'
            >
              {isLoading && <span>Loading more recipes…</span>}
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
