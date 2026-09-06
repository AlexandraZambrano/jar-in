import { Link } from 'react-router-dom';
import { Sticker } from '@/components/Sticker';

export function PlaceholderPage({ title, feature }: { title: string; feature: string }) {
  return (
    <div className="screen">
      <h1 className="screen-title">{title}</h1>
      <Sticker gloss tiltSeed={2} style={{ padding: 18 }}>
        <p style={{ margin: 0 }}>
          Coming in <strong>{feature}</strong>. See{' '}
          <code>docs/features/{feature}.md</code> for the plan.
        </p>
      </Sticker>
      <Link className="link-btn" to="/">
        Back to Home
      </Link>
    </div>
  );
}
