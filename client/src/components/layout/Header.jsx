const runtimeCommitHash = typeof window !== 'undefined' ? window.APP_CONFIG?.commitHash : '';
const buildHash = runtimeCommitHash || import.meta.env.VITE_COMMIT_HASH || 'unknown';

export default function Header() {
    return (<header className="page-header">
      <div className="header-inner">
        <div className="brand-nav">
          <div className="brand">
            <span className="brand-icon">Mi</span>
            <span>Mimic</span>
          </div>
        </div>
        <div className="build-hash">{buildHash.slice(0, 7)}</div>
      </div>
    </header>);
}
