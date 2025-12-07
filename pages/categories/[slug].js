import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import RecipeCard from '../../components/RecipeCard';
import Breadcrumb from '../../components/Breadcrumb';
import FilterPanel from '../../components/FilterPanel';
import AdSlot from '../../components/AdSlot';
import { REVALIDATE_TIME, BRAND_NAME } from '../../lib/constants';
import SideBar from '../../components/SideBar';

const PER_PAGE = 24;

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const { slug } = params;
  const isTrending = slug === 'trending';
  const decodedSlug = decodeURIComponent(slug); // Handle spaces like "South American"

  // Include `ingredients` so FilterPanel can build ingredient pills
  const SAFE_COLUMNS =
    'id, title, slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine, ingredients';

  let query = supabase.from('recipes').select(SAFE_COLUMNS, { count: 'exact' });

  if (isTrending) {
    query = query
      .order('rating_count', { ascending: false })
      .order('rating', { ascending: false });
  } else {
    // Match cuisine only (same behavior as /categories page)
    query = query.ilike('cuisine', decodedSlug);
  }

  // Single fetch for this cuisine / trending set
  const { data: allRecipes, count, error } = await query.limit(300);

  if (error) {
    console.error(`ISR Error for slug "${decodedSlug}":`, error.message);
    return { notFound: true };
  }

  const safeAll = allRecipes || [];

  // First page for initial render
  const initialRecipes = safeAll.slice(0, PER_PAGE);

  // Compute initial max time once (same logic FilterPanel would use)
  const initialMaxTime =
    safeAll.length > 0
      ? Math.max(...safeAll.map((r) => r.total_time || r.cook_time || 0))
      : 60;

  return {
    props: {
      slug: decodedSlug,
      isTrending,
      initialRecipes,
      initialTotalCount: count || safeAll.length || 0,
      initialMaxTime,
      initialAllRecipes: safeAll
    },
    revalidate: REVALIDATE_TIME || 3600
  };
}

export default function CategoryPage({
  slug,
  isTrending,
  initialRecipes = [],
  initialTotalCount = 0,
  initialMaxTime = 60,
  initialAllRecipes = []
}) {
  const router = useRouter();

  const [recipes, setRecipes] = useState(initialRecipes);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [allRecipes, setAllRecipes] = useState(initialAllRecipes);

  // We track filters AND whether the user has actually changed them
  const initialFiltersRef = useRef({
    ingredients: [],
    difficulty: null,
    maxTime: initialMaxTime
  });

  const [filters, setFilters] = useState(initialFiltersRef.current);
  const [hasUserFilters, setHasUserFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialRecipes.length < initialTotalCount
  );
  const [page, setPage] = useState(1);

  const listRef = useRef(null);
  const sentinelRef = useRef(null);
  const isLoadingRef = useRef(false);

  const displayTitle = isTrending
    ? 'Trending Recipes'
    : (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '') + ' Recipes';

  const heroImage = `/images/categories/${slug?.toLowerCase()}-category.webp`;

  // ----------------------------------------
  // 0. RESET STATE ON NAVIGATION / NEW PROPS
  // ----------------------------------------
  useEffect(() => {
    setRecipes(initialRecipes);
    setTotalCount(initialTotalCount);
    setAllRecipes(initialAllRecipes);

    const nextInitialFilters = {
      ingredients: [],
      difficulty: null,
      maxTime: initialMaxTime
    };

    initialFiltersRef.current = nextInitialFilters;
    setFilters(nextInitialFilters);
    setHasUserFilters(false);

    setPage(1);
    setHasMore(initialRecipes.length < initialTotalCount);
  }, [
    slug,
    initialRecipes,
    initialTotalCount,
    initialMaxTime,
    initialAllRecipes
  ]);

  // ----------------------------------------
  // 1. HELPER: BUILD QUERY STRING
  // ----------------------------------------
  const buildQueryString = (pageNumber) => {
    const params = new URLSearchParams();
    params.set('page', pageNumber);
    params.set('per_page', PER_PAGE);

    if (!isTrending && slug) params.set('cuisine', slug);

    if (filters.ingredients.length > 0)
      params.set('ingredients', filters.ingredients.join(','));

    if (filters.difficulty) params.set('difficulty', filters.difficulty);

    if (filters.maxTime) params.set('max_time', filters.maxTime);

    return params.toString();
  };

  // ----------------------------------------
  // 2. FETCH RECIPES PAGE
  // ----------------------------------------
  const fetchRecipesPage = async (pageNumber, replace = false) => {
    setIsLoading(true);
    isLoadingRef.current = true; // NEW

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
      console.error(err);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false; // NEW
    }
  };

  // ----------------------------------------
  // 3. HANDLE FILTER CHANGE (FROM FilterPanel)
  // ----------------------------------------
  const handleFilterChange = (next) => {
    setFilters((prev) => {
      const sameIngredients =
        prev.ingredients.length === next.ingredients.length &&
        prev.ingredients.every((v, i) => v === next.ingredients[i]);
      const sameDifficulty = prev.difficulty === next.difficulty;
      const sameMaxTime = prev.maxTime === next.maxTime;

      const isSame = sameIngredients && sameDifficulty && sameMaxTime;

      if (isSame) {
        return prev; // No real change → don't trigger effects
      }

      // First time filters actually change → mark that the user interacted
      setHasUserFilters(true);
      return next;
    });
  };

  // ----------------------------------------
  // 4. TRIGGER FETCH ON *REAL* FILTER CHANGE
  // ----------------------------------------
  useEffect(() => {
    // Ignore initial mount / non-user changes
    if (!hasUserFilters) return;

    setRecipes([]);
    setPage(1);
    setHasMore(true);
    listRef.current?.scrollIntoView({ behavior: 'smooth' });
    fetchRecipesPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, hasUserFilters]);

  // ----------------------------------------
  // 5. INFINITE SCROLL
  // ----------------------------------------
  useEffect(() => {
    if (!hasMore) return;
    if (!sentinelRef.current) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        // Use the ref so we don't re-fetch while already loading
        if (!isLoadingRef.current) {
          fetchRecipesPage(page + 1);
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    obs.observe(sentinelRef.current);

    return () => obs.disconnect();
    // NOTE: we intentionally do NOT depend on `isLoading` here,
    // we use `isLoadingRef` instead to avoid recreating the observer
  }, [hasMore, page, filters, slug]);

  if (router.isFallback) {
    return <div className='vr-container'>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>
          {displayTitle} | {BRAND_NAME}
        </title>
        <meta
          name='description'
          content={`Browse delicious ${displayTitle} at ${BRAND_NAME}. Find easy, top-rated recipes.`}
        />
      </Head>

      <Breadcrumb />

      <div className='vr-category-hero'>
        <img
          src={heroImage}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/hero-banner2.webp';
          }}
          alt={displayTitle}
          className='vr-category-hero__image'
        />
        <div className='vr-category-hero__overlay'>
          <h1 className='vr-category-hero__title'>{displayTitle}</h1>
        </div>
      </div>

      <div className='vr-category-layout'>
        <FilterPanel
          allRecipes={allRecipes}
          difficultyOptions={['easy', 'medium', 'hard']}
          initialTimeRange={{ min: 0, max: initialMaxTime }}
          onFilterChange={handleFilterChange}
        />

        <main
          className='vr-category-main'
          ref={listRef}
        >
          <div className='vr-category-main__header'>
            <h3 className='vr-category__title'>{displayTitle}</h3>
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
                  height='100%'
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
            <div className='vr-infinite-sentinel'>
              <span>You've reached the end!</span>
            </div>
          )}
        </main>

        <SideBar />
      </div>
    </>
  );
}
