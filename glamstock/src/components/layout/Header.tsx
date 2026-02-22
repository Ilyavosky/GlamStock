'use client';

import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>GLAMSTOCK</div>
      
      <div className={styles.userIcon} onClick={handleLogout} style={{ cursor: 'pointer' }}></div>
    </header>
  );
}