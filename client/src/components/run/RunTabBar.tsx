import type { RunDetailTabKey } from '../../types/runDetail';

interface RunTabBarProps {
  selectedTab: RunDetailTabKey;
  onSelectTab: (tabKey: RunDetailTabKey) => void;
}

const RUN_DETAIL_TABS: Array<{ key: RunDetailTabKey; label: string }> = [
  { key: 'debate', label: '토론 로그' },
  { key: 'scenario', label: '시나리오' },
  { key: 'artifacts', label: '생성물' },
  { key: 'logs', label: '로그' }
];

export default function RunTabBar({ selectedTab, onSelectTab }: RunTabBarProps) {
  return (
    <nav className="run-tab-bar" aria-label="상세 탭">
      {RUN_DETAIL_TABS.map((runDetailTab) => (
        <button
          key={runDetailTab.key}
          type="button"
          className={selectedTab === runDetailTab.key ? 'run-tab active' : 'run-tab'}
          onClick={() => onSelectTab(runDetailTab.key)}
        >
          {runDetailTab.label}
        </button>
      ))}
    </nav>
  );
}
