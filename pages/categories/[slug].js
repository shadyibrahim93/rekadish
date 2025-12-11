import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import RecipeCard from '../../components/RecipeCard';
import Breadcrumb from '../../components/Breadcrumb';
import FilterPanel from '../../components/FilterPanel';
import AdSlot from '../../components/AdSlot';
import { BRAND_NAME } from '../../lib/constants';
import SideBar from '../../components/SideBar';
import { useModal } from '../../components/ModalContext';

const PER_PAGE = 24;

/* ----------------------------------------
   SEO CONFIGURATION FOR CUISINES
---------------------------------------- */
const CUISINE_CONFIG = {
  american: {
    pageTitle: 'Classic American Recipes: Comfort Food & Family Favorites',
    heroImage: '/images/categories/american-category.webp',
    heading: 'American Recipes',
    metaDescription:
      'Explore our collection of classic American dishes. From juicy burgers and barbecue to comforting casseroles and apple pie, find favorites the whole family will love.'
  },
  asian: {
    pageTitle: 'Easy Asian Recipes: Stir-Fries, Curries & Noodle Dishes',
    heroImage: '/images/categories/asian-category.webp',
    heading: 'Asian Recipes',
    metaDescription:
      'Bring the takeout experience home with our best Asian recipes. Discover quick stir-fries, fragrant curries, dumpling ideas, and noodle dishes packed with flavor.'
  },
  french: {
    pageTitle: 'Simple French Recipes: Elegant & Delicious Meals',
    heroImage: '/images/categories/french-category.webp',
    heading: 'French Recipes',
    metaDescription:
      'Master the art of French cooking with these accessible recipes. From rustic stews and savory galettes to delicate pastries, bring a touch of Paris to your kitchen.'
  },
  fusion: {
    pageTitle: 'Creative Fusion Recipes: Bold Flavors & Unique Combinations',
    heroImage: '/images/categories/fusion-category.webp',
    heading: 'Fusion Recipes',
    metaDescription:
      'Experience the best of both worlds. Our fusion recipes combine techniques and flavors from different cultures to create exciting, modern, and delicious meals.'
  },
  indian: {
    pageTitle: 'Authentic Indian Recipes: Curries, Dals & Spices',
    heroImage: '/images/categories/indian-category.webp',
    heading: 'Indian Recipes',
    metaDescription:
      'Spice up your kitchen with our authentic Indian recipes. Explore rich butter chicken, healthy dals, aromatic biryanis, and easy vegetarian options.'
  },
  italian: {
    pageTitle: 'Authentic Italian Recipes: Pasta, Pizza & More',
    heroImage: '/images/categories/italian-category.webp',
    heading: 'Italian Recipes',
    metaDescription:
      'Buon appetito! Browse our top-rated Italian recipes, featuring homemade pasta, rustic pizzas, creamy risottos, and classic desserts like tiramisu.'
  },
  mediterranean: {
    pageTitle: 'Healthy Mediterranean Recipes: Fresh & Flavorful Meals',
    heroImage: '/images/categories/mediterranean-category.webp',
    heading: 'Mediterranean Recipes',
    metaDescription:
      'Discover the vibrant flavors of the Mediterranean diet. Enjoy healthy salads, grilled seafood, olive oil-rich dishes, and fresh ingredients perfect for any season.'
  },
  mexican: {
    pageTitle: 'Easy Mexican Recipes: Tacos, Enchiladas & More',
    heroImage: '/images/categories/mexican-category.webp',
    heading: 'Mexican Recipes',
    metaDescription:
      'Fiesta night made easy! Find our best Mexican and Tex-Mex recipes, including street tacos, cheesy enchiladas, fresh guacamole, and zesty salsas.'
  }
};

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR) - Replaces ISR
// ----------------------------------------
export async function getServerSideProps({ params, res }) {
  // Manual Cache Strategy:
  // s-maxage=3600: Cache in CDN for 1 hour
  // stale-while-revalidate=86400: Serve stale content for up to 1 day while updating
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );

  const { slug } = params;
  const isTrending = slug === 'trending';
  const decodedSlug = decodeURIComponent(slug);

  const SAFE_COLUMNS =
    'id, title, description, slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine, ingredients';

  let query = supabase.from('recipes').select(SAFE_COLUMNS, { count: 'exact' });

  if (isTrending) {
    query = query
      .order('rating_count', { ascending: false })
      .order('rating', { ascending: false });
  } else {
    query = query.ilike('cuisine', decodedSlug);
  }

  const { data: allRecipes, count, error } = await query.limit(300);

  if (error) {
    console.error(`SSR Error for slug "${decodedSlug}":`, error.message);
    return { notFound: true };
  }

  const safeAll = allRecipes || [];
  const initialRecipes = safeAll.slice(0, PER_PAGE);

  // Safely calculate max time
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
      initialMaxTime: Number.isFinite(initialMaxTime) ? initialMaxTime : 60,
      initialAllRecipes: safeAll
    }
  };
}

// ----------------------------------------
// 2. CLIENT SIDE COMPONENT
// ----------------------------------------
export default function CategoryPage({
  slug,
  isTrending,
  initialRecipes = [],
  initialTotalCount = 0,
  initialMaxTime = 60,
  initialAllRecipes = []
}) {
  const router = useRouter();
  const { setShowIngredientsModal, setShowMealPlanner } = useModal();

  // Hydration Safety
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [recipes, setRecipes] = useState(initialRecipes);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [allRecipes, setAllRecipes] = useState(initialAllRecipes);

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
  const abortControllerRef = useRef(null);

  // --- DYNAMIC CONTENT LOGIC ---
  const lowerSlug = slug ? slug.toLowerCase() : '';
  const cuisineConfig = CUISINE_CONFIG[lowerSlug];

  let displayTitle, displayHeading, displayDescription, heroImage;

  if (isTrending) {
    displayTitle = 'Trending Recipes';
    displayHeading = 'Trending Recipes';
    displayDescription = `See what everyone is cooking right now! Browse our most popular, top-rated recipes loved by the ${BRAND_NAME} community.`;
    heroImage = '/images/categories/trending-category.webp';
  } else if (cuisineConfig) {
    // 1. Use SEO Config if available
    displayTitle = cuisineConfig.pageTitle;
    displayHeading = cuisineConfig.heading;
    displayDescription = cuisineConfig.metaDescription;
    heroImage = cuisineConfig.heroImage;
  } else {
    // 2. Fallback for unknown categories
    const prettySlug = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '';
    displayTitle = `${prettySlug} Recipes`;
    displayHeading = `${prettySlug} Recipes`;
    displayDescription = `Browse our best collection of ${prettySlug} recipes. Find easy, delicious ideas perfect for any occasion.`;
    heroImage = `/images/categories/${lowerSlug}-category.webp`;
  }

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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------
  // 3. HANDLE FILTER CHANGE
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
        return prev;
      }

      setHasUserFilters(true);
      return next;
    });
  };

  // ----------------------------------------
  // 4. TRIGGER FETCH ON *REAL* FILTER CHANGE
  // ----------------------------------------
  useEffect(() => {
    if (!hasUserFilters) return;

    setPage(1);
    setHasMore(true);
    fetchRecipesPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, hasUserFilters]);

  // ----------------------------------------
  // 5. LOAD MORE BUTTON HANDLER (replaces infinite scroll)
  // ----------------------------------------
  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    fetchRecipesPage(nextPage);
  };

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
          content={displayDescription}
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
          <p className='vr-hero__desc'>{displayDescription}</p>

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
          onFilterChange={handleFilterChange}
        />

        <main
          className='vr-category-main'
          ref={listRef}
        >
          <div className='vr-category__header'>
            <h3 className='vr-category__title'>{displayHeading}</h3>
            <span className='vr-category-main__meta'>
              Total {totalCount} Recipes
            </span>
          </div>

          <div className='vr-category__grid'>
            {recipes.map((r, index) => (
              <React.Fragment key={r.id}>
                <RecipeCard recipe={r} />
                {isMounted && (
                  <AdSlot
                    id='101'
                    position='in-feed'
                    index={index}
                    every={6}
                  />
                )}
              </React.Fragment>
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
