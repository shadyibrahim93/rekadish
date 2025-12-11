// pages/team/[author].js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, useEffect, Fragment } from 'react'; // Added Fragment, useEffect
import { supabase } from '../../lib/supabaseClient';
import { BRAND_NAME, BRAND_URL } from '../../lib/constants';
import { AUTHORS } from '../../lib/authors';
import RecipeCard from '../../components/RecipeCard';
import TipsAndTricksCard from '../../components/TipsAndTricks/TipsAndTricksCard';
import AdSlot from '../../components/AdSlot';
import Breadcrumb from '../../components/Breadcrumb.js';
import { FiInstagram, FiTwitter, FiExternalLink } from 'react-icons/fi';

const RECIPE_SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'fastest', label: 'Fastest' }
];

const TIPS_SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'popular', label: 'Most Popular' }
];

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR) - Replaces ISR
// ----------------------------------------
export async function getServerSideProps({ params, res }) {
  // Manual Cache Strategy:
  // s-maxage=600: Cache in CDN for 10 minutes (Author profiles change infrequently)
  // stale-while-revalidate=86400: Serve stale content for up to 1 day while updating
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=600, stale-while-revalidate=86400'
  );

  const { author } = params;
  const authorMeta = AUTHORS[author];

  if (!authorMeta) {
    return { notFound: true };
  }

  // 1. Fetch this author's tips & tricks posts
  const blogColumns =
    'id, title, slug, description, image_url, tags, created_at, view_count, related_recipe_ids';

  const { data: posts = [] } = await supabase
    .from('blogs')
    .select(blogColumns)
    .eq('author_slug', author)
    .order('created_at', { ascending: false });

  // 2. Aggregate stats
  const totalViews = posts.reduce((sum, p) => sum + (p.view_count || 0), 0);

  // 3. Collect all related recipe IDs from their posts
  const recipeIdSet = new Set();
  posts.forEach((p) => {
    if (Array.isArray(p.related_recipe_ids)) {
      p.related_recipe_ids.forEach((id) => {
        if (id) recipeIdSet.add(id);
      });
    }
  });

  const recipeIds = Array.from(recipeIdSet);

  const recipeColumns =
    'id, title, slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine';

  let recipes = [];
  if (recipeIds.length > 0) {
    const { data: recipesData = [] } = await supabase
      .from('recipes')
      .select(recipeColumns)
      .in('id', recipeIds);

    recipes = recipesData;
  }

  // 4. Signature recipe (for "Signature Dish" section)
  let signatureRecipe = null;
  if (authorMeta.signatureRecipeId) {
    const { data: sigData } = await supabase
      .from('recipes')
      .select(recipeColumns)
      .eq('id', authorMeta.signatureRecipeId)
      .single();

    signatureRecipe = sigData || null;
  }

  const stats = {
    postsCount: posts.length,
    recipesCount: recipes.length,
    totalViews,
    yearsCooking: authorMeta.yearsCooking,
    recipesCreated: authorMeta.recipesCreated
  };

  return {
    props: {
      author: authorMeta,
      stats,
      posts,
      recipes,
      signatureRecipe
    }
  };
}

// --------- PAGE COMPONENT ----------
export default function AuthorProfile({
  author,
  stats,
  posts = [],
  recipes = [],
  signatureRecipe
}) {
  const [activeTab, setActiveTab] = useState('recipes'); // 'recipes' | 'tips'
  const [sort, setSort] = useState('newest');

  // Hydration Safety
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pageTitle = `${author.name} — ${author.role} | ${BRAND_NAME}`;
  const canonicalUrl = `${BRAND_URL}/team/${author.slug}`;
  const ogImage = `${BRAND_URL}/images/team/${author.avatar}.webp`;

  const metaDescription =
    author.bioShort ||
    `Learn more about ${author.name}, a ${author.role} at ${BRAND_NAME}, and explore their recipes and cooking guides.`;

  // Sorting helpers
  const sortedRecipes = useMemo(() => {
    const arr = [...recipes];

    if (sort === 'newest') {
      return arr.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    }

    if (sort === 'popular') {
      return arr.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    }

    if (sort === 'fastest') {
      return arr.sort(
        (a, b) => (a.total_time || 9999) - (b.total_time || 9999)
      );
    }

    return arr;
  }, [recipes, sort]);

  const sortedPosts = useMemo(() => {
    const arr = [...posts];

    if (sort === 'popular') {
      return arr.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }

    // Default to newest
    return arr.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
  }, [posts, sort]);

  const totalViewsFormatted =
    stats.totalViews > 1000
      ? `${(stats.totalViews / 1000).toFixed(1)}k`
      : stats.totalViews;

  const authorSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    description: author.bioShort,
    url: canonicalUrl,
    jobTitle: author.role,
    image: ogImage,
    knowsAbout: ['recipes', 'cooking', 'meal prep', 'food safety'],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    }
  };

  const firstName = author.name.split(' ')[0];

  const sortOptions =
    activeTab === 'recipes' ? RECIPE_SORT_OPTIONS : TIPS_SORT_OPTIONS;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name='description'
          content={metaDescription}
        />
        <link
          rel='canonical'
          href={canonicalUrl}
        />

        {/* OG */}
        <meta
          property='og:title'
          content={pageTitle}
        />
        <meta
          property='og:description'
          content={metaDescription}
        />
        <meta
          property='og:image'
          content={ogImage}
        />
        <meta
          property='og:url'
          content={canonicalUrl}
        />
        <meta
          property='og:type'
          content='profile'
        />

        {/* Twitter */}
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
          content={metaDescription}
        />
        <meta
          name='twitter:image'
          content={ogImage}
        />

        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(authorSchema) }}
        />
      </Head>

      <Breadcrumb />

      <div className='vr-home-layout vr-author-layout'>
        <div className='vr-category__container'>
          {/* HERO / IDENTITY */}
          <section className='vr-section vr-author-hero'>
            <div className='vr-author-hero__main'>
              <div className='vr-author-hero__avatar'>
                <Image
                  src={`/images/team/${author.avatar}.webp`}
                  alt={author.name}
                  width={120}
                  height={120}
                />
              </div>

              <div className='vr-author-hero__identity'>
                <h1 className='vr-author-hero__name'>{author.name}</h1>
                <p className='vr-author-hero__role'>{author.role}</p>
                <p className='vr-author-hero__bio'>{author.bioShort}</p>

                <div className='vr-author-hero__philosophy'>
                  <span className='vr-author-hero__pill'>
                    My kitchen philosophy
                  </span>
                  <p className='vr-author-hero__philosophy-text'>
                    {author.philosophy}
                  </p>
                </div>

                <div className='vr-author-hero__social'>
                  {author.social?.instagram && (
                    <a
                      href={author.social.instagram}
                      target='_blank'
                      rel='noreferrer'
                      aria-label={`${author.name} on Instagram`}
                    >
                      <FiInstagram />
                    </a>
                  )}
                  {author.social?.x && (
                    <a
                      href={author.social.x}
                      target='_blank'
                      rel='noreferrer'
                      aria-label={`${author.name} on X`}
                    >
                      <FiTwitter />
                    </a>
                  )}
                  {author.social?.pinterest && (
                    <a
                      href={author.social.pinterest}
                      target='_blank'
                      rel='noreferrer'
                      aria-label={`${author.name} on Pinterest`}
                    >
                      <FiExternalLink />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* STATS BAR */}
            <div className='vr-author-stats'>
              <div className='vr-author-stats__item'>
                <span className='vr-author-stats__label'>
                  Tips &amp; guides
                </span>
                <span className='vr-author-stats__value'>
                  {stats.postsCount}
                </span>
              </div>
              <div className='vr-author-stats__item'>
                <span className='vr-author-stats__label'>Total Tips views</span>
                <span className='vr-author-stats__value'>
                  {totalViewsFormatted}
                </span>
              </div>
              <div className='vr-author-stats__item'>
                <span className='vr-author-stats__label'>Years cooking</span>
                <span className='vr-author-stats__value'>
                  {stats.yearsCooking}+
                </span>
              </div>
              <div className='vr-author-stats__item'>
                <span className='vr-author-stats__label'>
                  Favorite ingredient
                </span>
                <span className='vr-author-stats__value'>
                  {author.favoriteIngredient}
                </span>
              </div>
            </div>
          </section>

          {/* WHY TRUST ME / FULL BIO */}
          <section className='vr-section vr-author-about'>
            <h2 className='vr-category__title'>Why cook with {firstName}?</h2>
            <p className='vr-author-about__text'>{author.bioFull}</p>
          </section>

          {/* SIGNATURE DISH */}
          {signatureRecipe && (
            <section className='vr-section vr-author-signature'>
              <div className='vr-author-signature__header'>
                <h2 className='vr-category__title'>
                  {firstName}&apos;s Signature Dish
                </h2>
                <p className='vr-author-signature__subtitle'>
                  This is the recipe that best captures {firstName}&apos;s style
                  in the kitchen.
                </p>
              </div>

              <div className='vr-author-signature__content'>
                <div className='vr-author-signature__copy'>
                  <p>
                    Looking for a starting point? Try{' '}
                    <strong>{signatureRecipe.title}</strong>. It pulls together
                    the flavors {firstName} reaches for most often and is a
                    great example of their approach to balancing ease and
                    flavor. You can add it straight to your meal plan, bookmark
                    it, or use it as a template to swap in your favorite
                    proteins and sides.
                  </p>
                </div>
              </div>
              <div className='vr-author-signature__card'>
                <RecipeCard recipe={signatureRecipe} />
              </div>
            </section>
          )}

          {/* CONTENT TABS + SORTING */}
          <section className='vr-section vr-author-content'>
            <div className='vr-author-content__header'>
              <div className='vr-author-tabs'>
                <button
                  type='button'
                  className={`vr-author-tab ${
                    activeTab === 'recipes' ? 'vr-author-tab--active' : ''
                  }`}
                  onClick={() => setActiveTab('recipes')}
                >
                  Recipes Featured
                </button>
                <button
                  type='button'
                  className={`vr-author-tab ${
                    activeTab === 'tips' ? 'vr-author-tab--active' : ''
                  }`}
                  onClick={() => setActiveTab('tips')}
                >
                  Tips &amp; Tricks
                </button>
              </div>

              <div className='vr-author-sort'>
                <span className='vr-author-sort__label'>Sort by</span>
                <div className='vr-author-sort__buttons'>
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type='button'
                      className={`vr-author-sort__btn ${
                        sort === opt.id ? 'vr-author-sort__btn--active' : ''
                      }`}
                      onClick={() => setSort(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RECIPES TAB */}
            {activeTab === 'recipes' && (
              <div className='vr-author-grid-wrapper'>
                {sortedRecipes.length === 0 ? (
                  <p className='vr-author-empty'>
                    {firstName} doesn&apos;t have any featured recipes yet.
                    Check back soon!
                  </p>
                ) : (
                  <div className='vr-category__grid vr-author-grid'>
                    {sortedRecipes.map((recipe, index) => (
                      <Fragment key={recipe.id}>
                        <div className='vr-author-grid__item'>
                          <RecipeCard recipe={recipe} />
                        </div>
                        {isMounted && (
                          <AdSlot
                            id='601'
                            position='in-feed'
                            index={index}
                            every={5}
                          />
                        )}
                      </Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIPS TAB */}
            {activeTab === 'tips' && (
              <div className='vr-author-grid-wrapper'>
                {sortedPosts.length === 0 ? (
                  <p className='vr-author-empty'>
                    {firstName} hasn&apos;t published any tips yet. Check back
                    soon!
                  </p>
                ) : (
                  <div className='vr-category__grid vr-author-grid'>
                    {sortedPosts.map((post) => (
                      <div
                        key={post.id}
                        className='vr-author-grid__item'
                      >
                        <TipsAndTricksCard post={post} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ENGAGEMENT: ASK + NEWSLETTER */}
          <section className='vr-section vr-author-engage'>
            <div className='vr-author-engage__card'>
              <h2 className='vr-category__title'>Ask {firstName} a question</h2>
              <p>
                Have a question about a recipe, a substitution, or a technique
                mentioned in
                {` ${firstName}'s`} guides? Send in your question and use the
                comments on each recipe to share what you cooked.
              </p>
              <Link
                href={`/tips-and-tricks`}
                className='vr-hero__badge'
              >
                Go to Tips &amp; Tricks
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
