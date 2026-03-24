import type { CostInfo } from '../../types/runDetail';

interface RunCostProps {
  costInfo: CostInfo;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export default function RunCost({ costInfo }: RunCostProps) {
  const apiRatio = costInfo.maxApiCalls > 0 ? costInfo.apiCalls / costInfo.maxApiCalls : 0;
  const apiValueClassName = apiRatio >= 0.8 ? 'cost-value warning' : 'cost-value';

  return (
    <section className="run-section">
      <h2 className="section-title">비용</h2>
      <dl className="run-cost-list">
        <div className="run-cost-row">
          <dt className="cost-label">API 호출</dt>
          <dd className={apiValueClassName}>{formatCount(costInfo.apiCalls)} / {formatCount(costInfo.maxApiCalls)}</dd>
        </div>
        <div className="run-cost-row">
          <dt className="cost-label">토큰</dt>
          <dd className="cost-value">{formatCount(costInfo.tokenCount)} tok</dd>
        </div>
        <div className="run-cost-row">
          <dt className="cost-label">비용</dt>
          <dd className="cost-value">${costInfo.costUsd.toFixed(2)}</dd>
        </div>
      </dl>
    </section>
  );
}
