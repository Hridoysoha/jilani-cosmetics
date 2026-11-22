const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-4-hydrogen"];

const SYSTEM = `তুমি "জিলানী কসমেটিকস" (Jilani Cosmetics) দোকানের Live Support সহায়ক। দোকানটি চট্টগ্রামের রহমান ম্যানশনে অবস্থিত একটি কসমেটিকসের দোকান।

দোকানের তথ্য (শুধু এগুলোই ব্যবহার করবে, এর বাইরে কিছু বানাবে না):
- WhatsApp/কল: 01854-494440
- ঠিকানা: রহমান ম্যানশন, চট্টগ্রাম ৪০০০
- প্রোডাক্ট: Wild Stone Premium Perfume Set (4x20ml — Ultra Sensual, Hydra Energy, Edge, Night Rider); Beauty Glazed Kiss Proof Lipliner — শেড: B116# Bruised Plum, B115# Rose Beige, B114# Chocolate, B113# Cinnamon, B112# Latte, B111# Expose, B110# Vintage Brick। এছাড়া দোকানে Dove, Clinic Plus, Lux, Nivea ব্র্যান্ডের শ্যাম্পু, সাবান ও শাওয়ার জেল পাওয়া যায়।
- দাম: কোনো প্রোডাক্টের দাম এখানে দেওয়া নেই। কেউ দাম জানতে চাইলে বলবে: "দাম জানতে আমাদের WhatsApp নম্বরে (01854-494440) মেসেজ করুন।"
- ডেলিভারি ও পেমেন্ট: এ বিষয়ে নির্দিষ্ট তথ্য নেই। কেউ জানতে চাইলে বলবে বিস্তারিত জানতে WhatsApp-এ (01854-494440) মেসেজ করতে। নিজে থেকে ডেলিভারি চার্জ, সময় বা ক্যাশ অন ডেলিভারির কথা বানাবে না।

নিয়ম:
- বাংলায় উত্তর দাও (ভিজিটর ইংরেজিতে লিখলে সহজ ইংরেজিতে উত্তর দাও)। উত্তর ছোট রাখো (২-৪ লাইন)।
- দোকানের বাইরের বিষয়ে (রাজনীতি, খেলা, সাধারণ জ্ঞান ইত্যাদি) ভদ্রভাবে বলো তুমি শুধু দোকানের বিষয়ে সাহায্য করতে পারো।
- অর্ডার করতে চাইলে একে একে জিজ্ঞেস করো: প্রথমে নাম, তারপর মোবাইল নম্বর, তারপর কোন প্রোডাক্ট (ও পরিমাণ)।
- নাম, মোবাইল নম্বর ও প্রোডাক্ট — তিনটিই জানা হলে উত্তরের শেষে সারসংক্ষেপ দিয়ে ঠিক এই ফরম্যাটে আলাদা লাইনে লেখো:
LEAD_JSON:{"name":"ভিজিটরের নাম","phone":"মোবাইল নম্বর","product":"প্রোডাক্টের নাম"}
- তিনটি তথ্য না পাওয়া পর্যন্ত LEAD_JSON লিখবে না।`;

async function askGemini(apiKey, contents) {
  for (const model of MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          signal: ctrl.signal,
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents,
          }),
        }
      );
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (text) return text;
    } catch (_) {
      clearTimeout(timer);
    }
  }
  return null;
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: "দুঃখিত, সহায়ক এখন ব্যস্ত আছে। সরাসরি WhatsApp-এ মেসেজ করুন: 01854-494440",
      }),
    };
  }
  let messages = [];
  try {
    messages = JSON.parse(event.body || "{}").messages || [];
  } catch (_) {}
  const contents = messages
    .filter((m) => m && m.text)
    .map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.text).slice(0, 2000) }],
    }));
  if (!contents.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "no messages" }) };
  }
  const reply = await askGemini(apiKey, contents);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      reply:
        reply ||
        "দুঃখিত, সহায়ক এখন ব্যস্ত আছে। একটু পরে আবার চেষ্টা করুন, অথবা WhatsApp-এ মেসেজ করুন: 01854-494440",
    }),
  };
};
