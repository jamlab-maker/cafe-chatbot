# Guest AI - Cafe Chatbot

Multilingual customer support chatbot for cafes, restaurants, and small shops.

## 🌍 Features

- **12-Language Support**: Auto-detects and replies in Korean, English, Japanese, Chinese, Thai, Vietnamese, Spanish, Russian, Indonesian, German, French, Hindi
- **24/7 Automation**: Handles customer inquiries around the clock
- **5-Minute Setup**: No coding required - one link to get started
- **Smart Q&A**: Automatically answers questions about menus, hours, reservations, locations, WiFi, parking, and more

## 🐛 Recent Bug Fixes

### Fixed Issues
1. **[object Object] error in non-Korean mode** - Responses now display correctly in all languages
2. **Language switching doesn't retranslate** - Existing messages properly retranslate when language is changed

### Testing
- ✅ Non-Korean language responses display without errors
- ✅ Language switching retranslates all existing messages
- ✅ Fully backward compatible

See [BUG_FIXES_SUMMARY.md](./BUG_FIXES_SUMMARY.md) for technical details.

## 📁 Project Structure

```
├── index.html              # Chat interface
├── agent.js               # Main chatbot logic (FIXED)
├── bootstrap-chat.js      # Initialize chat
├── styles.css             # Styling
├── supabase-api.js        # API wrapper
├── config.default.js      # Default config
└── BUG_FIXES_SUMMARY.md   # Technical documentation
```

## 🚀 Getting Started

1. Open `index.html` in a browser
2. Add `?demo=1` to test with sample data
3. Configure your shop settings
4. Share the link with customers

## 📝 Configuration

Edit shop configuration via:
- `window.__SHOP_CONFIG__` object
- Local storage (`shopConfig`)
- Or API calls to Supabase

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase Edge Functions
- **Translation**: MyMemory API
- **AI**: Claude API (optional LLM mode)
- **Database**: Supabase PostgreSQL

## 📞 Support

For issues and questions, please check [BUG_FIXES_SUMMARY.md](./BUG_FIXES_SUMMARY.md) or open an issue on GitHub.

---

**Built with ❤️ by Guest AI**
