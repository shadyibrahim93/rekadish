// components/RecipePage/ProductsWeUse.js
import React, { useEffect, useState, useMemo } from 'react';
import { getRandomEquipmentProducts } from '../../utils/getRecipeEquipment';

function buildAffiliateUrl(asin) {
  if (!asin) return '#';
  return `https://www.amazon.com/dp/${asin}?tag=valuerecipeki-20`;
}

const AMAZON_IMAGE_BASE = 'https://m.media-amazon.com/images/I/';
const FALLBACK_IMAGE = '/images/equipment-placeholder.webp'; // in /public/images/

function getAmazonImageUrl(imageUrl) {
  if (!imageUrl) return '';
  return `${AMAZON_IMAGE_BASE}${imageUrl}`;
}

export default function ProductsWeUse({
  products = [],
  recipeTitle,
  heading,
  description
}) {
  const isSidebarMode = !products || products.length === 0;

  // For sidebar mode we pick random products *after* mount (client only)
  const [sidebarProducts, setSidebarProducts] = useState([]);

  useEffect(() => {
    if (isSidebarMode) {
      const randomThree = getRandomEquipmentProducts(3);
      setSidebarProducts(randomThree);
    }
  }, [isSidebarMode]);

  const effectiveProducts = useMemo(() => {
    if (isSidebarMode) {
      return sidebarProducts;
    }
    return products;
  }, [isSidebarMode, sidebarProducts, products]);

  // On the server in sidebar mode this will be [], so SSR renders nothing.
  // On the client we set sidebarProducts in useEffect, and then it renders.
  if (!effectiveProducts.length) return null;

  const finalHeading =
    heading ||
    (recipeTitle ? 'Tools We Use for This Recipe' : 'Products We Use & Love');

  const finalDescription =
    description ||
    (recipeTitle
      ? `These tools and specialty items can make preparing ${recipeTitle} easier, more consistent, and more enjoyable.`
      : 'These are a few of our favorite kitchen tools we reach for all the time.');

  return (
    <section
      className='vr-section vr-card'
      itemScope
      itemType='https://schema.org/ItemList'
    >
      <meta
        itemProp='name'
        content={finalHeading}
      />

      <h3 className='vr-category__title'>{finalHeading}</h3>

      <p className='vr-category__description'>{finalDescription}</p>

      <div className='vr-category__grid'>
        {effectiveProducts.map((product, index) => (
          <article
            key={product.id || product.asin || index}
            className='vr-card vr-recipe-card'
            itemProp='itemListElement'
            itemScope
            itemType='https://schema.org/Product'
          >
            <meta
              itemProp='position'
              content={String(index + 1)}
            />

            {product.imageUrl && (
              <a
                href={buildAffiliateUrl(product.asin)}
                target='_blank'
                rel='nofollow sponsored noopener noreferrer'
                className='vr-recipe-card__media'
              >
                <img
                  src={getAmazonImageUrl(product.imageUrl)}
                  alt={product.label || product.title}
                  loading='lazy'
                  className='vr-products__image'
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
              </a>
            )}

            <div className='vr-equipment__body'>
              <h4
                className='vr-equipment__name'
                itemProp='name'
              >
                {product.label}
              </h4>

              {product.shortDescription && (
                <p
                  className='vr-equipment__text'
                  itemProp='description'
                >
                  {product.shortDescription}
                </p>
              )}

              {/* ✅ Hide details in sidebar mode */}
              {!isSidebarMode && product.details && (
                <ul className='vr-equipment__details'>
                  {product.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              )}

              <a
                href={buildAffiliateUrl(product.asin)}
                target='_blank'
                rel='nofollow sponsored noopener noreferrer'
                className='vr-equipment__cta vr-search__button'
                itemProp='url'
              >
                Buy Now
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
