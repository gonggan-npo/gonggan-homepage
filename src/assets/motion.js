// 사단법인 공간 — 화면 효과 (스크롤 등장, 상단 메뉴, 읽기 진행 막대)
// 움직임 줄이기 설정을 켠 사용자에게는 효과를 적용하지 않습니다.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1) 상단 메뉴: 스크롤하면 그림자, 맨 위 진행 막대
  var hd = document.querySelector(".hd");
  var bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  function onScroll() {
    var y = window.scrollY;
    if (hd) hd.classList.toggle("scrolled", y > 8);
    var max = root.scrollHeight - window.innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (reduce || !("IntersectionObserver" in window)) {
    root.classList.add("motion-off");
    return;
  }

  // 2) 스크롤하면 차례로 떠오르는 요소들
  var groups = [
    ".ph-in > *", ".head-row", ".sec > .stack", ".rim", ".mission", ".stem", ".foot",
    ".space-row", ".card", ".band", ".news-card", ".partners > *", ".logos > *",
    ".tile", ".list-top .item", ".step", ".greet .ph-img", ".greet .txt",
    ".mini-rim", ".mini-missions > *", ".chips", ".org-chart", ".org-units > *",
    ".facts", ".map", ".stages > *", ".biz-list > *", ".read-head", ".read .content",
    ".events > *", ".table-wrap", ".join", ".h2", ".flags > *", ".road-step", ".biz-item"
  ];
  var hero = document.querySelector(".hero");
  var curtain = document.querySelector(".curtain");
  var fx = !!(hero && curtain);
  var els = document.querySelectorAll(groups.join(","));
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      (e.target._rv || [e.target]).forEach(reveal);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  function reveal(t) {
      t.classList.add("in");
      // 등장이 끝나면 원래 마우스오버 효과로 돌려 놓기
      t.addEventListener("transitionend", function done(ev) {
        if (ev.target !== t || ev.propertyName !== "opacity") return;
        t.classList.remove("rv", "in");
        t.style.removeProperty("--d");
        t.removeEventListener("transitionend", done);
      });
  }

  els.forEach(function (el) {
    if (el.closest(".hero")) return;
    if (fx && el.classList.contains("space-row")) return;
    // 같은 줄의 형제들은 조금씩 늦게 등장
    var i = 0, s = el.previousElementSibling;
    while (s && i < 6) { if (s.classList.contains("rv")) i++; s = s.previousElementSibling; }
    el.classList.add("rv");
    el.style.setProperty("--d", i * 80 + "ms");
    // 잘려서 가려진 제목은 감싼 상자가 보일 때 함께 등장
    var target = el.classList.contains("h2") ? el.parentElement : el;
    if (target !== el) { (target._rv = target._rv || [target].filter(function (x) { return x.classList.contains("rv"); })).push(el); }
    io.observe(target);
  });

  // 3) 메인 화면 스크롤 전환
  if (fx) setupHome();
  function setupHome() {
    root.classList.add("fx");
    var heroIn = hero.querySelector(".hero-in");
    var dark = document.querySelector(".dark");
    var rows = document.querySelectorAll(".space-row");
    var mint = document.querySelector(".mint");
    var ticking = false;

    function layout() {
      // 첫 화면 아래쪽이 화면 바닥에 닿으면 그 자리에 멈춤
      hero.style.top = Math.min(0, window.innerHeight - hero.offsetHeight) + "px";
      update();
    }
    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function update() {
      ticking = false;
      var vh = window.innerHeight;

      // 첫 화면: 커튼이 덮을수록 살짝 작아지고 흐려짐
      // 맨 위에서는 효과 없이 또렷하게, 내린 만큼만 변화
      var p = clamp(window.scrollY / hero.offsetHeight);
      if (p <= 0) {
        heroIn.style.transform = "";
        heroIn.style.opacity = "";
      } else {
        heroIn.style.transform = "translateY(" + (-p * 60).toFixed(1) + "px) scale(" + (1 - p * 0.08).toFixed(4) + ")";
        heroIn.style.opacity = String(1 - p * 0.6);
      }

      // SPACE 영역: 아래에서 올라오며 둥근 카드 → 화면 가득
      if (dark) {
        var r = dark.getBoundingClientRect();
        var q = clamp((vh - r.top) / (vh * 0.8));
        var max = window.innerWidth > 720 ? 48 : 16;
        dark.style.setProperty("--inset", ((1 - q) * max).toFixed(1) + "px");
        dark.style.setProperty("--round", ((1 - q) * 40).toFixed(1) + "px");
      }

      // 화면 가운데에 가장 가까운 SPACE 줄 강조
      var mid = vh * 0.5, best = null, bestD = 1e9;
      rows.forEach(function (row) {
        var b = row.getBoundingClientRect();
        var d = Math.abs(b.top + b.height / 2 - mid);
        if (d < bestD) { bestD = d; best = row; }
      });
      rows.forEach(function (row) { row.classList.toggle("act", row === best && bestD < vh * 0.45); });

      // 주요사업: 화면 절반쯤 들어오면 배경이 민트로 물듦
      if (mint) {
        var m = mint.getBoundingClientRect();
        if (m.top < vh * 0.6) mint.classList.add("lit");
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", layout);
    layout();
  }

  // 검색으로 다시 나타나는 목록 항목은 바로 보이게
  document.addEventListener("input", function (e) {
    if (e.target.id === "q") document.querySelectorAll(".list-top .item.rv").forEach(function (el) { el.classList.remove("rv"); });
  });
})();
