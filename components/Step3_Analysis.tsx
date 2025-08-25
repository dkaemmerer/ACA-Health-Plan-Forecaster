
import React, { useState, useEffect, ReactNode } from 'react';
import type { EstimateResponse, PlanStat, PremiumAnalysisData, MetalLevel, CostTier } from '../types';
import { ChartBarIcon, CalculatorIcon, MetalIcon, DownloadIcon, InfoIcon } from './icons';
import ResultDisplay from './ResultDisplay';
import PlanStatsDisplay from './PlanStatsDisplay';
import PremiumAnalysisTable from './PremiumAnalysisTable';
import PremiumAnalysisChart from './PremiumAnalysisChart';


interface Step3Props {
  isGenerating: boolean;
  canCalculate: boolean;
  canGenerateAnalysis: boolean;
  onCalculateSingleYear: () => void;
  isCalculating: boolean;
  onGeneratePremiumAnalysis: () => void;
  isGeneratingPremiumAnalysis: boolean;
  premiumAnalysisProgress: { current: number; total: number } | null;
  logEntry: string | null;
  error: string | null;
  fallbackWarning: string | null;
  result: EstimateResponse | null;
  planStats: PlanStat[] | null;
  subsidyAmount: number;
  premiumAnalysisData: PremiumAnalysisData | null;
  hoveredIncome: number | null;
  onHoverIncome: (income: number | null) => void;
  onBack: () => void;
  income: number;
  onIncomeChange: (val: number) => void;
  startIncome: number;
  onStartIncomeChange: (val: number) => void;
  endIncome: number;
  onEndIncomeChange: (val: number) => void;
  incomeStep: number;
  onIncomeStepChange: (val: number) => void;
  onStopAnalysis: () => void;
  analysisWarning: { totalCalls: number; timeEstimate: number } | null;
  onConfirmAnalysis: () => void;
  onCancelAnalysis: () => void;
  isUnsupportedState: boolean;
  placeError: ReactNode | null;
}

const formatTime = (seconds: number): string => {
    if (seconds < 0) return "";
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (remainingSeconds === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} seconds`;
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button
      type="button"
      className={`${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
);

const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const Step3_Analysis: React.FC<Step3Props> = (props) => {
  const [selectedMetalLevel, setSelectedMetalLevel] = useState<MetalLevel>('Silver');
  const [selectedCostTier, setSelectedCostTier] = useState<CostTier>('mean');
  const [analysisPeriod, setAnalysisPeriod] = useState<'monthly' | 'annual'>('annual');
  const [singleYearPeriod, setSingleYearPeriod] = useState<'monthly' | 'annual'>('annual');
  const [remainingTime, setRemainingTime] = useState<string | null>(null);

  const { premiumAnalysisProgress } = props;

  useEffect(() => {
    if (premiumAnalysisProgress) {
        const remainingCalls = premiumAnalysisProgress.total - premiumAnalysisProgress.current;
        const estimatedSeconds = remainingCalls * 0.35; // ~350ms per call avg
        setRemainingTime(formatTime(estimatedSeconds));
    } else {
        setRemainingTime(null);
    }
  }, [premiumAnalysisProgress]);


  const { 
      isGenerating, canCalculate, canGenerateAnalysis, onCalculateSingleYear, isCalculating, 
      onGeneratePremiumAnalysis, isGeneratingPremiumAnalysis, logEntry, 
      error, fallbackWarning, result, planStats, subsidyAmount, premiumAnalysisData, 
      hoveredIncome, onHoverIncome, onBack,
      income, onIncomeChange, startIncome, onStartIncomeChange,
      endIncome, onEndIncomeChange, incomeStep, onIncomeStepChange,
      onStopAnalysis, analysisWarning, onConfirmAnalysis, onCancelAnalysis,
      isUnsupportedState, placeError
  } = props;

  const handleDownloadAnalysis = () => {
    if (!premiumAnalysisData) return;

    let csvContent = '';

    const dataTypes: ('premium' | 'oopc' | 'total')[] = ['premium', 'oopc', 'total'];
    const titleMap = {
        premium: `Projected ${analysisPeriod === 'monthly' ? 'Monthly' : 'Annual'} Premiums`,
        oopc: `Projected ${analysisPeriod === 'monthly' ? 'Monthly' : 'Annual'} Out-of-Pocket Costs`,
        total: `Projected Total ${analysisPeriod === 'monthly' ? 'Monthly' : 'Annual'} Costs (Premiums + OOPC)`,
    };
    
    dataTypes.forEach(dataType => {
        csvContent += `"${titleMap[dataType]}"\n`;
        const headerRow = ['Income', ...premiumAnalysisData.columnHeaders.map(h => `"${h}"`)];
        csvContent += headerRow.join(',') + '\n';

        premiumAnalysisData.rowData.forEach(row => {
            const rowData = [row.income === -1 ? 'No Subsidy' : row.income.toString()];
            row.values.forEach(cellData => {
                const matchingPlan = cellData?.stats?.find(s => s.metal_level === selectedMetalLevel);
                let displayValue: number | null = null;
                if (matchingPlan) {
                    const premium = matchingPlan.premiums[selectedCostTier];
                    const oopc = matchingPlan.oopc[selectedCostTier];
                    let monthlyValue: number | null = null;
                    if (dataType === 'premium') monthlyValue = premium;
                    else if (dataType === 'oopc') monthlyValue = oopc / 12;
                    else if (dataType === 'total' && typeof premium === 'number' && typeof oopc === 'number') monthlyValue = premium + (oopc / 12);

                    if (monthlyValue !== null) {
                        displayValue = analysisPeriod === 'annual' ? monthlyValue * 12 : monthlyValue;
                    }
                }
                rowData.push(displayValue !== null ? displayValue.toFixed(2) : '');
            });
            csvContent += rowData.join(',') + '\n';
        });
        csvContent += '\n\n';
    });
    
    downloadFile(`long_term_analysis_${selectedMetalLevel}_${selectedCostTier}_${analysisPeriod}.csv`, csvContent);
  };
  
  const metalButtonColors = {
    Bronze: 'bg-[#cd7f32]/20 hover:bg-[#cd7f32]/40 text-[#cd7f32]',
    Silver: 'bg-gray-300/50 hover:bg-gray-400/50 text-gray-400',
    Gold: 'bg-yellow-300/40 hover:bg-yellow-400/40 text-yellow-500',
  };
  const activeMetalButtonColors = {
    Bronze: 'bg-[#cd7f32] text-white ring-2 ring-offset-2 ring-[#cd7f32]/70 dark:ring-offset-gray-900',
    Silver: 'bg-gray-500 text-white ring-2 ring-offset-2 ring-gray-500/70 dark:ring-offset-gray-900',
    Gold: 'bg-yellow-500 text-white ring-2 ring-offset-2 ring-yellow-500/70 dark:ring-offset-gray-900',
  };

  return (
    <div className="space-y-8">
      {analysisWarning && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="warning-title" aria-describedby="warning-description">
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-2xl max-w-md text-center w-full">
                <h3 id="warning-title" className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  Warning
                  <br />
                  <span className="text-lg font-normal">analysis may take awhile</span>
                </h3>
                <div id="warning-description" className="mt-4 text-gray-700 dark:text-gray-300 space-y-2">
                    <p>
                        This analysis will perform approximately <strong>{analysisWarning.totalCalls}</strong> calculations and may take about <strong>{formatTime(analysisWarning.timeEstimate)}</strong> to complete.
                    </p>
                    <p>Do you want to continue?</p>
                </div>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={onCancelAnalysis} className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={onConfirmAnalysis} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">Continue</button>
                </div>
            </div>
        </div>
      )}

      {fallbackWarning && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700 flex items-start gap-3">
            <div className="flex-shrink-0 text-yellow-600 dark:text-yellow-300 mt-1">
                <InfoIcon className="h-5 w-5" />
            </div>
            <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Data Fallback Notice</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {fallbackWarning}
                </p>
            </div>
        </div>
      )}
      
      <section>
        <h2 className="text-2xl font-semibold border-b-2 border-blue-200 dark:border-blue-800 pb-2 mb-4">Analysis Tools</h2>
        
        {isUnsupportedState ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <InfoIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Unsupported State</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{placeError}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full">
                  <div className="flex-grow space-y-4">
                      <h3 className="text-lg font-medium text-center">Single Year Analysis</h3>
                      <div>
                          <label htmlFor="income" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Annual Household Income</label>
                          <div className="relative mt-1">
                              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                              <input type="number" id="income" value={income} onChange={(e) => onIncomeChange(Number(e.target.value))} className="pl-7 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., 75000" min="0" disabled={isGenerating} />
                          </div>
                      </div>
                  </div>
                  <div className="mt-6">
                      <button type="button" onClick={onCalculateSingleYear} disabled={isGenerating || !canCalculate} className="flex items-center gap-3 w-full justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed">
                          <CalculatorIcon />
                          {isCalculating ? 'Calculating...' : 'Calculate Single Year Costs' }
                      </button>
                  </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full">
                  <div className="flex-grow space-y-4">
                      <h3 className="text-lg font-medium text-center">Long-Term Analysis</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                              <label htmlFor="startIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Income</label>
                              <div className="relative mt-1">
                              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                              <input type="number" id="startIncome" value={startIncome} onChange={(e) => onStartIncomeChange(Number(e.target.value))} className="pl-7 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500" min="0" step="1000" disabled={isGenerating}/>
                              </div>
                          </div>
                          <div>
                              <label htmlFor="endIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Income</label>
                              <div className="relative mt-1">
                              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                              <input type="number" id="endIncome" value={endIncome} onChange={(e) => onEndIncomeChange(Number(e.target.value))} className="pl-7 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500" min="0" step="1000" disabled={isGenerating}/>
                              </div>
                          </div>
                          <div>
                              <label htmlFor="incomeStep" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Income Step</label>
                              <div className="relative mt-1">
                              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                              <input type="number" id="incomeStep" value={incomeStep} onChange={(e) => onIncomeStepChange(Number(e.target.value))} className="pl-7 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500" min="1" step="100" disabled={isGenerating}/>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="mt-6">
                      <button type="button" onClick={onGeneratePremiumAnalysis} disabled={isGenerating || !canGenerateAnalysis} className="flex items-center gap-3 w-full justify-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-teal-400 dark:disabled:bg-teal-800 disabled:cursor-not-allowed">
                          <ChartBarIcon />
                          {isGeneratingPremiumAnalysis ? `Analyzing...` : 'Analyze Long Term Costs' }
                      </button>
                  </div>
              </div>
          </div>
        )}
      </section>

      {isGeneratingPremiumAnalysis && (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-2xl">
                <div className="w-full flex-grow">
                {premiumAnalysisProgress && (
                    <div className="w-full max-w-md mx-auto">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(premiumAnalysisProgress.current / premiumAnalysisProgress.total) * 100}%` }}></div></div>
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1.5">{premiumAnalysisProgress.current} / {premiumAnalysisProgress.total}{remainingTime && ` (about ${remainingTime} remaining)`}</div>
                    </div>
                )}
                </div>
                {logEntry && (<div className="w-64 h-20 p-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-inner flex-shrink-0"><pre className="text-left text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-y-auto h-full">{logEntry}</pre></div>)}
            </div>
             <button type="button" onClick={onStopAnalysis} className="flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 transition-colors">Stop Analysis</button>
        </div>
      )}
      
      {error && <ResultDisplay isLoading={false} error={error} result={null} period="monthly" />}
      {isCalculating && <ResultDisplay isLoading={true} error={null} result={null} period="monthly" />}
      
      {result && !isCalculating && !error && (
        <div className="space-y-8 mt-8">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-3 text-sm font-medium">
                    <span className={singleYearPeriod === 'monthly' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}>Monthly View</span>
                    <ToggleSwitch checked={singleYearPeriod === 'annual'} onChange={(isChecked) => setSingleYearPeriod(isChecked ? 'annual' : 'monthly')} />
                    <span className={singleYearPeriod === 'annual' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}>Annual View</span>
                </div>
            </div>
          <ResultDisplay isLoading={false} error={null} result={result} period={singleYearPeriod} />
          <PlanStatsDisplay stats={planStats} subsidy={subsidyAmount} period={singleYearPeriod} />
        </div>
      )}

      {premiumAnalysisData && (
          <div className="mt-12 space-y-12">
            <div className="p-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold">Long-Term Cost Projections</h3>
                    <button onClick={handleDownloadAnalysis} className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800" title="Download all analysis data as CSV"><DownloadIcon /><span>Download All</span></button>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-900 rounded-lg">
                    {(['Bronze', 'Silver', 'Gold'] as MetalLevel[]).map(level => (
                        <button key={level} onClick={() => setSelectedMetalLevel(level)} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors focus:outline-none ${selectedMetalLevel === level ? activeMetalButtonColors[level] + ' shadow' : metalButtonColors[level]}`}>
                        <MetalIcon /> {level}
                        </button>
                    ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">Premium Tier:</span>
                        <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-900 rounded-lg">
                            {(['min', 'mean', 'max'] as CostTier[]).map(tier => (<button key={tier} onClick={() => setSelectedCostTier(tier)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-500 ${selectedCostTier === tier ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{tier === 'mean' ? 'Average' : tier}</button>))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                        <span className={analysisPeriod === 'monthly' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}>Monthly</span>
                        <ToggleSwitch checked={analysisPeriod === 'annual'} onChange={(isChecked) => setAnalysisPeriod(isChecked ? 'annual' : 'monthly')} />
                        <span className={analysisPeriod === 'annual' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}>Annual</span>
                    </div>
                </div>
            </div>

            <section><PremiumAnalysisTable data={premiumAnalysisData} dataType="premium" metalLevel={selectedMetalLevel} costTier={selectedCostTier} analysisPeriod={analysisPeriod} hoveredIncome={hoveredIncome} onHoverIncome={onHoverIncome} /><PremiumAnalysisChart data={premiumAnalysisData} dataType="premium" metalLevel={selectedMetalLevel} costTier={selectedCostTier} analysisPeriod={analysisPeriod} hoveredIncome={hoveredIncome} onHoverIncome={onHoverIncome} /></section>
            <section><PremiumAnalysisTable data={premiumAnalysisData} dataType="oopc" metalLevel={selectedMetalLevel} costTier={selectedCostTier} analysisPeriod={analysisPeriod} hoveredIncome={hoveredIncome} onHoverIncome={onHoverIncome} /><PremiumAnalysisChart data={premiumAnalysisData} dataType="oopc" metalLevel={selectedMetalLevel} costTier={selectedCostTier} analysisPeriod={analysisPeriod} hoveredIncome={hoveredIncome} onHoverIncome={onHoverIncome} /></section>
            <section><PremiumAnalysisTable data={premiumAnalysisData} dataType="total" metalLevel={selectedMetalLevel} costTier={selectedCostTier} analysisPeriod={analysisPeriod} hoveredIncome={hoveredIncome} onHoverIncome={onHoverIncome} /><PremiumAnalysisChart data={premiumAnalysisData} dataType="total" metalLevel={selectedMetalLevel} costTier={selectedCostTier} analysisPeriod={analysisPeriod} hoveredIncome={hoveredIncome} onHoverIncome={onHoverIncome} /></section>
          </div>
      )}
        
      <div className="pt-6 flex justify-start">
          <button type="button" onClick={onBack} disabled={isGenerating} className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed">Back to Inputs</button>
      </div>
    </div>
  );
};

export default Step3_Analysis;