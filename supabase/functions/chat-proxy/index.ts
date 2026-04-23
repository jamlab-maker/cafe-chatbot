/**
 * chat-proxy Edge Function
 * Gemini 2.0 Flash 기반 LLM-first 응답
 * - shop config를 system prompt에 주입
 * - guest_memory로 단골 손님 선호도 반영
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

function buildSystemPrompt(
  config: Record<string, unknown>,
  lang: string,
  guestMemory: Record<string, unknown> | null
): string {
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

  // 단골 손님 컨텍스트
  let guestContext = "";
  if (guestMemory) {
    const visitCount = guestMemory.visit_count as number || 1;
    const summary = guestMemory.last_summary as string || "";
    guestContext = `
== RETURNING GUEST ==
Visit count: ${visitCount}
${summary ? `Known preferences: ${summary}` : ""}
(Greet warmly as a returning guest if appropriate)`;
  }

  return `You are a friendly customer support chatbot for a small shop called "${config.shopName || "매장"}".

IMPORTANT: Always respond in ${langName}. Never switch languages. Be concise and warm.

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
${guestContext}
== RULES ==
- Answer concisely and warmly
- Only answer questions related to this shop
- If information is not available, politely say so
- Do NOT make up prices or information not listed above
- Respond in ${langName} only`;
}

async function summarizePreferences(
  conversationHistory: Array<{ role: string; text: string }>,
  geminiKey: string
): Promise<string> {
  const transcript = conversationHistory
    .map((h) => `${h.role === "customer" ? "Guest" : "Shop"}: ${h.text}`)
    .join("\n");

  const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: `Summarize guest preferences from this conversation in 1-2 sentences (English only, be specific about orders/preferences):\n\n${transcript}` }]
      }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 100 }
    })
  });
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
    const {
      shop_slug,
      message,
      lang = "ko",
      guest_id,
      conversation_history = [],
      session_end = false,
    } = await req.json();

    if (!message && !session_end) {
      return Response.json({ ok: false, error: "message required" }, { status: 400 });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return Response.json({ ok: false, error: "GEMINI_API_KEY not set" }, { status: 500 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // shop config 로드
    let shopConfig: Record<string, unknown> = {};
    if (shop_slug) {
      const { data } = await supabase.rpc("get_shop_config", { p_slug: shop_slug });
      if (data) shopConfig = data.config ?? data;
    }

    // guest_memory 로드
    let guestMemory: Record<string, unknown> | null = null;
    if (guest_id && shop_slug) {
      const { data } = await supabase
        .from("guest_memory")
        .select("*")
        .eq("guest_id", guest_id)
        .eq("shop_slug", shop_slug)
        .single();
      guestMemory = data;
    }

    // 세션 종료 시 선호도 요약 저장
    if (session_end && guest_id && shop_slug && conversation_history.length > 0) {
      const summary = await summarizePreferences(conversation_history, geminiKey);
      if (guestMemory) {
        await supabase
          .from("guest_memory")
          .update({
            visit_count: (guestMemory.visit_count as number || 1) + 1,
            last_summary: summary,
          })
          .eq("guest_id", guest_id)
          .eq("shop_slug", shop_slug);
      } else {
        await supabase.from("guest_memory").insert({
          guest_id,
          shop_slug,
          visit_count: 1,
          last_summary: summary,
        });
      }
      return Response.json({ ok: true, saved: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const systemPrompt = buildSystemPrompt(shopConfig, lang, guestMemory);

    // 대화 히스토리 변환 (최근 6턴)
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini error:", err);
      return Response.json({ ok: false, error: "gemini_error" }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return Response.json(
      { ok: true, text },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    console.error("chat-proxy error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
