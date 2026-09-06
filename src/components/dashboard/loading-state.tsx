function LoadingBar({ className = "" }: { className?: string }) {
  return <span className={`os-loading-bar ${className}`} aria-hidden="true" />;
}

export function DashboardLoadingState() {
  return (
    <main className="os-page dashboard-overview os-dashboard-loading" role="status" aria-live="polite" aria-label="Loading workspace overview">
      <span className="sr-only">Loading your workspace.</span>
      <div className="os-loading-heading" aria-hidden="true">
        <LoadingBar className="status" />
        <LoadingBar className="title" />
        <LoadingBar className="subtitle" />
      </div>
      <div className="os-grid-2 dashboard-focus-grid os-loading-focus" aria-hidden="true">
        <section className="p"><LoadingBar className="panel-title" /><LoadingBar className="row" /></section>
        <section className="p"><LoadingBar className="panel-title" /><LoadingBar className="row" /><LoadingBar className="row short" /></section>
      </div>
      <div className="kpi-row os-loading-kpis" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => <span className="kpi os-loading-tile" key={item} />)}
      </div>
      <div className="os-grid-2 os-loading-lower" aria-hidden="true">
        <section className="p"><LoadingBar className="panel-title" /><LoadingBar className="row" /><LoadingBar className="row" /></section>
        <section className="p"><LoadingBar className="panel-title" /><LoadingBar className="row short" /></section>
      </div>
    </main>
  );
}

export function AppLoadingShell() {
  return (
    <div className="os os-app-loading-shell">
      <aside className="os-loading-rail" aria-hidden="true">
        <strong>AUTERIM</strong>
        <LoadingBar className="rail-workspace" />
        {[0, 1, 2, 3, 4].map((item) => <LoadingBar className="rail-item" key={item} />)}
      </aside>
      <div className="os-main">
        <div className="os-loading-top" aria-hidden="true"><LoadingBar className="top-route" /><LoadingBar className="top-action" /><LoadingBar className="top-action" /></div>
        <DashboardLoadingState />
        <div className="os-loading-mobile-nav" aria-hidden="true">{[0, 1, 2, 3, 4].map((item) => <LoadingBar key={item} />)}</div>
      </div>
    </div>
  );
}
