const buildHash = import.meta.env.VITE_COMMIT_HASH ?? 'unknown';

export default function Header() {
  return (
    <header className="page-header">
      <div className="header-inner">
        <div className="brand-nav">
          <div className="brand">
            <span className="brand-icon">Mi</span>
            <span>Mimic</span>
          </div>
          <nav className="nav-links" aria-label="주요">
            <button className="nav-link active" type="button">대시보드</button>
            <button className="nav-link" type="button">프롬프트</button>
            <button className="nav-link" type="button">에셋</button>
            <button className="nav-link" type="button">설정</button>
          </nav>
        </div>
        <div className="build-hash">{buildHash.slice(0, 7)}</div>
      </div>
    </header>
  );
}
