export function CommunityStatsSection({
  stats,
}: {
  stats: Array<{ label: string; value: number | string; description?: string }>;
}) {
  // Filter out any stat with 0 or missing value to strictly prevent fake or empty stats
  const validStats = stats.filter((s) => {
    if (typeof s.value === "number") return s.value > 0;
    if (typeof s.value === "string") return s.value.trim().length > 0 && s.value !== "0";
    return false;
  });

  if (validStats.length === 0) {
    return null;
  }

  return (
    <section className="section home-stats-section" aria-label="Community Verified Statistics">
      <div className="home-stats-grid">
        {validStats.map((stat, idx) => (
          <div key={`${stat.label}-${idx}`} className="home-stat-card">
            <span className="home-stat-value">{stat.value}</span>
            <strong className="home-stat-label">{stat.label}</strong>
            {stat.description && <span className="home-stat-desc">{stat.description}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
