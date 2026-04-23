/**
 * chat-proxy Edge Function
 * Gemini 2.0 Flash 기반 LLM-first 응답
 * - shop config를 system prompt에 주입
 * - 손님 언어로 직접 응답 (별도 번역 API 불필요)
 *
 * 환경변수 필요:
 *   GEMINI_API_KEY  — Google AI Studio에서 발급
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  zh: "Chinese (Simplified)",
  th: "Thai",
  vi: "Vietnamese",
  es: "Spanish",
  ru: "Russian",
  id: "Indonesian",
  de: "German",
  fr: "French",
  hi: "Hindi",
};

function buildSystemPrompt(config: Record<string, unknown>, lang: string): string {
  const langName = LANG_NAMES[lang] || "English";
  const menuLines = Array.isArray(config.menu)
    ? (config.menu as Array<{ name: string; price?: string }>)
        .map((m) => `  - ${m.name}${m.price ? " (" + m.price + ")" : ""}`)
        .join("\n")
    : "  (메뉴 없음)";

  const customQA = Array.isArray(config.customQA)
    ? (config.customQA as Array<{ question: string; answer: string }>)
        .filter((q) => q.question && q.answer)
        .map((q) => `  Q: ${q.question}\n  A: ${q.answer}`)
        .join("\n")
    : "";

  return `You are a friendly customer support chatbot for a small shop called "${config.shopName || "매장"}".

IMPORTANT: Always respond in ${langName}. Never switch languages.

== SHOP INFORMATION ==
Name: ${config.shopName || "-"}
Hours: ${config.hours || "-"}
Closed: ${config.closed || "-"}
Address: ${config.address || "-"}
Directions: ${config.directions || "-"}
WiFi: ${config.wifiInfo || "-"}
Restroom: ${config.restroomInfo || "-"}
Parking: ${config.parkingInfo || "-"}
Reservation: ${config.reservation || "-"}
Takeout/Delivery: ${config.orderInfo || "-"}
Events/Discounts: ${config.eventText || "-"}
Instagram: ${config.instagramUrl || "-"}
Naver Map: ${config.naverMapUrl || "-"}

== MENU ==
${menuLines}

== FAQ ==
${customQA || "  (없음)"}

== RULES ==
- Answer concisely and warmly
- Only answer questions related to this shop
- If information is not available, politely say so
- Do NOT make up prices or information not listed above
- Respond in ${langName} only`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { shop_slug, message, lang = "ko", conversation_history = [] } = await req.json();

    if (!message) {
      return Response.json({ ok: false, error: "message required" }, { status: 400 });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return Response.json({ ok: false, error: "GEMINI_API_KEY not set" }, { status: 500 });
    }

    // shop config 로드
    let shopConfig: Record<string, unknown> = {};
    if (shop_slug) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data } = await supabase.rpc("get_shop_config", { p_slug: shop_slug });
      if (data) {
        shopConfig = data.config ?? data;
      }
    }

    const systemPrompt = buildSystemPrompt(shopConfig, lang);

    // 대화 히스토리 변환 (최근 6턴만)
    const recentHistory = (conversation_history as Array<{ role: string; text: string }>)
      .slice(-12)
      .map((h) => ({
        role: h.role === "customer" ? "user" : "model",
        parts: [{ text: h.text }],
      }));

    // Gemini API 호출
    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...recentHistory,
          { role: "user", parts: [{ text: message }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini error:", err);
      return Response.json({ ok: false, error: "gemini_error" }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return Response.json(
      { ok: true, text },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    console.error("chat-proxy error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
