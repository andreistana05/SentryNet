import { Link } from "react-router-dom";

interface MetricCardProps {
  title: string;
  value: string | number;
  label: string;
  accent: "rose" | "amber" | "cyan" | "green";
  delay: number;
  loading: boolean;
  to?: string;
}

function MetricCard({ title, value, label, accent, delay, loading, to }: MetricCardProps) {
  const className = `metric-card accent-${accent} ${loading ? "is-loading" : ""}`;
  const style = { animationDelay: `${delay * 90}ms` };
  const content = (
    <>
      <div className="metric-card-top">
        <span>{title}</span>
        <div className="metric-orb" />
      </div>

      <strong>{loading ? "--" : value}</strong>
      <p>{label}</p>
    </>
  );

  if (to) {
    return (
      <Link className={className} style={style} to={to} aria-label={`View ${title}`}>
        {content}
      </Link>
    );
  }

  return (
    <article
      className={className}
      style={style}
    >
      {content}
    </article>
  );
}

export default MetricCard;
