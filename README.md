# 사단법인 공간 홈페이지

https://gonggan.org

## 글 올리기 (관리자)

1. https://gonggan.org/admin/ 에 들어가 **GitHub로 로그인**합니다.
2. 왼쪽 메뉴에서 공지사항, 회원소식 등을 골라 **새로 만들기**를 누릅니다.
3. 제목·날짜·본문을 쓰고 **저장(게시)** 을 누르면 1~2분 뒤 홈페이지에 나타납니다.

인사말, 임원 명단, 연락처, 협력기관은 **기본 정보·고정 내용**에서 고칩니다.

## 구조

| 폴더 | 내용 |
|---|---|
| `src/news/notice`, `src/news/member` | 공지사항, 회원소식 |
| `src/research` | 연구·정책 자료 (PDF) |
| `src/programs`, `src/projects` | 교육 공고, 현장지원·위탁 사업 |
| `src/events` | 포럼·세미나 |
| `src/_data` | 기본 정보, 인사말, 임원, 협력기관, 주요사업 6개 |
| `src/uploads` | 관리자 페이지에서 올린 사진·파일 |
| `src/admin` | 관리자 페이지 (Decap CMS) 설정 |
| `src/assets/style.css` | 디자인. 대표 색은 맨 위 `--accent` 한 줄 |

## 개발자용

```bash
npm install
npm start      # http://localhost:8080 미리보기
npm run build  # _site 폴더에 결과물
```

배포: Cloudflare Pages (빌드 명령 `npm run build`, 출력 폴더 `_site`).
