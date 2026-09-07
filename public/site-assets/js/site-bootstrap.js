(function () {
  function bootstrap() {
    document.getElementById('drawer')?.setAttribute('aria-hidden', 'true');
    if (typeof window.renderStatic === 'function') {
      window.renderStatic();
    }
    if (typeof window.initMainAuth === 'function') {
      window.initMainAuth().catch(error => console.error('Authentication initialization failed:', error));
    }
  }

  window.SiteApp = window.SiteApp || {};
  window.SiteApp.bootstrap = bootstrap;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
