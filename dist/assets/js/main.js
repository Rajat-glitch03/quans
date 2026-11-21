const iconMap = {
    'fa-bars-staggered': 'menu', 'fa-bars': 'menu', 'fa-xmark': 'x', 'fa-times': 'x',
    'fa-house-chimney': 'house', 'fa-house': 'house', 'fa-screwdriver-wrench': 'wrench',
    'fa-chevron-right': 'chevron-right', 'fa-chevron-down': 'chevron-down',
    'fa-arrow-right': 'arrow-right', 'fa-arrow-up': 'arrow-up', 'fa-arrow-left': 'arrow-left',
    'fa-wand-magic-sparkles': 'sparkles', 'fa-envelope': 'mail', 'fa-file-contract': 'file-text',
    'fa-linkedin-in': 'linkedin', 'fa-linkedin': 'linkedin', 'fa-rocket': 'rocket',
    'fa-envelope-open-text': 'mail-open', 'fa-clock-rotate-left': 'history',
    'fa-user-plus': 'user-plus', 'fa-circle-user': 'user-round', 'fa-eye': 'eye',
    'fa-eye-slash': 'eye-off', 'fa-circle-exclamation': 'circle-alert',
    'fa-right-from-bracket': 'log-out', 'fa-arrow-right-from-bracket': 'log-out',
    'fa-copy': 'copy', 'fa-headset': 'headset', 'fa-lightbulb': 'lightbulb',
    'fa-magnifying-glass': 'search', 'fa-search': 'search', 'fa-circle-xmark': 'circle-x',
    'fa-file-import': 'file-input', 'fa-align-left': 'align-left', 'fa-fire': 'flame',
    'fa-bullseye': 'target', 'fa-hashtag': 'hash', 'fa-image': 'image',
    'fa-compress': 'minimize-2', 'fa-briefcase': 'briefcase-business',
    'fa-face-smile': 'smile', 'fa-check': 'check', 'fa-circle-check': 'circle-check',
    'fa-gear': 'settings', 'fa-sun': 'sun', 'fa-moon': 'moon', 'fa-trash': 'trash-2',
    'fa-pen-to-square': 'square-pen', 'fa-paper-plane': 'send', 'fa-plus': 'plus',
    'fa-file-lines': 'file-text', 'fa-user': 'user-round', 'fa-cloud-arrow-up': 'cloud-upload',
    'fa-circle-stop': 'circle-stop', 'fa-thumbs-up': 'thumbs-up', 'fa-thumbs-down': 'thumbs-down',
    'fa-refresh': 'refresh-cw', 'fa-rotate': 'refresh-cw', 'fa-download': 'download',
};
function replaceLegacyIcons(root = document) {
    if (!window.lucide)
        return;
    root.querySelectorAll('i[class*="fa-"]').forEach((node) => {
        const mapped = [...node.classList].map((className) => iconMap[className]).find(Boolean);
        if (!mapped)
            return;
        const replacement = document.createElement('i');
        replacement.setAttribute('data-lucide', mapped);
        const retained = [...node.classList].filter((className) => !className.startsWith('fa-'));
        replacement.className = [...retained, 'lucide-icon'].join(' ');
        if (node.getAttribute('aria-hidden'))
            replacement.setAttribute('aria-hidden', 'true');
        const label = node.getAttribute('aria-label');
        if (label)
            replacement.setAttribute('aria-label', label);
        node.replaceWith(replacement);
    });
    try {
        window.lucide.createIcons({ icons: window.lucide.icons, attrs: { 'aria-hidden': 'true' } });
    }
    catch (error) {
        console.warn('Lucide icon hydration skipped:', error);
    }
}
function setupRevealAnimations() {
    const candidates = document.querySelectorAll('.home-proof, .tool-feature, .catalog-item, .contact-reason, .home-method, .home-contact, .resume-prompt');
    candidates.forEach((element, index) => {
        element.setAttribute('data-reveal', '');
        element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
    });
    if (!('IntersectionObserver' in window)) {
        candidates.forEach((element) => element.classList.add('is-visible'));
        return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                currentObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    candidates.forEach((element) => observer.observe(element));
}
function setupMobileNavigation() {
    const panel = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const trigger = document.getElementById('openMobileMenu');
    const close = document.getElementById('closeMobileMenu');
    if (!panel || !overlay || !trigger || !close)
        return;
    const panelInner = panel.querySelector(':scope > div:last-child');
    const open = () => {
        panel.classList.remove('opacity-0', 'pointer-events-none');
        panel.classList.add('opacity-100', 'pointer-events-auto');
        panelInner?.classList.remove('translate-x-full');
        panelInner?.classList.add('translate-x-0');
        document.body.style.overflow = 'hidden';
    };
    const shut = () => {
        panel.classList.add('opacity-0', 'pointer-events-none');
        panel.classList.remove('opacity-100', 'pointer-events-auto');
        panelInner?.classList.add('translate-x-full');
        panelInner?.classList.remove('translate-x-0');
        document.body.style.overflow = '';
    };
    trigger.addEventListener('click', open);
    close.addEventListener('click', shut);
    overlay.addEventListener('click', shut);
    panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', shut));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape')
        shut(); });
}
function setActiveNavigation() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    const map = {
        'index.html': 'nav-home', '': 'nav-home', 'tools.html': 'nav-tool',
        'contact.html': 'nav-contact', 'about.html': 'nav-about',
        'pricing.html': 'nav-price', 'explore.html': 'nav-explore',
    };
    const targetId = map[current];
    if (!targetId)
        return;
    document.getElementById(targetId)?.classList.add('active');
}
function setupCopyEmail() {
    document.querySelectorAll('[data-copy-email]').forEach((button) => {
        button.addEventListener('click', async () => {
            const value = button.dataset.copyEmail;
            if (!value)
                return;
            try {
                await navigator.clipboard.writeText(value);
                const icon = button.querySelector('[data-lucide]');
                if (icon)
                    icon.setAttribute('data-lucide', 'check');
                if (window.lucide)
                    window.lucide.createIcons({ icons: window.lucide.icons });
                button.setAttribute('aria-label', 'Email address copied');
                window.setTimeout(() => {
                    const currentIcon = button.querySelector('[data-lucide]');
                    currentIcon?.setAttribute('data-lucide', 'copy');
                    if (window.lucide)
                        window.lucide.createIcons({ icons: window.lucide.icons });
                    button.setAttribute('aria-label', 'Copy email address');
                }, 1800);
            }
            catch {
                window.location.href = `mailto:${value}`;
            }
        });
    });
}
function enhanceAuthenticationPanels() {
    const panelContent = (mode) => {
        const signup = mode === 'signup';
        const headline = signup ? 'Make room for<br><em>better work.</em>' : 'Good to have<br><em>you back.</em>';
        const description = signup
            ? 'Bring your writing, career and client workflows into one practical workspace.'
            : 'Return to your saved sessions and pick up the work you were shaping.';
        const note = signup ? 'Create your account to keep your work connected.' : 'Your saved work stays connected to your account.';
        return `<aside class="auth-story" aria-label="Quans workspace introduction">
      <div class="auth-brand"><span class="auth-brand-mark">Q</span><span>quans.</span></div>
      <div class="auth-story-copy"><span class="auth-story-kicker">HUMONOID AI WORKSPACE</span><h4>${headline}</h4><p>${description}</p>
        <div class="auth-story-diagram" aria-hidden="true">
          <div class="auth-story-node"><b>Bring your context</b><small>Ideas, experience and a clear brief.</small></div>
          <span class="auth-story-arrow">→</span>
          <div class="auth-story-node"><b>Shape the result</b><small>Review, refine and make it yours.</small></div>
        </div>
      </div><div class="auth-story-foot">${note}<br>Clear workflows. Useful output. Your judgement stays in control.</div>
    </aside>`;
    };
    [['authModal', 'signup'], ['loginModal', 'login']].forEach(([id, mode]) => {
        const modal = document.getElementById(id);
        const shell = modal?.querySelector(':scope > .relative');
        if (!modal || !shell || shell.querySelector('.auth-layout'))
            return;
        const layout = document.createElement('div');
        layout.className = 'auth-layout';
        const storyTemplate = document.createElement('template');
        storyTemplate.innerHTML = panelContent(mode).trim();
        const story = storyTemplate.content.firstElementChild;
        const content = document.createElement('div');
        content.className = 'auth-content';
        while (shell.firstChild)
            content.append(shell.firstChild);
        if (story)
            layout.append(story);
        layout.append(content);
        shell.append(layout);
    });
    if (window.lucide)
        window.lucide.createIcons({ icons: window.lucide.icons });
}
function boot() {
    replaceLegacyIcons();
    enhanceAuthenticationPanels();
    setupRevealAnimations();
    setupMobileNavigation();
    setActiveNavigation();
    setupCopyEmail();
    // Keep icons consistent when Firebase history or generation results add new UI nodes.
    const observer = new MutationObserver((records) => {
        const hasLegacyIcons = records.some((record) => [...record.addedNodes].some((node) => node instanceof Element && (node.matches('i[class*="fa-"]') || node.querySelector('i[class*="fa-"]'))));
        if (hasLegacyIcons)
            replaceLegacyIcons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot, { once: true });
else
    boot();
export {};
