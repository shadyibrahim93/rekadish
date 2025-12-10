// components/RecipePage/Breadcrumb.jsx
import Link from 'next/link';
import { useRouter } from 'next/router';

function toLabel(str) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumb({ recipe }) {
  const router = useRouter();

  // Remove query params, split into segments
  const path = router.asPath.split('?')[0];
  const segments = path.split('/').filter(Boolean);

  // Build breadcrumb structure dynamically
  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    return {
      segment,
      href,
      label: toLabel(segment)
    };
  });

  // Override last segment label if recipe provided
  if (recipe?.title && crumbs.length > 0) {
    crumbs[crumbs.length - 1].label = recipe.title;
  }

  return (
    <nav className='vr-breadcrumb'>
      <ul>
        {/* Home link */}
        <li>
          <Link href='/'>Home</Link>
        </li>

        {crumbs.map((c, i) => (
          <>
            <span> / </span>
            <li key={i}>
              {/* Last item -> active, not clickable */}
              {i === crumbs.length - 1 ? (
                <span className='active'>{c.label}</span>
              ) : (
                <Link href={c.href}>
                  {c.label === 'Tips And Tricks' ? 'Tips' : c.label}
                </Link>
              )}
            </li>
          </>
        ))}
      </ul>
    </nav>
  );
}
