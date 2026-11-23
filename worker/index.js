// 사단법인 공간 — Cloudflare Worker
// 하는 일 두 가지:
// 1) 정적 홈페이지(_site) 전달
// 2) 관리자 페이지의 GitHub 로그인 중계 (/auth, /callback)
//    - CLIENT_ID, CLIENT_SECRET 은 Cloudflare 설정(Variables and Secrets)에서 넣습니다.

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

function html(body) {
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// 로그인 결과를 관리자 창으로 돌려보내는 작은 페이지
function resultPage(status, payload) {
  const content = JSON.stringify(payload);
  return html(`<!doctype html><meta charset="utf-8"><body>
<script>
(function () {
  function post(message) {
    if (window.opener) window.opener.postMessage(message, "*");
  }
  // Decap CMS 핸드셰이크
  window.addEventListener("message", function () {
    post("authorization:github:${status}:${content.replace(/</g, "\\u003c")}");
  }, { once: true });
  post("authorizing:github");
})();
</script>
<p>로그인 처리 중입니다. 창이 자동으로 닫히지 않으면 닫아 주세요.</p>
</body>`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // 1) GitHub 로그인 시작
    if (pathname === "/auth") {
      if (!env.CLIENT_ID) {
        return html("<p>설정이 끝나지 않았습니다: CLIENT_ID 가 없습니다.</p>");
      }
      const redirectUri = `${url.origin}/callback`;
      const state = crypto.randomUUID();
      const to = new URL(GITHUB_AUTHORIZE);
      to.searchParams.set("client_id", env.CLIENT_ID);
      to.searchParams.set("redirect_uri", redirectUri);
      to.searchParams.set("scope", url.searchParams.get("scope") || "repo");
      to.searchParams.set("state", state);
      return Response.redirect(to.toString(), 302);
    }

    // 2) GitHub 에서 돌아온 뒤: 토큰 교환
    if (pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return resultPage("error", { message: "코드를 받지 못했습니다." });
      try {
        const res = await fetch(GITHUB_TOKEN, {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json", "user-agent": "gonggan-cms-auth" },
          body: JSON.stringify({
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            code,
          }),
        });
        const data = await res.json();
        if (data.error || !data.access_token) {
          return resultPage("error", { message: data.error_description || data.error || "토큰 교환 실패" });
        }
        return resultPage("success", { token: data.access_token, provider: "github" });
      } catch (e) {
        return resultPage("error", { message: String(e) });
      }
    }

    // 3) 그 밖의 주소: 정적 홈페이지 전달
    return env.ASSETS.fetch(request);
  },
};
