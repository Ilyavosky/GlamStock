import styles from './Statscard.module.css';

interface StatsCardProps {
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}

export default function StatsCard({ label, value, sub, loading = false }: StatsCardProps) {
  return (
    <div className={`${styles.card} ${loading ? styles.skeleton : ''}`}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{loading ? '——' : value}</p>
      {sub && <p className={styles.sub}>{sub}</p>}
    </div>
  );
}