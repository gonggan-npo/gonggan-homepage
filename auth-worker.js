// 사단법인 공간 — 관리자 로그인 중계 Worker (별도 Worker로 올립니다)
// Cloudflare > Workers & Pages > Create > Worker 로 새 Worker를 만들고,
// "Edit code" 화면에서 이 파일 내용을 전부 붙여 넣은 뒤 Deploy 하세요.
// 그다음 Settings > Variables and Secrets 에서 아래 두 값을 넣습니다.
//   CLIENT_ID      : GitHub OAuth App 의 Client ID
//   CLIENT_SECRET  : GitHub OAuth App 의 Client Secret (Secret/암호화로)

const AUTHORIZE = "https://github.com/login/oauth/authorize";
const TOKEN = "https://github.com/login/oauth/access_token";

function page(body) {
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// 로그인 결과를 관리자 창으로 돌려보내는 페이지 (Decap CMS 규격)
function result(status, payload) {
  const content = JSON.stringify(payload).replace(/</g, "\\u003c");
  return page(`<!doctype html><meta charset="utf-8"><body>
<script>
(function () {
  function send() {
    if (window.opener) window.opener.postMessage(
      "authorization:github:${status}:${content}", "*");
  }
  window.addEventListener("message", function () { send(); }, { once: true });
  if (window.opener) window.opener.postMessage("authorizing:github", "*");
})();
</script>
<p style="font-family:sans-serif">로그인 처리 중입니다. 창이 자동으로 닫히지 않으면 닫아 주세요.</p>
</body>`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      if (!env.CLIENT_ID) return page("<p>설정 미완료: CLIENT_ID 가 없습니다.</p>");
      const to = new URL(AUTHORIZE);
      to.searchParams.set("client_id", env.CLIENT_ID);
      to.searchParams.set("redirect_uri", `${url.origin}/callback`);
      to.searchParams.set("scope", url.searchParams.get("scope") || "repo");
      to.searchParams.set("state", crypto.randomUUID());
      return Response.redirect(to.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return result("error", { message: "코드를 받지 못했습니다." });
      try {
        const res = await fetch(TOKEN, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", "user-agent": "gonggan-auth" },
          body: JSON.stringify({ client_id: env.CLIENT_ID, client_secret: env.CLIENT_SECRET, code }),
        });
        const data = await res.json();
        if (!data.access_token) return result("error", { message: data.error_description || data.error || "토큰 교환 실패" });
        return result("success", { token: data.access_token, provider: "github" });
      } catch (e) {
        return result("error", { message: String(e) });
      }
    }

    return new Response("gonggan auth worker", { headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
