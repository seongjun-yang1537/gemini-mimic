[codex] 2026-03-23 작업 메모 1
- phase 실행 로직은 phase1Runner.js, phase2Runner.js, phase3Runner.js, phase4Runner.js로 분리되어 있으며 각 runner는 실행 결과 객체를 반환한다.
- 공통 상수는 constants.js로 분리되어 오케스트레이터와 phase3 runner에서 재사용한다.
[codex] 2026-03-23 작업 메모 2
- phase1Runner는 run.inputText가 있으면 기본 분석 문맥에 추가 텍스트를 병합하고, inputVideo가 없을 때 videoPath를 생략해 텍스트 전용 실행을 허용한다.
- phase3Runner는 phase2 생성 referenceSheets와 run.selectedReferenceAssets 파일 경로를 합쳐 중복 제거 후 referenceImages로 전달한다.
