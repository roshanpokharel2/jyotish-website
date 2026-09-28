// Values come from .env via window.__ENV (set in app/layout.js). The literals below are
// only the fallback for serving public/ as a plain static site with no Next.js.
// Never commit real keys here -- put them in .env.
var __env = window.__ENV || {};

window.APP_CONFIG = {
  supabaseUrl: __env.supabaseUrl || 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: __env.supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY',
  defaultAstrologerId: __env.defaultAstrologerId || '00000000-0000-0000-0000-000000000000',
  astrologyEngineUrl: __env.astrologyEngineUrl || '',
  kundali: {
    ayanamsha: 'lahiri',
    houseSystem: 'whole-sign',
    dashaSystem: 'vimshottari',
    tradition: 'vedic',
    ephemeris: 'Astronomy Engine 2.1.19'
  },
};
