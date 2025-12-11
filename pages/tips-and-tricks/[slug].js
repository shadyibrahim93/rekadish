// pages/tips-and-tricks/[slug].js
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Fragment, useEffect, useState } from 'react';
import { IoShareOutline } from 'react-icons/io5';
import { supabase } from '../../lib/supabaseClient';
import { BRAND_NAME, BRAND_URL } from '../../lib/constants';
import TipsAndTricksCard from '../../components/TipsAndTricks/TipsAndTricksCard';
import AdSlot from '../../components/AdSlot';
import RecipeCard from '../../components/RecipeCard';
import { useUser } from '../../components/UserContext';
import TipsSidebar from '../../components/TipsAndTricks/TipsSidebar';
import Breadcrumb from '../../components/Breadcrumb.js';

// Dynamic import for comments to reduce initial bundle size
const PostComments = dynamic(
  () => import('../../components/TipsAndTricks/PostComments'),
  {
    loading: () => <p>Loading comments...</p>,
    ssr: false
  }
);

// ❌ REMOVED: getStaticPaths (Not allowed with getServerSideProps)

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR) - Replaces ISR
// ----------------------------------------
export async function getServerSideProps({ params, res }) {
  const { slug } = params;

  // Manual Cache Strategy:
  // s-maxage=120: Cache in CDN for 2 minutes
  // stale-while-revalidate=86400: Serve stale content for up to 1 day while updating
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=120, stale-while-revalidate=86400'
  );

  const baseColumns = [
    'id',
    'title',
    'slug',
    'description',
    'image_url',
    'tags',
    'author_name',
    'author_slug',
    'author_image',
    'author_role',
    'created_at',
    'status',
    'view_count',
    'like_count',
    'is_featured'
  ].join(', ');

  const fullPostColumns = `${baseColumns}, content, toc, seo_title, seo_description, related_recipe_ids`;

  // 1. Fetch main post
  const { data: post, error } = await supabase
    .from('blogs')
    .select(fullPostColumns)
    .eq('slug', slug)
    .single();

  if (error || !post) {
    return { notFound: true };
  }

  // Pre-format Date on Server to prevent Hydration Mismatch
  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  // OPTIMIZATION: Prepare all auxiliary promises to run in PARALLEL
  const promises = [];

  // 2. Fetch Latest
  promises.push(
    supabase
      .from('blogs')
      .select(baseColumns)
      .order('created_at', { ascending: false })
      .limit(12)
  );

  // 3. Fetch Related by Tag
  if (post.tags && post.tags.length > 0) {
    const primaryTag = post.tags[0];
    promises.push(
      supabase
        .from('blogs')
        .select(baseColumns)
        .contains('tags', [primaryTag])
        .neq('id', post.id)
        .order('created_at', { ascending: false })
        .limit(4)
    );
  } else {
    promises.push(Promise.resolve({ data: [] }));
  }

  // 4. Fetch Author Posts
  if (post.author_name) {
    promises.push(
      supabase
        .from('blogs')
        .select(baseColumns)
        .eq('author_name', post.author_name)
        .neq('id', post.id)
        .order('created_at', { ascending: false })
        .limit(4)
    );
  } else {
    promises.push(Promise.resolve({ data: [] }));
  }

  // 5. Fetch Related Recipes
  const rawIds = post.related_recipe_ids;
  let recipeIds = [];

  if (Array.isArray(rawIds)) {
    recipeIds = rawIds.filter(Boolean);
  } else if (typeof rawIds === 'string' && rawIds.trim()) {
    try {
      const parsed = JSON.parse(rawIds);
      recipeIds = Array.isArray(parsed)
        ? parsed.filter(Boolean)
        : rawIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    } catch {
      recipeIds = rawIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  if (recipeIds.length > 0) {
    const recipeColumns =
      'id, title, description slug, image_url, rating, rating_count, total_time, cook_time, difficulty, serving_time, cuisine';
    promises.push(
      supabase.from('recipes').select(recipeColumns).in('id', recipeIds)
    );
  } else {
    promises.push(Promise.resolve({ data: [] }));
  }

  // Await all DB requests simultaneously
  const [latestRes, relatedRes, authorRes, recipesRes] = await Promise.all(
    promises
  );

  const latest = latestRes.data || [];
  const related = relatedRes.data || [];
  const authorPosts = authorRes.data || [];
  const recipesData = recipesRes.data || [];

  // Process Tags
  const tagCounts = {};
  latest.forEach((p) => {
    (p.tags || []).forEach((tag) => {
      const key = tag.trim();
      if (!key) return;
      tagCounts[key] = (tagCounts[key] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag]) => tag);

  // Re-order recipes to match the specific order in recipeIds
  let relatedRecipes = [];
  if (recipesData.length > 0) {
    const byId = new Map(recipesData.map((r) => [r.id, r]));
    relatedRecipes = recipeIds.map((id) => byId.get(id)).filter(Boolean);
  }

  return {
    props: {
      post,
      latest,
      topTags,
      related,
      authorPosts,
      relatedRecipes,
      formattedDate // Pass server-formatted date
    }
  };
}

// --------- PAGE COMPONENT ----------
export default function TipsAndTricksPost({
  post,
  latest = [],
  topTags = [],
  related = [],
  authorPosts = [],
  relatedRecipes = [],
  formattedDate // Recieve server date
}) {
  const { user } = useUser();
  const TRACK_VIEWS_ON_LOCAL = false;

  // Hydration Safety
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const incrementViewCount = async () => {
      if (typeof window === 'undefined') return;
      if (!post?.id) return;

      const hostname = window.location.hostname;
      const isLocalhost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]';

      if (isLocalhost && !TRACK_VIEWS_ON_LOCAL) return;

      try {
        // Fire and forget
        supabase
          .from('blogs')
          .update({ view_count: (post.view_count || 0) + 1 })
          .eq('id', post.id)
          .then(() => {});
      } catch (err) {
        console.error('Failed to track blog view', err);
      }
    };

    incrementViewCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  // SHARE HANDLER
  const handleShareTip = async () => {
    if (typeof window === 'undefined') return;

    const url = window.location.href;
    const title = post.title;
    const text = `Check out this tip on ${BRAND_NAME}: ${title}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert('Link copied to your clipboard.');
      } else {
        alert(url);
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const readingTimeMinutes = (() => {
    if (!post.content) return null;
    const words = post.content
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `${minutes} min read`;
  })();

  const pageTitle =
    post.seo_title || `${post.title} — ${BRAND_NAME} Tips & Tricks`;
  const canonicalUrl = `${BRAND_URL}/tips-and-tricks/${post.slug}`;
  const ogImage = `${BRAND_URL}/images/tips-and-tricks/${post.image_url}.webp`;

  const metaDescription =
    post.seo_description ||
    post.description ||
    'Practical cooking tip from the RekaDish Tips & Tricks collection.';

  const authorName = post.author_name || `${BRAND_NAME} Editorial Team`;
  const authorFirstName = authorName.split(' ')[0];
  const eyebrowTag =
    post.tags && post.tags.length > 0 ? post.tags[0].trim() : null;

  const tipsPostSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: pageTitle,
    description: metaDescription,
    image: ogImage,
    url: canonicalUrl,
    datePublished: post.created_at,
    author: {
      '@type': 'Person',
      name: authorName,
      ...(post.author_role ? { jobTitle: post.author_role } : {}),
      ...(post.author_image
        ? {
            image: `${BRAND_URL}/images/team/${post.author_image}.webp`
          }
        : {})
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: BRAND_URL
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    }
  };

  // Normalize TOC
  let tocArray = [];
  if (Array.isArray(post.toc)) {
    tocArray = post.toc;
  } else if (typeof post.toc === 'string') {
    try {
      const parsed = JSON.parse(post.toc);
      if (Array.isArray(parsed)) tocArray = parsed;
    } catch {
      tocArray = [];
    }
  }

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

        {/* Open Graph */}
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
          content='article'
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(tipsPostSchema) }}
        />
      </Head>

      <Breadcrumb />

      <div className='vr-tips vr-tips--post'>
        <header className='vr-tips-post__header'>
          <div className='vr-tips-post__hero'>
            <img
              className='vr-tips-post__hero-image'
              src={`/images/tips-and-tricks/${post.image_url}.webp`}
              alt={post.title}
              loading='lazy'
            />

            <div className='vr-tips-post__hero-overlay'>
              <div className='vr-tips-post__hero-top'>
                {eyebrowTag && (
                  <span className='vr-tips-post__eyebrow'>#{eyebrowTag}</span>
                )}
                <h1 className='vr-tips-post__hero-title'>{post.title}</h1>
              </div>

              <div className='vr-tips-post__hero-bottom'>
                <Link href={`/team/${post.author_slug}`}>
                  <div className='vr-tips-post__meta'>
                    {post.author_image && (
                      <span className='vr-tips-post__author-avatar'>
                        <Image
                          src={`/images/team/${post.author_image}.webp`}
                          alt={authorName}
                          width={48}
                          height={48}
                        />
                      </span>
                    )}

                    <div className='vr-tips-post__meta-text'>
                      <div className='vr-tips-post__author-line'>
                        <span className='vr-tips-post__author-name'>
                          {authorName}
                        </span>
                        {post.author_role && (
                          <span className='vr-tips-post__author-role'>
                            {' '}
                            · {post.author_role}
                          </span>
                        )}
                      </div>
                      <div className='vr-tips-post__meta-line'>
                        {/* Use server-formatted date to prevent hydration error */}
                        {formattedDate && <span>{formattedDate}</span>}
                        {readingTimeMinutes && (
                          <>
                            {formattedDate && (
                              <span className='vr-tips-post__meta-separator'>
                                {' '}
                                ·{' '}
                              </span>
                            )}
                            <span>{readingTimeMinutes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className='vr-tips-post__hero-actions'>
                  <button
                    type='button'
                    className='vr-hero__icon-btn'
                    onClick={handleShareTip}
                    aria-label='Share this tip'
                  >
                    <IoShareOutline />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {isMounted && (
          <AdSlot
            id='401'
            position='in-article'
            height='auto'
          />
        )}

        <div className='vr-home-layout vr-tips-layout'>
          {/* MAIN COLUMN */}
          <article className='vr-category__container vr-tips-post'>
            {/* INLINE TOC */}
            {tocArray.length > 0 && (
              <section
                className='vr-section vr-tips-post__toc'
                aria-label='Table of contents'
              >
                <div className='vr-tips-post__toc-inner'>
                  <h2 className='vr-tips-post__toc-title'>In this guide</h2>
                  <p className='vr-tips-post__toc-intro'>
                    Jump straight to the part you need—whether it&apos;s safety
                    basics, storage timelines, or freezing tips.
                  </p>
                  <ul className='vr-tips-post__toc-list'>
                    {tocArray.map((item) => {
                      const isChild = item.level && item.level > 2;
                      return (
                        <li
                          key={item.id}
                          className={
                            isChild
                              ? 'vr-tips-post__toc-item vr-tips-post__toc-item--child'
                              : 'vr-tips-post__toc-item'
                          }
                        >
                          <a href={`#${item.id}`}>{item.label}</a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            )}

            {/* Article body */}
            <section className='vr-section vr-tips-post__body'>
              <div
                className='vr-article__content'
                dangerouslySetInnerHTML={{ __html: post.content || '' }}
              />
            </section>

            {/* Related recipes */}
            {relatedRecipes && relatedRecipes.length > 0 && (
              <section
                className='vr-section vr-tips-section'
                aria-labelledby='tips-related-recipes-heading'
              >
                <div className='vr-category__header vr-tips-section__header'>
                  <h2
                    id='tips-related-recipes-heading'
                    className='vr-category__title'
                  >
                    Recipes Featured in This Guide
                  </h2>
                  <p className='vr-tips-section__subtitle'>
                    Turn this guide into real meals with recipes that store and
                    reheat especially well.
                  </p>
                </div>

                <div className='vr-category__grid vr-tips-grid'>
                  {relatedRecipes.map((recipe, index) => (
                    <Fragment key={recipe.id}>
                      <RecipeCard
                        recipe={recipe}
                        hideTime
                      />
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

            {/* Author's Other Tips */}
            {authorPosts && authorPosts.length > 0 && (
              <section className='vr-section vr-tips-section'>
                <div className='vr-category__header vr-tips-section__header'>
                  <h2 className='vr-category__title'>
                    More From {authorFirstName}&apos;s Kitchen
                  </h2>
                </div>
                <div className='vr-category__grid vr-tips-grid'>
                  {authorPosts.map((authPost) => (
                    <TipsAndTricksCard
                      key={authPost.id}
                      post={authPost}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Related tips */}
            {related && related.length > 0 && (
              <section className='vr-section vr-tips-section'>
                <div className='vr-category__header vr-tips-section__header'>
                  <h2 className='vr-category__title'>
                    More Tips You Might Like
                  </h2>
                </div>
                <div className='vr-category__grid vr-tips-grid'>
                  {related.map((rel) => (
                    <TipsAndTricksCard
                      key={rel.id}
                      post={rel}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* COMMENTS */}
            <section className='vr-section vr-tips-section'>
              <PostComments
                postId={post.id}
                user={user}
              />
            </section>
          </article>

          {/* SIDEBAR */}
          <TipsSidebar
            topTags={topTags}
            latest={latest}
          />
        </div>
      </div>
    </>
  );
}
