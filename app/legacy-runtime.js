'use client';

import { useEffect, useRef, useState } from 'react';

// The legacy scripts are classic scripts with top-level `const`s: once run in a document
// they cannot be run again ("Identifier 'APP' has already been declared"), and the old
// copy stays bound to the old markup. So a second mount in the same document -- Fast
// Refresh in dev, or a client-side navigation back to the page -- reloads instead.
// Kept on window so it survives this module being hot-reloaded.
function alreadyRan(key) {
  const ran = (window.__legacyRuntimeRan ||= new Set());
  if (ran.has(key)) return true;
  ran.add(key);
  return false;
}

export default function LegacyRuntime({ markupPath, scripts, includeHeadStyles = false }) {
  const mountRef = useRef(null);
  const [error, setError] = useState('');
  // Props from a server component arrive as a new array on every render; key on content.
  const scriptsKey = scripts.join(' ');

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
        if (alreadyRan(`${markupPath} ${scriptsKey}`)) {
          window.location.reload();
          return;
        }
        mountRef.current.replaceChildren(...Array.from(body.childNodes));

        for (const src of scriptsKey.split(' ')) {
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
  }, [includeHeadStyles, markupPath, scriptsKey]);

  if (error) return <main className="legacy-error">{error}</main>;
  return <div ref={mountRef} />;
}
