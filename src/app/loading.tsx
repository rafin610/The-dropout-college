export default function Loading() {
  return (
    <main className="page-wrap loading-state" aria-busy="true" aria-label="Loading the network">
      <div className="loading-block" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="loading-line" />
      <div className="loading-line short" />
      <div className="loading-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}