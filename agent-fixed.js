/**
 * 소규모 매장 고객 지원 챗봇 (설정 기반, 12개 언어 + 무료 번역 API)
 * 지원 언어: ko, en, ja, zh, th, vi, es, ru, id, de, fr, hi
 *
 * BUG FIXES:
 * 1. appendMessage now always converts text to string to prevent "[object Object]" errors
 * 2. translate() and translateFromTo() ensure string returns with proper error handling
 * 3. renderConversation() properly handles promise chaining and ensures all text is strings
 * 4. Language switching now properly translates existing messages
 */
(function () {
  const chatHistory = document.getElementById('chatHistory');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const headerTitle = document.getElementById('headerTitle');
  const headerSubtitle = document.getElementById('headerSubtitle');

  const LANG_CODES = ['ko', 'en', 'ja', 'zh', 'th', 'vi', 'es', 'ru', 'id', 'de', 'fr', 'hi'];
  const LANG_LABELS = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文', th: 'ไทย', vi: 'Tiếng Việt', es: 'Español', ru: 'Русский', id: 'Bahasa Indonesia', de: 'Deutsch', fr: 'Français', hi: 'हिन्दी' };

  var PROMPT_EXAMPLES_KO = ['메뉴 알려주세요', '영업시간이 어떻게 되나요?', '예약 가능한가요?', '위치 알려주세요', '할인 이벤트 있어요?'];
  var PROMPT_EXAMPLES = {
    ko: PROMPT_EXAMPLES_KO,
    en: ['What\'s on the menu?', 'What are your hours?', 'Can I make a reservation?', 'Where are you located?', 'Any discounts?'],
    ja: ['メニューを教えて', '営業時間は？', '予約できますか？', '場所を教えて', '割引はありますか？'],
    zh: ['有什么菜单？', '营业时间？', '可以预约吗？', '地址在哪里？', '有优惠吗？'],
    th: ['มีเมนูอะไรบ้าง', 'เปิดกี่โมง', 'จองได้ไหม', 'อยู่ที่ไหน', 'มีโปรโมชั่นไหม'],
    vi: ['Cho xem thực đơn', 'Mấy giờ mở cửa?', 'Đặt bàn được không?', 'Ở đâu?', 'Có giảm giá không?'],
    es: ['¿Qué hay en el menú?', '¿Horario?', '¿Puedo reservar?', '¿Dónde están?', '¿Descuentos?'],
    ru: ['Какое меню?', 'Часы работы?', 'Можно забронировать?', 'Где вы?', 'Есть скидки?'],
    id: ['Apa menu nya?', 'Jam berapa buka?', 'Bisa reservasi?', 'Di mana lokasinya?', 'Ada diskon?'],
    de: ['Was gibt es auf der Karte?', 'Wann haben Sie geöffnet?', 'Kann ich reservieren?', 'Wo befinden Sie sich?', 'Gibt es Rabatte?'],
    fr: ['Qu\'est-ce qu\'il y a au menu?', 'Quels sont les horaires?', 'Puis-je réserver?', 'Où êtes-vous?', 'Des réductions?'],
    hi: ['मेन्यू क्या है?', 'खुलने का समय?', 'क्या बुक कर सकते हैं?', 'आप कहाँ हैं?', 'कोई छूट?']
  };

  const LANG_HINT_KO = '한국어 · English · 中文 · 日本語 · ไทย · Tiếng Việt · Español · Русский · Bahasa Indonesia · Deutsch · Français · हिन्दी';
  const UI_STRINGS = {
    ko: { subtitle: '게스트 AI', welcomeLine1: '안녕하세요! {name}입니다. 메뉴, 영업시간, 예약, 주문 문의 등 무엇이든 물어보세요.', placeholder: '메시지를 입력하세요 (12개 언어 지원)', sendButton: '전송', langHint: LANG_HINT_KO, promptExamplesLabel: '예시 질문' },
    en: { subtitle: 'Customer Support Chat', welcomeLine1: 'Hello! This is {name}. Ask us about menu, hours, reservation, order, or anything else.', placeholder: 'Type your message (12 languages supported)', sendButton: 'Send', langHint: LANG_HINT_KO, promptExamplesLabel: 'Example questions' },
    ja: { subtitle: 'カスタマーサポートチャット', welcomeLine1: 'こんにちは！{name}です。メニュー・営業時間・予約・注文など、何でもお気軽にどうぞ。', placeholder: 'メッセージを入力（12言語対応）', sendButton: '送信', langHint: LANG_HINT_KO, promptExamplesLabel: '例の質問' },
    zh: { subtitle: '客户支持聊天', welcomeLine1: '您好！这里是{name}。菜单、营业时间、预约、点餐等欢迎咨询。', placeholder: '输入消息（支持12种语言）', sendButton: '发送', langHint: LANG_HINT_KO, promptExamplesLabel: '示例问题' },
    th: { subtitle: 'แชทฝ่ายบริการลูกค้า', welcomeLine1: 'สวัสดีครับ/ค่ะ! นี่คือ {name} สอบถามเมนู เวลาเปิด ป้องกัน หรือสั่งอาหารได้เลยครับ/ค่ะ', placeholder: 'พิมพ์ข้อความ (รองรับ 12 ภาษา)', sendButton: 'ส่ง', langHint: LANG_HINT_KO, promptExamplesLabel: 'คำถามตัวอย่าง' },
    vi: { subtitle: 'Chat hỗ trợ khách hàng', welcomeLine1: 'Xin chào! Đây là {name}. Hỏi chúng tôi về thực đơn, giờ mở cửa, đặt chỗ, gọi món nhé.', placeholder: 'Nhập tin nhắn (hỗ trợ 12 ngôn ngữ)', sendButton: 'Gửi', langHint: LANG_HINT_KO, promptExamplesLabel: 'Câu hỏi mẫu' },
    es: { subtitle: 'Chat de atención al cliente', welcomeLine1: '¡Hola! Somos {name}. Pregunta por menú, horario, reservas, pedidos o lo que necesites.', placeholder: 'Escribe tu mensaje (12 idiomas)', sendButton: 'Enviar', langHint: LANG_HINT_KO, promptExamplesLabel: 'Preguntas de ejemplo' },
    ru: { subtitle: 'Чат поддержки', welcomeLine1: 'Здравствуйте! Это {name}. Спрашивайте о меню, часах работы, бронировании, заказах.', placeholder: 'Введите сообщение (12 языков)', sendButton: 'Отправить', langHint: LANG_HINT_KO, promptExamplesLabel: 'Примеры вопросов' },
    id: { subtitle: 'Chat dukungan pelanggan', welcomeLine1: 'Halo! Ini {name}. Tanya kami tentang menu, jam buka, reservasi, pesanan.', placeholder: 'Ketik pesan (12 bahasa)', sendButton: 'Kirim', langHint: LANG_HINT_KO, promptExamplesLabel: 'Contoh pertanyaan' },
    de: { subtitle: 'Kundensupport-Chat', welcomeLine1: 'Hallo! Hier ist {name}. Fragen Sie uns nach Menü, Öffnungszeiten, Reservierung, Bestellung.', placeholder: 'Nachricht eingeben (12 Sprachen)', sendButton: 'Senden', langHint: LANG_HINT_KO, promptExamplesLabel: 'Beispielfragen' },
    fr: { subtitle: 'Chat support client', welcomeLine1: 'Bonjour! Nous sommes {name}. Demandez-nous le menu, les horaires, la réservation, la commande.', placeholder: 'Écrivez votre message (12 langues)', sendButton: 'Envoyer', langHint: LANG_HINT_KO, promptExamplesLabel: 'Exemples de questions' },
    hi: { subtitle: 'ग्राहक सहायता चैट', welcomeLine1: 'नमस्ते! यह {name} है। मेन्यू, समय, बुकिंग, ऑर्डर के बारे में पूछें।', placeholder: 'संदेश लिखें (12 भाषाएं)', sendButton: 'भेजें', langHint: LANG_HINT_KO, promptExamplesLabel: 'उदाहरण प्रश्न' }
  };

  const UI_LANG_KEY = 'uiLang';
  var conversationHistory = [];

  function getUiLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var langParam = params.get('lang');
      if (langParam && LANG_CODES.indexOf(langParam) !== -1) return langParam;
      var saved = localStorage.getItem(UI_LANG_KEY);
      if (saved && LANG_CODES.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return 'ko';
  }

  function applyUiLang(lang) {
    var l = lang || getUiLang();
    var s = UI_STRINGS[l] || UI_STRINGS.ko;
    var name = (getConfig() && getConfig().shopName) ? getConfig().shopName : '고객 지원';
    if (headerSubtitle) headerSubtitle.textContent = s.subtitle;
    var welcomeLine1El = document.getElementById('welcomeLine1');
    if (welcomeLine1El) welcomeLine1El.textContent = (s.welcomeLine1 || '').replace(/\{name\}/g, name);
    if (messageInput) messageInput.placeholder = s.placeholder;
    if (sendButton) sendButton.textContent = s.sendButton;
    var langHintEl = document.getElementById('langHint');
    if (langHintEl) langHintEl.textContent = s.langHint;
    var labelEl = document.getElementById('promptExamplesLabel');
    if (labelEl) labelEl.textContent = s.promptExamplesLabel || '예시 질문';
    renderPromptExamples(l);
  }

  function renderPromptExamples(lang) {
    var container = document.getElementById('promptExamples');
    if (!container) return;
    var prompts = (PROMPT_EXAMPLES[lang] || PROMPT_EXAMPLES_KO).slice();
    container.innerHTML = '';
    prompts.forEach(function (text) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prompt-chip';
      btn.textContent = text;
      btn.addEventListener('click', function () {
        if (messageInput) messageInput.value = text;
        if (chatForm) chatForm.requestSubmit();
      });
      container.appendChild(btn);
    });
  }

  function appendPromptExamplesSection() {
    var wrap = document.getElementById('promptExamplesWrap');
    if (wrap && wrap.parentNode === chatHistory) return;
    if (wrap && wrap.parentNode) wrap.remove();
    var lang = getUiLang();
    var s = UI_STRINGS[lang] || UI_STRINGS.ko;
    wrap = document.createElement('div');
    wrap.className = 'prompt-examples-wrap';
    wrap.id = 'promptExamplesWrap';
    var label = document.createElement('p');
    label.className = 'prompt-examples-label';
    label.id = 'promptExamplesLabel';
    label.textContent = s.promptExamplesLabel || '예시 질문';
    var container = document.createElement('div');
    container.className = 'prompt-examples';
    container.id = 'promptExamples';
    wrap.appendChild(label);
    wrap.appendChild(container);
    chatHistory.appendChild(wrap);
    renderPromptExamples(lang);
  }

  function getConfig() {
    try {
      if (window.__SHOP_CONFIG__) return window.__SHOP_CONFIG__;
      var params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        var d = window.__DEFAULT_SHOP_CONFIG__ || {};
        return {
          shopName: d.shopName || '샘플 매장',
          businessType: d.businessType,
          accentColor: d.accentColor,
          intro: d.intro,
          hours: d.hours,
          closed: d.closed,
          address: d.address,
          directions: d.directions,
          instagramUrl: d.instagramUrl,
          naverMapUrl: d.naverMapUrl,
          googleMapUrl: d.googleMapUrl,
          wifiInfo: d.wifiInfo || '와이파이 비밀번호: 1234',
          faqUseWifi: true,
          restroomInfo: d.restroomInfo,
          faqUseRestroom: d.faqUseRestroom,
          parkingInfo: d.parkingInfo,
          faqUseParking: d.faqUseParking,
          reservation: d.reservation,
          orderInfo: d.orderInfo,
          eventText: d.eventText,
          menu: d.menu || [],
          customQA: d.customQA || []
        };
      }
      const stored = localStorage.getItem('shopConfig');
      var config = stored ? JSON.parse(stored) : (window.__DEFAULT_SHOP_CONFIG__ || {});
      var d = window.__DEFAULT_SHOP_CONFIG__ || {};
      var isSample = (config.shopName || '') === '샘플 매장' || !stored;
      if (isSample && !(config.wifiInfo && config.wifiInfo.trim())) {
        config = Object.assign({}, config, { wifiInfo: (d.wifiInfo && d.wifiInfo.trim()) || '와이파이 비밀번호: 1234' });
      }
      return config;
    } catch (e) {}
    return window.__DEFAULT_SHOP_CONFIG__ || {};
  }

  function setHeaderFromConfig() {
    const cfg = getConfig();
    if (headerTitle) headerTitle.textContent = cfg.shopName || '고객 지원';
    if (headerSubtitle) headerSubtitle.textContent = '게스트 AI';
  }

  function detectLanguage(text) {
    const t = text.trim();
    if (!t) return 'ko';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(t)) return 'ja';
    if (/[\uac00-\ud7a3]/.test(t)) return 'ko';
    if (/[\u4e00-\u9fff]/.test(t)) return 'zh';
    if (/[\u0e00-\u0e7f]/.test(t)) return 'th';
    if (/[\u0900-\u097f]/.test(t)) return 'hi';
    if (/[\u0400-\u04ff]/.test(t)) return 'ru';
    if (/\b(terima kasih|apa|bisa|dimana|tolong|berapa)\b/i.test(t)) return 'id';
    if (/\b(danke|bitte|was|wo|haben|sie|menu)\b/i.test(t)) return 'de';
    if (/\b(merci|s'il|vous|menu|où|réserver|bonjour)\b/i.test(t)) return 'fr';
    if (/\b(cam on|xin chao|cho toi|ban|gia bao nhieu)\b/i.test(t)) return 'vi';
    if (/\b(gracias|donde|hola|por favor|quiero)\b/i.test(t)) return 'es';
    return 'en';
  }

  function langCodeForApi(lang) {
    return lang === 'zh' ? 'zh-CN' : lang;
  }

  function translate(text, targetLang) {
    if (targetLang === 'ko' || !text) return Promise.resolve(String(text || ''));
    var langpair = 'ko|' + langCodeForApi(targetLang);
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + langpair;
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
          return String(data.responseData.translatedText || '');
        }
        return String(text || '');
      })
      .catch(function () { return String(text || ''); });
  }

  function translateFromTo(text, fromLang, toLang) {
    if (!text || fromLang === toLang) return Promise.resolve(String(text || ''));
    var from = langCodeForApi(fromLang);
    var to = langCodeForApi(toLang);
    var langpair = from + '|' + to;
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + langpair;
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
          return String(data.responseData.translatedText || '');
        }
        return String(text || '');
      })
      .catch(function () { return String(text || ''); });
  }

  function buildResponses(config) {
    const name = config.shopName || '매장';
    const menuLines = (config.menu || []).map(function (m) { return m.name + ' ' + (m.price || ''); }).join('\n');
    return {
      empty: '메시지를 입력해 주시면 친절히 안내해 드릴게요.',
      menu: '오늘의 메뉴입니다:\n' + (menuLines || '(메뉴 없음)') + '\n\n추가 문의 있으시면 말씀해 주세요!',
      hours: '영업시간: ' + (config.hours || '-') + '\n휴무: ' + (config.closed || '-'),
      reservation: config.reservation || '예약은 인스타 DM 등으로 받고 있습니다. 인원·시간 알려주시면 확인해 드립니다.',
      order: config.orderInfo || '테이크아웃·배달 문의는 인스타 DM으로 부탁드립니다.',
      location: (function () {
        var lines = [];
        if (config.address) lines.push(config.address);
        if (config.directions) lines.push(config.directions);
        if (config.instagramUrl) lines.push('인스타그램: ' + config.instagramUrl);
        if (config.naverMapUrl) lines.push('네이버맵: ' + config.naverMapUrl);
        if (config.googleMapUrl) lines.push('구글맵: ' + config.googleMapUrl);
        return lines.length ? lines.join('\n') : '';
      })(),
      wifi: (config.wifiInfo && config.wifiInfo.trim()) ? config.wifiInfo.trim() : '와이파이 정보가 등록되지 않았습니다.',
      restroom: (config.faqUseRestroom !== false && config.restroomInfo) ? config.restroomInfo : (config.restroomInfo || '화장실 정보가 등록되지 않았습니다.'),
      parking: (config.faqUseParking !== false && config.parkingInfo) ? config.parkingInfo : (config.parkingInfo || '주차 정보가 등록되지 않았습니다.'),
      discount: config.eventText || '현재 진행 중인 이벤트는 없습니다.',
      thanks: '감사합니다. 좋은 하루 되세요!',
      hello: '안녕하세요! ' + name + '입니다. 메뉴, 영업시간, 예약, 주문 등 편하게 물어보세요.',
      fallback: '메뉴, 영업시간, 예약, 주문, 위치, 할인 이벤트 등 궁금한 걸 말씀해 주시면 안내해 드릴게요.'
    };
  }

  const patterns = {
    menu: /메뉴|뭐 있어|음료|드릴 수|시킨다|menu|what do you have|drink|order|菜单|有什么|饮料|点餐|メニュー|何がある|飲み物|注文|thực đơn|carta|меню/i,
    hours: /영업|시간|몇 시|오픈|마감|운영|hours|open|close|when|时间|营业|几点|开门|営業|時間|何時|オープン|giờ mở|horario|время|работа/i,
    reservation: /예약|예약하고|방문 예약|자리|reservation|book|reserve|预约|预订|予約|予約したい|đặt bàn|reservar|бронирован/i,
    order: /주문|배달|테이크아웃|가져가|order|delivery|takeout|take away|订|外卖|带走|注文|配達|đặt món|para llevar|доставка/i,
    location: /위치|어디|오는 길|주소|location|where|address|地址|在哪里|場所|どこ|住所|ở đâu|dirección|адрес/i,
    wifi: /와이파이|wifi|wi-fi|무선|인터넷|internet|password|비밀번호|パスワード|密码|รหัส|mật khẩu|contraseña|пароль|kata sandi|passwort|mot de passe|wlan/i,
    restroom: /화장실|restroom|toilet|bathroom|卫生间|厕所|トイレ|ห้องน้ำ|vệ sinh|baño|санузел|kamar kecil|toilette|toilettes/i,
    parking: /주차|parking|주차장|停车|駐車|ที่จอดรถ|bãi đỗ|aparcamiento|парковк|tempat parkir|parken|stationnement|पार्किंग/i,
    discount: /할인|쿠폰|이벤트|프로모션|discount|coupon|event|promotion|优惠|折扣|活动|割引|クーポン|giảm giá|descuento|скидк/i,
    thanks: /감사|고마워|땡큐|thanks|thank you|谢谢|感謝|ありがとう|cảm ơn|gracias|спас/i,
    hello: /안녕|하이|hello|hi|你好|こんにちは|您好|xin chào|hola|привет/i
  };

  const roleLabelCustomer = { ko: '고객', en: 'Customer', zh: '顾客', ja: 'お客様', th: 'ลูกค้า', vi: 'Khách', es: 'Cliente', ru: 'Клиент', id: 'Pelanggan', de: 'Kunde', fr: 'Client', hi: 'ग्राहक' };
  const roleLabelAgent = { ko: '매장', en: 'Shop', zh: '店铺', ja: 'お店', th: 'ร้าน', vi: 'Cửa hàng', es: 'Tienda', ru: 'Магазин', id: 'Toko', de: 'Geschäft', fr: 'Magasin', hi: 'दुकान' };

  function getIntent(msg) {
    if (patterns.menu.test(msg)) return 'menu';
    if (patterns.hours.test(msg)) return 'hours';
    if (patterns.reservation.test(msg)) return 'reservation';
    if (patterns.order.test(msg)) return 'order';
    if (patterns.location.test(msg)) return 'location';
    if (patterns.wifi.test(msg)) return 'wifi';
    if (patterns.restroom.test(msg)) return 'restroom';
    if (patterns.parking.test(msg)) return 'parking';
    if (patterns.discount.test(msg)) return 'discount';
    if (patterns.thanks.test(msg)) return 'thanks';
    if (patterns.hello.test(msg)) return 'hello';
    return 'fallback';
  }

  function getAgentResponseKo(customerMessage) {
    var msg = customerMessage.trim();
    if (!msg) return buildResponses(getConfig()).empty;
    var config = getConfig();
    var R = buildResponses(config);
    if (config.faqUseHours && config.hours && /영업|시간|몇 시|오픈|마감|hours|open|close|时间|営業|giờ|horario|время/i.test(msg)) return R.hours;
    var customQA = config.customQA || [];
    for (var i = 0; i < customQA.length; i++) {
      var q = (customQA[i].question || '').trim();
      if (!q) continue;
      if (msg.indexOf(q) !== -1) return (customQA[i].answer || '').trim() || R.fallback;
    }
    var intent = getIntent(msg);
    return R[intent] || R.fallback;
  }

  function appendMessage(text, role, lang, skipRemove) {
    if (!skipRemove && welcomeMessage && welcomeMessage.parentNode) {
      welcomeMessage.remove();
    }
    var l = lang || 'ko';
    const wrap = document.createElement('div');
    wrap.className = 'message ' + role;
    const roleLabel = document.createElement('div');
    roleLabel.className = 'message-role';
    roleLabel.textContent = role === 'customer' ? (roleLabelCustomer[l] || roleLabelCustomer.ko) : (getConfig().shopName || roleLabelAgent[l] || roleLabelAgent.ko);
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    // FIX: Ensure text is always a string to prevent "[object Object]" errors
    bubble.textContent = String(text || '').trim();
    wrap.appendChild(roleLabel);
    wrap.appendChild(bubble);
    chatHistory.appendChild(wrap);
    var promptWrap = document.getElementById('promptExamplesWrap');
    if (promptWrap && promptWrap.parentNode) chatHistory.appendChild(promptWrap);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function handleSubmit(e) {
    e.preventDefault();
    var text = messageInput.value.trim();
    if (!text) return;

    var responseLang = detectLanguage(text);
    appendMessage(text, 'customer', responseLang);
    conversationHistory.push({ role: 'customer', text: text, lang: responseLang });
    messageInput.value = '';
    sendButton.disabled = true;

    function getShopSlugForProxy() {
      try {
        var params = new URLSearchParams(window.location.search);
        return (params.get('shop') || localStorage.getItem('guestAiShopSlug') || '').trim();
      } catch (e) {}
      return '';
    }

    function getKoReplyAsync() {
      try {
        var cfg = getConfig() || {};
        var wantLlm = cfg.llmEnabled === true || cfg.useLlm === true;
        if (!wantLlm) return Promise.resolve(String(getAgentResponseKo(text)));
        if (!window.GuestAI || !window.GuestAI.callEdgeFunction || !window.GuestAI.supabaseIsConfigured || !window.GuestAI.supabaseIsConfigured()) {
          return Promise.resolve(String(getAgentResponseKo(text)));
        }
        var slug = getShopSlugForProxy();
        if (!slug) return Promise.resolve(String(getAgentResponseKo(text)));
        return window.GuestAI.callEdgeFunction('chat-proxy', { shop_slug: slug, message: text })
          .then(function (res) {
            if (res && res.ok && res.text) return String(res.text || '');
            return String(getAgentResponseKo(text));
          })
          .catch(function () {
            return String(getAgentResponseKo(text));
          });
      } catch (e) {
        return Promise.resolve(String(getAgentResponseKo(text)));
      }
    }

    getKoReplyAsync().then(function (koReply) {
      // Ensure koReply is always a string
      koReply = String(koReply || '');
      conversationHistory.push({ role: 'agent', textKo: koReply });

      if (responseLang === 'ko') {
        setTimeout(function () {
          appendMessage(koReply, 'agent', responseLang);
          sendButton.disabled = false;
          messageInput.focus();
        }, 300);
        return;
      }

      translate(koReply, responseLang).then(function (translated) {
        translated = String(translated || '');
        setTimeout(function () {
          appendMessage(translated, 'agent', responseLang);
          sendButton.disabled = false;
          messageInput.focus();
        }, 100);
      }).catch(function () {
        appendMessage(String(koReply || ''), 'agent', 'ko');
        sendButton.disabled = false;
        messageInput.focus();
      });
    });
  }

  function renderConversation() {
    var lang = getUiLang();
    while (chatHistory.firstChild) chatHistory.removeChild(chatHistory.firstChild);
    var i = 0;

    function next() {
      if (i >= conversationHistory.length) return Promise.resolve();
      var item = conversationHistory[i];
      i += 1;

      if (item.role === 'customer') {
        if (item.lang === lang) {
          appendMessage(String(item.text || ''), 'customer', lang, true);
          return next();
        }
        return translateFromTo(String(item.text || ''), item.lang, lang).then(function (translated) {
          appendMessage(String(translated || ''), 'customer', lang, true);
          return next();
        }).catch(function () {
          appendMessage(String(item.text || ''), 'customer', item.lang, true);
          return next();
        });
      }

      // Handle agent messages
      if (lang === 'ko') {
        appendMessage(String(item.textKo || ''), 'agent', lang, true);
        return next();
      }

      return translate(String(item.textKo || ''), lang).then(function (translated) {
        appendMessage(String(translated || ''), 'agent', lang, true);
        return next();
      }).catch(function () {
        appendMessage(String(item.textKo || ''), 'agent', 'ko', true);
        return next();
      });
    }

    return next().then(function () {
      appendPromptExamplesSection();
    });
  }

  setHeaderFromConfig();
  applyUiLang(getUiLang());

  var langBtn = document.getElementById('langBtn');
  var langDropdown = document.getElementById('langDropdown');
  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = langDropdown.classList.toggle('hidden');
      langBtn.setAttribute('aria-expanded', !open);
    });
    langDropdown.querySelectorAll('button[role="option"]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        var lang = opt.getAttribute('data-lang') || 'ko';
        try { localStorage.setItem(UI_LANG_KEY, lang); } catch (err) {}
        applyUiLang(lang);
        langDropdown.classList.add('hidden');
        langBtn.setAttribute('aria-expanded', 'false');
        if (conversationHistory.length > 0) {
          renderConversation().then(function () {
            chatHistory.scrollTop = chatHistory.scrollHeight;
          });
        }
      });
    });
    document.addEventListener('click', function () {
      langDropdown.classList.add('hidden');
      langBtn.setAttribute('aria-expanded', 'false');
    });
  }

  chatForm.addEventListener('submit', handleSubmit);
  if (messageInput) messageInput.focus();
})();
