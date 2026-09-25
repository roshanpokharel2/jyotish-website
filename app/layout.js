import './globals.css';

export const metadata = {
  title: 'ज्योतिष तथा वास्तु सेवा केन्द्र',
  description: 'वैदिक ज्योतिष र वास्तु परामर्श सेवा केन्द्र',
};

// Browser-safe env, handed to the legacy runtime in public/site-assets/app-config.js.
// Only NEXT_PUBLIC_* values belong here -- this object is shipped to the client.
const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  astrologyEngineUrl: process.env.NEXT_PUBLIC_ASTROLOGY_ENGINE_URL || '',
  defaultAstrologerId: process.env.NEXT_PUBLIC_DEFAULT_ASTROLOGER_ID || '',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ne">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `window.__ENV=${JSON.stringify(publicEnv)};` }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
