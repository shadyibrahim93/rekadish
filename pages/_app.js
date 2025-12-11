import '../styles/main.scss';
import Head from 'next/head';
import Script from 'next/script'; // Import Script
import Layout from '../components/Layout';
import { MealPlannerProvider } from '../components/MealPlannerContext';
import { UserProvider } from '../components/UserContext';
import CookieBanner from '../components/CookieBanner.js';
import { ModalProvider } from '../components/ModalContext';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta
          name='viewport'
          content='width=device-width,initial-scale=1'
        />
        <meta
          name='impact-site-verification'
          value='dd3cee76-baa2-49a8-a042-5a747f4cee16'
        />
      </Head>

      {/* --- 1. Privacy & Consent (Loads First) --- */}
      {/* "beforeInteractive" injects into head and loads before hydration */}
      <Script
        src='https://cmp.gatekeeperconsent.com/min.js'
        data-cfasync='false'
        strategy='beforeInteractive'
      />
      <Script
        src='https://the.gatekeeperconsent.com/cmp.min.js'
        data-cfasync='false'
        strategy='beforeInteractive'
      />

      {/* --- 2. Google AdSense --- */}
      <Script
        src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4846660348676156'
        crossOrigin='anonymous'
        strategy='afterInteractive'
      />

      {/* --- 3. Ezoic Integration (Updated for Safety) --- */}
      <Script
        src='https://www.ezojs.com/ezoic/sa.min.js'
        strategy='afterInteractive'
      />
      <Script
        id='ezoic-init'
        strategy='afterInteractive'
      >
        {`
          window.ezstandalone = window.ezstandalone || {};
          window.ezstandalone.cmd = window.ezstandalone.cmd || [];
        `}
      </Script>

      {/* --- 4. Google Analytics --- */}
      <Script
        src='https://www.googletagmanager.com/gtag/js?id=G-3T82SZMP1T'
        strategy='afterInteractive'
      />
      <Script
        id='google-analytics'
        strategy='afterInteractive'
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-3T82SZMP1T');
        `}
      </Script>

      {/* --- App Content --- */}
      <MealPlannerProvider>
        <UserProvider>
          <ModalProvider>
            <Layout>
              <Component {...pageProps} />
              <CookieBanner />
            </Layout>
          </ModalProvider>
        </UserProvider>
      </MealPlannerProvider>
    </>
  );
}
