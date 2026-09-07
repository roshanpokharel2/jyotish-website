'use client';

import { useEffect, useRef, useState } from 'react';

export default function LegacyRuntime({ markupPath, scripts, includeHeadStyles = false }) {
  const mountRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const injectedStyles = [];
    const injectedScripts = [];

    async function mountRuntime() {
      try {
        const response = await fetch(markupPath);
        if (!response.ok) throw new Error(`Unable to load page (${response.status})`);
        const markup = await response.text();
        const parsed = new DOMParser().parseFromString(markup, 'text/html');
        const body = parsed.body;

        body.querySelectorAll('script').forEach((script) => script.remove());
        if (includeHeadStyles) {
          parsed.head.querySelectorAll('style').forEach((style) => {
            const injected = document.createElement('style');
            injected.textContent = style.textContent;
            document.head.appendChild(injected);
            injectedStyles.push(injected);
          });
        }

        if (cancelled || !mountRef.current) return;
        mountRef.current.replaceChildren(...Array.from(body.childNodes));

        for (const src of scripts) {
          const script = document.createElement('script');
          script.src = src;
          script.async = false;
          document.body.appendChild(script);
          injectedScripts.push(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
          });
        }
      } catch (mountError) {
        console.error(mountError);
        if (!cancelled) setError('The site could not be loaded. Check the browser console for details.');
      }
    }

    mountRuntime();
    return () => {
      cancelled = true;
      injectedScripts.forEach((script) => script.remove());
      injectedStyles.forEach((style) => style.remove());
    };
  }, [includeHeadStyles, markupPath, scripts]);

  if (error) return <main className="legacy-error">{error}</main>;
  return <div ref={mountRef} />;
}
