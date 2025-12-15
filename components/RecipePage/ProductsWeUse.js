// components/RecipePage/ProductsWeUse.js
import React, { useEffect, useState, useMemo } from 'react';
import { getRandomEquipmentProducts } from '../../utils/getRecipeEquipment';

function buildAffiliateUrl(asin) {
  if (!asin) return '#';
  return `https://www.amazon.com/dp/${asin}?tag=valuerecipeki-20`;
}

const AMAZON_IMAGE_BASE = 'https://m.media-amazon.com/images/I/';
const FALLBACK_IMAGE = '/images/equipment-placeholder.webp';

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

  const [sidebarProducts, setSidebarProducts] = useState([]);

  useEffect(() => {
    if (isSidebarMode) {
      const randomThree = getRandomEquipmentProducts(3);
      setSidebarProducts(randomThree);
    }
  }, [isSidebarMode]);

  const effectiveProducts = useMemo(() => {
    return isSidebarMode ? sidebarProducts : products;
  }, [isSidebarMode, sidebarProducts, products]);

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
      className='vr-section vr-card vr-products-we-use'
      itemScope
      itemType='https://schema.org/ItemList'
    >
      <meta
        itemProp='name'
        content={finalHeading}
      />
      <meta
        itemProp='numberOfItems'
        content={String(effectiveProducts.length)}
      />

      <h3 className='vr-category__title'>{finalHeading}</h3>
      <p className='vr-category__description'>{finalDescription}</p>

      <div className='vr-category__grid'>
        {effectiveProducts.map((product, index) => {
          const url = buildAffiliateUrl(product.asin);

          return (
            <article
              key={product.id || product.asin || index}
              className='vr-card vr-recipe-card'
              itemProp='itemListElement'
              itemScope
              itemType='https://schema.org/ListItem'
            >
              <meta
                itemProp='position'
                content={String(index + 1)}
              />

              {/* The actual “thing” in the list (NOT Product, so no offers/reviews required) */}
              <div
                itemProp='item'
                itemScope
                itemType='https://schema.org/Thing'
                className='vr-products-we-use-items__container'
              >
                <meta
                  itemProp='name'
                  content={product.label || product.title || 'Kitchen tool'}
                />

                {product.shortDescription && (
                  <meta
                    itemProp='description'
                    content={product.shortDescription}
                  />
                )}

                {/* Provide a canonical URL for the item */}
                {product.asin && (
                  <meta
                    itemProp='url'
                    content={url}
                  />
                )}

                {product.imageUrl && (
                  <a
                    href={url}
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

                <h4 className='vr-equipment__name'>{product.label}</h4>

                {product.shortDescription && (
                  <p className='vr-equipment__text'>
                    {product.shortDescription}
                  </p>
                )}

                {!isSidebarMode && product.details && (
                  <ul className='vr-equipment__details'>
                    {product.details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                )}

                <a
                  href={url}
                  target='_blank'
                  rel='nofollow sponsored noopener noreferrer'
                  className='vr-equipment__cta vr-search__button'
                >
                  Buy Now
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
