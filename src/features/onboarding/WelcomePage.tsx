import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { setPreferences } from '@/lib/preferences';
import { seedExampleData } from '@/db/seed';
import { useOnboardingState } from './useOnboardingState';
import { Questionnaire } from './Questionnaire';
import { ReviewProposal } from './ReviewProposal';
import { buildFromProposal } from './onboardingRepo';
import type { OnboardingAnswers, ProposedJar } from './proposeJars';
import styles from './Onboarding.module.css';

type Phase = 'intro' | 'questions' | 'review';

export function WelcomePage() {
  const db = useDb();
  const navigate = useNavigate();
  const { welcome, ready } = useOnboardingState();

  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (ready && !welcome && !submitting) {
    return <Navigate to="/" replace />;
  }

  async function useDefaults() {
    setSubmitting(true);
    await seedExampleData(db);
    setPreferences({ onboarding: 'skipped' });
    navigate('/', { replace: true });
  }

  async function confirm(jars: ProposedJar[]) {
    if (!answers) return;
    setSubmitting(true);
    await buildFromProposal(db, {
      currency: answers.currency,
      incomeMajor: answers.incomeMajor,
      jars,
    });
    setPreferences({ onboarding: 'done' });
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.page}>
      {phase === 'intro' && (
        <div className={styles.inner}>
          <span className={styles.brand}>Welcome to Jars</span>
          <div className={styles.card}>
            <span className={styles.q}>Let’s set up your jars</span>
            <span className={styles.hint}>
              Jars splits your income into buckets you choose — Essentials, a safe
              fund, whatever fits your life. Answer a few quick questions and we’ll
              suggest a starting split you can change anytime.
            </span>
            <button
              type="button"
              className={styles.btn}
              onClick={() => setPhase('questions')}
            >
              Answer a few questions
            </button>
            <button type="button" className={styles.link} onClick={useDefaults}>
              Skip — use a starter set
            </button>
          </div>
        </div>
      )}

      {phase === 'questions' && (
        <Questionnaire
          onExit={() => setPhase('intro')}
          onDone={(a) => {
            setAnswers(a);
            setPhase('review');
          }}
        />
      )}

      {phase === 'review' && answers && (
        <ReviewProposal
          answers={answers}
          onBack={() => setPhase('questions')}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
