// 사단법인 공간 — 홈페이지 Worker
// 평소에는 _site 폴더의 정적 파일을 그대로 보여 주고,
// /api/contact 로 들어온 문의 양식만 받아서 이메일로 보냅니다.
//
// Cloudflare 대시보드에서 넣는 값 (gonggan-homepage > Settings > Variables and Secrets)
//   CONTACT_TO   : 문의를 받을 주소. 여러 개면 쉼표로 구분 (Text)
//   CONTACT_FROM : 보내는 주소 (생략하면 noreply@gonggan.org)
// 받는 주소는 Cloudflare Email Routing > Destination addresses 에서 인증을 마쳐야 합니다.

import { EmailMessage } from "cloudflare:email";

const LIMITS = { name: 50, subject: 120, phone: 40, email: 120, message: 5000 };
const ALLOWED_ORIGINS = ["https://gonggan.org", "https://www.gonggan.org"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") return json({ ok: false, error: "잘못된 요청입니다." }, 405);
      try {
        return await handleContact(request, env);
      } catch (e) {
        console.log("contact error", String(e && e.stack || e));
        return json({ ok: false, error: "전송 중 문제가 생겼습니다. 잠시 뒤 다시 시도하시거나 이메일로 보내 주세요." }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  const origin = request.headers.get("origin") || "";
  const host = new URL(request.url).origin;
  if (origin && origin !== host && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ ok: false, error: "허용되지 않은 요청입니다." }, 403);
  }

  const form = await request.formData();
  const get = (k) => String(form.get(k) || "").trim();
  const data = {
    name: get("name"), subject: get("subject"), phone: get("phone"),
    email: get("email"), message: get("message"),
  };

  // 스팸 방지: 사람에게는 보이지 않는 칸이 채워졌거나, 화면을 연 지 3초 안에 보낸 경우
  const trap = get("website");
  const openedAt = Number(get("t")) || 0;
  if (trap || (openedAt && Date.now() - openedAt < 3000)) {
    return json({ ok: true }); // 봇에게는 성공한 것처럼 응답
  }

  if (get("agree") !== "yes") return json({ ok: false, error: "개인정보 수집·이용에 동의해 주세요." }, 400);
  for (const k of ["name", "subject", "email", "message"]) {
    if (!data[k]) return json({ ok: false, error: "필수 항목을 모두 입력해 주세요." }, 400);
  }
  for (const [k, max] of Object.entries(LIMITS)) {
    if (data[k].length > max) return json({ ok: false, error: "입력한 내용이 너무 깁니다." }, 400);
  }
  if (!/^[^\s@<>",]+@[^\s@<>",]+\.[^\s@<>",]+$/.test(data.email)) {
    return json({ ok: false, error: "이메일 주소를 다시 확인해 주세요." }, 400);
  }
  for (const k of ["name", "subject", "phone", "email"]) data[k] = data[k].replace(/[\r\n]+/g, " ");

  const to = String(env.CONTACT_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!to.length || !env.MAIL) {
    console.log("contact not configured", { to: to.length, mail: !!env.MAIL });
    return json({ ok: false, error: "문의 양식이 아직 준비 중입니다. 이메일로 보내 주세요." }, 503);
  }
  const from = env.CONTACT_FROM || "noreply@gonggan.org";

  const sentAt = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const text = [
    "홈페이지 문의 양식으로 새 문의가 왔습니다.",
    "이 메일에 '답장'하면 문의하신 분께 바로 회신됩니다.",
    "",
    `작성자: ${data.name}`,
    `연락처: ${data.phone || "-"}`,
    `이메일: ${data.email}`,
    `제목: ${data.subject}`,
    `보낸 시각: ${sentAt}`,
    "",
    "---- 내용 ----",
    data.message,
  ].join("\n");

  const subject = `[홈페이지 문의] ${data.subject}`;
  const results = await Promise.allSettled(to.map((addr) =>
    env.MAIL.send(new EmailMessage(from, addr, mime({ from, to: addr, replyTo: data.email, replyName: data.name, subject, text })))
  ));
  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.log("send failed", String(r.reason)));
  if (failed.length === results.length) {
    return json({ ok: false, error: "전송하지 못했습니다. 잠시 뒤 다시 시도하시거나 이메일로 보내 주세요." }, 502);
  }
  return json({ ok: true });
}

// ---------- 메일 본문 만들기 (UTF-8, 한글 제목·이름 인코딩) ----------
function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
const word = (s) => `=?UTF-8?B?${b64(s)}?=`;

function mime({ from, to, replyTo, replyName, subject, text }) {
  const body = b64(text).replace(/.{1,76}/g, "$&\r\n");
  return [
    `From: ${word("사단법인 공간 홈페이지")} <${from}>`,
    `To: <${to}>`,
    `Reply-To: ${word(replyName)} <${replyTo}>`,
    `Subject: ${word(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@gonggan.org>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
