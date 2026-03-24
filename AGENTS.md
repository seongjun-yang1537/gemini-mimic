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
- package.json scripts에 lint(eslint), test(node --test), test:api(node scripts/api-smoke.js)를 추가해 로컬 최소 검증 루틴을 표준화했다.
- test/ 디렉터리에 SettingsService.validateConfig 경계값, RunStore CRUD, PipelineOrchestrator.executeWithTimeout 실패 phase 주입 단위 테스트를 추가했다.
- scripts/api-smoke.js는 임시 작업 디렉터리에서 서버를 실행해 /api/settings, /api/prompts, /api/run 핵심 라우트를 smoke 검증한다.
- GitHub Actions CI(.github/workflows/ci.yml)는 npm ci 후 npm run lint && npm run test를 필수 게이트로 실행한다.
- PR 템플릿(.github/pull_request_template.md)에 영향받는 API 엔드포인트/실행 확인 명령/롤백 포인트 체크리스트를 추가했다.
- 공통 HTTP 에러 포맷을 src/http/errors/AppError.js로 분리해 status/message/code/details를 표준화했고, 응답에는 기존 호환 필드 error를 유지한다.
- 요청 검증을 src/http/middlewares/validateRequest.js로 분리해 /api/settings, /api/prompts/*, /api/assets/upload 등 주요 라우트의 body/query/params 검증을 핸들러 이전 단계로 이동했다.
- 라우트 비동기/예외 처리를 src/http/middlewares/errorHandler.js의 asyncRoute + 전역 errorHandler로 통합해 중복 try/catch를 줄이고 next(error) 경로로 일원화했다.
- src/services/pipeline/ 디렉터리를 추가해 phase 실행기를 파일별로 분리했다(phase1Runner.js~phase4Runner.js).
- src/services/pipeline/constants.js로 phase timeout map, pipeline timeout hard limit, phase3 반복 hard limit를 이동했다.
- src/services/pipelineOrchestrator.js는 phase 순서 제어, executeWithTimeout, 공통 상태 업데이트, 공통 websocket 이벤트 발행, 실패 메타 기록 처리만 담당하도록 정리했다.
[codex] 2026-03-23 추가 메모 12
- 서버 엔트리포인트를 경량화하기 위해 src/app/createApp.js를 도입해 공통 미들웨어와 라우터 조립을 분리했다.
- API 라우터는 src/routes/runRoutes.js, promptRoutes.js, assetRoutes.js, settingsRoutes.js로 도메인 단위 분리했고, 모두 createXxxRoutes({ ...deps }) 형태의 의존성 주입 팩토리를 사용한다.
- 정적 페이지 라우트는 src/routes/webRoutes.js로 분리해 /run/:id, /run/:id/result, /prompts, /assets, /settings, /{*fallbackPath}를 전담한다.

[codex] 2026-03-23 추가 메모 13
- 사용자 요청으로 GitHub Actions CI 워크플로우 파일(.github/workflows/ci.yml)을 제거해 push/pull_request 자동 lint/test 실행을 비활성화했다.
[codex] 2026-03-23 추가 메모 13
- RunStore(src/store/runStore.js)와 PromptService(src/services/promptService.js)를 Promise 기반 비동기 API로 전환했다.
- 대량 변경 전 시그니처/호출 지점을 `rg "createRun\(|updateRun\(|listPrompts\(" -n src test scripts`로 점검해 runRoutes/promptRoutes/pipelineOrchestrator/pipeline runners/test(runStore) 반영 범위를 확인했다.
- RunStore는 in-process 직렬화 큐(fileAccessQueue)로 파일 접근을 순차 처리해 동시 updateRun 호출 시 덮어쓰기 충돌을 방지한다.
[codex] 2026-03-23 추가 메모 14
- 공통 라이트 테마 디자인 토큰과 기본 컴포넌트 스타일을 public/styles.css로 분리해 index/run/prompts 화면에서 재사용한다.
- public/index.html은 다크 Tailwind 기반 탭 UI를 사이드바(240px)+메인 구조로 교체하고, 실행 카드/상태 뱃지/업로드 드롭존/최근 실행 목록을 Claude 스타일의 플랫 보더 디자인으로 반영했다.
- public/run.html은 상태 바, 전문가 패널, 토론 버블, 라운드 구분선, 최종 시나리오 강조 박스를 포함한 모니터링 레이아웃으로 재구성했다.
- public/prompts.html은 좌측 전문가 리스트+우측 모노스페이스 에디터 구조로 재구성하고, 수정됨 배지와 @태그 자동완성 드롭다운을 라이트 테마에 맞게 정리했다.
- 운영자 전용 .env 오버라이드 로더를 src/config/environment.js에 추가해 VIDEO_MODEL, VIDEO_SPLIT_MODEL, IMAGE_MODEL, FFMPEG_PATH, SAFETY_MAX_API_CALLS, SAFETY_MAX_COST_USD, SAFETY_PIPELINE_TIMEOUT_MINUTES를 설정 병합에 사용할 수 있도록 했다.
- SettingsService는 설정 우선순위를 코드 기본값 < config.json < 운영자 .env 오버라이드 순으로 적용하도록 readConfig/getDefaultConfig 병합 순서를 명시했다.
- SETTINGS_SCHEMA에 운영자 전용 필드(hidden/readOnly)를 표시했고 settings UI는 hidden 항목을 렌더링에서 제외하며 readOnly 배지를 노출한다.
- /api/settings 응답은 hidden/sensitive 스키마 정책에 따라 운영자 전용 값은 제외하고 민감 스키마는 마스킹 정책을 반영해 전달한다.
[codex] 2026-03-23 추가 메모 15
- /api/run은 영상 업로드(video) 외에 기존 에셋 선택(inputAssetId)과 텍스트 입력(inputText) 기반 실행을 지원하며, 최소 1개 입력(영상 또는 텍스트)이 필요하다.
- /api/run 요청에서 referenceAssetIds(JSON 배열/콤마 문자열)를 받아 이미지 에셋 유효성 검증 후 run 레코드(selectedReferenceAssets)에 저장한다.
- public/index.html 실행 폼은 MP4/WEBM 업로드, 서버 저장 영상 에셋 선택, 다중 레퍼런스 이미지 선택, 텍스트 입력을 함께 제공한다.
- run 모니터링 화면(public/run.html)에 상단 상태 탑바를 추가해 진행 상태 스피너/펄스 인디케이터를 노출하고, 실시간 실행/완료/실패/취소 상태를 명확히 표시하도록 갱신했다.
- 실행 중 취소 버튼을 추가했고 POST /api/run/:id/cancel API와 연동해 사용자가 진행 중인 파이프라인을 중단할 수 있게 했다.
[codex] 2026-03-23 추가 메모 16
- 대시보드 입력 UX를 Prompt Input & File Browser 구조로 개편해 하단 고정 입력 바, 첨부 프리뷰 스트립, 📎 드롭다운, 서버 드라이브 모달(검색/정렬/그리드·리스트/브레드크럼)을 통합했다.
- 서버 측에 src/routes/driveRoutes.js를 추가해 /api/drive/* 탐색·검색·썸네일·프리뷰·스트리밍, /api/upload, /api/generate 엔드포인트를 제공하도록 확장했다.
[codex] 2026-03-23 추가 메모 17
- 사용자 요청으로 public/index.html을 Hello World 단일 화면으로 단순화했다.
- 사용자 요청으로 taurus/index.js를 제외한 .js 파일들을 정리해 초기 재구축 시작 상태로 맞췄다.

# Mimic — 서비스 계획서

## 한 줄 요약

밈 영상을 넣으면 AI 전문가들이 토론해서 마케팅 크리에이티브 영상을 자동으로 만들어주는 웹 앱.

---

## 배경

템빨용사(Backpack Arena) 리브랜딩/리런칭을 위해 마케팅 크리에이티브 영상을 대량으로 만들어야 한다. 현재 수작업으로 하고 있는 파이프라인을 자동화한다.

현재 수작업 파이프라인:
1. 밈 영상을 가져와서 텍스트로 분석
2. 여러 관점에서 영상 시나리오를 만듦
3. 레퍼런스 이미지를 정리 (Veo3는 레퍼런스 3장 제한)
4. Veo3로 영상 생성, 결과물 판별, 필요시 재생성
5. ffmpeg로 간단한 편집 (화면 분할, 이어 붙이기 등)

이걸 전부 자동화한다.

---

## 이름

**Mimic** (meme + mimic) — 밈을 모방·학습해서 새로운 크리에이티브를 만든다는 뜻.

---

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 프론트 | React + TypeScript + Tailwind | 익숙함 |
| 백엔드 | Node.js + Express + TypeScript | Taurus가 Node.js 기반 |
| 실시간 | WebSocket | 파이프라인 진행 상태 스트리밍 |
| LLM | Gemini 3 Pro | 회사 API 키 사용 |
| 영상 생성 | Veo 3.1 (Taurus 모듈 리팩토링) | 기존에 만들어둔 CLI 도구 활용 |
| 이미지 생성 | Imagen (Gemini API 경유) | Gemini 생태계 |
| 영상 편집 | ffmpeg | 로컬 실행, 무료 |
| 프롬프트 저장 | .md 파일 (prompts/ 폴더) | git 추적 가능 |
| 실행 기록 | JSON 파일 (data/runs/) | DB 없이 간단하게 |
| UI 디자인 | Claude 웹앱(claude.ai) 스타일 | 깔끔, 플랫, 여백 넉넉 |

---

## 파이프라인 4단계

### Phase 1 — 밈 영상 분석 + 시나리오 확정

```
밈 영상 입력
    ↓
전문가 5명 병렬 분석 (Gemini 멀티모달)
    ↓
토론 진행자 → 삼세판 토론 (3라운드)
    ↓
정리 전문가 → 최종 시나리오 확정
```

전문가 5명:
- 훅 전문가 — 첫 3초 임팩트
- 스토리 전문가 — 서사 구조
- CTA 전문가 — 전환 유도 포인트
- 행동 묘사 전문가 — 동작/액션을 시나리오화
- 캐릭터 묘사 전문가 — 외형/특징을 프롬프트화

토론 구조:
- 토론 진행자가 쟁점 정리 + 반론 유도
- 삼세판 (3라운드) — 전문가 간 반박/보완
- 정리 전문가가 합의 결과를 시나리오로 문서화

### Phase 2 — 레퍼런스 시트 생성

- 레퍼런스 구성 전문가가 필요 에셋 목록 도출
- Imagen으로 이미지 생성 또는 기존 에셋을 합성
- Veo3 레퍼런스 3장 제한에 맞춰 자동 레이아웃

### Phase 3 — 영상 생성 + 토론 기반 이터레이션

```
Veo3 영상 생성 (Taurus 모듈)
    ↓
평가 전문가 3명 분석 (멀티모달)
    ↓
토론 진행자 → 삼세판 토론 (3라운드)
    ↓
합격 → Phase 4로
불합격 → 수정 지시서 반영 → 재생성 (루프)
```

평가 전문가 3명:
- 행동 묘사 평가 — 동작 자연스러움
- 캐릭터 평가 — 외형 일관성
- 시나리오 정합성 — 원본 대비 충실도

### Phase 4 — 영상 편집

- 편집 전문가가 편집 명세를 JSON으로 출력
- ffmpeg로 실행 (분할/합성/비율 조정)
- 최종 크리에이티브 출력

---

## 핵심 기능

### 토론 시스템

Phase 1과 Phase 3에서 동일한 패턴 사용:
1. 전문가 패널 병렬 분석/평가
2. 토론 진행자 — 쟁점 정리, 반론 유도
3. 삼세판 토론 (3라운드, 설정에서 변경 가능)
4. 정리 전문가 — 결과 문서화

### 프롬프트 관리

- 각 전문가의 시스템 프롬프트를 .md 파일로 관리 (총 13개+)
- 웹 UI에서 직접 편집 가능
- AI 피드백 업데이트: 자연어로 피드백 주면 Gemini가 프롬프트를 자동 수정

### 에셋 관리

- 입력 밈 영상, 게임 에셋, 생성물을 폴더별로 관리
- 모든 에셋에 `@태그ID` 부여
- 프롬프트에서 `@hero_char` 형태로 참조하면 Gemini API에 자동 주입
- 프롬프트 에디터에서 `@` 입력 시 자동완성

### 설정 커스터마이징

- 토론 라운드 수, 전문가 on/off, 모델 선택, temperature 등
- 웹 UI에서 변경 가능
- 파이프라인 실행마다 설정 스냅샷 저장

### 실시간 모니터링

- WebSocket으로 파이프라인 진행 상태 실시간 스트리밍
- 전문가 분석 진행 중/완료 상태, 경과 시간
- 토론 로그를 채팅 형태로 실시간 표시
- API 호출 횟수, 토큰 사용량, 예상 비용 실시간 표시
- 에러 발생 시 즉시 인라인 표시 + 상세 모달

### 에러 핸들링

- 모든 에러에 컴포넌트(어디서), 메시지(뭐가), 상세(왜) 포함
- 전문가 1명 실패해도 나머지로 계속 진행
- 에러 타입별 복구 가이드 제공
- 실패한 파이프라인은 처음부터 또는 실패 지점부터 재실행 가능

### 안전장치

- run 1회당 API 호출 최대 50회 (Phase 1 기준)
- 토론 라운드 하드 리밋 10회
- 비용 추적: 임계치 초과 시 자동 중단
- Gemini API 자체 rate limit도 있어서 이중 방어

---

## 화면 구성

| 경로 | 화면 | 역할 |
|------|------|------|
| `/` | 대시보드 | 실행 목록 + 새 실행 |
| `/run/:id` | 모니터링 | 실시간 파이프라인 상태 |
| `/run/:id/result` | 결과 상세 | 완료된 run 전체 결과 |
| `/prompts` | 프롬프트 관리 | 전문가 프롬프트 편집 |
| `/assets` | 에셋 관리 | 파일 관리 + @태그 |
| `/settings` | 설정 | 커스터마이징 |

UI는 Claude 웹앱 스타일:
- 따뜻한 오프화이트 배경 (#FAFAF8)
- 그림자 없음, 보더만
- 토론 UI는 채팅 버블 형태
- 전문가별 컬러 dot으로 발언자 구분

---

## 비용

Gemini 3 Pro 기준:
- 크리에이티브 1건 풀 런 LLM 비용: ~$1~$2 (삼세판 토론 포함)
- 토론이 전체 비용에서 차지하는 비중은 아주 작음
- 진짜 비용은 Veo3 영상 생성
- 토론을 꼼꼼히 해서 재생성 횟수를 줄이는 게 비용 절감 포인트
- 회사 API 키 사용

---

## Taurus 연동

`/taurus/index.js` — 기존에 만들어둔 Veo 3.1 영상 생성 CLI 도구.

이 소스 코드를 참고하여 재사용 가능한 API 모듈로 리팩토링:
- 초기 영상 생성 (레퍼런스 이미지 최대 3장, 4/6/8초)
- Extension (7초 단위 확장, 최대 148초)
- 시나리오 분할 (긴 영상 시 Gemini로 세그먼트 분리)
- 생성 완료 polling
- 영상 다운로드

CLI exec가 아닌 @google/genai SDK 직접 사용.

---

## 코드 구조

객체 지향, 의존성 주입, 파일 분리:

```
src/
├── server.ts              # 엔트리포인트
├── routes/                # HTTP 라우터 (얇은 레이어)
├── core/                  # 비즈니스 로직 (Express 몰라도 됨)
│   ├── GeminiClient.ts    # Gemini API 단일 진입점
│   ├── Expert.ts          # 전문가 클래스
│   ├── DebateEngine.ts    # 토론 엔진 (Phase 1, 3 공통)
│   ├── Phase1Runner.ts    # Phase 1 오케스트레이터
│   ├── TaurusModule.ts    # 영상 생성
│   └── FFmpegModule.ts    # 영상 편집
├── services/              # 데이터 접근
│   ├── PromptService.ts
│   ├── AssetService.ts
│   ├── ConfigService.ts
│   └── RunService.ts
└── types/                 # 공유 타입 정의

client/src/
├── pages/                 # 라우팅 진입점 (6개 화면)
├── components/            # 순수 UI 컴포넌트
├── hooks/                 # 데이터 fetch + WebSocket
└── api/                   # fetch 래퍼
```

원칙:
- 한 파일에 한 클래스/컴포넌트
- 모든 의존성은 생성자 주입
- core/는 Express에 대해 모름
- components/는 API를 직접 호출하지 않음

---

## 구현 전략

한번에 큰 명세를 던지면 안 됨. 아주 작은 단위로 쪼개서 하나씩 검증하면서 올라간다.

```
Task 1:  빈 프로젝트 부팅 (Express + React "Hello Mimic")
Task 2:  Gemini API 호출 1회
Task 3:  프롬프트 파일 읽기/쓰기
Task 4:  Expert 클래스 (프롬프트 + Gemini 연결)
Task 5:  전문가 5명 병렬 호출
Task 6:  토론 1라운드
Task 7:  토론 3라운드 풀 실행
Task 8:  영상 파일 업로드 + 멀티모달 분석
Task 9:  영상 → 풀 파이프라인 (API만)
Task 10: WebSocket 실시간 이벤트
Task 11: 프론트 — 대시보드
Task 12: 프론트 — 모니터링 화면
Task 13: 프론트 — 프롬프트 관리
```

각 태스크에 curl 검증 명령어가 있어서 됐는지 안됐는지 바로 확인 가능.

Phase 1이 완성되면:
- Phase 2 (레퍼런스 시트)
- Phase 3 (영상 생성 + 토론 이터레이션) — 토론 엔진 재사용
- Phase 4 (영상 편집)
- 에셋 관리 + @태그
- 설정 시스템
순서로 확장.

---

## 명세 파일 목록

| 파일 | 내용 | 용도 |
|------|------|------|
| `AGENT.md` | 서비스 계획 전체 (이 파일) | 전체 맥락 파악 |
| `PHASE1_SPEC.md` | Phase 1 동작 + 백엔드 + 화면 | 코덱스 구현 명세 |
| `DESIGN_SPEC.md` | Claude 스타일 UI 디자인 | 코덱스 디자인 가이드 |
| `MONITOR_SPEC.md` | 모니터링 화면 상세 | 코덱스 UI 명세 |
| `TASKS.md` | 점진적 태스크 목록 | 코덱스 태스크 단위 |
| `ASSET_SPEC.md` | 에셋 관리 + @태그 | Phase 1 이후 확장 |
| `SETTINGS_SPEC.md` | 설정 시스템 | Phase 1 이후 확장 |
| `SAFETY_SPEC.md` | API 안전장치 | Phase 1 이후 확장 |
| `ARCHITECTURE_SPEC.md` | 코드 구조 + 클래스 설계 | Phase 1 이후 확장 |
| `ERROR_SPEC.md` | 에러 핸들링 + 디버깅 | Phase 1 이후 확장 |
| `VERIFY_SPEC.md` | 빌드/구동 검증 | 코덱스 검증 체크리스트 |

# AGENTS.md — Dark mode style guide

## Philosophy

Claude.ai 네이티브 스타일을 따른다. 핵심 원칙:

- **Flat**: 그라디언트, mesh background, noise texture, decorative shadow 금지. 깨끗한 단색 표면만 사용
- **Seamless**: 앱과 위젯의 경계가 느껴지지 않아야 한다
- **Dark mode mandatory**: 모든 색상은 라이트/다크 양쪽에서 작동해야 한다. 하드코딩 금지

---

## 1. CSS variables (필수 사용)

색상을 직접 하드코딩하지 않는다. 반드시 CSS 변수를 사용한다.

### Backgrounds

| Variable | 용도 |
|---|---|
| `--color-background-primary` | 카드, 메인 표면 (라이트: white, 다크: near-black) |
| `--color-background-secondary` | 서브 표면, metric card, surface |
| `--color-background-tertiary` | 페이지 배경 |
| `--color-background-info` | 정보 강조 배경 |
| `--color-background-danger` | 에러/위험 배경 |
| `--color-background-success` | 성공 배경 |
| `--color-background-warning` | 경고 배경 |

### Text

| Variable | 용도 |
|---|---|
| `--color-text-primary` | 본문, 제목 (라이트: black, 다크: white) |
| `--color-text-secondary` | 부제, 레이블, 힌트 |
| `--color-text-tertiary` | 플레이스홀더, 비활성 |
| `--color-text-info` | 링크, 정보 강조 |
| `--color-text-danger` | 에러 텍스트 |
| `--color-text-success` | 성공 텍스트 |
| `--color-text-warning` | 경고 텍스트 |

### Borders

| Variable | 용도 |
|---|---|
| `--color-border-tertiary` | 기본 보더 (opacity 0.15) |
| `--color-border-secondary` | hover 시 보더 (opacity 0.3) |
| `--color-border-primary` | 강조 보더 (opacity 0.4) |
| `--color-border-info` | 정보/선택 강조 |
| `--color-border-danger` | 에러 상태 |
| `--color-border-success` | 성공 상태 |
| `--color-border-warning` | 경고 상태 |

### Typography & Layout

```
--font-sans          기본 폰트
--font-serif         에디토리얼/인용문 전용
--font-mono          코드

--border-radius-md   8px (일반 요소)
--border-radius-lg   12px (카드, 주요 컴포넌트)
--border-radius-xl   16px (대형 컨테이너)
```

---

## 2. Color palette — 9 ramps × 7 stops

카테고리 색상에는 아래 팔레트를 사용한다. CSS 변수가 아닌 hex 값이지만, 라이트/다크 모드별로 지정된 stop을 따른다.

```
Ramp     50        100       200       400       600       800       900
Purple   #EEEDFE   #CECBF6   #AFA9EC   #7F77DD   #534AB7   #3C3489   #26215C
Teal     #E1F5EE   #9FE1CB   #5DCAA5   #1D9E75   #0F6E56   #085041   #04342C
Coral    #FAECE7   #F5C4B3   #F0997B   #D85A30   #993C1D   #712B13   #4A1B0C
Pink     #FBEAF0   #F4C0D1   #ED93B1   #D4537E   #993556   #72243E   #4B1528
Gray     #F1EFE8   #D3D1C7   #B4B2A9   #888780   #5F5E5A   #444441   #2C2C2A
Blue     #E6F1FB   #B5D4F4   #85B7EB   #378ADD   #185FA5   #0C447C   #042C53
Green    #EAF3DE   #C0DD97   #97C459   #639922   #3B6D11   #27500A   #173404
Amber    #FAEEDA   #FAC775   #EF9F27   #BA7517   #854F0B   #633806   #412402
Red      #FCEBEB   #F7C1C1   #F09595   #E24B4A   #A32D2D   #791F1F   #501313
```

### 라이트/다크 모드 stop 규칙

- **Light mode**: 50 fill + 600 stroke + 800 title + 600 subtitle
- **Dark mode**: 800 fill + 200 stroke + 100 title + 200 subtitle

### 색상 배경 위 텍스트

색상 배경(badge, pill, card, tag) 위의 텍스트는 반드시 **같은 ramp의 가장 어두운 stop(800/900)**을 사용한다.
절대로 plain black(`#000`), generic gray(`#333`, `#666`) 사용 금지 — 다크모드에서 보이지 않는다.

```
❌ color: #333               → 다크모드에서 안 보임
❌ color: black              → 다크모드에서 안 보임
✅ color: var(--color-text-primary)   → 자동 전환
✅ Blue 50 배경 → Blue 800 텍스트    → 양쪽 모드 OK
```

### 색상 할당 원칙

- 색상은 의미를 인코딩한다. 순서가 아니다 (무지개순 금지)
- 같은 카테고리의 노드는 같은 색을 공유
- 다이어그램당 2~3색 이내
- Gray: 중립/구조적 요소
- Purple, Teal, Coral, Pink: 일반 카테고리
- Blue, Green, Amber, Red: 시맨틱 의미가 있을 때만 (info/success/warning/error)

---

## 3. Typography

```css
/* Heading */
h1 { font-size: 22px; font-weight: 500; }
h2 { font-size: 18px; font-weight: 500; }
h3 { font-size: 16px; font-weight: 500; }

/* Body */
body { font-size: 16px; font-weight: 400; line-height: 1.7; }
```

### 규칙

- **font-weight는 400과 500만 사용**한다. 600, 700 절대 금지 — 호스트 UI와 어울리지 않는다
- 항상 **sentence case**. Title Case, ALL CAPS 금지
- **문장 중간 볼드 금지**. 엔티티명, 클래스명은 `code style`로 표시
- 최소 font-size: 11px. 그 이하 금지
- heading 색상은 `var(--color-text-primary)`에서 오버라이드하지 않는다

---

## 4. UI tokens

### Borders

```css
border: 0.5px solid var(--color-border-tertiary);   /* 기본 */
border: 0.5px solid var(--color-border-secondary);   /* hover, 강조 */
border: 2px solid var(--color-border-info);          /* featured item 유일한 예외 */
```

0.5px가 기본이다. 1px, 2px는 일반적으로 사용하지 않는다.
유일한 예외: featured/recommended 카드에 `2px solid var(--color-border-info)`.

### Corner radius

```css
border-radius: var(--border-radius-md);    /* 8px — 일반 요소, 버튼, 인풋 */
border-radius: var(--border-radius-lg);    /* 12px — 카드, 주요 컨테이너 */
border-radius: var(--border-radius-xl);    /* 16px — 대형 컨테이너 */
```

**한쪽 면만 border가 있으면 radius는 0**이다. `border-left` + `border-radius` 조합 금지.

### Cards

```css
/* Raised card — 주요 콘텐츠 */
background: var(--color-background-primary);
border: 0.5px solid var(--color-border-tertiary);
border-radius: var(--border-radius-lg);
padding: 1rem 1.25rem;

/* Surface card — metric, stat */
background: var(--color-background-secondary);
border: none;
border-radius: var(--border-radius-md);
padding: 1rem;
```

### Box shadows

원칙적으로 사용 금지. 유일한 예외는 focus ring:
```css
box-shadow: 0 0 0 2px var(--color-border-info);  /* focus ring만 허용 */
```

### Spacing

```
vertical rhythm: rem 단위 (1rem, 1.5rem, 2rem)
component 내부: px 단위 (8px, 12px, 16px)
```

---

## 5. 금지 목록 (절대 하지 않는다)

```
❌ 하드코딩 색상 (color: #333, background: white)
❌ 그라디언트 (linear-gradient, radial-gradient)
❌ Drop shadow, box-shadow (focus ring 제외)
❌ Blur, glow, neon 효과
❌ font-weight 600, 700, 800, 900
❌ Title Case, ALL CAPS
❌ 문장 중간 볼드
❌ font-size < 11px
❌ emoji (CSS shapes 또는 SVG로 대체)
❌ 외부 컨테이너에 dark/colored 배경 (투명만 허용)
❌ position: fixed (iframe 환경에서 레이아웃 붕괴)
❌ 한쪽 면 border + border-radius 조합
❌ 색상 배경 위에 black/gray 텍스트
```

---

## 6. 다크모드 검증 체크리스트

코드 작성 후 아래를 점검한다:

1. **배경이 near-black이라고 가정하고** 모든 텍스트가 읽히는가?
2. CSS 변수를 사용하지 않은 하드코딩 색상이 있는가?
3. 색상 배경 위 텍스트가 같은 ramp의 800/900 stop인가?
4. `#333`, `#666`, `white`, `black` 같은 직접 색상이 쓰인 곳은 없는가?
5. 그라디언트, shadow, blur가 사용된 곳은 없는가?
6. `prefers-color-scheme: dark` 미디어 쿼리가 필요한 곳에 적용되었는가?

---

## 7. 컴포넌트 패턴

### Metric card

```html
<div style="
  background: var(--color-background-secondary);
  border-radius: var(--border-radius-md);
  padding: 1rem;
">
  <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0 0 4px;">Revenue</p>
  <p style="font-size: 24px; font-weight: 500; margin: 0; color: var(--color-text-primary);">$1.2M</p>
</div>
```

### Badge / Pill

```html
<!-- 시맨틱 (info) -->
<span style="
  background: var(--color-background-info);
  color: var(--color-text-info);
  font-size: 12px;
  padding: 4px 12px;
  border-radius: var(--border-radius-md);
">Active</span>

<!-- 카테고리 (ramp 사용) — 라이트모드 -->
<span style="
  background: #E1F5EE;
  color: #085041;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: var(--border-radius-md);
">Teal badge</span>
```

카테고리 badge에는 `prefers-color-scheme: dark`로 다크모드 대응:
- Light: 50 fill + 800 text
- Dark: 800 fill + 100 text

### Avatar / Initials circle

```html
<div style="
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--color-background-info);
  display: flex; align-items: center; justify-content: center;
  font-weight: 500; font-size: 14px;
  color: var(--color-text-info);
">MR</div>
```

### Button

```html
<!-- 기본 (outline) -->
<button style="
  background: transparent;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  padding: 8px 16px;
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
">Action</button>
```

hover: `background: var(--color-background-secondary)`
active: `transform: scale(0.98)`

### Input / Form

```html
<input type="text" style="
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  font-size: 14px;
" placeholder="Search..." />
```

focus: `border-color: var(--color-border-info); box-shadow: 0 0 0 2px var(--color-background-info);`

---

## 8. Layout 패턴

### Grid (반응형 카드)

```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
gap: 12px;
```

overflow 방지: `minmax(0, 1fr)` 사용.

### Table

constrained layout(700px 이하)에서는 `table-layout: fixed` + 명시적 column width,
또는 horizontal scroll wrapper 사용.

### Modal / Overlay

`position: fixed` 금지. 대신:

```html
<div style="
  min-height: 400px;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
">
  <!-- modal content -->
</div>
```

---

## 9. Number formatting

화면에 표시되는 모든 숫자는 반드시 포맷팅한다:

```javascript
// 정수
Math.round(value)

// 소수점 N자리
value.toFixed(2)

// 통화
new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)

// 음수 통화: -$5M (O), $-5M (X)
const fmt = (v) => (v < 0 ? '-' : '') + '$' + Math.abs(v) + 'M';
```

range slider에는 `step` 속성 필수:

```html
<input type="range" min="0" max="100" step="1" />
```
[codex] 2026-03-23 추가 메모 18
- src/server.js 파일이 비어 있는 상태에서는 npm start가 MODULE_NOT_FOUND로 실패하므로, 최소 서버 엔트리포인트를 복구해 실행 가능 상태를 유지한다.
- 복구 엔트리포인트는 Express 정적 서빙(public), /api/health 상태 확인, Express 5 호환 catch-all('/{*fallbackPath}') 라우트를 포함한다.

[codex] 2026-03-23 추가 메모 19
- config/config.json의 Gemini API 키 하드코딩 값을 제거했고, API 키는 .env의 GEMINI_API_KEY로만 관리한다.
[codex] 2026-03-23 추가 메모 20
- public/index.html 대시보드 UI를 최신 명세에 맞춰 헤더 우측 공란, 첨부+전송 중심 입력 툴바, 작업/프롬프트/에셋/설정 4탭 구조로 정리했다.
- 대시보드 탭에서 상태 요약 pill을 제거하고 태스크 행 중심 정보만 남겨 단일 컬럼 집중 레이아웃을 유지했다.
[codex] 2026-03-23 추가 메모 21
- client/ 디렉터리를 Vite React TypeScript 템플릿으로 생성하고, tailwindcss + @tailwindcss/vite + react-router-dom을 설치했다.
- public/index.html의 대시보드 단일 HTML/CSS/JS를 client/src 기준 pages/components/hooks/types/constants/styles 구조로 분할했다.
- 대시보드 입력/첨부/@태그 자동완성/작업 리스트 UI를 DashboardPage와 하위 컴포넌트로 분리하고, 태스크/첨부/칩 로직을 useTasks/useAttachments/useTagChips로 분리했다.
[codex] 2026-03-24 추가 메모 22
- client 라우터에 `/debug` 경로를 추가해 디버그용 목업 작업 리스트와 디버그 툴바(상태별 항목 추가/초기화)를 분리했다.
- `/` 경로는 production 모드로 동작하며 작업 탭 기본 상태를 빈 리스트 + 안내 문구로 표시하도록 변경했다.
[codex] 2026-03-24 추가 메모 23
- public/index.html의 프롬프트 탭 뱃지 숫자 13 하드코딩을 제거하고 id(promptsCountBadge) 기반 동적 표시로 교체했다.
- 서버에서 /api/prompts를 제공할 때만 실제 프롬프트 개수를 표시하고, 실패 시 0으로 폴백해 UI 숫자 오해를 줄였다.
