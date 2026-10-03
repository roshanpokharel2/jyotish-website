'use client';

import { useEffect } from 'react';
import LegacyRuntime from '../legacy-runtime';
import './admin.css';

// Admin-only bundle: auth + shell + queues. Feature modules (booking, kundali,
// vastu, shop, chat widget, …) are not loaded here; renderStatic guards them.
const scripts = [
  'https://cdn.jsdelivr.net/npm/nepali-date-converter/dist/nepali-date-converter.umd.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.109.0',
  '/site-assets/app-config.js',
  '/site-assets/js/site-config.js',
  '/site-assets/js/site-helpers.js',
  '/site-assets/script.js',
  '/site-assets/js/auth-module.js',
  '/site-assets/js/admin-module.js',
  '/site-assets/js/site-bootstrap.js',
];

function legacyReady(){
  return (
    typeof window.goView === 'function' &&
    typeof window.renderStatic === 'function' &&
    typeof window.renderAdmin === 'function' &&
    typeof window.initMainAuth === 'function' &&
    window.SiteApp?.bootstrap
  );
}

export default function AdminPage() {
  useEffect(() => {
    document.body.classList.add('is-admin');
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (legacyReady()) {
        try {
          window.goView('admin');
        } catch (err) {
          console.error(err);
        }
        clearInterval(timer);
      } else if (tries > 200) clearInterval(timer);
    }, 100);
    return () => {
      clearInterval(timer);
      document.body.classList.remove('is-admin');
    };
  }, []);
  return <LegacyRuntime markupPath="/site-assets/jyotish.html" scripts={scripts} />;
}
