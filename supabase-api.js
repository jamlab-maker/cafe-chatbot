/**
 * Supabase: Auth(REST) + PostgREST RPC + Edge Functions
 */
(function (global) {
  var G = (global.GuestAI = global.GuestAI || {});
  var SESSION_KEY = 'guestAiSupabaseSession';

  function getCfg() {
    return global.__SUPABASE_CONFIG__ || {};
  }

  function baseUrl() {
    var u = (getCfg().url || '').trim();
    return u.replace(/\/+$/, '');
  }

  function anonKey() {
    return (getCfg().anonKey || '').trim();
  }

  function authBase() {
    return baseUrl() + '/auth/v1';
  }

  G.normalizeShopSlug = function (s) {
    if (!s || typeof s !== 'string') return '';
    s = s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (s.length > 128) s = s.slice(0, 128);
    return s;
  };

  G.supabaseIsConfigured = function () {
    var u = baseUrl();
    return u.indexOf('http') === 0 && anonKey().length >= 20;
  };

  function headersAnon() {
    var k = anonKey();
    return {
      'Content-Type': 'application/json',
      apikey: k,
      Authorization: 'Bearer ' + k
    };
  }

  function headersWithUserJwt() {
    var k = anonKey();
    var sess = getStoredSessionSync();
    var bearer = sess && sess.access_token ? sess.access_token : k;
    return {
      'Content-Type': 'application/json',
      apikey: k,
      Authorization: 'Bearer ' + bearer
    };
  }

  function getStoredSessionSync() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function setStoredSession(data) {
    try {
      if (!data) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  G.getStoredSession = getStoredSessionSync;

  G.supabaseRpc = function (name, params, useUserJwt) {
    var h = useUserJwt ? headersWithUserJwt() : headersAnon();
    return fetch(baseUrl() + '/rest/v1/rpc/' + encodeURIComponent(name), {
      method: 'POST',
      headers: h,
      body: JSON.stringify(params || {})
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error(t || String(r.status));
        });
      }
      return r.json();
    });
  };

  /**
   * 원격 매장 페이로드: { config, status, plan } 또는 레거시(평면 config)
   */
  G.normalizeShopPayload = function (data) {
    if (data === null || data === undefined) return null;
    if (typeof data !== 'object' || Array.isArray(data)) return null;
    if (data.config !== undefined && typeof data.config === 'object' && !Array.isArray(data.config)) {
      return {
        config: data.config,
        status: data.status || 'active',
        plan: data.plan || 'free'
      };
    }
    return { config: data, status: 'active', plan: 'free' };
  };

  G.getShopConfigFromCloud = function (slug) {
    var s = G.normalizeShopSlug(slug);
    if (!s) return Promise.resolve(null);
    return G.supabaseRpc('get_shop_config', { p_slug: s }, false)
      .then(function (data) {
        return G.normalizeShopPayload(data);
      })
      .catch(function () {
        return null;
      });
  };

  G.saveShopConfigToCloud = function (slug, configObject, ownerKey) {
    var s = G.normalizeShopSlug(slug);
    if (!s) return Promise.resolve({ ok: false, error: 'invalid_slug' });
    var sess = getStoredSessionSync();
    var useJwt = !!(sess && sess.access_token);
    return G.supabaseRpc(
      'save_shop_config',
      {
        p_slug: s,
        p_config: configObject,
        p_owner_key: ownerKey || null
      },
      useJwt
    ).then(function (data) {
      if (data && data.ok === true) return data;
      return { ok: false, error: (data && data.error) || 'save_failed' };
    });
  };

  G.callEdgeFunction = function (name, body) {
    if (!G.supabaseIsConfigured()) {
      return Promise.reject(new Error('not_configured'));
    }
    return fetch(baseUrl() + '/functions/v1/' + encodeURIComponent(name), {
      method: 'POST',
      headers: headersAnon(),
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j && j.error) || String(r.status));
        return j;
      });
    });
  };

  G.authSendOtp = function (email) {
    if (!email || typeof email !== 'string') return Promise.reject(new Error('invalid_email'));
    return fetch(authBase() + '/otp', {
      method: 'POST',
      headers: headersAnon(),
      body: JSON.stringify({ email: email.trim(), create_user: true })
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || String(r.status)); });
      return r.json().catch(function () { return {}; });
    });
  };

  G.authVerifyOtp = function (email, token) {
    if (!email || !token) return Promise.reject(new Error('invalid'));
    return fetch(authBase() + '/verify', {
      method: 'POST',
      headers: headersAnon(),
      body: JSON.stringify({
        type: 'email',
        email: email.trim(),
        token: String(token).trim()
      })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j && (j.msg || j.error_description || j.message)) || String(r.status));
        if (j.access_token) {
          setStoredSession({
            access_token: j.access_token,
            refresh_token: j.refresh_token,
            expires_at: j.expires_at,
            user: j.user
          });
        }
        return j;
      });
    });
  };

  function refreshSession() {
    var sess = getStoredSessionSync();
    if (!sess || !sess.refresh_token) return Promise.resolve(null);
    return fetch(authBase() + '/token?grant_type=refresh_token', {
      method: 'POST',
      headers: headersAnon(),
      body: JSON.stringify({ refresh_token: sess.refresh_token })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          setStoredSession(null);
          return null;
        }
        if (j.access_token) {
          var next = {
            access_token: j.access_token,
            refresh_token: j.refresh_token || sess.refresh_token,
            expires_at: j.expires_at,
            user: j.user || sess.user
          };
          setStoredSession(next);
          return next;
        }
        return null;
      });
    });
  }

  G.getSession = function () {
    return Promise.resolve().then(function () {
      var sess = getStoredSessionSync();
      if (!sess || !sess.access_token) return null;
      return fetch(authBase() + '/user', {
        method: 'GET',
        headers: headersWithUserJwt()
      }).then(function (r) {
        if (r.status === 401) return refreshSession().then(function (s) { return s ? { user: s.user, access_token: s.access_token } : null; });
        if (!r.ok) return sess.user ? { user: sess.user, access_token: sess.access_token } : null;
        return r.json().then(function (user) {
          var merged = Object.assign({}, sess, { user: user });
          setStoredSession(merged);
          return { user: user, access_token: sess.access_token };
        });
      }).catch(function () {
        return sess.user ? { user: sess.user, access_token: sess.access_token } : null;
      });
    });
  };

  G.signOut = function () {
    setStoredSession(null);
    return Promise.resolve();
  };

  /** 플랜 문서 명칭과 동일한 별칭 */
  G.signInWithOtp = G.authSendOtp;
})(window);
