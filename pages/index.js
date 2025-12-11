// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useMemo, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import RecipeCard from '../components/RecipeCard';
import { useModal } from '../components/ModalContext';
import { BRAND_NAME, BRAND_URL } from '../lib/constants';
import SideBar from '../components/SideBar.js';
import AdSlot from '../components/AdSlot';

const SECTIONS_PER_BATCH = 3; // How many cuisine sections to reveal at once

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR)
// ----------------------------------------
export async function getServerSideProps({ res }) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );

  const cardColumns =
    'id, title, slug, description, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine';

  const { data: topRated } = await supabase
    .from('recipes')
    .select(cardColumns)
    .order('rating', { ascending: false })
    .order('rating_count', { ascending: false })
    .limit(8);

  const { data: batchRecipes } = await supabase
    .from('recipes')
    .select(cardColumns)
    .limit(300);

  const all = batchRecipes || [];

  const servingTimeRecipes = all.reduce((acc, r) => {
    const key = r.serving_time?.trim();
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    if (acc[key].length < 8) acc[key].push(r);
    return acc;
  }, {});

  const uniqueCuisines = [
    ...new Set(all.map((r) => r.cuisine?.trim()).filter(Boolean))
  ].slice(0, 12); // Increased limit slightly since we have lazy load now

  const cuisineRecipes = {};
  await Promise.all(
    uniqueCuisines.map(async (cuisine) => {
      const { data } = await supabase
        .from('recipes')
        .select(cardColumns)
        .eq('cuisine', cuisine)
        .limit(8);
      cuisineRecipes[cuisine] = data || [];
    })
  );

  // Serialize to be safe
  const safeProps = JSON.parse(
    JSON.stringify({
      topRated: topRated || [],
      servingTimeRecipes,
      cuisines: uniqueCuisines,
      cuisineRecipes
    })
  );

  return {
    props: safeProps
  };
}

// ----------------------------------------
// 2. COMPONENT
// ----------------------------------------
export default function Home({
  topRated = [],
  servingTimeRecipes = {},
  cuisines = [],
  cuisineRecipes = {}
}) {
  const { setShowIngredientsModal, setShowMealPlanner } = useModal();
  const [isMounted, setIsMounted] = useState(false);

  // Lazy Reveal State (replaced infinite scroll with button)
  const [visibleCuisinesCount, setVisibleCuisinesCount] =
    useState(SECTIONS_PER_BATCH);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const visibleCuisines = useMemo(() => {
    return cuisines.slice(0, visibleCuisinesCount);
  }, [cuisines, visibleCuisinesCount]);

  const hasMore = visibleCuisinesCount < cuisines.length;

  const handleLoadMoreCuisines = () => {
    if (!hasMore) return;
    setVisibleCuisinesCount((prev) => prev + SECTIONS_PER_BATCH);
  };

  const metaKeywords = useMemo(() => {
    const cuisineKeywords = cuisines.join(', ');
    return `recipes, easy recipes, quick meals, dinner ideas, ${cuisineKeywords}, ${BRAND_NAME}`;
  }, [cuisines]);

  // Schema (Condensed for brevity)
  const siteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: BRAND_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BRAND_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: BRAND_URL,
    logo: { '@type': 'ImageObject', url: `${BRAND_URL}/logo.webp` }
  };
  const homeSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${BRAND_NAME} — Discover delightful recipes`,
    description:
      'Discover curated, fast, and fun recipes by cuisine, category, and difficulty.',
    url: BRAND_URL
  };

  return (
    <>
      <Head>
        <title>{BRAND_NAME} — Discover delightful recipes</title>
        <meta
          name='description'
          content={`Discover curated, fast, and fun recipes by cuisine and category. Plan meals, cook from your pantry, and explore top-rated dishes on ${BRAND_NAME}.`}
        />
        <meta
          name='keywords'
          content={metaKeywords}
        />
        <link
          rel='canonical'
          href={BRAND_URL}
        />
        {/* OG Tags */}
        <meta
          property='og:title'
          content={`${BRAND_NAME} — Discover delightful recipes`}
        />
        <meta
          property='og:description'
          content='Explore top-rated recipes, browse by cuisine, plan meals, and find kitchen tools that make cooking easier.'
        />
        <meta
          property='og:image'
          content={`${BRAND_URL}/images/og-home.webp`}
        />
        <meta
          property='og:url'
          content={BRAND_URL}
        />
        <meta
          property='og:type'
          content='website'
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
          name='twitter:image'
          content={`${BRAND_URL}/images/og-home.webp`}
        />

        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
        />
      </Head>

      {/* HERO */}
      <section className='vr-hero'>
        <img
          className='vr-hero__image'
          src='/images/hero-banner2.webp'
          alt='Assorted plated dishes'
        />
        <div className='vr-hero__overlay'>
          <h1 className='vr-hero__title'>
            Discover Easy, Delicious Recipes for Every Day
          </h1>
          <p className='vr-hero__desc'>
            Find quick meals, explore global cuisines, plan your week, and get
            inspired to cook.
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
      </section>

      {/* MAIN LAYOUT */}
      <div className='vr-home-layout'>
        <div className='vr-category__container'>
          {/* 1. TOP RATED (Always Visible) */}
          {topRated.length > 0 && (
            <section
              className='vr-section'
              aria-labelledby='top-rated-heading'
            >
              <div className='vr-category__header'>
                <h3 className='vr-category__title'>Top Rated Recipes</h3>
                <Link
                  href={`/recipes`}
                  className='vr-category__link'
                >
                  View all recipes →
                </Link>
              </div>
              <div className='vr-category__grid'>
                {topRated.map((r, index) => (
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
          )}

          {/* 2. SERVING TIMES (Always Visible) */}
          {Object.keys(servingTimeRecipes).length > 0 && (
            <section
              className='vr-section vr-section--serving-time'
              aria-labelledby='serving-time-heading'
            >
              <div className='vr-cuisines-list'>
                {Object.entries(servingTimeRecipes).map(([time, recipes]) => (
                  <div
                    key={time}
                    className='vr-section'
                    itemScope
                    itemType='https://schema.org/ItemList'
                  >
                    <div className='vr-category__header'>
                      <h3 className='vr-category__title'>
                        {time.charAt(0).toUpperCase() + time.slice(1)} Recipes
                      </h3>
                      <Link
                        href={`/${time.toLowerCase()}`}
                        className='vr-category__link'
                      >
                        View all {time} recipes →
                      </Link>
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
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. CUISINE SECTIONS (Lazy Loaded via button) */}
          {cuisines.length > 0 && (
            <section
              className='vr-section vr-section--cuisines'
              aria-labelledby='cuisines-heading'
            >
              <div className='vr-cuisines-list'>
                {visibleCuisines.map((cuisineName) => (
                  <div
                    key={cuisineName}
                    className='vr-section'
                    itemScope
                    itemType='https://schema.org/ItemList'
                  >
                    <div className='vr-category__header'>
                      <h3 className='vr-category__title'>
                        {cuisineName} Recipes
                      </h3>
                      <Link
                        href={`/categories/${encodeURIComponent(cuisineName)}`}
                        className='vr-category__link'
                      >
                        View all {cuisineName} recipes →
                      </Link>
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
                  </div>
                ))}

                {hasMore && (
                  <div className='vr-load-more-wrapper'>
                    <button
                      type='button'
                      className='vr-load-more-btn'
                      onClick={handleLoadMoreCuisines}
                    >
                      Load more cuisines
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <SideBar />
      </div>
    </>
  );
}
