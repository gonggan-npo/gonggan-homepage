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
  const esc = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
  const message = esc(`authorization:github:${status}:${JSON.stringify(payload)}`);
  const ok = status === "success";
  return page(`<!doctype html><meta charset="utf-8"><body>
<p id="msg" style="font-family:sans-serif">로그인 처리 중입니다...</p>
<script>
(function () {
  var msg = document.getElementById("msg");
  var done = false;
  var tries = 0;
  if (!window.opener) {
    msg.textContent = "[오류 A] 관리자 창과 연결이 끊겼습니다. 이 창을 닫고 관리자 페이지에서 다시 로그인해 주세요.";
    return;
  }
  window.addEventListener("message", function (e) {
    if (done || e.data !== "authorizing:github") return;
    done = true;
    e.source.postMessage(${message}, e.origin);
    msg.textContent = ${ok} ? "로그인 완료. 창이 닫힙니다." : "[오류 C] 로그인 실패: " + ${esc(payload.message || "")};
    if (${ok}) setTimeout(function () { window.close(); }, 800);
  });
  (function ping() {
    if (done) return;
    if (tries++ > 10) { msg.textContent = "[오류 B] 관리자 창이 응답하지 않습니다."; return; }
    window.opener.postMessage("authorizing:github", "*");
    setTimeout(ping, 1000);
  })();
})();
</script>
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
