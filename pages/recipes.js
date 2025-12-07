import Head from 'next/head';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import RecipeCard from '../components/RecipeCard';
import AdSlot from '../components/AdSlot';
import FilterPanel from '../components/FilterPanel';
import MealPlanner from '../components/MealPlanner';
import { REVALIDATE_TIME, BRAND_NAME } from '../lib/constants';
import SideBar from '../components/SideBar';

const PER_PAGE = 24;

// ----------------------------------------
// 1. SERVER SIDE BUILD (ISR)
// ----------------------------------------
export async function getStaticProps() {
  // --- A. Query Logic ---
  // Fetch newest recipes first by default
  const query = supabase
    .from('recipes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // --- B. Fetch First Page (Limit 24) ---
  const {
    data: initialRecipes,
    count,
    error
  } = await query.range(0, PER_PAGE - 1);

  if (error) {
    console.error('ISR Error:', error);
    return { notFound: true };
  }

  // --- C. Fetch Max Time (for initial filter state) ---
  const { data: timeData } = await supabase
    .from('recipes')
    .select('total_time, cook_time')
    .limit(100);

  const initialMaxTime = timeData
    ? Math.max(...timeData.map((r) => r.total_time || r.cook_time || 0))
    : 60;

  return {
    props: {
      initialRecipes: initialRecipes || [],
      initialTotalCount: count || 0,
      initialMaxTime
    },
    revalidate: REVALIDATE_TIME
  };
}

// ----------------------------------------
// 2. CLIENT SIDE COMPONENT
// ----------------------------------------
export default function Recipes({
  initialRecipes = [],
  initialTotalCount = 0,
  initialMaxTime = 60
}) {
  // Initialize state with Server Data
  const [recipes, setRecipes] = useState(initialRecipes);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  // Lazy loaded for filters
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

  const listRef = useRef(null);
  const sentinelRef = useRef(null);

  // ----------------------------------------
  // 3. LAZY LOAD FILTER DATA
  // ----------------------------------------
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

  // ----------------------------------------
  // 4. HELPER: BUILD QUERY STRING
  // ----------------------------------------
  const buildQueryString = (pageNumber) => {
    const params = new URLSearchParams();
    params.set('page', pageNumber);
    params.set('per_page', PER_PAGE);

    if (filters.ingredients.length > 0) {
      params.set('ingredients', filters.ingredients.join(','));
    }

    if (filters.difficulty) {
      params.set('difficulty', filters.difficulty);
    }

    if (filters.maxTime) {
      params.set('max_time', filters.maxTime);
    }

    return params.toString();
  };

  // ----------------------------------------
  // 5. FETCH RECIPES PAGE (Client Logic)
  // ----------------------------------------
  const fetchRecipesPage = async (pageNumber, replace = false) => {
    setIsLoading(true);

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
    }
  };

  // ----------------------------------------
  // 6. RESET + LOAD ON FILTER CHANGE
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

    if (listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    fetchRecipesPage(1, true);
  }, [filters]);

  // ----------------------------------------
  // 7. INFINITE SCROLL
  // ----------------------------------------
  useEffect(() => {
    if (!hasMore || isLoading) return;
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          fetchRecipesPage(page + 1);
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, page, filters]);

  return (
    <>
      <Head>
        <title>{BRAND_NAME} — Discover delightful recipes</title>
        <meta
          name='description'
          content='Browse our entire collection of delicious recipes. Filter by ingredients, difficulty, and cooking time.'
        />
      </Head>

      {/* MAIN LAYOUT */}
      <div className='vr-category-layout'>
        {/* LEFT FILTER SIDEBAR */}
        <FilterPanel
          allRecipes={allRecipes} // Populates lazily
          difficultyOptions={['easy', 'medium', 'hard']}
          initialTimeRange={{ min: 0, max: 60 }}
          onFilterChange={setFilters}
        />

        {/* MAIN GRID */}
        <main
          className='vr-category-main'
          id='trending'
          ref={listRef}
        >
          <div className='vr-category-main__header'>
            <h3 className='vr-category__title'>All Recipes</h3>

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

        {/* RIGHT SIDEBAR */}
        <SideBar />
      </div>
    </>
  );
}
