// pages/recipes/[id].js
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import RecipePage from '../../components/RecipePage/RecipePage';
import { BRAND_NAME, BRAND_URL } from '../../lib/constants';

// ----------------------------------------
// 1. SERVER SIDE RENDER (SSR) - Replaces ISR
// ----------------------------------------
export async function getServerSideProps({ params, res }) {
  const { id } = params;

  // Manual Cache Strategy:
  // s-maxage=3600: Cache this recipe page in CDN for 1 hour
  // stale-while-revalidate=86400: Serve stale version for up to 1 day while updating
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );

  // Query logic remains exactly the same
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', id)
    .single();

  if (!recipe || error) {
    return { notFound: true };
  }

  return {
    props: { recipe }
  };
}

export default function RecipePageContainer({ recipe }) {
  const metaKeywords = Array.isArray(recipe.tags)
    ? recipe.tags.join(', ')
    : typeof recipe.tags === 'string'
    ? recipe.tags
    : '';

  const keywords =
    Array.isArray(recipe.tags) && recipe.tags.length
      ? recipe.tags
          .map((t) => String(t).replace(/-/g, ' ').trim())
          .filter(Boolean)
          .join(', ')
      : undefined;

  const nutrition = recipe.nutrition;

  const nutritionLd =
    nutrition &&
    (nutrition.calories ||
      nutrition.fat ||
      nutrition.protein ||
      nutrition.carbohydrates)
      ? {
          '@type': 'NutritionInformation',
          calories: nutrition.calories
            ? /^\d+(\.\d+)?$/.test(String(nutrition.calories).trim())
              ? `${nutrition.calories} calories`
              : String(nutrition.calories).trim()
            : undefined,
          fatContent: nutrition.fat ? String(nutrition.fat).trim() : undefined,
          proteinContent: nutrition.protein
            ? String(nutrition.protein).trim()
            : undefined,
          carbohydrateContent: nutrition.carbohydrates
            ? String(nutrition.carbohydrates).trim()
            : undefined
        }
      : undefined;

  const recipeUrl = `${BRAND_URL}/recipes/${recipe.slug}`; // adjust to your real route
  const recipeImageUrl = `${BRAND_URL}/images/recipes/${recipe.image_url}.webp`;

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Recipe',
    name: recipe.title,
    image: `${BRAND_URL}/images/recipes/${recipe.image_url}.webp`,
    author: { '@type': 'Organization', name: `${BRAND_NAME} Editorial Team` },
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      logo: { '@type': 'ImageObject', url: `${BRAND_URL}/logo.webp` }
    },
    datePublished: recipe.created_at,
    description: recipe.description,
    recipeYield: `${recipe.servings} servings`,
    recipeCuisine: recipe.cuisine,

    recipeCategory: recipe.cuisine,
    keywords,
    nutrition: nutritionLd,
    prepTime: `PT${recipe.prep_time}M`,
    cookTime: `PT${recipe.cook_time}M`,
    totalTime: `PT${recipe.total_time}M`,

    recipeIngredient: (recipe.ingredients || []).map((i) =>
      `${i.quantity || ''} ${i.ingredient}`.trim()
    ),

    recipeInstructions: (recipe.instructions || [])
      .map((step, idx) => {
        const text = typeof step === 'string' ? step : step?.text ?? '';
        const cleanText = String(text).trim();
        const stepNumber = idx + 1;
        const stepAnchor = `step-${stepNumber}`;
        if (!cleanText) return null;
        return {
          '@type': 'HowToStep',
          name: `Step ${idx + 1}`,
          text: cleanText,
          url: `${recipeUrl}#${stepAnchor}`,
          image: [recipeImageUrl]
        };
      })
      .filter(Boolean),

    ...(recipe.rating && recipe.rating_count
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: recipe.rating,
            ratingCount: recipe.rating_count
          }
        }
      : {})
  };

  return (
    <>
      <Head>
        <title>
          {recipe.title} — {BRAND_NAME}
        </title>

        {/* DESCRIPTION */}
        <meta
          name='description'
          content={recipe.description}
        />

        {/* KEYWORDS using recipe.tags */}
        {metaKeywords && (
          <meta
            name='keywords'
            content={metaKeywords}
          />
        )}

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
          href={`${BRAND_URL}/recipes/${recipe.slug}`}
        />

        {/* OPEN GRAPH */}
        <meta
          property='og:title'
          content={`${recipe.title} — ${BRAND_NAME}`}
        />
        <meta
          property='og:description'
          content={recipe.description}
        />
        <meta
          property='og:image'
          content={`${BRAND_URL}/images/recipes/${recipe.image_url}.webp`}
        />
        <meta
          property='og:url'
          content={`${BRAND_URL}/recipes/${recipe.slug}`}
        />
        <meta
          property='og:type'
          content='article'
        />
        <meta
          property='og:site_name'
          content={`${BRAND_NAME}`}
        />

        {/* TWITTER CARDS */}
        <meta
          name='twitter:card'
          content='summary_large_image'
        />
        <meta
          name='twitter:title'
          content={`${recipe.title} — ${BRAND_NAME}`}
        />
        <meta
          name='twitter:description'
          content={recipe.description}
        />
        <meta
          name='twitter:image'
          content={`${BRAND_URL}/images/recipes/${recipe.image_url}.webp`}
        />
        <meta
          name='twitter:site'
          content='@RekaDish'
        />

        {/* PINTEREST */}
        <meta
          name='pin:media'
          content={`${BRAND_URL}/images/recipes/${recipe.image_url}.webp`}
        />
        <meta
          name='pin:description'
          content={recipe.description}
        />

        {/* STRUCTURED DATA */}
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <RecipePage recipe={recipe} />
    </>
  );
}
