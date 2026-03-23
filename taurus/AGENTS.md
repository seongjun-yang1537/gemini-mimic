[codex] 2026-03-23 작업 메모
- taurus/index.js는 CLI 진입점이 아니라 백엔드에서 import 가능한 모듈 형태를 우선한다.
- Veo 모델 고정값은 veo-3.1-generate-preview를 유지한다.
- 시나리오 분할 모델은 gemini-3-flash-preview를 유지한다.
- 레퍼런스 이미지는 최대 3장만 허용하고 referenceType은 asset을 유지한다.
- extension 전 30초 대기, polling 간격 10초, 최대 길이 148초(확장 20회) 제약을 유지한다.
- 코드 작성 시 불필요한 주석을 추가하지 않는다.
[codex] 2026-03-23 추가 메모
- taurus/index.js는 원본 참고용으로 유지하고, 재사용 API는 별도 파일(taurus/api.js)로 관리한다.
[codex] 2026-03-23 추가 메모 2
- taurus/api.js의 pollOperation 시그니처는 callbacks 외에 pollConfig(maxPollAttempts, maxPollMs, pollIntervalMs)를 받아 종료 한도를 강제한다.
- generateInitialVideo/extendVideo/createTaurusApi.generateVideo 호출 흐름에서 동일 pollConfig를 전달해 구간별 폴링 동작을 일관화했다.
