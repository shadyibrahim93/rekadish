// components/TipsAndTricks/TipsSidebar.js
import Link from 'next/link';
import AdSlot from '../AdSlot';
import ProductsWeUse from '../RecipePage/ProductsWeUse';

export default function TipsSidebar({ toc = [], topTags = [], latest = [] }) {
  const recentTips = latest.slice(0, 5);

  return (
    <aside className='vr-sidebar vr-tips-sidebar'>
      {/* TABLE OF CONTENTS - ON THIS PAGE (only on post pages) */}
      {toc && toc.length > 0 && (
        <section className='vr-tips-sidebar__section vr-tips-sidebar__section--toc'>
          <h3 className='vr-tips-sidebar__title'>On this page</h3>
          <ul className='vr-tips-sidebar__list vr-tips-toc'>
            {toc.map((item) => (
              <li
                key={item.id}
                className={`vr-tips-toc__item ${
                  item.level === 3 ? 'vr-tips-toc__item--level-3' : ''
                }`}
              >
                <a
                  href={`#${item.id}`}
                  className='vr-tips-toc__link'
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Popular tags */}
      {topTags.length > 0 && (
        <section className='vr-tips-sidebar__section'>
          <h3 className='vr-tips-sidebar__title'>Popular Tags</h3>
          <ul className='vr-tips-sidebar__list vr-tips-tags-list'>
            {topTags.map((tag) => (
              <li
                key={tag}
                className='vr-tips-tags-list__item'
              >
                <Link
                  href={`/tips-and-tricks?tag=${encodeURIComponent(tag)}`}
                  className='vr-tips-tag-pill'
                >
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent tips list */}
      {recentTips.length > 0 && (
        <section className='vr-tips-sidebar__section'>
          <h3 className='vr-tips-sidebar__title'>Recent Tips</h3>
          <ul className='vr-tips-sidebar__list vr-tips-recent-list'>
            {recentTips.map((post) => (
              <li
                key={post.id}
                className='vr-tips-recent-list__item'
              >
                <Link
                  href={`/tips-and-tricks/${post.slug}`}
                  className='vr-tips-recent-list__link'
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Products we love – kept as-is but wrapped for spacing */}
      <section className='vr-tips-sidebar__section vr-tips-sidebar__section--products'>
        <ProductsWeUse />
      </section>

      {/* Sidebar ad */}
      <AdSlot
        id='301'
        position='sidebar'
        placement='sticky'
        height='auto'
        className='vr-card vr-tips-sidebar__ad'
      />
    </aside>
  );
}
