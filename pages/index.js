// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import RecipeCard from '../components/RecipeCard';
import { useModal } from '../components/ModalContext';
import { BRAND_NAME, BRAND_URL } from '../lib/constants';
import SideBar from '../components/SideBar.js';
import AdSlot from '../components/AdSlot';

// 👇 1. THIS RUNS ON THE SERVER (ISR)
export async function getStaticProps() {
  const PROPS_REVALIDATE = 60; // Update homepage at most once every 60 seconds

  // Define the lightweight columns we need for cards
  // Excludes heavy fields like 'instructions', 'ingredients', 'nutrition_info'
  const cardColumns =
    'id, title, slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine';

  // --- A. Fetch Top Rated (Efficiently via DB sort) ---
  const { data: topRated } = await supabase
    .from('recipes')
    .select(cardColumns) // 👈 OPTIMIZED
    .order('rating', { ascending: false })
    .order('rating_count', { ascending: false })
    .limit(8);

  // --- B. Fetch a batch to determine Cuisines & Serving Times ---
  // We fetch a larger batch to find what tags/cuisines exist
  const { data: batchRecipes } = await supabase
    .from('recipes')
    .select(cardColumns) // 👈 OPTIMIZED
    .limit(300);

  const all = batchRecipes || [];

  // 1. Process Serving Time Groups
  const servingTimeRecipes = all.reduce((acc, r) => {
    const key = r.serving_time?.trim();
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    if (acc[key].length < 8) acc[key].push(r);
    return acc;
  }, {});

  // 2. Process Unique Cuisines
  const uniqueCuisines = [
    ...new Set(all.map((r) => r.cuisine?.trim()).filter(Boolean))
  ].slice(0, 8); // Limit to top 8 cuisines

  // --- C. Fetch Recipes for those Specific Cuisines ---
  // We use Promise.all to fetch them in parallel (FAST)
  const cuisineRecipes = {};

  await Promise.all(
    uniqueCuisines.map(async (cuisine) => {
      const { data } = await supabase
        .from('recipes')
        .select(cardColumns) // 👈 OPTIMIZED
        .eq('cuisine', cuisine)
        .limit(8);

      cuisineRecipes[cuisine] = data || [];
    })
  );

  return {
    props: {
      topRated: topRated || [],
      servingTimeRecipes,
      cuisines: uniqueCuisines,
      cuisineRecipes
    },
    revalidate: PROPS_REVALIDATE
  };
}

// 👇 2. COMPONENT NOW JUST RENDERS (Instant Load)
export default function Home({
  topRated = [],
  servingTimeRecipes = {},
  cuisines = [],
  cuisineRecipes = {}
}) {
  const { setShowIngredientsModal } = useModal();

  /* ----------------------------------------
      SEO KEYWORDS
  ---------------------------------------- */
  const metaKeywords = useMemo(() => {
    const cuisineKeywords = cuisines.join(', ');
    return `recipes, easy recipes, quick meals, dinner ideas, ${cuisineKeywords}, ${BRAND_NAME}`;
  }, [cuisines]);

  /* ----------------------------------------
      STRUCTURED DATA
  ---------------------------------------- */
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
    logo: {
      '@type': 'ImageObject',
      url: `${BRAND_URL}/logo.webp`
    },
    sameAs: [
      `https://www.facebook.com/${BRAND_URL}`,
      `https://www.instagram.com/${BRAND_URL}`,
      `https://www.pinterest.com/${BRAND_URL}`
    ]
  };

  const homeSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${BRAND_NAME} — Discover delightful recipes`,
    description:
      'Discover curated, fast, and fun recipes by cuisine, category, and difficulty.',
    url: BRAND_URL,
    hasPart: [
      {
        '@type': 'Collection',
        name: 'Top Rated Recipes',
        url: `${BRAND_URL}/recipes?sort=top-rated`
      },
      ...cuisines.map((cuisineName) => ({
        '@type': 'Collection',
        name: `${cuisineName} Recipes`,
        url: `${BRAND_URL}/categories/${encodeURIComponent(cuisineName)}`
      }))
    ]
  };

  return (
    <>
      <Head>
        {/* BASIC SEO */}
        <title>{BRAND_NAME} — Discover delightful recipes</title>
        <meta
          name='description'
          content={`Discover curated, fast, and fun recipes by cuisine and category. Plan meals, cook from your pantry, and explore top-rated dishes on ${BRAND_NAME}.`}
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
          content={`${BRAND_NAME}`}
        />

        {/* CANONICAL */}
        <link
          rel='canonical'
          href={BRAND_URL}
        />

        {/* OPEN GRAPH */}
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
          property='og:site_name'
          content={`${BRAND_NAME}`}
        />

        {/* TWITTER */}
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
          content='Find curated recipes, meal ideas, and kitchen essentials.'
        />
        <meta
          name='twitter:image'
          content={`${BRAND_URL}/images/og-home.webp`}
        />

        {/* STRUCTURED DATA */}
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
          alt='Assorted plated dishes from different cuisines'
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
          </div>
        </div>
      </section>

      {/* MAIN HOME LAYOUT */}
      <div className='vr-home-layout'>
        <div className='vr-category__container'>
          {/* TOP RATED SECTION */}
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
            </section>
          )}

          {/* SERVING TIME SECTIONS */}
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
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CUISINE SECTIONS */}
          {cuisines.length > 0 && (
            <section
              className='vr-section vr-section--cuisines'
              aria-labelledby='cuisines-heading'
            >
              <div className='vr-cuisines-list'>
                {cuisines.map((cuisineName) => (
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
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* SIDEBAR */}
        <SideBar />
      </div>
    </>
  );
}
