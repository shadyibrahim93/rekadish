// pages/search.js
import { BRAND_NAME, BRAND_URL } from '../lib/constants';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useRef, Fragment } from 'react';
import { supabase } from '../lib/supabaseClient';
import RecipeCard from '../components/RecipeCard';
import CreateFromIngredients from '../components/CreateFromIngredients';
import Link from 'next/link';
import AdSlot from '../components/AdSlot';
import SideBar from '../components/SideBar';

const PER_PAGE = 24; // Batch size for rendering results

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR) - Replaces ISR
// ----------------------------------------
export async function getServerSideProps({ res }) {
  // Manual Cache Strategy:
  // s-maxage=60: Cache "Trending" list in CDN for 60 seconds
  // stale-while-revalidate=300: Serve stale content while updating in background
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );

  const safeColumns =
    'id, title, slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine';

  // Fetch Top Rated / Trending Recipes for the "Empty State"
  const { data: trendingRecipes } = await supabase
    .from('recipes')
    .select(safeColumns)
    .order('rating', { ascending: false })
    .order('rating_count', { ascending: false })
    .limit(11);

  return {
    props: {
      initialTrending: trendingRecipes || []
    }
  };
}

// ----------------------------------------
// 2. CLIENT SIDE COMPONENT
// ----------------------------------------
export default function SearchResultsPage({ initialTrending = [] }) {
  const router = useRouter();
  const { q } = router.query;

  // Hydration Safety
  const [isMounted, setIsMounted] = useState(false);

  // Search Data State
  const [allResults, setAllResults] = useState([]); // Stores ALL fetched results
  const [loading, setLoading] = useState(false);

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(PER_PAGE);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* ----------------------------------------
      LOAD SEARCH RESULTS (Client Side)
  ---------------------------------------- */
  useEffect(() => {
    if (!q) {
      setAllResults([]);
      return;
    }

    setLoading(true);
    // Reset visible count on new search
    setVisibleCount(PER_PAGE);

    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        setAllResults(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [q]);

  // Compute the currently visible slice of results
  const visibleResults = useMemo(() => {
    return allResults.slice(0, visibleCount);
  }, [allResults, visibleCount]);

  const hasMore = visibleCount < allResults.length;

  /* ----------------------------------------
      INFINITE SCROLL OBSERVER
  ---------------------------------------- */
  useEffect(() => {
    if (!hasMore) return;
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          // Reveal next batch
          setVisibleCount((prev) => prev + PER_PAGE);
        }
      },
      {
        // 👇 Load next batch when user is 1200px away from bottom
        rootMargin: '1200px',
        threshold: 0.1
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  /* ----------------------------------------
      SEO METADATA
  ---------------------------------------- */
  const pageTitle = q
    ? `Search results for "${q}" — ${BRAND_NAME}`
    : `Search recipes — ${BRAND_NAME}`;

  const pageDescription = q
    ? `Browse recipe results for "${q}" on ${BRAND_NAME}. Discover curated recipes by ingredients, cuisine, and more.`
    : `Search thousands of recipes on ${BRAND_NAME} by keyword, ingredients, cuisine, and more.`;

  const metaKeywords = useMemo(() => {
    if (!q) return `recipe search, search recipes, ${BRAND_NAME}`;
    return `recipe search, search recipes, ${q}, ${BRAND_NAME}`;
  }, [q]);

  const canonicalUrl = q
    ? `${BRAND_URL}/search?q=${encodeURIComponent(q)}`
    : `${BRAND_URL}/search`;

  /* ----------------------------------------
      JSON-LD SCHEMA
  ---------------------------------------- */
  const searchSchema = {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: pageTitle,
    description: pageDescription,
    url: canonicalUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BRAND_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name='description'
          content={pageDescription}
        />
        <meta
          name='keywords'
          content={metaKeywords}
        />
        <meta
          name='author'
          content={`${BRAND_NAME} Editorial Team`}
        />
        <meta
          name='publisher'
          content={BRAND_NAME}
        />
        <link
          rel='canonical'
          href={canonicalUrl}
        />

        {/* OPEN GRAPH */}
        <meta
          property='og:title'
          content={pageTitle}
        />
        <meta
          property='og:description'
          content={pageDescription}
        />
        <meta
          property='og:type'
          content='website'
        />
        <meta
          property='og:url'
          content={canonicalUrl}
        />
        <meta
          property='og:image'
          content={`${BRAND_URL}/images/og-search.webp`}
        />
        <meta
          property='og:site_name'
          content={BRAND_NAME}
        />

        {/* TWITTER */}
        <meta
          name='twitter:card'
          content='summary_large_image'
        />
        <meta
          name='twitter:title'
          content={pageTitle}
        />
        <meta
          name='twitter:description'
          content={pageDescription}
        />
        <meta
          name='twitter:image'
          content={`${BRAND_URL}/images/og-search.webp`}
        />

        {/* STRUCTURED DATA */}
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(searchSchema) }}
        />
      </Head>

      <div className='vr-home-layout'>
        <div className='vr-category__container'>
          {/* SEARCH RESULTS SECTION */}
          <div className='vr-card'>
            <h1 className='vr-category__title'>
              {q ? `Search results for "${q}"` : 'Search recipes'}
            </h1>

            {loading ? (
              <p className='vr-search-results__empty'>Searching…</p>
            ) : visibleResults.length > 0 ? (
              <div className='vr-category__grid'>
                {visibleResults.map((recipe, index) => (
                  <Fragment key={recipe.id}>
                    <RecipeCard recipe={recipe} />
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
            ) : (
              <p className='vr-search-results__empty'>
                {q
                  ? `No recipes found for "${q}". Try checking the trending recipes below.`
                  : 'Enter a keyword above to find delicious recipes.'}
              </p>
            )}

            {/* Sentinel Div for Infinite Scroll */}
            {hasMore && !loading && (
              <div
                ref={sentinelRef}
                style={{ height: '50px', opacity: 0 }}
              />
            )}
          </div>

          {/* CREATE FROM INGREDIENTS */}
          <div className='vr-card'>
            <CreateFromIngredients />
          </div>

          {/* TRENDING NOW (Always visible, pre-loaded) */}
          <div className='vr-card'>
            <div className='vr-section'>
              <div className='vr-category__header'>
                <h3 className='vr-category__title'>Trending Recipes</h3>
                <Link
                  href={`/recipes`}
                  className='vr-category__link'
                >
                  View all recipes →
                </Link>
              </div>
              <div className='vr-category__grid'>
                {initialTrending.map((recipe, index) => (
                  <Fragment key={recipe.id}>
                    <RecipeCard recipe={recipe} />
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
            </div>
          </div>
        </div>

        <SideBar />
      </div>
    </>
  );
}
