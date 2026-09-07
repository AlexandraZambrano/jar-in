import { NavLink } from 'react-router-dom';
import { Icon } from './icons';
import styles from './BottomNav.module.css';

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <NavLink to="/" end className={styles.item}>
        <Icon name="home" />
        <span>Home</span>
      </NavLink>
      <NavLink to="/jars" className={styles.item} data-tour="jars">
        <Icon name="jars" />
        <span>Jars</span>
      </NavLink>

      <NavLink
        to="/add"
        className={styles.item}
        aria-label="Add a transaction"
        data-tour="add"
      >
        <span className={styles.fab}>
          <Icon name="plus" size={24} strokeWidth={2.8} />
        </span>
        <span>Add</span>
      </NavLink>

      <NavLink to="/insights" className={styles.item} data-tour="insights">
        <Icon name="insights" />
        <span>Insights</span>
      </NavLink>
      <NavLink to="/settings" className={styles.item} data-tour="more">
        <Icon name="more" />
        <span>More</span>
      </NavLink>
    </nav>
  );
}
