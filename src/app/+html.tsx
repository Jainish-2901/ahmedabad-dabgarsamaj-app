import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering and client-side web loading.
export default function Root({ children }: PropsWithChildren) {
  const pageTitle = 'અમદાવાદ ડબગર સમાજ ડિજિટલ પરિવાર પરિચય પુસ્તિકા';
  const pageDescription =
    'શ્રી અમદાવાદ ડબગર સમાજ ડિજિટલ પરિવાર પરિચય પુસ્તિકા - તમામ પરિવારો, સભ્યો, વંશાવલી અને સંબંધોને જોડતો સત્તાવાર ડિજિટલ મંચ.';
  const keywords =
    'અમદાવાદ ડબગર સમાજ, Dabgar Samaj, Ahmedabad Dabgar Samaj, Dabgar Community, Pariwar Parichay Pustika, Dabgar Directory, ડબગર પરિચય પુસ્તિકા, Jainish Dabgar';

  // Resolve absolute website URL (WhatsApp & Facebook STRICTLY require full https:// URLs for og:image)
  const rawSiteUrl =
    process.env.EXPO_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://ahmedabad-dabgarsamaj-app.vercel.app';
  const siteUrl = rawSiteUrl.replace(/\/$/, '');
  const ogImageUrl = `${siteUrl}/icon-512.png`;

  return (
    <html lang="gu">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="શ્રી અમદાવાદ ડબગર સમાજ / Jainish Dabgar" />
        <meta name="robots" content="index, follow" />
        <meta name="format-detection" content="telephone=no" />

        {/* Open Graph / Facebook / WhatsApp Sharing Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="અમદાવાદ ડબગર સમાજ ડિજિટલ પરિચય પુસ્તિકા" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {siteUrl ? <meta property="og:url" content={siteUrl} /> : null}
        
        {/* WhatsApp & Social Media Preview Image (Must have absolute HTTPS URL, dimensions & type) */}
        <meta property="og:image" content={ogImageUrl} />
        {ogImageUrl.startsWith('https://') ? (
          <meta property="og:image:secure_url" content={ogImageUrl} />
        ) : null}
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content="શ્રી અમદાવાદ ડબગર સમાજ પ્રતીક" />
        <meta property="og:locale" content="gu_IN" />

        {/* Twitter / X Sharing Cards */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="twitter:image:alt" content="અમદાવાદ ડબગર સમાજ" />

        {/* PWA & iOS Home Screen App Installation */}
        <meta name="application-name" content="ડબગર સમાજ પુસ્તિકા" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ડબગર સમાજ" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="msapplication-TileColor" content="#1d4ed8" />

        {/* Favicons, Apple Touch Icons & Web Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />

        {/* Google / SEO Rich Snippet Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'અમદાવાદ ડબગર સમાજ ડિજિટલ પરિવાર પરિચય પુસ્તિકા',
              alternateName: 'Ahmedabad Dabgar Samaj Directory',
              description: pageDescription,
              inLanguage: 'gu-IN',
            }),
          }}
        />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #f8fafc;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;
