

import React from 'react';
import { InstructionsIcon, HouseholdIcon, ChartBarIcon } from './icons.tsx';

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
  goToStep: (step: number) => void;
  isNavDisabled?: boolean;
}

const WizardStepper: React.FC<WizardStepperProps> = ({ steps, currentStep, goToStep, isNavDisabled = false }) => {
  const icons = [<InstructionsIcon key={1} />, <HouseholdIcon key={2}/>, <ChartBarIcon key={3}/>];
  
  return (
    <nav aria-label="Progress">
      <ol role="list" className="border border-gray-300 dark:border-gray-700 rounded-md divide-y divide-gray-300 dark:divide-gray-700 md:flex md:divide-y-0">
        {steps.map((step, stepIdx) => {
          const stepNumber = stepIdx + 1;
          const isCompleted = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;

          return (
            <li key={step} className="relative md:flex-1 md:flex">
              <button
                type="button"
                onClick={() => goToStep(stepNumber)}
                disabled={isNavDisabled}
                className={`group flex items-center w-full text-left ${!isNavDisabled ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className="px-6 py-4 flex items-center text-sm font-medium">
                  <span
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200 ${
                      isCurrent
                        ? 'bg-blue-600 border-2 border-blue-600'
                        : isCompleted
                        ? 'bg-green-500'
                        : 'bg-gray-100 dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className={`text-lg ${isCurrent ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`}>
                        {icons[stepIdx]}
                      </span>
                    )}
                  </span>
                  <span className={`ml-4 text-sm font-medium ${isNavDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-200'}`}>{step}</span>
                </span>
              </button>

              {stepIdx !== steps.length - 1 ? (
                <div className="hidden md:block absolute top-0 right-0 h-full w-5" aria-hidden="true">
                  <svg
                    className="h-full w-full text-gray-300 dark:text-gray-700"
                    viewBox="0 0 22 80"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path d="M0.5 0L20.5 40L0.5 80" vectorEffect="non-scaling-stroke" stroke="currentcolor" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default WizardStepper;