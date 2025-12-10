// pages/tips-and-tricks/index.js
import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { BRAND_NAME, BRAND_URL } from '../../lib/constants';
import TipsSidebar from '../../components/TipsAndTricks/TipsSidebar';
import AdSlot from '../../components/AdSlot';
import TipsAndTricksCard from '../../components/TipsAndTricks/TipsAndTricksCard';
import Breadcrumb from '../../components/Breadcrumb.js';

export async function getStaticProps() {
  const PROPS_REVALIDATE = 120; // Rebuild at most every 2 minutes

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
    .limit(30);

  const all = latest || [];

  const tagCounts = {};
  all.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      const key = tag.trim();
      if (!key) return;
      tagCounts[key] = (tagCounts[key] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
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
    },
    revalidate: PROPS_REVALIDATE
  };
}

export default function TipsAndTricksIndex({
  latest = [],
  topTags = [],
  tagPosts = {}
}) {
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
                      <AdSlot
                        id='201'
                        position='in-feed'
                        index={index}
                        every={6}
                      />
                    </Fragment>
                  ))}
                </div>
              </section>
            )}

            {/* TAG SECTIONS */}
            {topTags.length > 0 && (
              <section
                className='vr-section vr-tips-section'
                aria-labelledby='tips-tags-heading'
              >
                <div className='vr-category__header vr-tips-section__header'>
                  <h2
                    id='tips-tags-heading'
                    className='vr-category__title'
                  >
                    Explore by Topic
                  </h2>
                  <p className='vr-tips-section__subtitle'>
                    Jump into focused tips on the topics you care about most.
                  </p>
                </div>

                <div className='vr-cuisines-list vr-tips-tags'>
                  {topTags.map((tag) => (
                    <div
                      key={tag}
                      id={`tag-${encodeURIComponent(tag)}`}
                      className='vr-section vr-tips-tag-block'
                    >
                      <div className='vr-category__header vr-tips-tag-header'>
                        <h3 className='vr-category__title'>#{tag} Tips</h3>
                        <Link
                          href={`/tips-and-tricks?tag=${encodeURIComponent(
                            tag
                          )}`}
                          className='vr-category__link'
                        >
                          View all #{tag} tips →
                        </Link>
                      </div>

                      <div className='vr-category__grid vr-tips-grid'>
                        {(tagPosts[tag] || []).map((post) => (
                          <TipsAndTricksCard
                            key={post.id}
                            post={post}
                          />
                        ))}
                      </div>
                    </div>
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
