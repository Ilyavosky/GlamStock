'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    router.push('/login');
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <Link href="/dashboard" className={pathname === '/dashboard' ? styles.linkActive : styles.link}>
          Dashboard
        </Link>
        <Link href="/inventario" className={pathname === '/inventario' ? styles.linkActive : styles.link}>
          Inventario general
        </Link>
        <Link href="/sucursales" className={pathname === '/sucursales' ? styles.linkActive : styles.link}>
          Sucursales
        </Link>
        <Link href="/ventas" className={pathname === '/ventas' ? styles.linkActive : styles.link}>
          Ventas
        </Link>
      </nav>

      <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Cerrar sesión
      </button>
    </aside>
  );
}