// pages/recipes/index.js
import Head from 'next/head';
import { Fragment, useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import RecipeCard from '../../components/RecipeCard';
import AdSlot from '../../components/AdSlot';
import FilterPanel from '../../components/FilterPanel';
import { BRAND_NAME } from '../../lib/constants';
import SideBar from '../../components/SideBar';

const PER_PAGE = 24;
const AUTO_LOAD_LIMIT = 3; // 🛑 Safety Brake: Auto-load 3 pages, then pause.

export async function getServerSideProps({ res }) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );

  try {
    const query = supabase
      .from('recipes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const {
      data: initialRecipes,
      count,
      error
    } = await query.range(0, PER_PAGE - 1);

    if (error) {
      console.error('SSR Supabase Error:', error);
      return { notFound: true };
    }

    const { data: timeData } = await supabase
      .from('recipes')
      .select('total_time, cook_time')
      .limit(100);

    let initialMaxTime = 60;
    if (timeData && timeData.length > 0) {
      const times = timeData.map((r) => r.total_time || r.cook_time || 0);
      if (times.length > 0) {
        initialMaxTime = Math.max(...times);
      }
    }

    if (!Number.isFinite(initialMaxTime)) {
      initialMaxTime = 60;
    }

    return {
      props: {
        initialRecipes: initialRecipes || [],
        initialTotalCount: count || 0,
        initialMaxTime
      }
    };
  } catch (err) {
    console.error('SSR Critical Failure:', err);
    return { notFound: true };
  }
}

export default function Recipes({
  initialRecipes = [],
  initialTotalCount = 0,
  initialMaxTime = 60
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [recipes, setRecipes] = useState(initialRecipes);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [allRecipes, setAllRecipes] = useState([]);

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

  // 🛑 NEW: Track how many times we've auto-loaded
  const [autoLoadCount, setAutoLoadCount] = useState(0);

  const listRef = useRef(null);
  const sentinelRef = useRef(null);
  const isLoadingRef = useRef(false);

  // 3. LAZY LOAD FILTER DATA
  useEffect(() => {
    async function loadFilterData() {
      if (allRecipes.length > 0) return;
      const params = new URLSearchParams();
      params.set('page', 1);
      params.set('per_page', 300);

      try {
        const res = await fetch(`/api/recipes?${params.toString()}`);
        const json = await res.json();
        const base = json.data || [];
        setAllRecipes(base);

        const maxT = Math.max(
          ...base.map((r) => r.total_time || r.cook_time || 0)
        );
        if (maxT > filters.maxTime) {
          setFilters((f) => ({ ...f, maxTime: maxT }));
        }
      } catch (err) {
        console.error('Failed to load filter data', err);
      }
    }
    const timer = setTimeout(loadFilterData, 500);
    return () => clearTimeout(timer);
  }, []);

  // 4. HELPER: BUILD QUERY STRING
  const buildQueryString = (pageNumber) => {
    const params = new URLSearchParams();
    params.set('page', pageNumber);
    params.set('per_page', PER_PAGE);

    if (filters.ingredients.length > 0)
      params.set('ingredients', filters.ingredients.join(','));
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.maxTime && filters.maxTime < initialMaxTime)
      params.set('max_time', filters.maxTime);

    return params.toString();
  };

  // 5. FETCH RECIPES PAGE
  const fetchRecipesPage = async (pageNumber, replace = false) => {
    isLoadingRef.current = true;
    setIsLoading(true);

    const qs = buildQueryString(pageNumber);

    try {
      const res = await fetch(`/api/recipes?${qs}`);
      const json = await res.json();
      const data = json.data || [];
      const serverTotal = json.total_count || json.count || 0;

      setRecipes((prev) => {
        const next = replace ? data : [...prev, ...data];
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
      console.error('Failed to fetch recipes', err);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  // 6. RESET + LOAD ON FILTER CHANGE
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setPage(1);
    setHasMore(true);
    setAutoLoadCount(0); // Reset brake on filter change
    fetchRecipesPage(1, true);
  }, [filters]);

  // 7. SEAMLESS INFINITE SCROLL (With Safety Brake)
  useEffect(() => {
    if (!hasMore) return;
    // 🛑 If we hit the limit, stop observing. User must click button.
    if (autoLoadCount >= AUTO_LOAD_LIMIT) return;

    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingRef.current) {
          fetchRecipesPage(page + 1);
          // Increment the brake counter
          setAutoLoadCount((prev) => prev + 1);
        }
      },
      {
        rootMargin: '1200px',
        threshold: 0.1
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, page, filters, autoLoadCount]); // Add autoLoadCount dependency

  // 8. Manual Load Handler (Releases the brake)
  const handleLoadMore = () => {
    setAutoLoadCount(0); // Reset the counter to allow 3 more auto-loads
    fetchRecipesPage(page + 1);
  };

  return (
    <>
      <Head>
        <title>{BRAND_NAME} — Discover delightful recipes</title>
        <meta
          name='description'
          content='Browse our entire collection of delicious recipes. Filter by ingredients, difficulty, and cooking time.'
        />
      </Head>

      <div className='vr-category-layout'>
        <FilterPanel
          allRecipes={allRecipes}
          difficultyOptions={['easy', 'medium', 'hard']}
          initialTimeRange={{ min: 0, max: 60 }}
          onFilterChange={setFilters}
        />

        <main
          className='vr-category-main'
          id='trending'
          ref={listRef}
        >
          <div className='vr-category__header'>
            <h3 className='vr-category__title'>All Recipes</h3>
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

          {/* INFINITE SCROLL SENTINEL & BUTTON */}
          {hasMore && (
            <div className='vr-infinite-footer'>
              {/* Option A: Spinner (Visible when auto-loading) */}
              {isLoading && (
                <div
                  className='vr-infinite-sentinel'
                  style={{ height: '50px' }}
                >
                  <span>Loading more recipes…</span>
                </div>
              )}

              {/* Option B: Invisible Sentinel (Active when not loading & under limit) */}
              {!isLoading && autoLoadCount < AUTO_LOAD_LIMIT && (
                <div
                  ref={sentinelRef}
                  style={{ height: '20px', width: '100%' }} // Physical bump for mobile
                />
              )}

              {/* Option C: "Load More" Button (Active when limit hit) */}
              {!isLoading && autoLoadCount >= AUTO_LOAD_LIMIT && (
                <button
                  className='vr-hero__badge--light'
                  onClick={handleLoadMore}
                  style={{ margin: '2rem auto', display: 'block' }}
                >
                  Load More Recipes
                </button>
              )}
            </div>
          )}

          {!hasMore && !isLoading && recipes.length > 0 && (
            <div className='vr-end-message'>
              <span>You've reached the end of the recipes.</span>
            </div>
          )}

          {recipes.length === 0 && !isLoading && (
            <div className='vr-empty-state'>
              <p>No recipes match these filters yet. Try adjusting them.</p>
            </div>
          )}
        </main>

        <SideBar />
      </div>
    </>
  );
}
