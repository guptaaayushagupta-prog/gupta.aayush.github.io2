/*
 * Portfolio web explorer. This is a browser-like *panel*, not a browser engine.
 * Cross-origin websites can and do block iframe embedding (CSP frame-ancestors /
 * X-Frame-Options). The explicit same-tab button navigates the current tab,
 * without a popup or new tab, and the browser Back button returns to the portfolio.
 */
(() => {
  'use strict';

  const launcher = document.querySelector('[data-wb-open]');
  if (!launcher || !('HTMLDialogElement' in window) || !HTMLDialogElement.prototype.showModal) return;

  const icons = {
    globe: '<circle cx="10" cy="10" r="7.5"/><path d="M2.5 10h15M10 2.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5M10 2.5C8 4.5 7 7 7 10s1 5.5 3 7.5"/>',
    back: '<path d="M16.5 10H3.5m5-5-5 5 5 5"/>',
    next: '<path d="M3.5 10h13m-5-5 5 5-5 5"/>',
    reload: '<path d="M16 7a6.8 6.8 0 1 0 1 5.5M16 3.5V7h-3.5"/>',
    close: '<path d="M5 5l10 10m0-10L5 15"/>',
    home: '<path d="M3 9.2 10 3l7 6.2V17H3V9.2Z"/><path d="M8 17v-5h4v5"/>'
  };
  const svg = name => '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + icons[name] + '</svg>';
  const btn = (act, title, icon, disabled = false) => `<button type="button" class="wb-icon" data-wb="${act}" aria-label="${title}" title="${title}"${disabled ? ' disabled' : ''}>${svg(icon)}</button>`;

  const dialog = document.createElement('dialog');
  dialog.className = 'wb';
  dialog.setAttribute('aria-label', 'Portfolio web explorer');
  dialog.innerHTML = `
    <div class="wb-window">
      <div class="wb-toolbar">
        <span class="wb-mark">${svg('globe')} WEB EXPLORER</span>
        ${btn('back','Previous entered address','back',true)}
        ${btn('forward','Next entered address','next',true)}
        ${btn('reload','Reload embedded page','reload',true)}
        ${btn('home','Explorer home','home')}
        <form class="wb-address" autocomplete="off" role="search">
          <label for="wb-url" class="wb-sr">Search Google or enter an HTTPS website address</label>
          <input id="wb-url" type="search" placeholder="Search Google or enter a URL" maxlength="2000" spellcheck="false" autocorrect="off" autocapitalize="off" enterkeyhint="go">
          <button class="wb-go" type="submit">Go</button>
        </form>
        ${btn('close','Close web explorer','close')}
      </div>
      <div class="wb-stage">
        <div class="wb-home">
          <p class="wb-eyebrow">Part of the research portfolio</p>
          <h2>Explore the web.</h2>
          <p>Search Google or enter a web address. Sites that allow embedding can appear here without leaving the portfolio.</p>
          <div class="wb-links">
            <button type="button" data-wb-url="https://pubmed.ncbi.nlm.nih.gov/">PubMed</button>
            <button type="button" data-wb-url="https://en.wikipedia.org/">Wikipedia</button>
            <button type="button" data-wb-url="https://www.google.com/webhp?igu=1">Google</button>
          </div>
          <p class="wb-links-label">Social websites · Same-tab option available</p>
          <div class="wb-links">
            <button type="button" data-wb-url="https://www.instagram.com/">Instagram</button>
            <button type="button" data-wb-url="https://www.tiktok.com/">TikTok</button>
            <button type="button" data-wb-url="https://x.com/">X</button>
            <button type="button" data-wb-url="https://www.reddit.com/">Reddit</button>
            <button type="button" data-wb-url="https://www.youtube.com/">YouTube</button>
          </div>
        </div>
        <iframe class="wb-frame" title="Embedded website (only for websites that permit embedding)" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-forms allow-scripts allow-same-origin" hidden></iframe>
        <div class="wb-load" hidden></div>
      </div>
      <div class="wb-bottom">
        <p><strong>Page not showing?</strong> Many sites, including social media, block embedded browsers. Use the button to visit the full website in your <em>current</em> tab—no new tab opens. Then use Back to return here.</p>
        <button class="wb-direct" type="button" data-wb="direct" disabled>Open full site in this tab ↗</button>
      </div>
      <div class="wb-mini"><strong>Note:</strong> Navigation arrows track the URLs entered here, not links clicked inside external websites. Websites control whether they can appear in this panel.</div>
    </div>`;
  document.body.appendChild(dialog);

  const input = dialog.querySelector('#wb-url');
  const form = dialog.querySelector('form.wb-address');
  const home = dialog.querySelector('.wb-home');
  const frame = dialog.querySelector('.wb-frame');
  const loadMark = dialog.querySelector('.wb-load');
  const buttons = Object.fromEntries(Array.from(dialog.querySelectorAll('[data-wb]')).map(el => [el.dataset.wb, el]));
  let backstack = [];
  let index = -1;
  let lastFocus = null;
  let progressTimeout = null;

  // Explicitly reject unsafe URI schemes, insecure mixed content, and credential-bearing URLs.
  function destination(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;
    if (/^[a-z][\w+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) return null;
    if (/^(?:javascript|data|file|blob|about|mailto):/i.test(value)) return null;
    const looksLikeAddress = /^https?:\/\//i.test(value) || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d{2,5})?(?:[/?#]|$)/i.test(value);
    if (!looksLikeAddress) {
      const term = encodeURIComponent(value);
      return {name: value, inline: 'https://www.google.com/search?igu=1&q=' + term, full: 'https://www.google.com/search?q=' + term};
    }
    try {
      const parsed = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      if (parsed.username || parsed.password || !parsed.hostname) return null;
      parsed.protocol = 'https:';
      return {name: parsed.href, inline: parsed.href, full: parsed.href};
    } catch (_) { return null; }
  }

  function controls() {
    buttons.back.disabled = index <= 0;
    buttons.forward.disabled = index < 0 || index >= backstack.length - 1;
    buttons.reload.disabled = index < 0;
    buttons.direct.disabled = index < 0;
  }
  function showDestination(dest) {
    input.value = dest.name;
    home.hidden = true;
    frame.hidden = false;
    frame.src = dest.inline;
    loadMark.hidden = false;
    clearTimeout(progressTimeout);
    progressTimeout = setTimeout(() => { loadMark.hidden = true; }, 3500);
    controls();
  }
  function go(raw) {
    const item = destination(raw);
    if (!item) {
      input.setCustomValidity('Please enter a valid website or search term.');
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');
    backstack = backstack.slice(0, index + 1);
    backstack.push(item);
    index = backstack.length - 1;
    showDestination(item);
  }
  function resetHome() {
    index = -1;
    backstack = [];
    input.value = '';
    frame.removeAttribute('src');
    frame.hidden = true;
    home.hidden = false;
    loadMark.hidden = true;
    controls();
  }
  function open() {
    if (dialog.open) return;
    lastFocus = document.activeElement;
    dialog.showModal();
    document.documentElement.classList.add('wb-lock');
    input.focus();
  }
  function close() { dialog.close(); }

  launcher.addEventListener('click', open);
  launcher.hidden = false;
  launcher.setAttribute('aria-haspopup', 'dialog');
  form.addEventListener('submit', e => { e.preventDefault(); go(input.value); input.blur(); });
  input.addEventListener('input', () => input.setCustomValidity(''));
  frame.addEventListener('load', () => { loadMark.hidden = true; });
  buttons.back.addEventListener('click', () => { if (index > 0) showDestination(backstack[--index]); });
  buttons.forward.addEventListener('click', () => { if (index < backstack.length - 1) showDestination(backstack[++index]); });
  buttons.reload.addEventListener('click', () => { if (index >= 0) showDestination(backstack[index]); });
  buttons.home.addEventListener('click', resetHome);
  buttons.close.addEventListener('click', close);
  buttons.direct.addEventListener('click', () => {
    if (index >= 0) window.location.assign(backstack[index].full);
  });
  dialog.querySelectorAll('[data-wb-url]').forEach(el => el.addEventListener('click', () => go(el.dataset.wbUrl)));
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('wb-lock');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  });
})();
