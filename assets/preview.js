'use strict';

// GA4 screen tracking (public screens only — excludes Studio Admin)
if (typeof window.gtag === 'function') {
  const trackPage = () => {
    const section = document.querySelector('.screen.on');
    if (!section || section.id === 'admin') return;
    window.gtag('event', 'page_view', {
      page_location: location.origin + location.pathname + '#' + section.id,
      page_title: section.id
    });
  };
  trackPage();
  window.addEventListener('hashchange', trackPage);
}
