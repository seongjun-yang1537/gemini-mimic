import Badge from '../common/Badge';
import { DASHBOARD_TABS } from '../../constants/phases';
export default function Tabs({ selectedTab, taskCount, onChangeTab }) {
    return (<section className="tabs-bar">
      <div className="tabs" role="tablist" aria-label="대시보드 탭">
        {DASHBOARD_TABS.map((tabItem) => (<button key={tabItem.key} className={`tab-button${selectedTab === tabItem.key ? ' active' : ''}`} type="button" role="tab" aria-selected={selectedTab === tabItem.key} onClick={() => onChangeTab(tabItem.key)}>
            {tabItem.label}
            {tabItem.key === 'tasks' ? <Badge count={taskCount} isActive={selectedTab === tabItem.key}/> : null}
          </button>))}
      </div>
    </section>);
}
