import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import { usePreferences } from '@/lib/preferences';
import type { Jar, JarPattern, JarType, SubCategory } from '@/db/schemas';
import { Icon, JAR_ICON_NAMES, type IconName } from '@/components/icons';
import { fromMinor, parseAmountInput, toMinor } from '@/lib/money';
import { newId } from '@/lib/id';
import { move } from '@/lib/reorder';
import { DEFAULT_CURRENCY } from '@/db/constants';
import { JAR_PALETTE, PATTERN_CSS, resolveJarColors } from './jarPalette';
import { createJar, deleteJar, updateJar } from './jarsRepo';
import {
  addSubCategory,
  deleteSubCategory,
  moveSubCategory,
  renameSubCategory,
} from './subCategoriesRepo';
import { SubCategoryEditor, type SubItem } from './SubCategoryEditor';

const PATTERNS: JarPattern[] = ['solid', 'hatch', 'dots', 'hline', 'grid', 'vline'];

export function JarEditPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const cvd = usePreferences().a11y.includes('cvd');

  const { data: jars } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const { data: allSubs } = useRxQuery<SubCategory>(() => db.subCategories.find(), [db]);
  const existing = useMemo(() => jars.find((j) => j.id === id), [jars, id]);

  const [name, setName] = useState('');
  const [type, setType] = useState<JarType>('flow');
  const [percentage, setPercentage] = useState('10');
  const [color, setColor] = useState(JAR_PALETTE[0].candy);
  const [pattern, setPattern] = useState<JarPattern>('solid');
  const [icon, setIcon] = useState<string>('house');
  const [targetInput, setTargetInput] = useState('');
  const [openingInput, setOpeningInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Staged sub-categories for a not-yet-created jar.
  const [pendingSubs, setPendingSubs] = useState<SubItem[]>([]);

  const currency = existing?.currency ?? jars[0]?.currency ?? DEFAULT_CURRENCY;

  const dbSubs = useMemo(
    () =>
      allSubs
        .filter((s) => s.jarId === id)
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ id: s.id, name: s.name })),
    [allSubs, id],
  );
  const subItems: SubItem[] = isNew ? pendingSubs : dbSubs;

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setType(existing.type);
    setPercentage(String(existing.percentage));
    setColor(existing.color);
    setPattern(existing.pattern);
    setIcon(existing.icon);
    setTargetInput(
      existing.targetAmountMinor != null
        ? String(fromMinor(existing.targetAmountMinor, existing.currency))
        : '',
    );
    setOpeningInput(
      existing.openingBalanceMinor
        ? String(fromMinor(existing.openingBalanceMinor, existing.currency))
        : '',
    );
  }, [existing]);

  const sub = {
    add: (n: string) => {
      if (isNew) setPendingSubs((p) => [...p, { id: newId(), name: n.trim() }]);
      else void addSubCategory(db, id!, n);
    },
    rename: (sid: string, n: string) => {
      if (isNew)
        setPendingSubs((p) => p.map((s) => (s.id === sid ? { ...s, name: n } : s)));
      else void renameSubCategory(db, sid, n);
    },
    move: (sid: string, dir: 'up' | 'down') => {
      if (isNew)
        setPendingSubs((p) => move(p, p.findIndex((s) => s.id === sid), dir));
      else void moveSubCategory(db, id!, sid, dir);
    },
    remove: (sid: string) => {
      if (isNew) setPendingSubs((p) => p.filter((s) => s.id !== sid));
      else void deleteSubCategory(db, sid);
    },
  };

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Give the jar a name.';
    const pct = Number(percentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) e.percentage = '0 to 100.';
    if (type === 'accumulation') {
      const t = parseAmountInput(targetInput);
      if (t == null || t <= 0) e.target = 'A growth jar needs a target amount.';
    }
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const input = {
      name,
      type,
      percentage: Number(percentage),
      color,
      pattern,
      icon,
      currency,
      targetAmountMinor:
        type === 'accumulation'
          ? toMinor(parseAmountInput(targetInput) ?? 0, currency)
          : null,
      openingBalanceMinor:
        type === 'accumulation'
          ? toMinor(parseAmountInput(openingInput) ?? 0, currency)
          : 0,
    };

    if (isNew) {
      const jarId = await createJar(db, input);
      for (const s of pendingSubs) await addSubCategory(db, jarId, s.name);
    } else {
      await updateJar(db, id!, input);
    }
    navigate('/jars');
  }

  async function onDelete() {
    if (!id || isNew) return;
    const txCount = await db.transactions.count({ selector: { jarId: id } }).exec();
    const msg = txCount
      ? `Delete this jar? Its ${txCount} transaction${txCount > 1 ? 's are' : ' is'} kept and shown as "Unassigned" until you move ${txCount > 1 ? 'them' : 'it'}.`
      : 'Delete this jar?';
    if (!confirm(msg)) return;
    await deleteJar(db, id);
    navigate('/jars');
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{isNew ? 'New jar' : 'Edit jar'}</h1>

      <form className="stack" onSubmit={onSubmit}>
        <label className="field">
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <span className="error">{errors.name}</span>}
        </label>

        <label className="field">
          Type
          <select value={type} onChange={(e) => setType(e.target.value as JarType)}>
            <option value="flow">Flow — a spending cap that resets monthly</option>
            <option value="accumulation">Growth — builds toward a target</option>
          </select>
        </label>

        <label className="field">
          Percentage of income
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
          />
          {errors.percentage && <span className="error">{errors.percentage}</span>}
        </label>

        {type === 'accumulation' && (
          <>
            <label className="field">
              Target amount ({currency})
              <input
                type="text"
                inputMode="decimal"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="10000"
              />
              {errors.target && <span className="error">{errors.target}</span>}
            </label>
            <label className="field">
              Opening balance ({currency}) — optional
              <input
                type="text"
                inputMode="decimal"
                value={openingInput}
                onChange={(e) => setOpeningInput(e.target.value)}
                placeholder="0"
              />
            </label>
          </>
        )}

        <div className="field">
          Colour
          <div className="picker-row">
            {JAR_PALETTE.map((p) => (
              <button
                key={p.key}
                type="button"
                className="swatch"
                aria-pressed={color === p.candy}
                aria-label={p.name}
                style={{ background: resolveJarColors(p.candy, cvd).fill }}
                onClick={() => {
                  setColor(p.candy);
                  setPattern(p.pattern);
                  setIcon(p.icon);
                }}
              />
            ))}
          </div>
        </div>

        <div className="field">
          Icon
          <div className="picker-row">
            {JAR_ICON_NAMES.map((n) => (
              <button
                key={n}
                type="button"
                className="swatch"
                aria-pressed={icon === n}
                aria-label={n}
                style={{ background: 'var(--surface)', color: 'var(--ink)' }}
                onClick={() => setIcon(n)}
              >
                <Icon name={n as IconName} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          Pattern (used in colour-blind-safe mode)
          <div className="picker-row">
            {PATTERNS.map((p) => (
              <button
                key={p}
                type="button"
                className="swatch"
                aria-pressed={pattern === p}
                aria-label={p}
                onClick={() => setPattern(p)}
                style={{
                  background: resolveJarColors(color, true).fill,
                  backgroundImage: PATTERN_CSS[p] === 'none' ? undefined : PATTERN_CSS[p],
                }}
              />
            ))}
          </div>
        </div>

        <SubCategoryEditor
          items={subItems}
          onAdd={sub.add}
          onRename={sub.rename}
          onMove={sub.move}
          onRemove={sub.remove}
        />

        <button className="btn" type="submit">
          {isNew ? 'Create jar' : 'Save changes'}
        </button>
        {!isNew && (
          <button className="btn btn--ghost" type="button" onClick={onDelete}>
            Delete jar
          </button>
        )}
      </form>
    </div>
  );
}
