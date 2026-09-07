import { useEffect, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/icons';
import styles from './SubCategoryEditor.module.css';

export interface SubItem {
  id: string;
  name: string;
}

interface Props {
  items: SubItem[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onRemove: (id: string) => void;
}

function Row({
  item,
  first,
  last,
  onRename,
  onMove,
  onRemove,
}: {
  item: SubItem;
  first: boolean;
  last: boolean;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState(item.name);
  useEffect(() => setDraft(item.name), [item.name]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== item.name) onRename(item.id, next);
    else setDraft(item.name);
  };

  return (
    <div className={styles.row}>
      <input
        aria-label={`Sub-category name: ${item.name}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
          e.key === 'Enter' && e.currentTarget.blur()
        }
      />
      <button
        type="button"
        className={styles.iconBtn}
        disabled={first}
        aria-label={`Move ${item.name} up`}
        onClick={() => onMove(item.id, 'up')}
      >
        <Icon name="chevron" size={16} style={{ transform: 'rotate(-90deg)' }} />
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        disabled={last}
        aria-label={`Move ${item.name} down`}
        onClick={() => onMove(item.id, 'down')}
      >
        <Icon name="chevron" size={16} style={{ transform: 'rotate(90deg)' }} />
      </button>
      <button
        type="button"
        className={`${styles.iconBtn} ${styles.remove}`}
        aria-label={`Remove ${item.name}`}
        onClick={() => onRemove(item.id)}
      >
        <Icon name="plus" size={16} style={{ transform: 'rotate(45deg)' }} />
      </button>
    </div>
  );
}

export function SubCategoryEditor({ items, onAdd, onRename, onMove, onRemove }: Props) {
  const [newName, setNewName] = useState('');

  const add = () => {
    const n = newName.trim();
    if (!n) return;
    onAdd(n);
    setNewName('');
  };

  return (
    <div className="field">
      Sub-categories
      <div className={styles.list}>
        {items.map((item, i) => (
          <Row
            key={item.id}
            item={item}
            first={i === 0}
            last={i === items.length - 1}
            onRename={onRename}
            onMove={onMove}
            onRemove={onRemove}
          />
        ))}

        <div className={`${styles.row} ${styles.add}`}>
          <input
            aria-label="New sub-category name"
            placeholder="e.g. groceries"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Add sub-category"
            onClick={add}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>

        {items.length === 0 && (
          <span className={styles.hint}>
            Optional — split this jar into finer buckets like rent, energy, groceries.
          </span>
        )}
      </div>
    </div>
  );
}
