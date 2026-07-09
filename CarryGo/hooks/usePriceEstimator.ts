import { useState, useEffect, useRef } from 'react';
import { estimatePrice, PriceEstimate, PriceEstimateParams } from '@/services/price-estimator.service';

interface UsePriceEstimatorResult {
  estimate: PriceEstimate | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePriceEstimator(
  params: Partial<PriceEstimateParams>,
  debounceMs: number = 500
): UsePriceEstimatorResult {
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0);

  const isComplete = Boolean(
    params.fromCity && params.toCity && params.weight && params.category
  );

  const fetchEstimate = () => {
    if (!isComplete) {
      setEstimate(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    const currentRequest = ++abortRef.current;

    estimatePrice(params as PriceEstimateParams)
      .then(result => {
        if (currentRequest === abortRef.current) {
          setEstimate(result);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (currentRequest === abortRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to estimate price');
          setIsLoading(false);
        }
      });
  };

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!isComplete) {
      setEstimate(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(fetchEstimate, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [params.fromCity, params.toCity, params.weight, params.category, params.vehicleType, params.deliveryDate]);

  return { estimate, isLoading, error, refresh: fetchEstimate };
}
