/**
 * Supabase에서 ?shop= 슬러그 설정을 불러온 뒤 agent.js 로드 및 테마 적용
 */
(function () {
  function darkenHex(hex, amount) {
    hex = (hex || '').replace(/^#?/, '');
    if (hex.length !== 6) return '#554336';
    var r = Math.max(0, parseInt(hex.slice(0, 2), 16) - amount);
    var g = Math.max(0, parseInt(hex.slice(2, 4), 16) - amount);
    var b = Math.max(0, parseInt(hex.slice(4, 6), 16) - amount);
    return '#' + [r, g, b].map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  function resolveConfigForTheme() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1' && window.__DEFAULT_SHOP_CONFIG__) return window.__DEFAULT_SHOP_CONFIG__;
      if (window.__SHOP_CONFIG__) return window.__SHOP_CONFIG__;
      var s = localStorage.getItem('shopConfig');
      if (s) return JSON.parse(s);
      if (window.__DEFAULT_SHOP_CONFIG__) return window.__DEFAULT_SHOP_CONFIG__;
    } catch (e) {}
    return null;
  }

  function applyTheme(cfg) {
    var name = (cfg && cfg.shopName) ? cfg.shopName : '고객 지원';
    document.title = name + ' · 고객 지원';
    var accent = (cfg && cfg.accentColor) ? cfg.accentColor.replace(/^#?/, '#') : null;
    if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
      var root = document.documentElement;
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-hover', darkenHex(accent, 25));
      root.style.setProperty('--customer-bubble', accent);
    }
  }

  function showExpiredUi() {
    var overlay = document.getElementById('chatExpiredOverlay');
    var app = document.querySelector('.app');
    if (overlay) overlay.classList.remove('hidden');
    if (app) app.classList.add('chat-disabled');
  }

  function loadRemoteShopConfig() {
    if (!window.GuestAI || !window.GuestAI.supabaseIsConfigured || !window.GuestAI.supabaseIsConfigured()) {
      return Promise.resolve();
    }
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') return Promise.resolve();
      var shop =
        params.get('shop') ||
        (function () {
          try {
            return localStorage.getItem('guestAiShopSlug');
          } catch (e) {
            return null;
          }
        })();
      if (!shop) return Promise.resolve();
      return window.GuestAI.getShopConfigFromCloud(shop).then(function (payload) {
        if (!payload || !payload.config) return;
        window.__SHOP_CONFIG__ = payload.config;
        window.__SHOP_META__ = { status: payload.status, plan: payload.plan };
        if (payload.status === 'expired') {
          showExpiredUi();
        }
      });
    } catch (e) {
      return Promise.resolve();
    }
  }

  function run() {
    loadRemoteShopConfig().then(function () {
      applyTheme(resolveConfigForTheme());
      if (window.__SHOP_META__ && window.__SHOP_META__.status === 'expired') {
        return;
      }
      var s = document.createElement('script');
      s.src = 'agent.js';
      document.body.appendChild(s);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
