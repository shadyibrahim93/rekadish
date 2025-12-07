import Head from 'next/head';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import RecipeCard from '../components/RecipeCard';
import Breadcrumb from '../components/Breadcrumb';
import FilterPanel from '../components/FilterPanel';
import { REVALIDATE_TIME, BRAND_NAME } from '../lib/constants';
import SideBar from '../components/SideBar';
import AdSlot from '../components/AdSlot';

const PER_PAGE = 24;

// Central config so you can control title/hero per serving_time
const SERVING_CONFIG = {
  breakfast: {
    servingTime: 'breakfast',
    pageTitle: 'Best Breakfast Recipes & Easy Morning Ideas',
    heroImage: '/images/categories/breakfast-category.webp',
    heading: 'Breakfast Recipes',
    metaDescription:
      'Start your day right with our best breakfast recipes. From quick eggs to fluffy pancakes.'
  },
  lunch: {
    servingTime: 'lunch',
    pageTitle: 'Best Lunch Recipes & Easy Midday Ideas',
    heroImage: '/images/categories/lunch-category.webp',
    heading: 'Lunch Recipes',
    metaDescription:
      'Find easy and delicious lunch recipes, from fresh salads to hearty bowls.'
  },
  dinner: {
    servingTime: 'dinner',
    pageTitle: 'Best Dinner Recipes & Easy Evening Ideas',
    heroImage: '/images/categories/dinner-category.webp',
    heading: 'Dinner Recipes',
    metaDescription:
      'Discover comforting and easy dinner recipes to end your day on a delicious note.'
  },
  dessert: {
    servingTime: 'dessert',
    pageTitle: 'Best Dessert Recipes & Sweet Treat Ideas',
    heroImage: '/images/categories/dessert-category.webp',
    heading: 'Dessert Recipes',
    metaDescription:
      'Indulge your sweet tooth with our favorite dessert recipes, from quick treats to showstopper bakes.'
  }
};

// ----------------------------------------
// 1. STATIC PATHS (BREAKFAST/LUNCH/DINNER/DESSERT)
// ----------------------------------------
export async function getStaticPaths() {
  const slugs = Object.keys(SERVING_CONFIG); // ['breakfast', 'lunch', 'dinner', 'dessert']

  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: 'blocking'
  };
}

// ----------------------------------------
// 2. SERVER SIDE BUILD (ISR) PER SERVING_TIME
// ----------------------------------------
export async function getStaticProps({ params }) {
  const rawSlug = params.slug;
  const slug = String(rawSlug).toLowerCase();

  const config = SERVING_CONFIG[slug];

  // If slug is not one of breakfast/lunch/dinner/dessert => 404
  if (!config) {
    return { notFound: true };
  }

  const { servingTime } = config;

  // Include `ingredients` so FilterPanel can build ingredient pills
  const SAFE_COLUMNS =
    'id, title, slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine, ingredients';

  // Fetch up to 300 recipes for this serving time
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

  // First page for initial render
  const initialRecipes = safeAll.slice(0, PER_PAGE);

  // Max time for initial filter range
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
      initialMaxTime,
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

  // Safety: if somehow config missing on client
  if (!config) {
    return <div className='vr-container'>Invalid serving time.</div>;
  }

  const { pageTitle, heroImage, heading, metaDescription } = config;

  // Initialize state with Server Data (Instant Load!)
  const [recipes, setRecipes] = useState(initialRecipes);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  // Used by FilterPanel to calculate counts/stats.
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
  const isLoadingRef = useRef(false); // to prevent double-loads in IntersectionObserver

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
    setIsLoading(true);
    isLoadingRef.current = true;

    const qs = buildQueryString(pageNumber);

    try {
      const res = await fetch(`/api/recipes?${qs}`);
      const json = await res.json();
      const data = json.data || [];

      if (replace || pageNumber === 1) {
        setTotalCount(json.total_count || json.count || 0);
      }

      setRecipes((prev) => (replace ? data : [...prev, ...data]));

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

    setRecipes([]);
    setPage(1);
    setHasMore(true);
    fetchRecipesPage(1, true); // replace = true
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

        // Prevent chaining multiple loads while one is in-flight
        if (isLoadingRef.current) return;

        fetchRecipesPage(page + 1);
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
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
          <div className='vr-category-main__header'>
            <h3 className='vr-category__title'>{heading}</h3>
            <span className='vr-category-main__meta'>
              {totalCount
                ? `${recipes.length} out of ${totalCount} recipes loaded`
                : `${recipes.length} recipes loaded`}
            </span>
          </div>

          <div className='vr-category__grid'>
            {recipes.map((r, index) => (
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
