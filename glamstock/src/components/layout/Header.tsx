'use client';

import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    router.push('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>GLAMSTOCK</div>
      <div className={styles.userIcon} onClick={handleLogout} style={{ cursor: 'pointer' }}></div>
    </header>
  );
}