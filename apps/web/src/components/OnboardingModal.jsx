/**
 * OnboardingModal — one-time guided tour for first-time users.
 * Covers main areas (Dashboard, Transactions, Expenses, Inventory, Analysis) and KoboAI features.
 * Completion stored in localStorage (kobotrack_onboarding_done).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../i18n';

const ONBOARDING_STORAGE_KEY = 'kobotrack_onboarding_done';

export function hasCompletedOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingComplete() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {}
}

export function clearOnboarding() {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {}
}

const STEPS = [
  { id: 'welcome', titleKey: 'onboarding.welcomeTitle', bodyKey: 'onboarding.welcomeBody' },
  { id: 'main', titleKey: 'onboarding.mainTitle', bodyKey: 'onboarding.mainBody' },
  { id: 'expensesInventory', titleKey: 'onboarding.expensesInventoryTitle', bodyKey: 'onboarding.expensesInventoryBody' },
  { id: 'analysisKoboai', titleKey: 'onboarding.analysisKoboaiTitle', bodyKey: 'onboarding.analysisKoboaiBody' },
  { id: 'done', titleKey: 'onboarding.doneTitle', bodyKey: 'onboarding.doneBody' },
];

export default function OnboardingModal({ onComplete, open }) {
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    const onEscape = (e) => {
      if (e.key === 'Escape') {
        setOnboardingComplete();
        onComplete?.();
      }
    };
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [open, onComplete]);

  if (!open) return null;

  function handleSkip() {
    setOnboardingComplete();
    onComplete?.();
  }

  function handleNext() {
    if (isLast) {
      setOnboardingComplete();
      onComplete?.();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function handleBack() {
    if (isFirst) return;
    setStepIndex((i) => i - 1);
  }

  function handleGetStarted() {
    setOnboardingComplete();
    onComplete?.();
    navigate('/dashboard');
  }

  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-body"
    >
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <span className="onboarding-step-indicator" aria-hidden="true">
            {stepIndex + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            className="onboarding-skip"
            onClick={handleSkip}
            aria-label={t('onboarding.skip')}
          >
            {t('onboarding.skip')}
          </button>
        </div>
        <div className="onboarding-content">
          <h2 id="onboarding-title" className="onboarding-title">
            {t(step.titleKey)}
          </h2>
          <p id="onboarding-body" className="onboarding-body">
            {t(step.bodyKey)}
          </p>
        </div>
        <div className="onboarding-progress" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label={t('onboarding.progressLabel')}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot${i === stepIndex ? ' active' : ''}${i < stepIndex ? ' completed' : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="onboarding-actions">
          {!isFirst && (
            <button type="button" className="btn btn-ghost" onClick={handleBack}>
              {t('common.back')}
            </button>
          )}
          <div className="onboarding-actions-primary">
            {isLast ? (
              <button type="button" className="btn btn-primary" onClick={handleGetStarted}>
                {t('onboarding.getStarted')}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                {t('common.next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
