function MetricCard({ title, value, label, accent, delay, loading }) {
  return (
    <article
      className={`metric-card accent-${accent} ${loading ? "is-loading" : ""}`}
      style={{ animationDelay: `${delay * 90}ms` }}
    >
      <div className="metric-card-top">
        <span>{title}</span>
        <div className="metric-orb" />
      </div>

      <strong>{loading ? "--" : value}</strong>
      <p>{label}</p>
    </article>
  );
}

export default MetricCard;
