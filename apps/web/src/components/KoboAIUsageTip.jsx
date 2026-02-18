/**
 * KoboAIUsageTip — fetches and displays a one-sentence contextual tip for the current page.
 * Owner-only; only renders when KoboAI is configured. Fails silently (no tip shown).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { t } from '../i18n';

export default function KoboAIUsageTip({ page = 'dashboard', className = '' }) {
  const { user } = useAuth();
  const [tip, setTip] = useState('');
  const [loading, setLoading] = useState(false);

  const canUseKoboAI = user?.role === 'OWNER';

  useEffect(() => {
    if (!canUseKoboAI || !page) return;
    setLoading(true);
    api.get(`/ai/usage-tip?page=${encodeURIComponent(page)}`)
      .then((data) => setTip(data?.tip?.trim() ?? ''))
      .catch(() => setTip(''))
      .finally(() => setLoading(false));
  }, [canUseKoboAI, page]);

  if (!canUseKoboAI || loading || !tip) return null;

  return (
    <p className={`koboai-usage-tip ${className}`.trim()} role="status">
      <span className="koboai-usage-tip-label">{t('koboai.usageTip')}:</span> {tip}
    </p>
  );
}
