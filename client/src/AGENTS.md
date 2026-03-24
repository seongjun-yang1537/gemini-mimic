[codex] 2026-03-24 작업 메모 1
- Run 상세 페이지 기본 라우트를 추가해 `/run/:id`(production), `/debug/run/:id`(mock)에서 2컬럼 레이아웃을 렌더링한다.
- 상세 페이지 구성요소를 `components/run/`로 분리해 상단 바, 좌측 요약(요약/진행/비용/생성물), 우측 탭 바/빈 슬롯 콘텐츠를 개별 컴포넌트로 조립한다.
- 디버그 상세 데이터는 `debug/mockRunDetails.ts`, 타입은 `types/runDetail.ts`, 데이터 훅은 `hooks/useRunDetail.ts`/`hooks/useRunDetailMock.ts`에 분리했다.
- 대시보드 작업 행 클릭 시 dataMode에 따라 `/run/:id` 또는 `/debug/run/:id`로 네비게이션하도록 `TaskList`/`TaskRow`에 모드 전달을 추가했다.
[codex] 2026-03-24 작업 메모 2
- `TaskRow` 루트를 버튼에서 `<Link>`로 전환해 카드 전체 클릭 시 버블링/stopPropagation 영향 없이 `/${prefix}/run/:id`로 직접 이동하도록 정리했다.
- `TaskRow` 링크 스타일에 `pointer-events: auto`, `text-decoration: none`, `color: inherit`를 명시해 클릭 차단 가능성을 줄였다.
- `RunDetailPage`는 `useParams().id` 기준 빈 상태 문구를 표시하고, `dataMode`에 따라 뒤로가기 경로를 `/` 또는 `/debug`로 분기한다.

[codex] 2026-03-24 작업 메모 3
- task 행 클릭 미이동 이슈 대응으로 `components/task/TaskRow.tsx`를 `useNavigate` 기반 키보드/마우스 네비게이션(`role="link"`, `tabIndex=0`, `Enter/Space`)으로 조정했다.
- `styles/index.css`에 `.task-row:hover` 배경 전환을 추가해 클릭 가능 상태를 시각적으로 드러냈다.

[codex] 2026-03-24 작업 메모 4
- 대시보드 입력 영역을 Composer/PromptEditor/AttachmentStrip/AttachmentCard/TagAutocomplete/ComposerToolbar로 재조립해 기존 monolithic 입력 블록을 컴포넌트 단위로 분리했다.
- 스타일을 tokens.css, global.css, header.css, composer.css, tabs.css, task.css, empty.css로 분리하고 main.tsx에서 순차 import하도록 반영했다.
- 첨부/태그 훅 로직에서 thumbnail/editor/fallback/format 유틸을 utils로 분리해 재사용 경로를 명확히 했다.

[codex] 2026-03-24 작업 메모 5
- layout/Header에서 빌드 해시를 전역 window 의존성 없이 import.meta.env 기반으로 표시하도록 정리했다.
[codex] 2026-03-24 작업 메모 6
- src 경로의 컴포넌트/훅/상수/유틸 파일 확장자를 .ts/.tsx에서 .js/.jsx로 일괄 변환했다.
- 타입 전용 선언(import type, interface, type alias)을 제거해 런타임 코드만 남기고 import 경로를 JS 기준으로 동작하도록 유지했다.
- 타입 정의 전용이던 src/types 디렉터리는 JavaScript 전환 범위에서 제외하고 삭제했다.
[codex] 2026-03-24 작업 메모 7
- 사용자 요청으로 `client/src/components/layout/Header.jsx`에서 상단 내비게이션 텍스트(대시보드/프롬프트/에셋/설정) 버튼 4개를 제거하고 브랜드(`Mimic`)만 노출하도록 정리했다.
