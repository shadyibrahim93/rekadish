// pages/categories/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState, useEffect, useRef, Fragment } from 'react';
import { supabase } from '../../lib/supabaseClient';
import RecipeCard from '../../components/RecipeCard';
import AdSlot from '../../components/AdSlot';
import Breadcrumb from '../../components/Breadcrumb.js';
import { useModal } from '../../components/ModalContext';
import { BRAND_NAME, BRAND_URL } from '../../lib/constants';
import SideBar from '../../components/SideBar';

const CATEGORIES_PER_BATCH = 4; // Render 4 cuisine sections at a time

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR)
// ----------------------------------------
export async function getServerSideProps({ res }) {
  // Manual Cache Strategy:
  // s-maxage=3600: Cache in CDN for 1 hour
  // stale-while-revalidate=86400: Serve stale content while updating
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );

  const safeColumns =
    'id, title, slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine';

  // A. Fetch a large batch to find all unique cuisines
  const { data: allData } = await supabase
    .from('recipes')
    .select('cuisine')
    .not('cuisine', 'is', null)
    .limit(500);

  // B. Extract Unique Cuisines
  const uniqueCuisines = [
    ...new Set((allData || []).map((r) => r.cuisine?.trim()).filter(Boolean))
  ].sort();

  // C. Fetch Recipes for EACH Cuisine
  const cuisineRecipes = {};

  await Promise.all(
    uniqueCuisines.map(async (cuisine) => {
      const { data } = await supabase
        .from('recipes')
        .select(safeColumns)
        .eq('cuisine', cuisine)
        .limit(8);

      if (data && data.length > 0) {
        cuisineRecipes[cuisine] = data;
      }
    })
  );

  const activeCuisines = uniqueCuisines.filter(
    (c) => cuisineRecipes[c] && cuisineRecipes[c].length > 0
  );

  return {
    props: {
      cuisines: activeCuisines,
      cuisineRecipes
    }
  };
}

// ----------------------------------------
// 2. COMPONENT
// ----------------------------------------
export default function Categories({ cuisines = [], cuisineRecipes = {} }) {
  const { setShowIngredientsModal, setShowMealPlanner } = useModal();

  // Hydration Safety
  const [isMounted, setIsMounted] = useState(false);

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(CATEGORIES_PER_BATCH);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine which cuisines to actually render based on scroll position
  const visibleCuisines = useMemo(() => {
    return cuisines.slice(0, visibleCount);
  }, [cuisines, visibleCount]);

  const hasMore = visibleCount < cuisines.length;

  // ----------------------------------------
  // INFINITE SCROLL OBSERVER
  // ----------------------------------------
  useEffect(() => {
    if (!hasMore) return;
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          // Reveal the next batch of categories
          setVisibleCount((prev) => prev + CATEGORIES_PER_BATCH);
        }
      },
      {
        // 👇 Load next batch when user is 1200px (approx 1-2 screens) away
        rootMargin: '1200px',
        threshold: 0.1
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  /* ----------------------------------------
      SEO
  ---------------------------------------- */
  const metaKeywords = useMemo(() => {
    const cuisineKeywords = cuisines.join(', ');
    return `recipes, easy recipes, quick meals, ${cuisineKeywords}, ${BRAND_NAME}`;
  }, [cuisines]);

  /* ----------------------------------------
      SCHEMA
  ---------------------------------------- */
  const siteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: BRAND_URL,
    sameAs: [
      `https://facebook.com/${BRAND_NAME}`,
      `https://www.pinterest.com/${BRAND_NAME}`,
      `https://www.instagram.com/${BRAND_NAME}`
    ],
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${BRAND_URL}/logo.webp`
      }
    }
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${BRAND_NAME} — Discover delightful recipes`,
    description: 'Explore curated, fast, and fun recipes from all cuisines.',
    url: BRAND_URL,
    hasPart: cuisines.map((cuisineName) => ({
      '@type': 'Collection',
      name: `${cuisineName} Recipes`,
      url: `${BRAND_URL}/categories/${encodeURIComponent(cuisineName)}`
    }))
  };

  return (
    <>
      <Head>
        <title>{BRAND_NAME} — Discover delightful recipes</title>
        <meta
          name='description'
          content='Discover premium-quality recipes, curated by cuisine and category. Fast, easy, and delicious recipes for everyday cooking.'
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
          href={`${BRAND_URL}/categories`}
        />

        <meta
          property='og:title'
          content={`${BRAND_NAME} — Discover delightful recipes`}
        />
        <meta
          property='og:description'
          content='Explore curated, fast, and fun recipes for all cuisines.'
        />
        <meta
          property='og:image'
          content={`${BRAND_URL}/images/cuisine.webp`}
        />
        <meta
          property='og:url'
          content={`${BRAND_URL}/categories`}
        />
        <meta
          property='og:type'
          content='website'
        />
        <meta
          property='og:site_name'
          content={BRAND_NAME}
        />

        <meta
          name='twitter:card'
          content='summary_large_image'
        />
        <meta
          name='twitter:title'
          content={`${BRAND_NAME} — Discover delightful recipes`}
        />
        <meta
          name='twitter:description'
          content='Explore curated, fun, and fast recipes for all cuisines.'
        />
        <meta
          name='twitter:image'
          content={`${BRAND_URL}/images/cuisine.webp`}
        />

        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionSchema)
          }}
        />
      </Head>

      <Breadcrumb recipe={cuisines} />

      {/* HERO SECTION */}
      <div className='vr-hero'>
        <img
          className='vr-hero__image'
          src='/images/cuisine.webp'
          alt='hero'
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/hero-banner2.webp';
          }}
        />
        <div className='vr-hero__overlay'>
          <h1 className='vr-hero__title'>
            Discover Delicious Recipes by Cuisine
          </h1>
          <p className='vr-hero__desc'>
            Discover premium-quality recipes, curated by cuisine and category.
            Fast, easy, and delicious recipes for everyday cooking.
          </p>

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

      {/* MAIN LAYOUT */}
      <div className='vr-home-layout'>
        <div className='vr-category__container'>
          {/* Render only the "visible" cuisines */}
          {visibleCuisines.map((cuisineName) => (
            <section
              key={cuisineName}
              className='vr-section'
              itemScope
              itemType='https://schema.org/ItemList'
            >
              <div className='vr-category__header'>
                <h3 className='vr-category__title'>{cuisineName} Recipes</h3>
                <Link
                  href={`/categories/${encodeURIComponent(cuisineName)}`}
                  className='vr-category__link'
                >
                  View all {cuisineName} recipes →
                </Link>
                <meta
                  itemProp='name'
                  content={`${cuisineName} Recipes`}
                />
              </div>

              <div className='vr-category__grid'>
                {(cuisineRecipes[cuisineName] || []).map((r, index) => (
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
            </section>
          ))}

          {/* Sentinel Div for Infinite Scroll */}
          {hasMore && (
            <div
              ref={sentinelRef}
              className='vr-infinite-sentinel'
              style={{ height: '50px', opacity: 0 }}
            />
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <SideBar />
      </div>
    </>
  );
}
