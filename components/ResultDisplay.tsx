import React from 'react';
import type { EstimateResponse } from '../types.ts';
import { SpinnerIcon, InfoIcon, CheckCircleIcon, XCircleIcon } from './icons.tsx';

interface ResultDisplayProps {
  isLoading: boolean;
  error: string | null;
  result: EstimateResponse | null;
  period: 'monthly' | 'annual';
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, error, result, period }) => {
  if (isLoading) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center text-center p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <SpinnerIcon />
        <p className="mt-2 text-lg font-medium text-blue-600 dark:text-blue-300">Calculating your estimate...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">This may take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
        <div className="flex">
          <div className="flex-shrink-0">
            <InfoIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Calculation Error</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const aptcAmount = result.estimates?.[0]?.aptc ?? 0;
    const displayAmount = period === 'annual' ? aptcAmount * 12 : aptcAmount;
    const hasSubsidy = displayAmount > 0;
    const periodText = period === 'annual' ? 'Annual' : 'Monthly';

    return (
      <div className={`mt-8 p-8 rounded-lg border text-center ${
          hasSubsidy 
            ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' 
            : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
      }`}>
        {hasSubsidy ? (
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
        ) : (
            <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        )}
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Estimated {periodText} Premium Tax Credit</h3>
        <p className={`mt-2 text-5xl font-bold ${
            hasSubsidy 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
        }`}>
          ${displayAmount.toLocaleString()}
          {period === 'monthly' && <span className="text-2xl font-medium text-gray-500 dark:text-gray-400">/mo</span>}
          {period === 'annual' && <span className="text-2xl font-medium text-gray-500 dark:text-gray-400">/yr</span>}
        </p>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {hasSubsidy 
            ? "This is an estimate based on the information you provided. Your actual eligibility and credit amount may vary."
            : "Based on the information provided, you are not expected to be eligible for a premium tax credit at this income level."
          }
        </p>
      </div>
    );
  }

  return null;
};

export default ResultDisplay;