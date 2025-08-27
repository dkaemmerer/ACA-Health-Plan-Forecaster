import React from 'react';
import type { PlanStat, MetalLevel } from '../types.ts';
import { MetalIcon, DownloadIcon } from './icons.tsx';

interface PlanStatsDisplayProps {
  stats: PlanStat[] | null;
  subsidy: number;
  period: 'monthly' | 'annual';
}

const formatCurrency = (amount: number, fractionDigits = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
};

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

const PlanStatsDisplay: React.FC<PlanStatsDisplayProps> = ({ stats, subsidy, period }) => {
  const planOrder = ['Bronze', 'Silver', 'Gold'];
  const metalColorClasses = {
    Bronze: 'text-[#cd7f32]',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-500',
  };

  if (!stats || stats.length === 0) {
    return null;
  }
  
  const sortedStats = [...stats].sort((a, b) => planOrder.indexOf(a.metal_level) - planOrder.indexOf(b.metal_level)).filter(s => planOrder.includes(s.metal_level));
  const showSubsidy = subsidy > 0;
  const isMonthly = period === 'monthly';

  const handleDownload = () => {
    if (!sortedStats) return;

    let csvContent = '';
    
    // Premiums
    csvContent += `"${isMonthly ? 'Estimated Monthly Premiums' : 'Estimated Annual Premiums'}"\n`;
    const premiumHeaders = showSubsidy 
        ? ['Plan Level', 'Full Price (Min)', 'After Subsidy (Min)', 'Full Price (Average)', 'After Subsidy (Average)', 'Full Price (Max)', 'After Subsidy (Max)']
        : ['Plan Level', 'Minimum Premium', 'Average Premium', 'Maximum Premium'];
    csvContent += premiumHeaders.join(',') + '\n';
    sortedStats.forEach(plan => {
        const multiplier = isMonthly ? 1 : 12;
        let rowData = [
            plan.metal_level, 
            ((plan.premiums.min + subsidy) * multiplier).toFixed(2), 
            (plan.premiums.min * multiplier).toFixed(2), 
            ((plan.premiums.mean + subsidy) * multiplier).toFixed(2), 
            (plan.premiums.mean * multiplier).toFixed(2), 
            ((plan.premiums.max + subsidy) * multiplier).toFixed(2), 
            (plan.premiums.max * multiplier).toFixed(2)
        ];
        if (!showSubsidy) {
            rowData = [
                plan.metal_level,
                (plan.premiums.min * multiplier).toFixed(2),
                (plan.premiums.mean * multiplier).toFixed(2),
                (plan.premiums.max * multiplier).toFixed(2)
            ]
        };
        csvContent += rowData.join(',') + '\n';
    });
    csvContent += '\n';

    // OOPC
    csvContent += `"${isMonthly ? 'Estimated Monthly Out-of-Pocket Costs' : 'Estimated Annual Out-of-Pocket Costs'}"\n`;
    const oopcHeaders = ['Plan Level', 'Minimum OOPC', 'Average OOPC', 'Maximum OOPC'];
    csvContent += oopcHeaders.join(',') + '\n';
    sortedStats.forEach(plan => {
        const divisor = isMonthly ? 12 : 1;
      const rowData = [plan.metal_level, (plan.oopc.min / divisor).toFixed(2), (plan.oopc.mean / divisor).toFixed(2), (plan.oopc.max / divisor).toFixed(2)];
      csvContent += rowData.join(',') + '\n';
    });
    csvContent += '\n';
    
    // Total Costs
    csvContent += `"${isMonthly ? 'Estimated Total Monthly Costs (Premiums + OOPC)' : 'Estimated Total Annual Costs (Premiums + OOPC)'}"\n`;
    const totalHeaders = showSubsidy
      ? ['Plan Level', 'Full Price (Min)', 'After Subsidy (Min)', 'Full Price (Average)', 'After Subsidy (Average)', 'Full Price (Max)', 'After Subsidy (Max)']
      : ['Plan Level', 'Minimum Total', 'Average Total', 'Maximum Total'];
    csvContent += totalHeaders.join(',') + '\n';
    sortedStats.forEach(plan => {
        const afterSubsidyMin = isMonthly ? (plan.premiums.min + plan.oopc.min / 12) : (plan.premiums.min * 12) + plan.oopc.min;
        const afterSubsidyMean = isMonthly ? (plan.premiums.mean + plan.oopc.mean / 12) : (plan.premiums.mean * 12) + plan.oopc.mean;
        const afterSubsidyMax = isMonthly ? (plan.premiums.max + plan.oopc.max / 12) : (plan.premiums.max * 12) + plan.oopc.max;
        
        let rowData;
        if (showSubsidy) {
            const fullPriceMin = isMonthly ? ((plan.premiums.min + subsidy) + plan.oopc.min / 12) : ((plan.premiums.min * 12) + (subsidy * 12) + plan.oopc.min);
            const fullPriceMean = isMonthly ? ((plan.premiums.mean + subsidy) + plan.oopc.mean / 12) : ((plan.premiums.mean * 12) + (subsidy * 12) + plan.oopc.mean);
            const fullPriceMax = isMonthly ? ((plan.premiums.max + subsidy) + plan.oopc.max / 12) : ((plan.premiums.max * 12) + (subsidy * 12) + plan.oopc.max);
            rowData = [
                plan.metal_level, 
                fullPriceMin.toFixed(2), afterSubsidyMin.toFixed(2), 
                fullPriceMean.toFixed(2), afterSubsidyMean.toFixed(2), 
                fullPriceMax.toFixed(2), afterSubsidyMax.toFixed(2)
            ];
        } else {
            rowData = [plan.metal_level, afterSubsidyMin.toFixed(2), afterSubsidyMean.toFixed(2), afterSubsidyMax.toFixed(2)];
        }
        csvContent += rowData.join(',') + '\n';
    });
    
    downloadFile(`cost_estimates_${period}.csv`, csvContent);
  };

  return (
    <div className="mt-8 space-y-10">
        <div className="flex items-center justify-center -mb-6">
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                title="Download all tables as CSV"
            >
                <DownloadIcon />
                <span>Download All</span>
            </button>
        </div>

        {/* Premiums Table */}
        <section>
            <h3 className="text-xl font-semibold text-center mb-4">Estimated {isMonthly ? 'Monthly' : 'Annual'} Premiums</h3>
            <div className="overflow-x-auto bg-white dark:bg-gray-800/50 rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    {showSubsidy ? (
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th rowSpan={2} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider align-bottom border-b border-gray-200 dark:border-gray-700">Plan Level</th>
                                <th colSpan={2} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Minimum Premium</th>
                                <th colSpan={2} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Average Premium</th>
                                <th colSpan={2} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Maximum Premium</th>
                            </tr>
                            <tr>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Full Price</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">After Subsidy</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Full Price</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">After Subsidy</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Full Price</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">After Subsidy</th>
                            </tr>
                        </thead>
                    ) : (
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Plan Level</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Minimum Premium</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Average Premium</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Maximum Premium</th>
                            </tr>
                        </thead>
                    )}
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedStats.map((plan) => {
                            const multiplier = isMonthly ? 1 : 12;
                            return (
                                <tr key={plan.metal_level}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"><div className={`flex items-center gap-2 ${metalColorClasses[plan.metal_level as MetalLevel] || ''}`}><MetalIcon /><span>{plan.metal_level}</span></div></td>
                                    {showSubsidy ? (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency((plan.premiums.min + subsidy) * multiplier)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold text-right">{formatCurrency(plan.premiums.min * multiplier)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency((plan.premiums.mean + subsidy) * multiplier)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold text-right">{formatCurrency(plan.premiums.mean * multiplier)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency((plan.premiums.max + subsidy) * multiplier)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold text-right">{formatCurrency(plan.premiums.max * multiplier)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(plan.premiums.min * multiplier)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(plan.premiums.mean * multiplier)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(plan.premiums.max * multiplier)}</td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {showSubsidy && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">Your estimated {isMonthly ? 'monthly' : 'annual'} tax credit of <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(subsidy * (isMonthly ? 1 : 12))}</span> has been applied.</p>}
        </section>

        {/* OOPC Table */}
        <section>
            <h3 className="text-xl font-semibold text-center mb-4">Estimated {isMonthly ? 'Monthly' : 'Annual'} Out-of-Pocket Costs</h3>
            <div className="overflow-x-auto bg-white dark:bg-gray-800/50 rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Plan Level</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Minimum Cost</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Average Cost</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Maximum Cost</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedStats.map((plan) => {
                            const divisor = isMonthly ? 12 : 1;
                            const fractionDigits = isMonthly ? 2 : 0;
                            return (
                                <tr key={plan.metal_level}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"><div className={`flex items-center gap-2 ${metalColorClasses[plan.metal_level as MetalLevel] || ''}`}><MetalIcon /><span>{plan.metal_level}</span></div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(plan.oopc.min / divisor, fractionDigits)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(plan.oopc.mean / divisor, fractionDigits)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(plan.oopc.max / divisor, fractionDigits)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">Estimates based on your selected "Healthcare Needs" for each person.</p>
        </section>

        {/* Total Cost Table */}
        <section>
            <h3 className="text-xl font-semibold text-center mb-4">Estimated Total {isMonthly ? 'Monthly' : 'Annual'} Costs <span className="text-base font-normal text-gray-500">(Premiums + OOPC)</span></h3>
             <div className="overflow-x-auto bg-white dark:bg-gray-800/50 rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    {showSubsidy ? (
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th rowSpan={2} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider align-bottom border-b border-gray-200 dark:border-gray-700">Plan Level</th>
                                <th colSpan={2} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Minimum Total</th>
                                <th colSpan={2} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Average Total</th>
                                <th colSpan={2} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">Maximum Total</th>
                            </tr>
                            <tr>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Full Price</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">After Subsidy</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Full Price</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">After Subsidy</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Full Price</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">After Subsidy</th>
                            </tr>
                        </thead>
                    ) : (
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Plan Level</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Minimum Total</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Average Total</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Maximum Total</th>
                            </tr>
                        </thead>
                    )}
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedStats.map((plan) => {
                            const fractionDigits = isMonthly ? 2 : 0;
                            
                            const afterSubsidyMin = isMonthly ? (plan.premiums.min + plan.oopc.min / 12) : (plan.premiums.min * 12) + plan.oopc.min;
                            const afterSubsidyMean = isMonthly ? (plan.premiums.mean + plan.oopc.mean / 12) : (plan.premiums.mean * 12) + plan.oopc.mean;
                            const afterSubsidyMax = isMonthly ? (plan.premiums.max + plan.oopc.max / 12) : (plan.premiums.max * 12) + plan.oopc.max;

                            return (
                                <tr key={plan.metal_level}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"><div className={`flex items-center gap-2 ${metalColorClasses[plan.metal_level as MetalLevel] || ''}`}><MetalIcon /><span>{plan.metal_level}</span></div></td>
                                    {showSubsidy ? (() => {
                                        const fullPriceMin = isMonthly ? ((plan.premiums.min + subsidy) + plan.oopc.min / 12) : ((plan.premiums.min * 12) + (subsidy * 12) + plan.oopc.min);
                                        const fullPriceMean = isMonthly ? ((plan.premiums.mean + subsidy) + plan.oopc.mean / 12) : ((plan.premiums.mean * 12) + (subsidy * 12) + plan.oopc.mean);
                                        const fullPriceMax = isMonthly ? ((plan.premiums.max + subsidy) + plan.oopc.max / 12) : ((plan.premiums.max * 12) + (subsidy * 12) + plan.oopc.max);
                                        return (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(fullPriceMin, fractionDigits)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold text-right">{formatCurrency(afterSubsidyMin, fractionDigits)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(fullPriceMean, fractionDigits)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold text-right">{formatCurrency(afterSubsidyMean, fractionDigits)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{formatCurrency(fullPriceMax, fractionDigits)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold text-right">{formatCurrency(afterSubsidyMax, fractionDigits)}</td>
                                            </>
                                        )
                                    })() : (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-semibold text-right">{formatCurrency(afterSubsidyMin, fractionDigits)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-semibold text-right">{formatCurrency(afterSubsidyMean, fractionDigits)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-semibold text-right">{formatCurrency(afterSubsidyMax, fractionDigits)}</td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">Total cost is your {isMonthly ? 'monthly' : 'annual'} after-subsidy premium plus your estimated {isMonthly ? 'monthly' : 'annual'} out-of-pocket spending.</p>
        </section>
    </div>
  );
};

export default PlanStatsDisplay;