(function (w, d) {
  'use strict';
  if (w.LCTracking) return;
  var GA = 'G-YLJL7PN7V3', PIXEL = '1565202944499059';
  var live = /^(www\.)?lc-creation\.be$/.test(location.hostname);
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICKS = ['gclid', 'gbraid', 'wbraid', 'fbclid'];
  var key = 'lc_tracking_session_v1', consentKey = 'lc_tracking_consent_v1';
  var gaReady = false, metaReady = false, sent = {}, pageSent = {}, panel;
  var debug = new URLSearchParams(location.search).get('lc_debug') === '1';
  function get(store, name) { try { return JSON.parse(store.getItem(name) || 'null'); } catch (_) { return null; } }
  function put(store, name, value) { try { store.setItem(name, JSON.stringify(value)); } catch (_) {} }
  function remove(store, name) { try { store.removeItem(name); } catch (_) {} }
  function localGet(name) { try { return get(w.localStorage, name); } catch (_) { return null; } }
  function sessionGet(name) { try { return get(w.sessionStorage, name); } catch (_) { return null; } }
  function saveConsent() { try { put(w.localStorage, consentKey, consent); } catch (_) {} }
  function uuid() { return 'lc-' + (w.crypto && w.crypto.randomUUID ? w.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })); }
  var consent = localGet(consentKey);
  if (!consent || consent.version !== 1 || Date.now() - consent.at > 15552000000) consent = { version: 1, analytics: false, marketing: false, chosen: false, at: Date.now() };
  var state = sessionGet(key);
  if (!state || Date.now() - state.at > 1800000) state = { at: Date.now(), attribution: {}, offer: 'general_pool', attempt: null };
  if (!consent.analytics) UTM.forEach(function (k) { delete state.attribution[k]; });
  if (!consent.marketing) CLICKS.forEach(function (k) { delete state.attribution[k]; });
  function save() {
    state.at = Date.now();
    try { if (consent.analytics || consent.marketing) put(w.sessionStorage, key, state); else remove(w.sessionStorage, key); } catch (_) {}
  }
  function cleanValue(k, v) {
    if (typeof v !== 'string') return '';
    if (UTM.indexOf(k) >= 0) return /^[\p{L}0-9_. -]{1,100}$/u.test(v) && !/^\+?[\d .-]{7,20}$/.test(v) ? v : '';
    return /^[a-zA-Z0-9_.-]{1,500}$/.test(v) ? v : '';
  }
  var incoming = {}, search = new URLSearchParams(location.search);
  UTM.concat(CLICKS).forEach(function (k) { var v = cleanValue(k, search.get(k)); if (v) incoming[k] = v; });
  // Remove unknown query values before any third-party tag can read the page URL.
  // Preserve the existing offer selection parameter used by the contact page.
  var cleanSearch = new URLSearchParams();
  Object.keys(incoming).forEach(function (k) { cleanSearch.set(k, incoming[k]); });
  if (search.get('projet') === 'offre-6x3') cleanSearch.set('projet', 'offre-6x3');
  if (debug) cleanSearch.set('lc_debug', '1');
  var cleaned = location.pathname + (cleanSearch.toString() ? '?' + cleanSearch.toString() : '') + (/^#[a-zA-Z0-9_-]+$/.test(location.hash) ? location.hash : '');
  try { if (cleaned !== location.pathname + location.search + location.hash) history.replaceState(null, '', cleaned); } catch (_) {}
  function capture() {
    if (Object.keys(incoming).length) {
      // One touch at a time; never combine an old campaign with a new click.
      state.attribution = {};
      UTM.forEach(function (k) { if (consent.analytics && incoming[k]) state.attribution[k] = incoming[k]; });
      CLICKS.forEach(function (k) { if (consent.marketing && incoming[k]) state.attribution[k] = incoming[k]; });
    }
    save();
  }
  function pageOffer() {
    if (/configurateur-projet\.html/.test(location.pathname)) return location.hash === '#lc-6-3' ? 'LC_6_3' : location.hash === '#beton' ? 'concrete' : null;
    if (/piscine-bois-25900/.test(location.pathname)) return 'LC_6_3';
    if (location.hash === '#piscine-beton' || location.hash === '#beton') return 'concrete';
    if (/piscines\.html|piscine-bali|piscine-urbaine/.test(location.pathname) || location.pathname === '/' || /index\.html$/.test(location.pathname)) return 'general_pool';
    return null;
  }
  var offer = pageOffer();
  if (offer) state.offer = offer;
  capture();
  function audit(platform, name, params, eventId) {
    var record = { platform: platform, name: name, parameters: params, event_id: eventId || '', transport: live ? 'queued' : 'local_test' };
    if (debug || !live) { d.dispatchEvent(new CustomEvent('lc:tracking-dispatch', { detail: record })); if (debug) console.info('[LC tracking]', JSON.stringify(record)); }
  }
  function google(command) {
    if (live) w.gtag.apply(w, command);
    if (command[0] === 'event') audit('ga4', command[1], command[2], command[2].event_id);
  }
  function metaEvent(method, name, params, id) {
    if (live) w.fbq(method, PIXEL, name, params, { eventID: id });
    audit('meta', name, params, id);
  }
  function addScript(src) { var s = d.createElement('script'); s.async = true; s.src = src; d.head.appendChild(s); }
  function safeReferrer() { try { var u = new URL(d.referrer); return u.origin + u.pathname; } catch (_) { return ''; } }
  function gaParameters(params) {
    var measuredUrl = new URL(location.origin + location.pathname);
    UTM.forEach(function (k) { if (consent.analytics && incoming[k]) measuredUrl.searchParams.set(k, incoming[k]); });
    ['gclid', 'gbraid', 'wbraid'].forEach(function (k) { if (consent.marketing && incoming[k]) measuredUrl.searchParams.set(k, incoming[k]); });
    var p = Object.assign({}, params, { send_to: GA, page_location: measuredUrl.href, page_referrer: safeReferrer() });
    var map = { utm_source: 'campaign_source', utm_medium: 'campaign_medium', utm_campaign: 'campaign_name', utm_content: 'campaign_content', utm_term: 'campaign_term' };
    Object.keys(map).forEach(function (k) { if (state.attribution[k]) p[map[k]] = state.attribution[k]; });
    if (debug) p.debug_mode = true;
    return p;
  }
  function initTags() {
    // Also stop enhanced-measurement traffic after an explicit withdrawal.
    w['ga-disable-' + GA] = !consent.analytics;
    if (live && !w.gtag) { w.dataLayer = w.dataLayer || []; w.gtag = function () { w.dataLayer.push(arguments); }; }
    if (live && !gaReady) w.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    if (live) w.gtag('consent', 'update', { analytics_storage: consent.analytics ? 'granted' : 'denied', ad_storage: consent.marketing ? 'granted' : 'denied', ad_user_data: consent.marketing ? 'granted' : 'denied', ad_personalization: consent.marketing ? 'granted' : 'denied' });
    if (consent.analytics && !gaReady) {
      gaReady = true;
      if (live) {
        w.gtag('js', new Date());
        w.gtag('config', GA, Object.assign(gaParameters({}), { send_page_view: false, allow_google_signals: consent.marketing, allow_ad_personalization_signals: consent.marketing }));
        addScript('https://www.googletagmanager.com/gtag/js?id=' + GA);
      }
    }
    if (consent.marketing && !metaReady) {
      metaReady = true;
      if (live) {
        if (!w.fbq) { var n = w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; w._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []; }
        // Prevent automatic form/button event capture and automatic matching.
        w.fbq('set', 'autoConfig', false, PIXEL);
        w.fbq('init', PIXEL);
        addScript('https://connect.facebook.net/en_US/fbevents.js');
      }
    }
    if (live && metaReady) w.fbq('consent', consent.marketing ? 'grant' : 'revoke');
    if (live && gaReady) {
      w.gtag('set', 'allow_google_signals', consent.marketing);
      w.gtag('set', 'allow_ad_personalization_signals', consent.marketing);
    }
  }
  function params() {
    function val(id) { var e = d.getElementById(id); return e ? e.value : ''; }
    var size = d.querySelector('input[name="taille"]:checked');
    var timing = val('project-timing') || val('config-delai');
    var projectOffer = val('project-offer'), budget = Number(val('project-budget'));
    var projectBand = budget > 0 ? budget >= 40000 ? '40k_plus' : budget >= 30000 ? '30_40k' : budget >= 20000 ? '20_30k' : budget >= 15000 ? '15_20k' : 'under_15k' : 'unknown';
    return { form_name: 'configurateur_piscine', source_offer: projectOffer || state.offer,
      pool_type: projectOffer === 'concrete' ? 'concrete' : projectOffer === 'LC_6_3' || d.getElementById('config-next') ? 'wood' : 'undecided',
      budget_band: d.getElementById('project-budget') ? projectBand : ({ '15-20k': '15_20k', '20-30k': '20_30k', '30-40k': '30_40k', '40k+': '40k_plus' })[val('config-budget')] || 'unknown',
      project_timing: ({ 'Dans les 3 à 6 mois': '3_6_months', 'Dans les 6 à 12 mois': '6_12_months', 'Pour la saison suivante': 'next_season' })[timing] || 'research',
      dimension_band: projectOffer === 'LC_6_3' ? '6x3' : projectOffer === 'concrete' && Number(val('project-length')) >= 2 && Number(val('project-width')) >= 2 ? 'custom' : ({ Compacte: '5x3_2', Familiale: '6x4_2', Grande: '8_35x4_9' })[size && size.value] || 'unknown' };
  }
  function dispatch(name, p, id) {
    var map = { page_pool_view: ['trackSingle', 'ViewContent'], configurator_start: ['trackSingleCustom', 'configurator_start'], configurator_step_progress: ['trackSingleCustom', 'configurator_step_progress'], configurator_complete: ['trackSingle', 'Lead'], qualified_lead: ['trackSingleCustom', 'qualified_lead'] };
    if (!map[name]) return;
    if (consent.analytics && !sent['ga:' + id]) {
      sent['ga:' + id] = true;
      google(['event', name, gaParameters(Object.assign({}, p, { event_id: id }))]);
      // Existing GA4 conversion retained. Do not mark BOTH events as primary in Ads.
      if (name === 'configurator_complete') google(['event', 'generate_lead', gaParameters(Object.assign({}, p, { event_id: id }))]);
    }
    if (consent.marketing && !sent['meta:' + id]) { sent['meta:' + id] = true; metaEvent(map[name][0], map[name][1], p, id); }
  }
  function pageEvents() {
    if (consent.analytics && !pageSent.ga) { pageSent.ga = true; google(['event', 'page_view', gaParameters({})]); }
    if (consent.marketing && !pageSent.meta) { pageSent.meta = true; metaEvent('trackSingle', 'PageView', {}, pageId); }
    if (offer) dispatch('page_pool_view', { source_offer: offer, pool_type: offer === 'LC_6_3' ? 'wood' : offer === 'concrete' ? 'concrete' : 'undecided' }, pageId + '-pool');
  }
  var pageId = uuid();
  function start() {
    if (!consent.analytics && !consent.marketing) return;
    if (!state.attempt || state.attempt.complete) state.attempt = { id: uuid(), milestones: [], started: false, complete: false };
    var a = state.attempt;
    if (!a.started || consent.analytics && !a.startAnalytics || consent.marketing && !a.startMarketing) {
      // A later consent grant starts measurement for the newly allowed platform.
      if (a.startAnalytics) sent['ga:' + a.id + '-start'] = true;
      if (a.startMarketing) sent['meta:' + a.id + '-start'] = true;
      a.started = true; dispatch('configurator_start', params(), a.id + '-start');
      a.startAnalytics = a.startAnalytics || consent.analytics;
      a.startMarketing = a.startMarketing || consent.marketing; save();
    }
  }
  function step(number) {
    if (number < 2 || number > 4) return;
    start();
    var attempt = state.attempt, percent = (number - 1) * 25;
    if (!attempt || attempt.milestones.indexOf(percent) >= 0) return;
    attempt.milestones.push(percent);
    dispatch('configurator_step_progress', Object.assign(params(), { progress_percent: percent }), attempt.id + '-progress-' + percent); save();
  }
  function prepare() {
    start();
    return { schema_version: 1, submission_id: state.attempt ? state.attempt.id : uuid(), source_offer: state.offer, attribution: Object.assign({}, state.attribution), consent: { analytics: consent.analytics, marketing: consent.marketing } };
  }
  function complete(data) {
    if (!data || data.ok !== true || data.skipped || !data.id) return;
    var t = data.tracking;
    var id = t && /^lc-[0-9a-f-]{36}$/.test(t.event_id) ? t.event_id : 'lc-email-' + data.id;
    if (state.attempt && state.attempt.complete) return;
    var p = t && t.parameters ? t.parameters : params();
    // Only the server determines qualified_lead after successful email acceptance.
    dispatch('configurator_complete', p, id);
    if (t && t.qualified === true) dispatch('qualified_lead', p, id + '-qualified');
    if (state.attempt) { state.attempt.complete = true; save(); }
  }
  function choose(analytics, marketing) {
    consent = { version: 1, analytics: analytics, marketing: marketing, chosen: true, at: Date.now() };
    if (!analytics) UTM.forEach(function (k) { delete state.attribution[k]; });
    if (!marketing) CLICKS.forEach(function (k) { delete state.attribution[k]; });
    if (!analytics && !marketing) state.attempt = null;
    saveConsent(); capture(); initTags(); pageEvents();
    if (panel) panel.hidden = true;
  }
  function consentUI() {
    panel = d.createElement('section'); panel.className = 'lc-consent'; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'Choix des cookies'); panel.hidden = consent.chosen;
    panel.innerHTML = '<h2>Votre choix de confidentialité</h2><p>Avec votre accord, nous mesurons les visites et les demandes avec Google Analytics. Les cookies publicitaires Meta et Google permettent aussi de mesurer nos publicités et de vous proposer des rappels. Le configurateur fonctionne quel que soit votre choix. <a href="/politique-confidentialite.html">Confidentialité</a></p><div class="lc-consent-actions"><button type="button" data-consent="all">Tout accepter</button><button type="button" data-consent="none">Tout refuser</button><button type="button" data-consent="analytics">Mesure des visites uniquement</button></div>';
    panel.addEventListener('click', function (e) { var v = e.target.getAttribute('data-consent'); if (v) choose(v !== 'none', v === 'all'); });
    d.body.appendChild(panel);
    var button = d.createElement('button'); button.type = 'button'; button.className = 'lc-consent-settings'; button.textContent = 'Choix des cookies'; button.addEventListener('click', function () { panel.hidden = false; panel.querySelector('button').focus(); });
    (d.querySelector('footer') || d.body).appendChild(button);
  }
  // Public calls are all guarded; tracking failures cannot interrupt a lead or navigation.
  function safe(fn) { return function () { try { return fn.apply(null, arguments); } catch (_) { return null; } }; }
  w.LCTracking = { start: safe(start), step: safe(step), prepare: safe(prepare), complete: safe(complete) };
  function ready() {
    consentUI(); initTags(); pageEvents();
    w.addEventListener('storage', safe(function (e) {
      if (e.key !== consentKey) return;
      var next = localGet(consentKey);
      if (!next || next.version !== 1) { choose(false, false); return; }
      consent = next;
      if (!consent.analytics) UTM.forEach(function (k) { delete state.attribution[k]; });
      if (!consent.marketing) CLICKS.forEach(function (k) { delete state.attribution[k]; });
      if (!consent.analytics && !consent.marketing) state.attempt = null;
      save(); initTags(); if (panel) panel.hidden = consent.chosen;
    }));
    d.addEventListener('change', function (e) { if (e.isTrusted && e.target.closest('.config-step')) safe(start)(); });
    d.addEventListener('input', function (e) { if (e.isTrusted && e.target.closest('.config-step')) safe(start)(); });
    d.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (a && /configurateur-(?:piscine|projet)\.html/.test(a.getAttribute('href'))) { if (offer) state.offer = offer; save(); }
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', safe(ready)); else safe(ready)();
})(window, document);
