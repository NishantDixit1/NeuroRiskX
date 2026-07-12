import { useEffect, useState } from 'react';
import { predictionService } from '../services/api';
import { ModelInfo } from '../types';

/**
 * Fetches the model's own description of itself from /model-info (a public endpoint).
 *
 * Every model or dataset fact rendered anywhere in this app comes from here. Nothing
 * is typed into a component, so retraining the model can never leave a page quoting a
 * stale ROC-AUC or the wrong algorithm.
 */
export function useModelInfo(): ModelInfo | null {
  const [info, setInfo] = useState<ModelInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    predictionService
      .getModelInfo()
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        // Non-fatal. Pages render without the model facts rather than inventing them.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

/** One consistent sentence describing the model, built only from server-sent facts. */
export function describeModel(info: ModelInfo | null): string {
  if (!info) return '';
  const positive = (info.dataset.positiveRate * 100).toFixed(1);
  return `${info.modelLabel}. ROC-AUC ${info.rocAuc} on ${info.dataset.nRecords.toLocaleString()} records from the ${info.dataset.name} (${positive}% positive). Not a medical device.`;
}
