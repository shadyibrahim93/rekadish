// pages/team/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { BRAND_NAME, BRAND_URL } from '../../lib/constants';
import { AUTHOR_LIST, AUTHORS } from '../../lib/authors';
import Breadcrumb from '../../components/Breadcrumb.js';

export async function getStaticProps() {
  // Aggregate basic stats from blogs for each author
  const { data: blogRows = [] } = await supabase
    .from('blogs')
    .select('id, author_slug, view_count');

  const statsByAuthor = {};

  blogRows.forEach((row) => {
    if (!row.author_slug) return;
    const key = row.author_slug;

    if (!statsByAuthor[key]) {
      statsByAuthor[key] = {
        postsCount: 0,
        totalViews: 0
      };
    }

    statsByAuthor[key].postsCount += 1;
    statsByAuthor[key].totalViews += row.view_count || 0;
  });

  return {
    props: {
      statsByAuthor
    },
    revalidate: 600 // 10 minutes
  };
}

export default function TeamIndex({ statsByAuthor = {} }) {
  const pageTitle = `${BRAND_NAME} Recipe Contributors — Meet the Creators`;
  const metaDescription =
    'Get to know the recipe developers and writers behind RekaDish. Explore their cooking styles, signature dishes, and favorite tips.';

  const authorsSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${BRAND_NAME} Team`,
    url: `${BRAND_URL}/team`,
    itemListElement: AUTHOR_LIST.map((author, index) => ({
      '@type': 'Person',
      position: index + 1,
      name: author.name,
      description: author.bioShort,
      url: `${BRAND_URL}/team/${author.slug}`
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
        <link
          rel='canonical'
          href={`${BRAND_URL}/team`}
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
          property='og:url'
          content={`${BRAND_URL}/team`}
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

        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(authorsSchema) }}
        />
      </Head>

      <Breadcrumb />

      <div className='vr-home-layout vr-authors'>
        <div className='vr-category__container'>
          {/* HERO */}
          <section className='vr-section vr-author-hero'>
            <div className='vr-author-hero__text'>
              <h1 className='vr-hero__title'>Meet the {BRAND_NAME} Team</h1>
              <p className='vr-hero__desc'>
                Get to know the cooks and writers behind the recipes and guides
                you love. Each author brings a different perspective—whether
                it&apos;s meal prep science, weeknight shortcuts, or cozy
                Mediterranean comfort food.
              </p>
            </div>
          </section>

          {/* AUTHORS GRID */}
          <section className='vr-section'>
            <div className='vr-category__grid vr-author-grid'>
              {AUTHOR_LIST.map((author) => {
                const stats = statsByAuthor[author.slug] || {
                  postsCount: 0,
                  totalViews: 0
                };

                const formattedViews =
                  stats.totalViews > 1000
                    ? `${(stats.totalViews / 1000).toFixed(1)}k`
                    : stats.totalViews;

                return (
                  <article
                    key={author.slug}
                    className='vr-card vr-author-card'
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
                            width={80}
                            height={80}
                          />
                        </div>
                        <div className='vr-author-card__identity'>
                          <h2 className='vr-author-card__name'>
                            {author.name}
                          </h2>
                          <p className='vr-author-card__role'>{author.role}</p>
                        </div>
                      </div>

                      <p className='vr-author-card__bio'>{author.bioShort}</p>

                      <div className='vr-author-card__stats'>
                        <div className='vr-author-card__stat'>
                          <span className='vr-author-card__stat-label'>
                            Tips &amp; Guides
                          </span>
                          <span className='vr-author-card__stat-value'>
                            {stats.postsCount}
                          </span>
                        </div>
                        <div className='vr-author-card__stat'>
                          <span className='vr-author-card__stat-label'>
                            Total Views
                          </span>
                          <span className='vr-author-card__stat-value'>
                            {formattedViews}
                          </span>
                        </div>
                        <div className='vr-author-card__stat'>
                          <span className='vr-author-card__stat-label'>
                            Favorite ingredient
                          </span>
                          <span className='vr-author-card__stat-value'>
                            {author.favoriteIngredient}
                          </span>
                        </div>
                      </div>

                      <div className='vr-author-card__footer'>
                        <span className='vr-author-card__cta'>
                          View profile →
                        </span>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
