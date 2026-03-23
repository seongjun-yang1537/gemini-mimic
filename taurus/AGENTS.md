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
- taurus/api.js의 polling 루프에 MAX_POLLS(60) 하드리밋을 추가해 무한 폴링을 방지했다.
- taurus API 호출 경로(split/generate/poll/download)에 onApiCall 훅을 넣어 상위 파이프라인에서 글로벌 API 카운터를 적용할 수 있게 했다.
[codex] 2026-03-23 추가 메모 3
- taurus/api.js pollOperation은 pollIntervalMs/maxPollAttempts/maxPollMs 옵션을 받아 시도 횟수와 경과 시간을 동시에 제한한다.
- poll timeout 에러 메시지에 operation 식별자와 누적 attempts/elapsedMs를 포함해 원인 추적성을 높였다.
- generateInitialVideo/extendVideo/createTaurusApi.generateVideo에서 동일 폴링 제한값을 전달하도록 정렬했다.
