[codex] 2026-03-23 작업 메모 1
- phase 실행 로직은 phase1Runner.js, phase2Runner.js, phase3Runner.js, phase4Runner.js로 분리되어 있으며 각 runner는 실행 결과 객체를 반환한다.
- 공통 상수는 constants.js로 분리되어 오케스트레이터와 phase3 runner에서 재사용한다.
[codex] 2026-03-23 상수 정리 메모 2
- src/services/pipeline/constants.js는 phase timeout map/pipeline timeout hard limit/phase3 iteration hard limit을 src/config/runtimeConstants.js에서 가져오도록 변경했다.
