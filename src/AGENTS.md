[codex] 2026-03-23 라우팅 분리 메모
- src/server.js는 프로세스 시작과 HTTP 서버 listen, 서비스 조립만 담당하도록 단순화했다.
- src/app/createApp.js에서 express 인스턴스 생성, 공통 미들웨어(json/static), 도메인 라우터 마운트, 에러 미들웨어 연결을 담당한다.
- src/routes/에 run/prompt/asset/settings/web 라우터를 팩토리 함수 형태로 분리해 의존성을 외부 주입받도록 구성했다.
