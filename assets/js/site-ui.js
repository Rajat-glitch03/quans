(() => {
  'use strict';

  const setPageContext = () => {
    const path = window.location.pathname.toLowerCase();
    const page = path.endsWith('index.html') || path.endsWith('/') ? 'home'
      : path.endsWith('tool.html') ? 'tools'
      : path.endsWith('contact.html') ? 'contact'
      : path.endsWith('about.html') ? 'about'
      : path.endsWith('proposal.html') ? 'proposal'
      : path.endsWith('social.html') ? 'social'
      : path.endsWith('textrep.html') ? 'textrep'
      : path.endsWith('resume.html') ? 'resume'
      : 'legal';
    document.body.dataset.page = page;
  };

  const revealSections = () => {
    const candidates = document.querySelectorAll('.q-section, .q-tool-card, .q-step-card, .q-about-card, .q-contact-panel, .q-directory-card');
    if (!('IntersectionObserver' in window)) {
      candidates.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          activeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
    candidates.forEach((item) => {
      item.classList.add('q-reveal');
      observer.observe(item);
    });
  };

  const enhanceActiveNavigation = () => {
    const file = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('header a[href]').forEach((link) => {
      if (link.getAttribute('href') === file) {
        link.setAttribute('aria-current', 'page');
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    setPageContext();
    revealSections();
    enhanceActiveNavigation();
  });
})();
