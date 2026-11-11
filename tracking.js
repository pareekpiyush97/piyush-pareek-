/* Zrimat traffic tracking: UTM capture, GA4, WhatsApp lead source. */
(function () {
  var GA_ID = 'G-XXXXXXXXXX'; // TODO: replace with the real GA4 Measurement ID
  var KEY = 'zr_utm', TTL = 30 * 864e5;
  var P = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  };
  var q = new URLSearchParams(location.search), cur = {};
  P.forEach(function (k) { var v = q.get(k); if (v) cur[k] = v.slice(0, 100); });
  var ref = ''; try { ref = document.referrer && new URL(document.referrer).hostname; } catch (e) {}
  if (ref === location.hostname) ref = '';
  var saved = store.get();
  if (Object.keys(cur).length) {
    cur.landing = location.pathname; cur.ts = Date.now();
    saved = cur; store.set(saved); // last paid/tagged touch wins
  } else if (!saved || Date.now() - saved.ts > TTL) {
    saved = { utm_source: ref || '(direct)', utm_medium: ref ? 'referral' : '(none)', landing: location.pathname, ts: Date.now() };
    store.set(saved);
  }
  var tag = [saved.utm_source, saved.utm_medium, saved.utm_campaign].filter(Boolean).join('/');

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  if (GA_ID.indexOf('XXXX') < 0) {
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, {
      campaign_source: saved.utm_source, campaign_medium: saved.utm_medium,
      campaign_name: saved.utm_campaign, campaign_term: saved.utm_term, campaign_content: saved.utm_content
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
      try {
        var u = new URL(a.href), t = u.searchParams.get('text') || '';
        u.searchParams.set('text', (t ? t + ' ' : '') + '[src: ' + tag + ']');
        a.href = u.toString();
      } catch (e) {}
    });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.href, type = /wa\.me/.test(h) ? 'whatsapp' : /^mailto:/.test(h) ? 'email' : '';
    if (type) gtag('event', 'generate_lead', { method: type, link_text: (a.textContent || '').trim().slice(0, 60), lead_source: tag });
  });
})();
