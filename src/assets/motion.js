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
    ".events > *", ".table-wrap", ".join"
  ];
  var els = document.querySelectorAll(groups.join(","));
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var t = e.target;
      t.classList.add("in");
      io.unobserve(t);
      // 등장이 끝나면 원래 마우스오버 효과로 돌려 놓기
      t.addEventListener("transitionend", function done(ev) {
        if (ev.target !== t || ev.propertyName !== "opacity") return;
        t.classList.remove("rv", "in");
        t.style.removeProperty("--d");
        t.removeEventListener("transitionend", done);
      });
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  els.forEach(function (el) {
    if (el.closest(".hero")) return;
    // 같은 줄의 형제들은 조금씩 늦게 등장
    var i = 0, s = el.previousElementSibling;
    while (s && i < 6) { if (s.classList.contains("rv")) i++; s = s.previousElementSibling; }
    el.classList.add("rv");
    el.style.setProperty("--d", i * 80 + "ms");
    io.observe(el);
  });

  // 검색으로 다시 나타나는 목록 항목은 바로 보이게
  document.addEventListener("input", function (e) {
    if (e.target.id === "q") document.querySelectorAll(".list-top .item.rv").forEach(function (el) { el.classList.remove("rv"); });
  });
})();
