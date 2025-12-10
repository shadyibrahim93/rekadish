// components/TipsAndTricks/TipsAndTricksCard.js
import Link from 'next/link';
import Image from 'next/image';
import { BRAND_NAME } from '../../lib/constants';

export default function TipsAndTricksCard({ post }) {
  const authorName = post.author_name || `${BRAND_NAME} Editorial Team`;
  const authorImageSrc = post.author_image
    ? `/images/team/${post.author_image}.webp`
    : null;

  const createdDate = post.created_at ? new Date(post.created_at) : null;
  const formattedDate = createdDate
    ? createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  const eyebrowTag =
    post.tags && post.tags.length > 0 ? post.tags[0].trim() : null;

  // simple reading time estimate (optional)
  const readingTime = (() => {
    if (!post.content) return null;
    const words = post.content
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `${minutes} min read`;
  })();

  return (
    <article className='vr-card vr-tips-card'>
      <Link
        href={`/tips-and-tricks/${post.slug}`}
        className='vr-tips-card__media'
        aria-hidden='true'
      >
        <Image
          src={`/images/tips-and-tricks/${post.image_url}.webp`}
          alt={post.title}
          width={480}
          height={320}
        />
      </Link>

      <div className='vr-tips-card__body'>
        {eyebrowTag && <p className='vr-tips-card__eyebrow'>#{eyebrowTag}</p>}

        <Link href={`/tips-and-tricks/${post.slug}`}>
          <h3 className='vr-tips-card__title'>{post.title}</h3>
        </Link>

        {post.description && (
          <p className='vr-tips-card__excerpt'>{post.description}</p>
        )}
        <Link href={`/team/${post.author_slug}`}>
          <div className='vr-tips-card__footer'>
            <div className='vr-tips-card__author'>
              {authorImageSrc && (
                <span className='vr-tips-card__avatar'>
                  <Image
                    src={authorImageSrc}
                    alt={authorName}
                    width={32}
                    height={32}
                  />
                </span>
              )}
              <div className='vr-tips-card__author-info'>
                <span className='vr-tips-card__author-name'>{authorName}</span>
                {formattedDate && (
                  <span className='vr-tips-card__meta-line'>
                    {formattedDate}
                  </span>
                )}
              </div>
            </div>

            <div className='vr-tips-card__meta'>
              {readingTime && (
                <span className='vr-tips-card__meta-line'>{readingTime}</span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
