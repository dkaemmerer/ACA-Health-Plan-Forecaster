
import React, { useMemo } from 'react';
import type { PremiumAnalysisData, MetalLevel, CostTier } from '../types';

interface ChartProps {
  data: PremiumAnalysisData;
  dataType: 'premium' | 'oopc' | 'total';
  metalLevel: MetalLevel;
  costTier: CostTier;
  analysisPeriod: 'monthly' | 'annual';
  hoveredIncome: number | null;
  onHoverIncome: (income: number | null) => void;
}

const colors = [ '#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e' ];
const NO_SUBSIDY_COLOR = '#6b7280'; // Gray

const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount.toFixed(0)}`;
};

const PremiumAnalysisChart: React.FC<ChartProps> = ({ data, dataType, metalLevel, costTier, analysisPeriod, hoveredIncome, onHoverIncome }) => {
  
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
  
  const chartData = useMemo(() => {
    const relevantRowData = (dataType === 'oopc' && data.rowData.length > 0)
        ? [data.rowData.find(row => row.values.some(cell => cell !== null))].filter(Boolean) as PremiumAnalysisData['rowData']
        : data.rowData;

    const lines = relevantRowData.map(row => {
      const points = row.values.map((cell, index) => {
        const value = getDisplayValue(cell);
        if (typeof value === 'number') {
          return { x: index, y: value };
        }
        return null;
      }).filter(p => p !== null) as { x: number; y: number }[];
      
      return { income: row.income, points };
    }).filter(l => l.points.length > 0);

    const allPoints = lines.flatMap(l => l.points);
    const maxY = Math.max(...allPoints.map(p => p.y), 0);
    const numCategories = data.columnHeaders.length;

    const subsidizedLines = lines.filter(l => l.income !== -1);
    const noSubsidyLine = lines.find(l => l.income === -1);
    
    return { lines, subsidizedLines, noSubsidyLine, maxY: Math.ceil(maxY / 100) * 100, numCategories };
  }, [data, metalLevel, costTier, analysisPeriod, dataType]);

  const width = 800;
  const height = 450;
  const margin = { top: 20, right: 20, bottom: 100, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = (x: number) => margin.left + (chartData.numCategories > 1 ? (x / (chartData.numCategories - 1)) * innerWidth : innerWidth / 2);
  const yScale = (y: number) => margin.top + innerHeight - (chartData.maxY > 0 ? (y / chartData.maxY) * innerHeight : innerHeight);
  
  const yAxisTicks = useMemo(() => {
      const ticks = [];
      const numTicks = 5;
      if (chartData.maxY === 0) return [0];
      for (let i = 0; i <= numTicks; i++) {
        ticks.push((chartData.maxY / numTicks) * i);
      }
      return ticks;
  }, [chartData.maxY]);
  
  const titleMap = {
    premium: 'Premium',
    oopc: 'Out-of-Pocket Cost',
    total: 'Total Cost',
  };
  const chartTitle = `${analysisPeriod.charAt(0).toUpperCase() + analysisPeriod.slice(1)} ${titleMap[dataType]} Projections Over Time`;

  if (chartData.lines.length === 0) return null;

  return (
    <div className="mt-8">
        <h3 className="text-xl font-semibold text-center mb-2">{chartTitle}</h3>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="font-sans">
            <g className="text-gray-500 dark:text-gray-400 text-xs">
                {yAxisTicks.map(tick => (
                    <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
                        <line x1={margin.left} x2={width - margin.right} stroke="currentColor" strokeDasharray="2,3" className="text-gray-200 dark:text-gray-700" />
                        <text x={margin.left - 8} y="4" textAnchor="end" className="fill-current">{formatCurrency(tick)}</text>
                    </g>
                ))}
            </g>

            <g className="text-gray-500 dark:text-gray-400 text-xs">
                 {data.columnHeaders.map((label, i) => (
                    <g key={i} transform={`translate(${xScale(i)}, ${height - margin.bottom})`}>
                       <text y={15} transform={`rotate(-45)`} textAnchor="end" className="fill-current">{label}</text>
                    </g>
                ))}
            </g>

            <g>
                {chartData.lines.map((line) => {
                    if (line.points.length < 1) return null;
                    const path = line.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`).join(' ');
                    const isHovered = hoveredIncome === line.income;
                    const isNoSubsidy = line.income === -1;
                    const lineIndex = chartData.subsidizedLines.findIndex(l => l.income === line.income);
                    const color = isNoSubsidy ? NO_SUBSIDY_COLOR : colors[lineIndex % colors.length];

                    return (
                        <path 
                            key={line.income} 
                            d={path} 
                            fill="none" 
                            stroke={color}
                            strokeWidth={isHovered ? 4 : 2}
                            strokeDasharray={isNoSubsidy ? "4,4" : "none"}
                            className="transition-all duration-150"
                            opacity={hoveredIncome === null || isHovered ? 1 : 0.3}
                        />
                    );
                })}
            </g>

             <g>
                {chartData.lines.flatMap((line) => 
                    line.points.map(p => (
                         <circle 
                            key={`${line.income}-${p.x}`}
                            cx={xScale(p.x)} 
                            cy={yScale(p.y)} 
                            r={10} 
                            fill="transparent"
                            onMouseEnter={() => onHoverIncome(line.income)}
                            onMouseLeave={() => onHoverIncome(null)}
                            className="cursor-pointer"
                        />
                    ))
                )}
            </g>

             <g>
                 {hoveredIncome !== null && chartData.lines.find(l => l.income === hoveredIncome)?.points.map((p, i) => {
                    const line = chartData.lines.find(l => l.income === hoveredIncome)!;
                    const isNoSubsidy = line.income === -1;
                    const lineIndex = chartData.subsidizedLines.findIndex(l => l.income === hoveredIncome);
                    const color = isNoSubsidy ? NO_SUBSIDY_COLOR : colors[lineIndex % colors.length];
                    return (
                        <circle 
                            key={i}
                            cx={xScale(p.x)}
                            cy={yScale(p.y)}
                            r={4}
                            fill={color}
                            className="pointer-events-none"
                        />
                    );
                 })}
             </g>
        </svg>

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
            {dataType === 'oopc' && chartData.lines.length > 0 ? (
                 <div 
                    key="oopc-legend" 
                    className="flex items-center gap-2 text-sm"
                >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[0] }}></span>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                        Estimated Cost
                    </span>
                </div>
            ) : (
                <>
                {chartData.subsidizedLines.map((line, i) => (
                    <div 
                        key={line.income} 
                        className="flex items-center gap-2 text-sm cursor-pointer"
                        onMouseEnter={() => onHoverIncome(line.income)}
                        onMouseLeave={() => onHoverIncome(null)}
                    >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></span>
                        <span className={`font-medium ${hoveredIncome === line.income ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(line.income)}
                        </span>
                    </div>
                ))}
                {chartData.noSubsidyLine && (
                     <div 
                        key={-1} 
                        className="flex items-center gap-2 text-sm cursor-pointer"
                        onMouseEnter={() => onHoverIncome(-1)}
                        onMouseLeave={() => onHoverIncome(null)}
                    >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NO_SUBSIDY_COLOR }}></span>
                        <span className={`font-medium ${hoveredIncome === -1 ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            No Subsidy
                        </span>
                    </div>
                )}
                </>
            )}
        </div>
    </div>
  );
};

export default PremiumAnalysisChart;
