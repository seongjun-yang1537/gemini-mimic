[codex] 2026-03-23 작업 메모
- 현재 저장소는 Node.js 기반이며 서버 진입점은 src/server.js를 사용한다.
- API는 Express + WebSocket(ws) 기반으로 /api/run, /api/prompts, /ws/run/:id 경로를 제공한다.
- 실행 기록은 outputs/runs.json 파일에 저장된다.
- 프롬프트 파일은 prompts/<phase>/*.md 구조로 관리한다.
- taurus/api.js 모듈을 백엔드에서 import하여 Veo 생성 로직을 재사용한다.
- 정적 UI 파일은 public/ 아래에서 제공한다.
[codex] 2026-03-23 추가 메모 2
- 정적 라우팅은 /run/:id, /run/:id/result, /prompts 경로를 사용하고 각각 public/run.html, public/result.html, public/prompts.html을 반환한다.
- 대시보드 실행 목록에서 모니터링(/run/:id)과 결과(/run/:id/result) 화면으로 바로 이동할 수 있다.
- run.html은 전문가 패널/토론 로그/정리 결과/미디어 프리뷰를 분리해 WebSocket 이벤트를 실시간 반영한다.
[codex] 2026-03-23 추가 메모 3
- Gemini API 키 로딩은 src/config/environment.js에서 .env(프로젝트 루트) 기준으로 중앙 관리한다.
- 서버 시작 시 GeminiClient 생성 전에 GEMINI_API_KEY 존재 여부를 검증하고, 누락 시 .env 설정 안내 오류를 반환한다.
[codex] 2026-03-23 추가 메모 4
- 에셋 메타데이터 저장소는 outputs/assets.json 파일을 사용하며 AssetStore(src/store/assetStore.js)에서 CRUD를 담당한다.
- 에셋 실파일 루트는 assets/이며 category별 하위 폴더(inputs, references, generated/images, generated/videos, exports)를 AssetService에서 자동 생성·관리한다.
- 에셋 API는 src/server.js에 /api/assets 계열 엔드포인트(GET 목록/상세/파일/썸네일, POST 업로드, PATCH 수정, DELETE 삭제, resolve 단건/프롬프트)를 제공한다.
- 프롬프트 내 @태그는 AssetService.resolvePrompt/buildGeminiPartsFromPrompt와 GeminiClient 연동으로 inline_data 첨부 파트로 자동 변환된다.
- 정적 에셋 관리 화면은 /assets 경로(public/assets.html)로 제공되고, 대시보드(public/index.html) 상단에서 바로 이동 가능하다.
- 프롬프트 편집기(public/prompts.html)는 @ 입력 시 /api/assets 목록 기반 태그 자동완성 드롭다운을 제공한다.
[codex] 2026-03-23 추가 메모 5
- Express 5 환경에서는 src/server.js의 catch-all 라우트에 "*"를 직접 사용할 수 없고 "/{*fallbackPath}" 형태를 사용해야 서버 부팅 시 path-to-regexp 오류가 발생하지 않는다.
[codex] 2026-03-23 추가 메모 6
- 사용자 요구로 public/index.html에 실행/프롬프트/에셋 화면을 탭 기반 통합 대시보드로 구성했고, /prompts·/assets는 iframe으로 메인에서 직접 전환해 사용하도록 반영했다.
[codex] 2026-03-23 추가 메모 7
- 설정 시스템은 config/config.json 파일을 사용하며 src/services/settingsService.js에서 기본값 병합, 부분 업데이트, 카테고리/전체 초기화, 유효성 검증을 처리한다.
- 설정 API는 src/server.js에 /api/settings(GET, PATCH), /api/settings/defaults(GET), /api/settings/reset(POST)로 추가되었고 /settings 정적 라우트(public/settings.html)를 제공한다.
- 파이프라인 실행 시 src/store/runStore.js의 run 레코드에 configSnapshot을 저장하고 src/services/pipelineOrchestrator.js에서 설정 기반 라운드 수/전문가 활성화/반복 횟수/영상 파라미터를 반영한다.
[codex] 2026-03-23 추가 메모 8
- run 단위 안전장치로 src/services/runSafety.js에 ApiGuard(호출수 제한)와 CostTracker(토큰/비용 누적)를 추가했고, 파이프라인 실행 중 tokenUsage/apiCallUsage를 run 레코드와 WebSocket usage_update 이벤트로 갱신한다.
- src/services/pipelineOrchestrator.js는 safety 설정값을 읽어 전체 파이프라인 타임아웃(최대 60분)과 phase별 타임아웃(1:5분,2:5분,3:20분,4:3분 + 코드 하드리밋)을 적용한다.
- debate 라운드는 src/services/debateEngine.js에서 하드리밋 10으로 강제하고, phase3 재생성은 src/services/pipelineOrchestrator.js에서 하드리밋 10으로 강제한다.
- settings 기본값/스키마에 safety.maxApiCallsPerRun(200), safety.maxCostPerRunUsd(10), safety.pipelineTimeoutMinutes(30)를 추가했다.
[codex] 2026-03-23 추가 메모 9
- video 설정에 pollTimeoutMs(기본 1800000ms), maxPollAttempts(기본 180)을 추가했고 settings 스키마/검증에 연결했다.
- SettingsService 검증에 video.pollTimeoutMs >= video.pollInterval 제약을 추가했다.
- 파이프라인의 taurusApi.generateVideo 호출은 pollIntervalMs/maxPollAttempts/maxPollMs를 runtimeConfig.video에서 전달해 폴링 제한값을 일관 적용한다.
- src/services/pipelineOrchestrator.js의 execute catch 블록에서 실패 시 status/failedAt/failedPhase/errorMessage를 run 레코드에 함께 저장한다.
- executeWithTimeout은 예외에 failedPhase가 없으면 현재 phase 번호를 주입해 실패 원인 추적이 가능하다.
- public/index.html 실행 목록은 failed 상태에서 errorMessage를 한 줄로 렌더링한다.
- src/services/pipelineOrchestrator.js의 phase2는 생성된 레퍼런스 이미지 파일 존재 여부를 확인해 referenceSheets를 동적으로 저장하며, 파일이 없으면 빈 배열로 기록한다.
- phase2에서 레퍼런스 이미지가 없을 때 WebSocket pipeline_error 이벤트로 "레퍼런스 이미지 파일 없음" 메시지를 발행해 UI가 원인을 안내할 수 있게 한다.
- phase3 영상 생성 옵션은 존재하는 레퍼런스 이미지 경로만 referenceImages로 전달하고, 배열이 비어 있으면 referenceImages 옵션 자체를 생략한다.
- public/run.html은 pipeline_error 수신 시 레퍼런스 이미지 누락 메시지를 사용자 친화 문구로 변환해 표시한다.

[codex] 2026-03-23 추가 메모 10
- Gemini 텍스트 기본 모델 기본값을 더 이상 존재하지 않는 gemini-3-pro에서 gemini-3.1-pro-preview로 변경했다.
- 분할용 splitModel 기본값/선택지도 gemini-3.1-flash-lite-preview 중심으로 갱신해 모델 not found(404) 가능성을 낮췄다.
- settings 스키마의 gemini.model 옵션에서 gemini-3-pro를 제거하고 현재 가격 문서에 노출된 유효 모델명을 반영했다.
[codex] 2026-03-23 추가 메모 11
- src/services/pipeline/ 디렉터리를 추가해 phase 실행기를 파일별로 분리했다(phase1Runner.js~phase4Runner.js).
- src/services/pipeline/constants.js로 phase timeout map, pipeline timeout hard limit, phase3 반복 hard limit를 이동했다.
- src/services/pipelineOrchestrator.js는 phase 순서 제어, executeWithTimeout, 공통 상태 업데이트, 공통 websocket 이벤트 발행, 실패 메타 기록 처리만 담당하도록 정리했다.
