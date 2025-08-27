


import React, { useMemo } from 'react';
import type { 
  PremiumAnalysisData, 
  MetalLevel, 
  CostTier 
} from '../types.ts';

interface PremiumAnalysisTableProps {
  data: PremiumAnalysisData;
  dataType: 'premium' | 'oopc' | 'total';
  metalLevel: MetalLevel;
  costTier: CostTier;
  analysisPeriod: 'monthly' | 'annual';
  hoveredIncome: number | null;
  onHoverIncome: (income: number | null) => void;
}

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || typeof amount === 'undefined') return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getColorForValue = (value: number | undefined | null, min: number, max: number): { backgroundColor: string; color: string } => {
    if (value === null || typeof value === 'undefined') return { backgroundColor: 'transparent', color: '' };
    const range = max - min;
    if (range <= 0) return { backgroundColor: 'hsla(120, 70%, 90%, 0.7)', color: '#104028' };

    const percentage = (value - min) / range;
    
    const hue = 120 * (1 - percentage);
    const saturation = 70;
    const lightness = 92 - (percentage * 25); 

    const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const textColor = lightness > 65 ? '#1f2937' : '#f9fafb';
    
    return { backgroundColor, color: textColor };
};

const PremiumAnalysisTable: React.FC<PremiumAnalysisTableProps> = ({
  data,
  dataType,
  metalLevel,
  costTier,
  analysisPeriod,
  hoveredIncome,
  onHoverIncome,
}) => {

  const getDisplayValue = (cellData: PremiumAnalysisData['rowData'][0]['values'][0]) => {
      const matchingPlan = cellData?.stats?.find(s => s.metal_level === metalLevel);
      if (!matchingPlan) return null;

      const premium = matchingPlan.premiums[costTier];
      const oopc = matchingPlan.oopc[costTier];

      let monthlyValue: number | null = null;

      if (dataType === 'premium' && typeof premium === 'number') {
          monthlyValue = premium;
      } else if (dataType === 'oopc' && typeof oopc === 'number') {
          monthlyValue = oopc / 12;
      } else if (dataType === 'total' && typeof premium === 'number' && typeof oopc === 'number') {
          monthlyValue = premium + (oopc / 12);
      }
      
      if (monthlyValue === null) return null;

      return analysisPeriod === 'annual' ? monthlyValue * 12 : monthlyValue;
  };

  const tableData = useMemo(() => {
    if (dataType === 'oopc' && data.rowData.length > 0) {
      const firstRowWithData = data.rowData.find(row => row.values.some(cell => cell !== null));
      return firstRowWithData ? [firstRowWithData] : [];
    }
    return data.rowData;
  }, [data.rowData, dataType]);

  const { minVal, maxVal } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    tableData.forEach(row => {
      row.values.forEach(cellData => {
        const value = getDisplayValue(cellData);
        if (typeof value === 'number') {
          if (value < min) min = value;
          if (value > max) max = value;
        }
      });
    });
    return { 
        minVal: min === Infinity ? 0 : min, 
        maxVal: max === -Infinity ? 0 : max 
    };
  }, [tableData, metalLevel, costTier, analysisPeriod, dataType]);
  
  const titleMap = {
    premium: `Projected ${analysisPeriod === 'monthly' ? 'Monthly' : 'Annual'} Premiums`,
    oopc: `Projected ${analysisPeriod === 'monthly' ? 'Monthly' : 'Annual'} Out-of-Pocket Costs`,
    total: `Projected Total ${analysisPeriod === 'monthly' ? 'Monthly' : 'Annual'} Costs (Premiums + OOPC)`,
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-center mb-4">{titleMap[dataType]}</h3>
      <div className="overflow-x-auto visible-scrollbar bg-white dark:bg-gray-800/50 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider z-10">
                {dataType === 'oopc' ? '' : 'Income'}
              </th>
              {data.columnHeaders.map((header, colIndex) => (
                <th key={colIndex} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tableData.map((row, rowIndex) => {
               const isHovered = hoveredIncome !== null && hoveredIncome === row.income;
               const baseRowClass = row.income === -1 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800';
               const hoverRowClass = isHovered ? 'bg-sky-100 dark:bg-sky-800' : '';

               return (
                  <tr 
                    key={rowIndex} 
                    className={`${baseRowClass} ${hoverRowClass} transition-colors duration-150`}
                    onMouseEnter={() => onHoverIncome(row.income)}
                    onMouseLeave={() => onHoverIncome(null)}
                   >
                    <td className={`sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium z-10 transition-colors duration-150 ${isHovered ? 'bg-sky-100 dark:bg-sky-800' : baseRowClass} text-gray-900 dark:text-white`}>
                      {dataType === 'oopc' ? 'Estimate' : (row.income === -1 ? 'No Subsidy' : formatCurrency(row.income))}
                    </td>
                    {row.values.map((cellData, colIndex) => {
                      const value = getDisplayValue(cellData);
                      const cellStyle = getColorForValue(value, minVal, maxVal);
                      
                      return (
                        <td 
                          key={colIndex} 
                          className="px-6 py-4 whitespace-nowrap text-sm text-right transition-colors"
                          style={isHovered ? { backgroundColor: 'transparent' } : { backgroundColor: cellStyle.backgroundColor }}
                        >
                          <span 
                            className={`font-medium ${isHovered ? 'text-gray-800 dark:text-gray-100' : ''}`}
                            style={isHovered ? {} : { color: cellStyle.color }}
                          >
                            {formatCurrency(value)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
               );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PremiumAnalysisTable;