import LegacyRuntime from './legacy-runtime';

const scripts = [
  'https://cdn.jsdelivr.net/npm/nepali-date-converter/dist/nepali-date-converter.umd.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.109.0',
  '/site-assets/app-config.js',
  '/site-assets/js/site-config.js',
  'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js',
  '/site-assets/js/site-helpers.js',
  '/site-assets/script.js',
  '/site-assets/js/vastu-upload.js',
  '/site-assets/js/daily-horoscope.js',
    '/site-assets/js/rashifal.js',
  '/site-assets/js/chat-consultation.js',
  '/site-assets/js/ask-flow.js',
  '/site-assets/js/booking-flow.js',
  '/site-assets/js/auth-module.js',
  '/site-assets/js/shop-module.js',
  '/site-assets/js/classes-module.js',
  '/site-assets/js/chat-widget.js',
  '/site-assets/js/contact-form.js',
  '/site-assets/js/kundali-engine.js?v=20260906-2',
  '/site-assets/js/kundali-form.js?v=20260906-2',
  '/site-assets/js/panchanga-muhurta.js',
  '/site-assets/js/bookings-admin.js',
  '/site-assets/js/site-bootstrap.js',
];

export default function HomePage() {
  return <LegacyRuntime markupPath="/site-assets/jyotish.html" scripts={scripts} />;
}
