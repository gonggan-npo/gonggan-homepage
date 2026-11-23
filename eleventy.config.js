// 사단법인 공간 홈페이지 빌드 설정 (Eleventy)
const markdownIt = require("markdown-it");
const md = markdownIt({ html: true, breaks: true, linkify: true });

module.exports = function (eleventyConfig) {
  eleventyConfig.setLibrary("md", md);
  // 관리자 페이지에서 쓴 긴 글(인사말 등)을 문단으로 바꿈
  eleventyConfig.addFilter("markdown", (s) => md.render(String(s || "")));

  // 그대로 복사할 파일: 스타일, 관리자 페이지, 업로드한 사진·문서
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.ignores.add("src/admin/**");
  eleventyConfig.addPassthroughCopy({ "src/uploads": "uploads" });

  // 날짜 표시: 2026.11.23
  const pad = (n) => String(n).padStart(2, "0");
  const toDate = (d) => (d instanceof Date ? d : new Date(d));
  eleventyConfig.addFilter("ymd", (d) => {
    const x = toDate(d);
    return `${x.getFullYear()}.${pad(x.getMonth() + 1)}.${pad(x.getDate())}`;
  });
  eleventyConfig.addFilter("ym", (d) => {
    const x = toDate(d);
    return `${x.getFullYear()}.${pad(x.getMonth() + 1)}`;
  });
  eleventyConfig.addFilter("day", (d) => pad(toDate(d).getDate()));

  // 본문 첫 부분 미리보기 (HTML·마크다운 기호 제거)
  eleventyConfig.addFilter("excerpt", (content, len = 80) => {
    const text = String(content || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#*_>\[\]()!`-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > len ? text.slice(0, len) + "…" : text;
  });

  // 주소에 쓸 파일 이름 (날짜 포함, 겹치지 않게)
  eleventyConfig.addFilter("basename", (p) => String(p).split("/").pop().replace(/\.[^.]+$/, ""));

  // 앞에서 n개만
  eleventyConfig.addFilter("latest", (arr, n) => (arr || []).slice(0, n));

  const byDateDesc = (a, b) => b.date - a.date;
  const pinnedFirst = (a, b) =>
    (b.data.pinned ? 1 : 0) - (a.data.pinned ? 1 : 0) || byDateDesc(a, b);

  // 소식: 공지사항 + 회원소식
  eleventyConfig.addCollection("notice", (api) =>
    api.getFilteredByGlob("src/news/notice/*.md").sort(pinnedFirst)
  );
  eleventyConfig.addCollection("member", (api) =>
    api.getFilteredByGlob("src/news/member/*.md").sort(byDateDesc)
  );
  eleventyConfig.addCollection("news", (api) =>
    api
      .getFilteredByGlob(["src/news/notice/*.md", "src/news/member/*.md"])
      .sort(pinnedFirst)
  );

  // 주요사업·네트워크 자료
  eleventyConfig.addCollection("research", (api) =>
    api.getFilteredByGlob("src/research/*.md").sort(byDateDesc)
  );
  eleventyConfig.addCollection("programs", (api) =>
    api.getFilteredByGlob("src/programs/*.md").sort(byDateDesc)
  );
  eleventyConfig.addCollection("projects", (api) =>
    api.getFilteredByGlob("src/projects/*.md").sort(byDateDesc)
  );
  eleventyConfig.addCollection("events", (api) =>
    api.getFilteredByGlob("src/events/*.md").sort(byDateDesc)
  );

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
