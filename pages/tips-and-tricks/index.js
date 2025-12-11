// pages/tips-and-tricks/index.js
import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useMemo, useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { BRAND_NAME, BRAND_URL } from '../../lib/constants';
import TipsSidebar from '../../components/TipsAndTricks/TipsSidebar';
import AdSlot from '../../components/AdSlot';
import TipsAndTricksCard from '../../components/TipsAndTricks/TipsAndTricksCard';
import Breadcrumb from '../../components/Breadcrumb.js';

const TAGS_PER_BATCH = 3; // Render 3 topic sections at a time

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR) - Replaces ISR
// ----------------------------------------
export async function getServerSideProps({ res }) {
  // Manual Cache Strategy:
  // s-maxage=120: Cache in CDN for 2 minutes
  // stale-while-revalidate=86400: Serve stale content for up to 1 day while updating
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=120, stale-while-revalidate=86400'
  );

  const columns = [
    'id',
    'title',
    'slug',
    'description',
    'image_url',
    'tags',
    'content',
    'toc',
    'created_at',
    'author_name',
    'author_image',
    'author_slug',
    'author_role',
    'seo_title',
    'seo_description'
  ].join(', ');

  const { data: latest } = await supabase
    .from('blogs')
    .select(columns)
    .order('created_at', { ascending: false })
    .limit(100);

  const all = latest || [];

  const tagCounts = {};
  all.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      const key = tag.trim();
      if (!key) return;
      tagCounts[key] = (tagCounts[key] || 0) + 1;
    });
  });

  // Get top 15 tags instead of just 6 to make the infinite scroll meaningful
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag]) => tag);

  const tagPosts = {};

  await Promise.all(
    topTags.map(async (tag) => {
      const { data } = await supabase
        .from('blogs')
        .select(columns)
        .contains('tags', [tag])
        .order('created_at', { ascending: false })
        .limit(6);

      tagPosts[tag] = data || [];
    })
  );

  return {
    props: {
      latest: all,
      topTags,
      tagPosts
    }
  };
}

export default function TipsAndTricksIndex({
  latest = [],
  topTags = [],
  tagPosts = {}
}) {
  // Hydration Safety
  const [isMounted, setIsMounted] = useState(false);

  // Infinite Scroll State for Tag Sections
  const [visibleCount, setVisibleCount] = useState(TAGS_PER_BATCH);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute visible tags based on scroll progress
  const visibleTags = useMemo(() => {
    return topTags.slice(0, visibleCount);
  }, [topTags, visibleCount]);

  const hasMoreTags = visibleCount < topTags.length;

  // ----------------------------------------
  // INFINITE SCROLL OBSERVER
  // ----------------------------------------
  useEffect(() => {
    if (!hasMoreTags) return;
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          // Reveal next batch of tags
          setVisibleCount((prev) => prev + TAGS_PER_BATCH);
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
  }, [hasMoreTags]);

  /* ----------------------------------------
      SEO
  ---------------------------------------- */
  const pageTitle = `${BRAND_NAME} Tips & Tricks — Cooking Guides & Kitchen Ideas`;
  const metaDescription =
    'Discover RekaDish Tips & Tricks: practical cooking advice, how-tos, and kitchen ideas to make everyday meals easier and more delicious.';

  const metaKeywords = useMemo(() => {
    const tagKeywords = topTags.join(', ');
    return `cooking tips, kitchen hacks, recipe tips, ${tagKeywords}, ${BRAND_NAME}`;
  }, [topTags]);

  const tipsSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${BRAND_NAME} Tips & Tricks`,
    url: `${BRAND_URL}/tips-and-tricks`,
    description: metaDescription,
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: BRAND_URL
    },
    blogPost: latest.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.seo_title || post.title,
      description: post.seo_description || post.description,
      url: `${BRAND_URL}/tips-and-tricks/${post.slug}`,
      datePublished: post.created_at,
      image: `${BRAND_URL}/images/tips-and-tricks/${post.image_url}.webp`,
      author: post.author_name
        ? {
            '@type': 'Person',
            name: post.author_name,
            ...(post.author_role ? { jobTitle: post.author_role } : {}),
            ...(post.author_image
              ? {
                  image: `${BRAND_URL}/images/authors/${post.author_image}.webp`
                }
              : {})
          }
        : {
            '@type': 'Organization',
            name: `${BRAND_NAME} Editorial Team`
          }
    }))
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name='description'
          content={metaDescription}
        />
        <meta
          name='keywords'
          content={metaKeywords}
        />
        <link
          rel='canonical'
          href={`${BRAND_URL}/tips-and-tricks`}
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
          content={`${BRAND_URL}/images/og-tips-and-tricks.webp`}
        />
        <meta
          property='og:url'
          content={`${BRAND_URL}/tips-and-tricks`}
        />
        <meta
          property='og:type'
          content='website'
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
          content={`${BRAND_URL}/images/og-tips-and-tricks.webp`}
        />

        {/* Structured data */}
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(tipsSchema) }}
        />
      </Head>

      <Breadcrumb />

      <div className='vr-tips vr-tips--index'>
        {/* HERO */}
        <section className='vr-hero vr-tips-hero'>
          <img
            className='vr-hero__image vr-tips-hero__image'
            src='/images/tips-and-tricks/tips-hero.webp'
            alt='Cooking tools, ingredients, and tips on a kitchen countertop'
          />
          <div className='vr-hero__overlay vr-tips-hero__overlay'>
            <span className='vr-tips-hero__eyebrow'>Tips & Tricks</span>
            <h1 className='vr-hero__title vr-tips-hero__title'>
              RekaDish Tips & Tricks
            </h1>
            <p className='vr-hero__desc vr-tips-hero__desc'>
              Deep-dive guides, smart kitchen shortcuts, and step-by-step tips
              to make everyday cooking easier, safer, and more delicious.
            </p>
            {topTags.length > 0 && (
              <div className='vr-hero__actions vr-tips-hero__tags'>
                {topTags.slice(0, 5).map((tag) => (
                  <Link
                    key={tag}
                    href={`#tag-${encodeURIComponent(tag)}`}
                    className='vr-hero__badge--light'
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* MAIN LAYOUT */}
        <div className='vr-home-layout vr-tips-layout'>
          <div className='vr-category__container'>
            {/* LATEST TIPS */}
            {latest.length > 0 && (
              <section
                className='vr-section vr-tips-section'
                aria-labelledby='latest-tips-heading'
              >
                <div className='vr-category__header vr-tips-section__header'>
                  <h2
                    id='latest-tips-heading'
                    className='vr-category__title'
                  >
                    Latest Tips & Tricks
                  </h2>
                  <p className='vr-tips-section__subtitle'>
                    New guides from our home cooks, science nerds, and flavor
                    lovers.
                  </p>
                </div>

                <div className='vr-category__grid vr-tips-grid'>
                  {latest.map((post, index) => (
                    <Fragment key={post.id}>
                      <TipsAndTricksCard post={post} />
                      {isMounted && (
                        <AdSlot
                          id='201'
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
          </div>

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
