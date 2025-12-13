// pages/about.js
import Head from 'next/head';
import Link from 'next/link';
import { useModal } from '../components/ModalContext';
import { BRAND_NAME, BRAND_URL } from '../lib/constants';

export default function AboutPage() {
  const { setShowIngredientsModal } = useModal();

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_URL,
    url: BRAND_URL,
    logo: `${BRAND_URL}/images/logo/brand_logo.webp`,
    sameAs: [
      `https://www.facebook.com/${BRAND_URL}`,
      `https://www.instagram.com/${BRAND_URL}`,
      `https://www.pinterest.com/${BRAND_URL}`
    ]
  };

  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${BRAND_NAME}`,
    url: `${BRAND_URL}/about`,
    description: `Learn about ${BRAND_NAME}, our mission, our vision, and why we believe cooking should be simple, affordable, and fun for everyone.`
  };

  return (
    <>
      <Head>
        <title>About Us — {BRAND_NAME}</title>
        <meta
          name='description'
          content={`Learn about ${BRAND_NAME}, our mission, story, and why we believe cooking should be simple, affordable, and fun for everyone.`}
        />
        <meta
          name='keywords'
          content={`about ${BRAND_NAME}, cooking website story, recipe platform, food mission, home cooking help`}
        />

        <link
          rel='canonical'
          href={`${BRAND_URL}/about`}
        />

        {/* OG */}
        <meta
          property='og:title'
          content={`About Us — ${BRAND_NAME}`}
        />
        <meta
          property='og:description'
          content={`Discover the story and mission behind ${BRAND_NAME} — a platform built to make cooking simple, affordable, and inspiring.`}
        />
        <meta
          property='og:image'
          content={`${BRAND_URL}/images/og-about.webp`}
        />
        <meta
          property='og:url'
          content={`${BRAND_URL}/about`}
        />

        {/* Twitter */}
        <meta
          name='twitter:card'
          content='summary_large_image'
        />
        <meta
          name='twitter:title'
          content={`About Us — ${BRAND_NAME}`}
        />
        <meta
          name='twitter:description'
          content={`Discover the story and mission behind ${BRAND_NAME} — a platform built to make cooking simple, affordable, and inspiring.`}
        />
        <meta
          name='twitter:image'
          content={`${BRAND_URL}/images/og-about.webp`}
        />

        {/* Schema */}
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
        />
      </Head>

      <div className='vr-about-page'>
        <section className='vr-about-hero'>
          <h1>About {BRAND_NAME}</h1>
          <p>
            Where simple cooking meets smart technology — built to help you make
            the most of every ingredient.
          </p>
        </section>

        <section className='vr-about-section vr-card'>
          <h3>Our Story</h3>
          <p>
            {BRAND_NAME} began with a simple idea: great food shouldn’t require
            expensive ingredients, complicated techniques, or hours in the
            kitchen. As a developer who loved experimenting in the kitchen, I
            often found myself overwhelmed by recipe websites full of clutter,
            ads, or unclear steps.
          </p>
          <p>
            I wanted something better — clean, efficient, and built around the
            things home cooks actually need. So {BRAND_NAME} was created with a
            mission to blend smart technology with practical cooking guidance,
            helping millions cook confidently at home.
          </p>
        </section>

        <section className='vr-about-section vr-card'>
          <h3>Our Vision</h3>
          <p>
            We’re building a platform that makes cooking approachable, fun, and
            surprisingly simple — no matter your skill level. Our vision is to
            help people cook more at home, save money, reduce food waste, and
            feel inspired every single day.
          </p>
        </section>

        <section className='vr-about-section vr-card'>
          <h3>Why the Name "{BRAND_NAME}"?</h3>
          <p>
            <b>{BRAND_NAME}</b> is a unique name that blends the English word
            "Dish" with the Māori word <b>"Reka," </b>
            <b></b>
            <b>meaning</b>
            <b>"tasty,"</b>
            <b>"sweet,"</b> or <b>"pleasant."</b>
          </p>
          <p>
            We chose <b>{BRAND_NAME}</b> because it succinctly captures our
            mission: providing a delightful, high-quality cooking experience
            (Reka) for every meal (Dish). It signifies that our recipes are
            vetted for maximum flavor and pleasure, making every dish a
            guaranteed success.
          </p>
        </section>

        <section className='vr-about-section vr-card'>
          <h3>Our Mission</h3>
          <ul>
            <li>✔ Make cooking simple, joyful, and accessible.</li>
            <li>✔ Deliver clear, step-by-step instructions.</li>
            <li>✔ Help home cooks save time and money.</li>
            <li>✔ Showcase recipes anyone can follow.</li>
            <li>✔ Build smart tools that help people cook better.</li>
          </ul>
        </section>

        <section className='vr-about-section vr-card'>
          <h3>Where We’re Going</h3>
          <p>
            {BRAND_NAME} is evolving into a complete cooking companion —
            offering personalized suggestions, meal planners,
            ingredient-matching recipes, and more. We're continuously improving,
            shaped by real user feedback and real cooking needs.
          </p>
        </section>

        <section className='vr-about-footer'>
          <p>
            Thank you for being part of {BRAND_NAME}. We're honored to help you
            cook something amazing today.
          </p>

          <div className='vr-about-footer__actions'>
            <Link
              href='/recipes'
              className='vr-about-btn'
            >
              Explore Recipes →
            </Link>

            <button
              className='vr-about-btn vr-about-btn--secondary'
              onClick={() => setShowIngredientsModal(true)}
            >
              Create From Ingredients →
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
