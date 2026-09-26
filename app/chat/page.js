import LegacyRuntime from '../legacy-runtime';

const scripts = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.109.0',
  '/site-assets/app-config.js',
  '/site-assets/chat-app.js',
];

export const metadata = {
  title: 'Consultation Chat | Jyotish and Vastu Sewa Kendra',
};

export default function ChatPage() {
  return (
    <LegacyRuntime
      markupPath="/site-assets/chat-mvp.html"
      scripts={scripts}
      includeHeadStyles
    />
  );
}
