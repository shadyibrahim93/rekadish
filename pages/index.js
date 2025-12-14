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
import Image from 'next/image';
import { AUTHOR_LIST } from '../lib/authors';
import TipsAndTricksCard from '../components/TipsAndTricks/TipsAndTricksCard';

// Icons
import {
  FaCalendarAlt,
  FaFeatherAlt,
  FaBolt,
  FaPaperPlane,
  FaEnvelopeOpenText,
  FaClock,
  FaStar,
  FaUtensils,
  FaImage,
  FaHandsHelping,
  FaListOl,
  FaRegClock,
  FaWallet,
  FaMagic
} from 'react-icons/fa';

const SECTIONS_PER_BATCH = 3;

const RECIPE_OF_DAY_TZ = 'America/New_York';

// Fast deterministic 32-bit hash (FNV-1a)
function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0; // unsigned
}

function getDateKey(now = new Date()) {
  // "YYYY-MM-DD" in the chosen timezone (en-CA formats like 2025-12-13)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RECIPE_OF_DAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

async function fetchRecipeOfTheDay(cardColumns) {
  const dateKey = getDateKey(); // changes once per calendar day (in TZ)
  const seed = hash32(dateKey);

  // Get total recipe count
  const { count, error: countError } = await supabase
    .from('recipes')
    .select('id', { count: 'exact', head: true });

  if (countError || !count || count < 1) return null;

  const offset = seed % count;

  // Deterministic pick: stable order + offset based on today's seed
  const { data, error } = await supabase
    .from('recipes')
    .select(cardColumns)
    .order('id', { ascending: true })
    .range(offset, offset); // inclusive

  if (!error && data?.[0]) return data[0];

  // Fallback
  const { data: fallback } = await supabase
    .from('recipes')
    .select(cardColumns)
    .order('id', { ascending: true })
    .limit(1);

  return fallback?.[0] || null;
}

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

  const tipsColumns = [
    'id',
    'title',
    'slug',
    'description',
    'image_url',
    'tags',
    'created_at',
    'author_name',
    'author_image',
    'author_slug',
    'author_role',
    'seo_title',
    'seo_description'
  ].join(', ');

  // 1. Top Rated
  const { data: topRated } = await supabase
    .from('recipes')
    .select(cardColumns)
    .order('rating', { ascending: false })
    .order('rating_count', { ascending: false })
    .limit(11);

  const { data: topTips } = await supabase
    .from('blogs')
    .select(tipsColumns)
    .order('created_at', { ascending: false })
    .limit(5);
  // 2. Featured Recipe (Recipe of the Day) - Just picking the 1st highest rated for demo
  // In a real app, you might randomize this or pick a specific ID
  const featuredRecipe = await fetchRecipeOfTheDay(cardColumns);

  // 3. Quick Recipes (Under 30 mins)
  const { data: quickRecipes } = await supabase
    .from('recipes')
    .select(cardColumns)
    .lte('total_time', 30) // Less than or equal to 30
    .limit(6);

  // 4. Batch for infinite scroll
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
  ].slice(0, 12);

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

  const safeProps = JSON.parse(
    JSON.stringify({
      topRated: topRated || [],
      featuredRecipe,
      quickRecipes: quickRecipes || [],
      servingTimeRecipes,
      cuisines: uniqueCuisines,
      cuisineRecipes,
      topTips: topTips || []
    })
  );

  return {
    props: safeProps
  };
}

const QUICK_CATEGORIES = [
  { name: 'Breakfast', link: '/breakfast' },
  { name: 'Lunch', link: '/lunch' },
  { name: 'Dinner', link: '/dinner' },
  { name: 'Desserts', link: '/dessert' },
  { name: 'American', link: '/categories/american' },
  { name: 'Italian', link: '/categories/Italian' },
  { name: 'Mexican', link: '/categories/Mexican' },
  { name: 'Mediterranean', link: '/categories/mediterranean' },
  { name: 'Asian', link: '/categories/asian' },
  { name: 'Fusion', link: '/categories/fusion' }
];

// ----------------------------------------
// 2. COMPONENT
// ----------------------------------------
export default function Home({
  topRated = [],
  featuredRecipe = null,
  quickRecipes = [],
  servingTimeRecipes = {},
  cuisines = [],
  cuisineRecipes = {},
  topTips = [] //
}) {
  const { setShowIngredientsModal, setShowMealPlanner } = useModal();
  const [isMounted, setIsMounted] = useState(false);

  // Newsletter State
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await fetch('/api/newsletter/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setSubmitted(true);
      setEmail('');
    } catch (err) {
      console.error('Newsletter subscription failed:', err);
    }
  };

  const metaKeywords = useMemo(() => {
    const cuisineKeywords = cuisines.join(', ');
    return `recipes, easy recipes, quick meals, dinner ideas, ${cuisineKeywords}, ${BRAND_NAME}`;
  }, [cuisines]);

  // Schemas (omitted for brevity, same as before)
  const siteSchema = {
    /* ... */
  };
  const orgSchema = {
    /* ... */
  };
  const homeSchema = {
    /* ... */
  };

  return (
    <>
      <Head>
        <title>{BRAND_NAME} — Discover delightful recipes</title>
        <meta
          name='description'
          content={`Discover curated, fast, and fun recipes by cuisine and category.`}
        />
        {/* ... (Keep existing Head tags) ... */}
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
          {/* Quick Browse Pills */}
          <section
            className='vr-section vr-quick-categories'
            aria-label='Quick Categories'
          >
            <div className='vr-quick-browse'>
              {QUICK_CATEGORIES.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.link}
                  className='vr-pill'
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </section>

          {/* OUR MISSION */}
          <section className='vr-section vr-mission'>
            <div className='vr-category__header'>
              <h3 className='vr-category__title'>Why RekaDish?</h3>
            </div>

            <div className='vr-mission__wrap'>
              <div className='vr-mission-items__container'>
                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaHandsHelping size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Cooking for Everyone</h3>
                  <span className='vr-mission-text'>
                    Make cooking simple, joyful, and accessible for every home
                    cook, no matter your schedule or experience level.
                  </span>
                </div>

                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaListOl size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Crystal-Clear Steps</h3>
                  <span className='vr-mission-text'>
                    Deliver clear, step-by-step instructions with the small
                    details that matter, so you feel confident from prep to
                    plate.
                  </span>
                </div>

                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaWallet size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Smarter Home Cooking</h3>
                  <span className='vr-mission-text'>
                    Help home cooks save time and money with practical
                    shortcuts, smart swaps, and budget-friendly ideas that still
                    taste amazing.
                  </span>
                </div>

                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaRegClock size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Reliable Results</h3>
                  <span className='vr-mission-text'>
                    Showcase recipes anyone can follow. Tested for real
                    kitchens, real ingredients, and consistently delicious
                    results.
                  </span>
                </div>

                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaMagic size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Tools That Empower</h3>
                  <span className='vr-mission-text'>
                    Build smart tools that help people cook better. Making
                    planning, shopping, and learning new skills feel effortless.
                  </span>
                </div>
                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaFeatherAlt size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Create Your Own</h3>
                  <p className='vr-mission-text'>
                    Recipes from ingredients you have. Build, save, and share
                    your own recipes.
                  </p>
                </div>
                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaCalendarAlt size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Smart Planner</h3>
                  <p className='vr-mission-text'>
                    Organize your week, share plans, and check pantry stock
                    automatically.
                  </p>
                </div>
                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaImage size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Ingredient Clarity</h3>
                  <p className='vr-mission-text'>
                    Every ingredient comes with a high quality image, so you
                    always know exactly what you’re reading.
                  </p>
                </div>
                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaBolt size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Fast & Clean</h3>
                  <p className='vr-mission-text'>
                    A high performance experience. No clutter, just great food.
                  </p>
                </div>
                <div className='vr-mission-item'>
                  <span className='vr-mission-icon'>
                    <FaStar size={28} />
                  </span>
                  <h3 className='vr-mission-title'>Trusted & Tested</h3>
                  <p className='vr-mission-text'>
                    Recipes are built for real home kitchens. Clear, reliable,
                    and made to work the first time.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* --- NEW SECTION: RECIPE OF THE DAY (Spotlight) --- */}
          {featuredRecipe && (
            <section className='vr-section vr-spotlight'>
              <div className='vr-spotlight__card'>
                <div className='vr-spotlight__image-wrapper'>
                  <img
                    src={`/images/recipes/${featuredRecipe.image_url}.webp`}
                    alt={featuredRecipe.title}
                  />
                </div>
                <div className='vr-spotlight__content'>
                  <div className='vr-category__title'>Recipe of the Day</div>

                  <div className='vr-spotlight__meta'>
                    <span className='vr-tag'>{featuredRecipe.cuisine}</span>
                    <span className='vr-tag'>
                      <FaClock /> {featuredRecipe.total_time} min
                    </span>
                  </div>
                  <h3>{featuredRecipe.title}</h3>
                  <p>{featuredRecipe.description.substring(0, 120)}...</p>
                  <Link
                    href={`/recipes/${featuredRecipe.slug}`}
                    className='vr-spotlight__btn'
                  >
                    View Recipe <FaUtensils />
                  </Link>
                </div>
              </div>
            </section>
          )}
          {/* MEET THE TEAM */}
          <section className='vr-section vr-team-preview'>
            <div className='vr-category__header'>
              <h3 className='vr-category__title'>Meet the Team</h3>
              <Link
                href='/team'
                className='vr-category__link'
              >
                View all →
              </Link>
            </div>

            <div className='vr-category__grid vr-team-grid'>
              {AUTHOR_LIST.slice(0, 4).map((author) => (
                <article
                  key={author.slug}
                  className='vr-card vr-author-card vr-team-card'
                >
                  <Link
                    href={`/team/${author.slug}`}
                    className='vr-author-card__link'
                  >
                    <div className='vr-author-card__header'>
                      <div className='vr-author-card__avatar'>
                        <Image
                          src={`/images/team/${author.avatar}.webp`}
                          alt={author.name}
                          width={72}
                          height={72}
                        />
                      </div>

                      <div className='vr-author-card__identity'>
                        <h3 className='vr-author-card__name'>{author.name}</h3>
                        <p className='vr-author-card__role'>{author.role}</p>
                      </div>
                    </div>

                    <p className='vr-author-card__bio'>{author.bioShort}</p>

                    <div className='vr-author-card__footer'>
                      <span className='vr-author-card__cta'>
                        View profile →
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>

          {/* NEWSLETTER */}
          <section className='vr-section vr-newsletter-home'>
            <div className='vr-newsletter-home__content'>
              <div className='vr-newsletter-home__text'>
                <span className='vr-newsletter-home__icon'>
                  <FaEnvelopeOpenText />
                </span>
                <h3>Deliciously Simple.</h3>
                <p>Join 10,000+ home cooks. Get recipes and plans delivered.</p>
              </div>
              {!submitted ? (
                <form
                  onSubmit={handleSubscribe}
                  className='vr-newsletter-home__form'
                >
                  <input
                    type='email'
                    placeholder='Your email address'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button type='submit'>
                    Subscribe <FaPaperPlane className='icon-right' />
                  </button>
                </form>
              ) : (
                <div className='vr-newsletter-home__success'>
                  🎉 You’re on the list!
                </div>
              )}
            </div>
          </section>
          {/* TOP TIPS */}
          {topTips.length > 0 && (
            <section className='vr-section vr-top-tips'>
              <div className='vr-category__header'>
                <h3 className='vr-category__title'>Top Tips & Tricks</h3>
                <Link
                  href='/tips-and-tricks'
                  className='vr-category__link'
                >
                  View all →
                </Link>
              </div>

              <div className='vr-category__grid vr-tips-grid vr-tips-grid--home'>
                {topTips.map((post) => (
                  <TipsAndTricksCard
                    key={post.id}
                    post={post}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 1. TOP RATED */}
          {topRated.length > 0 && (
            <section className='vr-section'>
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
                {topRated.map((r, i) => (
                  <Fragment key={r.id}>
                    <RecipeCard recipe={r} />
                    {isMounted && (
                      <AdSlot
                        id='101'
                        position='in-feed'
                        index={i}
                        every={6}
                      />
                    )}
                  </Fragment>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
