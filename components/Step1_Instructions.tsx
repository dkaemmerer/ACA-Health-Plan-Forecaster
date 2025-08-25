import React from 'react';
import { InfoIcon } from './icons';

interface Step1Props {
    onNext: () => void;
    coverageYear: number;
}

const Step1_Instructions: React.FC<Step1Props> = ({ onNext, coverageYear }) => {
  const show2026Warning = coverageYear === 2025;

  return (
    <div className="space-y-6">
      <div className="prose prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
        <h2 className="text-2xl font-semibold border-b-2 border-blue-200 dark:border-blue-800 pb-2 mb-4">
          How to Use the Health Premium Forecaster
        </h2>
        <p>
          Welcome! This tool helps you project your potential health insurance subsidy and preview plan costs on the HealthCare.gov marketplace. Here’s how to get started:
        </p>

        <div className="mt-8 flex flex-col lg:flex-row gap-8 not-prose">
            {/* Column 1: Steps */}
            <div className="flex-1 space-y-6">
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <div className="flex-shrink-0 text-blue-500 mt-1">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 font-bold text-lg">1</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Enter Your Household Details</h3>
                        <p>Go to the next tab to provide your location and household information. This is the foundation for all calculations.</p>
                        <ul className="mt-2 list-disc list-inside space-y-2 text-sm">
                            <li><strong>Location & Members:</strong> Add each person in your household who needs coverage.</li>
                            <li><strong>Set Healthcare Needs:</strong> For each person, specify their expected healthcare needs (Low, Medium, or High). This is crucial for estimating your potential out-of-pocket costs.</li>
                            <li><strong>Plan for the Future:</strong> Use "Future Life Events" to see how costs change when you add a spouse or child in the long-term analysis.</li>
                        </ul>
                    </div>
                </div>

                 <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <div className="flex-shrink-0 text-blue-500 mt-1">
                         <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 font-bold text-lg">2</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Choose Your Analysis</h3>
                        <p>On the "Analysis & Results" tab, you have two options:</p>
                        <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                            <li><strong>Single Year Analysis:</strong> Get a quick estimate for the upcoming year. This shows your subsidy, premiums, estimated out-of-pocket costs, and total costs.</li>
                            <li><strong>Long-Term Analysis:</strong> Project how your premiums, out-of-pocket costs, and total costs will change over many years as your family ages and grows.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Column 2: Notes & Disclaimers */}
            <div className="flex-1 space-y-6">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700 flex items-start gap-3">
                  <div className="flex-shrink-0 text-yellow-600 dark:text-yellow-300 mt-1">
                      <InfoIcon className="h-5 w-5" />
                  </div>
                  <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Important Disclaimer</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          This tool provides an estimate based on data from the official HealthCare.gov API. Actual subsidy amounts and plan availability may vary. This is not an official application from HealthCare.gov and should be used for informational purposes only.
                      </p>
                       <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                          This tool is designed for states that use the federal HealthCare.gov marketplace. If your state operates its own health insurance exchange (e.g., Covered California, Pennie), this tool will not work for you directly but you're still welcome to try ZIP codes from other states as an indirect estimate.
                      </p>
                  </div>
                </div>
                {show2026Warning && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700 flex items-start gap-3">
                      <div className="flex-shrink-0 text-orange-600 dark:text-orange-300 mt-1">
                          <InfoIcon className="h-5 w-5" />
                      </div>
                      <div>
                          <h4 className="font-semibold text-orange-800 dark:text-orange-200">Note on {coverageYear + 1} Projections</h4>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                              This tool currently uses <strong>{coverageYear}</strong> premium and subsidy data. Enhanced subsidies are set to expire at the end of {coverageYear}, which may cause a significant increase in costs for {coverageYear + 1}. This tool will be updated when {coverageYear + 1} data becomes available (typically after Nov 1st, {coverageYear}).
                          </p>
                      </div>
                  </div>
                )}
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 flex items-start gap-3">
                    <div className="flex-shrink-0 text-blue-600 dark:text-blue-300 mt-1">
                        <InfoIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200">Medicare Eligibility</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            The long-term analysis assumes adults maintain ACA coverage until they reach the standard Medicare eligibility age of 65. The projection automatically stops at that point for household adults.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
      <div className="pt-6 flex justify-end">
          <button
              type="button"
              onClick={onNext}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
          >
              Get Started
          </button>
      </div>
    </div>
  );
};

export default Step1_Instructions;
