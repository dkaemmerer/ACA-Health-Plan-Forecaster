


import React, { useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import type { Person, Place, EstimateRequestPayload, EstimateResponse, PlanStatsRequestPayload, PlanStat, PremiumAnalysisData, MetalLevel, CostTier, FutureEvent, County } from './types.ts';
import { getEligibilityEstimate, getPlanStats, getCountiesByZip } from './services/healthCareGovService.ts';
import WizardStepper from './components/WizardStepper.tsx';
import Step1_Instructions from './components/Step1_Instructions.tsx';
import Step2_HouseholdIncome from './components/Step2_HouseholdIncome.tsx';
import Step3_Analysis from './components/Step3_Analysis.tsx';

const getCoverageYear = (): number => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 for January, 10 for November
  
  // Data for coverage year Y becomes available on Nov 1 of year Y-1.
  // e.g., 2025 data is available from Nov 1, 2024.
  // From Nov 1, 2024 to Oct 31, 2025, the latest available year is 2025.
  
  if (currentMonth >= 10) { // November or December
    // e.g. in Nov 2024, latest data is for 2025.
    return currentYear + 1;
  } else {
    // e.g. in Oct 2024, latest data is for 2024.
    // e.g. in Jan 2025, latest data is for 2025.
    return currentYear;
  }
};

const UNSUPPORTED_STATE_ABBREVIATIONS: Set<string> = new Set([
  'CA', 'CO', 'CT', 'DC', 'ID', 'KY', 'ME', 'MD', 'MA', 'MN', 
  'NV', 'NJ', 'NY', 'PA', 'RI', 'VT', 'VA', 'WA'
]);

const STATE_MARKETPLACE_URLS: Record<string, { name: string, url: string }> = {
  'CA': { name: 'Covered California', url: 'https://www.coveredca.com/' },
  'CO': { name: 'Connect for Health Colorado', url: 'https://connectforhealthco.com/' },
  'CT': { name: 'Access Health CT', url: 'https://www.accesshealthct.com/' },
  'DC': { name: 'DC Health Link', url: 'https://www.dchealthlink.com/' },
  'ID': { name: 'Your Health Idaho', url: 'https://www.yourhealthidaho.org/' },
  'KY': { name: 'kynect', url: 'https://kynect.ky.gov/' },
  'ME': { name: 'CoverME.gov', url: 'https://www.coverme.gov/' },
  'MD': { name: 'Maryland Health Connection', url: 'https://www.marylandhealthconnection.gov/' },
  'MA': { name: 'Massachusetts Health Connector', url: 'https://www.mahealthconnector.org/' },
  'MN': { name: 'MNsure', url: 'https://www.mnsure.org/' },
  'NV': { name: 'Nevada Health Link', url: 'https://www.nevadahealthlink.com/' },
  'NJ': { name: 'Get Covered NJ', url: 'https://www.getcovered.nj.gov/' },
  'NY': { name: 'NY State of Health', url: 'https://nystateofhealth.ny.gov/' },
  'PA': { name: 'Pennie', url: 'https://www.pennie.com/' },
  'RI': { name: 'HealthSource RI', url: 'https://healthsourceri.com/' },
  'VT': { name: 'Vermont Health Connect', url: 'https://portal.healthconnect.vermont.gov/' },
  'VA': { name: 'Virginia\'s Insurance Marketplace', url: 'https://www.marketplace.virginia.gov/' },
  'WA': { name: 'Washington Healthplanfinder', url: 'https://www.wahealthplanfinder.org/' },
};

const generateSmartHeader = (people: Person[], forceInitials: boolean = false): string => {
  if (people.length === 0) return "N/A";

  const totalNameLength = people.map(p => p.name).join('').length;

  // Use full names only if NOT forced to use initials, household is small, AND names are short.
  if (!forceInitials && people.length <= 3 && totalNameLength <= 11) {
    return people.map(p => `${p.name} ${p.age}`).join(' / ');
  }

  // Generate initial identifiers (1 char)
  let identifiers = people.map(p => p.name.substring(0, 1).toUpperCase());
  
  let hasDuplicates = true;
  let len = 1;
  
  while (hasDuplicates) {
    const counts: { [key: string]: number[] } = {};
    identifiers.forEach((id, index) => {
      if (!counts[id]) counts[id] = [];
      counts[id].push(index);
    });

    const duplicates = Object.values(counts).filter(indices => indices.length > 1);

    if (duplicates.length === 0) {
      hasDuplicates = false;
    } else {
      len++;
      duplicates.flat().forEach(indexToFix => {
        const personName = people[indexToFix].name;
        if (personName.length >= len) {
          identifiers[indexToFix] = personName.substring(0, len);
        }
      });
      // Safety break to prevent infinite loops on identical names
      if (len > 10) {
        hasDuplicates = false;
      }
    }
  }

  // Combine identifiers with ages
  return people.map((p, index) => `${identifiers[index]} ${p.age}`).join(' / ');
};


const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [zipcode, setZipcode] = useState<string>('60040');
  const [place, setPlace] = useState<Place | null>({ zipcode: '60040', state: 'IL', countyfips: '17097', countyName: 'Lake County' });
  const [isFetchingPlace, setIsFetchingPlace] = useState<boolean>(false);
  const [placeError, setPlaceError] = useState<ReactNode | null>(null);
  const [countiesForZip, setCountiesForZip] = useState<County[] | null>(null);
  const [selectedCountyFips, setSelectedCountyFips] = useState<string | null>('17097');
  const [isUnsupportedState, setIsUnsupportedState] = useState<boolean>(false);

  const [income, setIncome] = useState<number>(90000);
  const [people, setPeople] = useState<Person[]>([
    { id: '1', name: 'Mom', age: 42, gender: 'Female', is_parent: true, is_child_dependent: false, coverage_until_age: 25, uses_tobacco: false, is_pregnant: false, has_mec: false, aptc_eligible: true, utilization_level: 'Medium' },
    { id: '2', name: 'Dad', age: 41, gender: 'Male', is_parent: true, is_child_dependent: false, coverage_until_age: 25, uses_tobacco: false, is_pregnant: false, has_mec: false, aptc_eligible: true, utilization_level: 'Medium' },
    { id: '3', name: 'Kid', age: 5, gender: 'Male', is_parent: false, is_child_dependent: true, coverage_until_age: 25, uses_tobacco: false, is_pregnant: false, has_mec: false, aptc_eligible: true, utilization_level: 'Low' },
  ]);
  const [hasMarriedCouple, setHasMarriedCouple] = useState<boolean>(true);
  const [futureEvents, setFutureEvents] = useState<FutureEvent[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [planStats, setPlanStats] = useState<PlanStat[] | null>(null);

  const [isGeneratingPremiumAnalysis, setIsGeneratingPremiumAnalysis] = useState<boolean>(false);
  const [premiumAnalysisProgress, setPremiumAnalysisProgress] = useState<{ current: number; total: number } | null>(null);
  const [premiumAnalysisLogEntry, setPremiumAnalysisLogEntry] = useState<string | null>(null);
  const [premiumAnalysisData, setPremiumAnalysisData] = useState<PremiumAnalysisData | null>(null);
  const [hoveredIncome, setHoveredIncome] = useState<number | null>(null);

  const [startIncome, setStartIncome] = useState<number>(50000);
  const [endIncome, setEndIncome] = useState<number>(150000);
  const [incomeStep, setIncomeStep] = useState<number>(25000);
  const [analysisWarning, setAnalysisWarning] = useState<{ totalCalls: number; timeEstimate: number } | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
  const cancelAnalysisRef = useRef(false);

  const [singleYearCache, setSingleYearCache] = useState<{ inputs: any, result: EstimateResponse, planStats: PlanStat[] } | null>(null);
  const [longTermCache, setLongTermCache] = useState<{ inputs: any, data: PremiumAnalysisData } | null>(null);

  const coverageYear = useMemo(() => getCoverageYear(), []);

  const clearResultsAndCaches = useCallback(() => {
    setResult(null);
    setPlanStats(null);
    setPremiumAnalysisData(null);
    setError(null);
    setFallbackWarning(null);
    setSingleYearCache(null);
    setLongTermCache(null);
  }, []);

  const nextStep = () => setCurrentStep(prev => prev < wizardSteps.length ? prev + 1 : prev);
  const prevStep = () => {
      if (currentStep > 1) {
          if (currentStep === 3) clearResultsAndCaches();
          setCurrentStep(currentStep - 1);
      }
  };
  const goToStep = (step: number) => {
    if (step < currentStep && currentStep === 3) {
      clearResultsAndCaches();
    }
    setCurrentStep(step);
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const hasChildren = people.some(p => p.is_child_dependent);
    const hasParents = people.some(p => p.is_parent);

    if (hasChildren && !hasParents) {
        errors.push("At least one household member must be marked as 'Parent' when there is a 'Child dependent'.");
    }

    people.forEach(p => {
        if (p.is_child_dependent && p.coverage_until_age < p.age) {
            errors.push(`${p.name}'s 'Coverage Until Age' (${p.coverage_until_age}) cannot be less than their current age (${p.age}).`);
        }
    });

    futureEvents.forEach(event => {
        if ('current_age' in event && event.current_age < 0) {
            errors.push(`Future spouse's age cannot be negative.`);
        }
        if (event.years_from_now <= 0) {
            errors.push(`'Years from now' for a future event must be greater than 0.`);
        }
    });

    return errors;
  }, [people, futureEvents]);

  const handleZipcodeChange = useCallback(async (newZip: string) => {
    setZipcode(newZip);
    
    if (newZip === place?.zipcode && countiesForZip !== null) return;

    clearResultsAndCaches();
    setPlace(null);
    setCountiesForZip(null);
    setSelectedCountyFips(null);
    setPlaceError(null);
    setIsUnsupportedState(false);

    if (/^\d{5}$/.test(newZip)) {
      setIsFetchingPlace(true);
      try {
        const response = await getCountiesByZip(newZip, coverageYear);
        const counties = response.data.counties;
        
        if (counties && counties.length > 0) {
          setCountiesForZip(counties);
          if (counties.length === 1) {
            const singleCounty = counties[0];
            const state = singleCounty.state;
            const marketplaceInfo = STATE_MARKETPLACE_URLS[state];
            if (marketplaceInfo) {
              setIsUnsupportedState(true);
              setPlaceError(
                <>
                  This tool does not support {state} as it uses a state-specific health insurance marketplace. 
                  Please visit <a href={marketplaceInfo.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">{marketplaceInfo.name}</a> for assistance.
                </>
              );
            } else {
              setIsUnsupportedState(false);
            }
            setSelectedCountyFips(singleCounty.fips);
            setPlace({
              zipcode: newZip,
              state: singleCounty.state,
              countyfips: singleCounty.fips,
              countyName: singleCounty.name
            });
          }
        } else {
          setPlaceError('Could not find location data for this ZIP code.');
        }
      } catch (err) {
        setPlaceError('Failed to fetch location data.');
      } finally {
        setIsFetchingPlace(false);
      }
    } else if (newZip.length > 0) {
      setPlaceError('Please enter a valid 5-digit ZIP code.');
    }
  }, [place?.zipcode, clearResultsAndCaches, coverageYear, countiesForZip]);

  const handleCountySelectionChange = useCallback((fips: string) => {
    if (!countiesForZip) return;

    const selectedCounty = countiesForZip.find(c => c.fips === fips);
    if (selectedCounty) {
        const state = selectedCounty.state;
        const marketplaceInfo = STATE_MARKETPLACE_URLS[state];
        if (marketplaceInfo) {
            setIsUnsupportedState(true);
            setPlaceError(
              <>
                This tool does not support {state} as it uses a state-specific health insurance marketplace. 
                Please visit <a href={marketplaceInfo.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">{marketplaceInfo.name}</a> for assistance.
              </>
            );
        } else {
            setIsUnsupportedState(false);
            setPlaceError(null);
        }
        if (fips !== selectedCountyFips) {
            clearResultsAndCaches();
        }
        setSelectedCountyFips(fips);
        setPlace({
            zipcode: selectedCounty.zipcode,
            state: selectedCounty.state,
            countyfips: selectedCounty.fips,
            countyName: selectedCounty.name
        });
    }
  }, [countiesForZip, selectedCountyFips, clearResultsAndCaches]);

  const setPeopleWithClear = useCallback((updater: React.SetStateAction<Person[]>) => {
    clearResultsAndCaches();
    setPeople(updater);
  }, [clearResultsAndCaches]);

  const handlePersonChange = useCallback((id: string, updatedPerson: Partial<Person>) => {
    setPeopleWithClear(prevPeople =>
      prevPeople.map(p => (p.id === id ? { ...p, ...updatedPerson } : p))
    );
  }, [setPeopleWithClear]);

  const addPerson = useCallback(() => {
    const newPerson: Person = {
      id: new Date().getTime().toString(),
      name: `Person ${people.length + 1}`,
      age: 30,
      gender: 'Female',
      is_parent: false,
      is_child_dependent: false,
      coverage_until_age: 25,
      uses_tobacco: false,
      is_pregnant: false,
      has_mec: false,
      aptc_eligible: true,
      utilization_level: 'Low',
    };
    setPeopleWithClear(prev => [...prev, newPerson]);
  }, [people.length, setPeopleWithClear]);

  const removePerson = useCallback((id: string) => {
    setPeopleWithClear(prev => prev.filter(p => p.id !== id));
  }, [setPeopleWithClear]);
  
  const setHasMarriedCoupleWithClear = useCallback((val: boolean) => {
    clearResultsAndCaches();
    setHasMarriedCouple(val);
  }, [clearResultsAndCaches]);
  
  const setFutureEventsWithClear = useCallback((updater: React.SetStateAction<FutureEvent[]>) => {
    clearResultsAndCaches();
    setFutureEvents(updater);
  }, [clearResultsAndCaches]);

  const addFutureEvent = useCallback((event: Omit<FutureEvent, 'id'>) => {
    const newEvent = { ...event, id: new Date().getTime().toString() } as FutureEvent;
    setFutureEventsWithClear(prev => [...prev, newEvent]);
  }, [setFutureEventsWithClear]);
  
  const updateFutureEvent = useCallback((id: string, updatedEventData: Omit<FutureEvent, 'id'>) => {
    setFutureEventsWithClear(prevEvents => 
        prevEvents.map(event => 
            event.id === id ? { ...updatedEventData, id } as FutureEvent : event
        )
    );
  }, [setFutureEventsWithClear]);

  const removeFutureEvent = useCallback((id: string) => {
    setFutureEventsWithClear(prev => prev.filter(e => e.id !== id));
  }, [setFutureEventsWithClear]);

  const onIncomeChangeWithCache = (val: number) => {
    setIncome(val);
    setSingleYearCache(null);
  };
  const onStartIncomeChangeWithCache = (val: number) => {
    setStartIncome(val);
    setLongTermCache(null);
  };
  const onEndIncomeChangeWithCache = (val: number) => {
    setEndIncome(val);
    setLongTermCache(null);
  };
  const onIncomeStepChangeWithCache = (val: number) => {
    setIncomeStep(val);
    setLongTermCache(null);
  };

  const canProceedFromStep2 = useMemo(() => {
      return place && !isFetchingPlace && people.length > 0 && people.some(p => p.aptc_eligible) && validationErrors.length === 0 && !isUnsupportedState;
  }, [place, isFetchingPlace, people, validationErrors, isUnsupportedState]);

  const canCalculate = useMemo(() => {
      return canProceedFromStep2 && income >= 0;
  }, [canProceedFromStep2, income]);
  
  const canGenerateAnalysis = useMemo(() => {
      return canProceedFromStep2 && startIncome >= 0 && endIncome >= startIncome && incomeStep > 0;
  }, [canProceedFromStep2, startIncome, endIncome, incomeStep]);

  const handleCalculate = async () => {
    if (!canCalculate || !place) return;

    setPremiumAnalysisData(null);
    setError(null);
    setFallbackWarning(null);
    
    const currentInputs = {
        zipcode, place: JSON.stringify(place), people: JSON.stringify(people), hasMarriedCouple, income
    };
    
    if (singleYearCache && JSON.stringify(singleYearCache.inputs) === JSON.stringify(currentInputs)) {
        setResult(singleYearCache.result);
        setPlanStats(singleYearCache.planStats);
        return;
    }

    setIsLoading(true);
    setResult(null);
    setPlanStats(null);

    const activePeople = people.filter(p => !(p.is_child_dependent && p.age > p.coverage_until_age));
    if (activePeople.length === 0 || !activePeople.some(p => p.aptc_eligible)) {
        setError("No one in the household is eligible for coverage with the current settings.");
        setIsLoading(false);
        return;
    }

    const householdPayload = {
        income,
        people: activePeople.map(({ id, name, is_child_dependent, coverage_until_age, ...rest }) => {
            const apiPerson = { ...rest }; if(is_child_dependent && rest.age >= 19) { apiPerson.is_parent = false; } return apiPerson;
        }),
        has_married_couple: hasMarriedCouple, unemployment_received: 'None' as const,
    };
    const estimatePayload: EstimateRequestPayload = { year: coverageYear, place: place, household: householdPayload, };
    const statsPayload: PlanStatsRequestPayload = { market: 'Individual', year: coverageYear, place: place, household: householdPayload, };

    try {
      const [estimateResult, statsResult] = await Promise.all([ getEligibilityEstimate(estimatePayload), getPlanStats(statsPayload) ]);
      
      setResult(estimateResult.data);
      setPlanStats(statsResult.data);

      if (estimateResult.fallbackOccurred || statsResult.fallbackOccurred) {
        const originalYear = coverageYear;
        const usedYear = estimateResult.usedYear;
        setFallbackWarning(`We couldn't retrieve data for ${originalYear}, as it may not be available yet. Displaying results based on ${usedYear} data. Projections may be less accurate.`);
      }

      setSingleYearCache({ inputs: currentInputs, result: estimateResult.data, planStats: statsResult.data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during calculation.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0, }).format(amount);
  };
  
  const handleStopAnalysis = useCallback(() => {
    cancelAnalysisRef.current = true;
    setIsGeneratingPremiumAnalysis(false);
    setPremiumAnalysisProgress(null);
    setPremiumAnalysisLogEntry('Analysis stopped by user.');
  }, []);

  const startPremiumAnalysis = async (totalCalls: number, incomes: number[], projectionYears: { household: Person[], has_married_couple: boolean }[], currentInputs: any, forceInitials: boolean) => {
    if (!place) {
        setError("Location is not set. Please select a valid ZIP code and county.");
        return;
    }
    cancelAnalysisRef.current = false;
    setIsGeneratingPremiumAnalysis(true);
    setError(null);
    setPremiumAnalysisLogEntry('Initializing analysis...');
    setPremiumAnalysisData(null); 
    setPremiumAnalysisProgress({ current: 0, total: totalCalls });

    try {
        let currentCall = 0;
        const columnHeaders: string[] = [];
        const rowData: PremiumAnalysisData['rowData'] = incomes.map(inc => ({ income: inc, values: [] }));
        let firstCall = true;
        let fallbackHasOccurredThisAnalysis = false;
        let fallbackUsedYear: number | null = null;

        for (const yearProjection of projectionYears) {
            if (cancelAnalysisRef.current) break;
            const activePeopleForYear = yearProjection.household.filter(p => !(p.is_child_dependent && p.age > p.coverage_until_age));
            const header = generateSmartHeader(activePeopleForYear, forceInitials);
            columnHeaders.push(header);

            for (let i = 0; i < incomes.length; i++) {
                if (cancelAnalysisRef.current) break;
                const currentIncome = incomes[i];

                if (!activePeopleForYear.some(p => p.aptc_eligible) || activePeopleForYear.length === 0) {
                    rowData[i].values.push(null);
                } else {
                    const peopleForApi = activePeopleForYear.map(({ id, name, is_child_dependent, coverage_until_age, ...rest }) => {
                        const apiPerson = {...rest}; if(is_child_dependent && rest.age >= 19) { apiPerson.is_parent = false; } return apiPerson;
                    });

                    const householdPayload = { income: currentIncome, people: peopleForApi, has_married_couple: yearProjection.has_married_couple, unemployment_received: 'None' as const };
                    const statsPayload: PlanStatsRequestPayload = { market: 'Individual', year: coverageYear, place: place, household: householdPayload };
                    const estimatePayload: EstimateRequestPayload = { year: coverageYear, place: place, household: householdPayload };

                    try {
                        const [statsResult, estimateResult] = await Promise.all([ getPlanStats(statsPayload), getEligibilityEstimate(estimatePayload) ]);
                        
                        if (firstCall && (statsResult.fallbackOccurred || estimateResult.fallbackOccurred)) {
                            fallbackHasOccurredThisAnalysis = true;
                            fallbackUsedYear = statsResult.usedYear;
                        }
                        
                        const aptc = estimateResult.data.estimates?.[0]?.aptc ?? 0;
                        rowData[i].values.push({ stats: statsResult.data, aptc });
                        setPremiumAnalysisLogEntry([`Ages: ${activePeopleForYear.map(p => p.age).join(', ')}`, `Income: ${formatCurrency(currentIncome)}`, `Subsidy: ${formatCurrency(aptc)}`].join('\n'));
                    } catch (e) {
                        console.error(`Failed API call for income ${currentIncome} and household:`, e);
                        rowData[i].values.push(null);
                    }
                }
                firstCall = false;
                currentCall++;
                setPremiumAnalysisProgress({ current: currentCall, total: totalCalls });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (!cancelAnalysisRef.current) {
            if (fallbackHasOccurredThisAnalysis && fallbackUsedYear) {
                const originalYear = coverageYear;
                setFallbackWarning(`We couldn't retrieve data for ${originalYear}, as it may not be available yet. The long-term analysis is based on ${fallbackUsedYear} data and may be less accurate.`);
            } else {
                setFallbackWarning(null);
            }

           if (rowData.length > 0 && rowData[0].values.length > 0) {
                const unsubsidizedRow: PremiumAnalysisData['rowData'][0] = { income: -1, values: [] };
                for (let j = 0; j < columnHeaders.length; j++) {
                    const firstRowCell = rowData[0].values[j];
                    if (firstRowCell && firstRowCell.stats && typeof firstRowCell.aptc === 'number') {
                        const { stats, aptc } = firstRowCell;
                        const unsubsidizedStats: PlanStat[] = stats.map(plan => ({ ...plan, premiums: { min: plan.premiums.min + aptc, mean: plan.premiums.mean + aptc, max: plan.premiums.max + aptc } }));
                        unsubsidizedRow.values.push({ stats: unsubsidizedStats, aptc: 0 });
                    } else { unsubsidizedRow.values.push(null); }
                }
                rowData.push(unsubsidizedRow);
            }
            const finalData = { columnHeaders, rowData };
            setPremiumAnalysisData(finalData);
            setLongTermCache({ inputs: currentInputs, data: finalData });
        } else {
            setPremiumAnalysisData(null);
        }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred during premium analysis.');
    } finally {
      setIsGeneratingPremiumAnalysis(false);
      setPremiumAnalysisProgress(null);
      if (!cancelAnalysisRef.current) setPremiumAnalysisLogEntry(null);
      cancelAnalysisRef.current = false;
    }
  };
  
  const handleGeneratePremiumAnalysis = () => {
    if (!canGenerateAnalysis) return;

    setResult(null);
    setPlanStats(null);
    setError(null);
    setFallbackWarning(null);

    const currentInputs = {
        zipcode, place: JSON.stringify(place), people: JSON.stringify(people), hasMarriedCouple, futureEvents: JSON.stringify(futureEvents),
        startIncome, endIncome, incomeStep
    };

    if (longTermCache && JSON.stringify(longTermCache.inputs) === JSON.stringify(currentInputs)) {
        setPremiumAnalysisData(longTermCache.data);
        return;
    }

    const incomes = [];
    for (let i = startIncome; i <= endIncome; i += incomeStep) incomes.push(i);
    if (incomes.length === 0 && startIncome <= endIncome) incomes.push(startIncome);

    if (incomes.length === 0) {
        setError("No income levels to process based on the provided range.");
        return;
    }

    let currentHousehold: Person[] = JSON.parse(JSON.stringify(people));
    let currentHasMarriedCouple = hasMarriedCouple;
    let yearIndex = 0;
    
    const projectionYears: { household: Person[], has_married_couple: boolean }[] = [];
    while (true) {
        const adults = currentHousehold.filter(p => !p.is_child_dependent);
        if (adults.length > 0 && adults.every(p => p.age >= 65)) break;
        if (adults.length === 0 && currentHousehold.length > 0 && currentHousehold.every(p => p.age >= 65)) break;
        if (projectionYears.length > 100) break;

        projectionYears.push({ household: JSON.parse(JSON.stringify(currentHousehold)), has_married_couple: currentHasMarriedCouple });
        
        currentHousehold.forEach(p => p.age++);
        
        const eventsThisYear = futureEvents.filter(e => e.years_from_now === yearIndex + 1);
        for (const event of eventsThisYear) {
            if (event.type === 'Add Spouse') {
                currentHousehold.push({ id: `future_spouse_${event.id}`, name: 'Spouse', age: event.current_age + event.years_from_now, gender: event.gender, is_parent: true, is_child_dependent: false, coverage_until_age: 25, uses_tobacco: false, is_pregnant: false, has_mec: false, aptc_eligible: true, utilization_level: event.utilization_level });
                currentHasMarriedCouple = true;
            } else if (event.type === 'Add Child') {
                 currentHousehold.push({ id: `future_child_${event.id}`, name: 'Child', age: 0, gender: event.gender, is_parent: false, is_child_dependent: true, coverage_until_age: event.coverage_until_age, uses_tobacco: false, is_pregnant: false, has_mec: false, aptc_eligible: true, utilization_level: event.utilization_level });
            }
        }
        yearIndex++;
    }

    const forceInitials = projectionYears.some(({ household }) => 
        household.length >= 4 || household.map(p => p.name).join('').length > 11
    );
    
    const totalCalls = incomes.length * projectionYears.length;
    
    if (totalCalls > 200) {
        const timeEstimate = Math.round((totalCalls * 350) / 1000); 
        setAnalysisWarning({ totalCalls, timeEstimate });
    } else {
        startPremiumAnalysis(totalCalls, incomes, projectionYears, currentInputs, forceInitials);
    }
  };

  const confirmAndStartAnalysis = () => {
    if (analysisWarning) {
        const currentInputs = {
            zipcode, place: JSON.stringify(place), people: JSON.stringify(people), hasMarriedCouple, futureEvents: JSON.stringify(futureEvents),
            startIncome, endIncome, incomeStep
        };
        const incomes = [];
        for (let i = startIncome; i <= endIncome; i += incomeStep) incomes.push(i);
        if (incomes.length === 0 && startIncome <= endIncome) incomes.push(startIncome);

        let currentHousehold: Person[] = JSON.parse(JSON.stringify(people));
        let currentHasMarriedCouple = hasMarriedCouple;
        let yearIndex = 0;
        const projectionYears: { household: Person[], has_married_couple: boolean }[] = [];
        while (true) {
            const adults = currentHousehold.filter(p => !p.is_child_dependent);
            if (adults.length > 0 && adults.every(p => p.age >= 65)) break;
            if (adults.length === 0 && currentHousehold.length > 0 && currentHousehold.every(p => p.age >= 65)) break;
            if (projectionYears.length > 100) break;
            projectionYears.push({ household: JSON.parse(JSON.stringify(currentHousehold)), has_married_couple: currentHasMarriedCouple });
            currentHousehold.forEach(p => p.age++);
            const eventsThisYear = futureEvents.filter(e => e.years_from_now === yearIndex + 1);
            for (const event of eventsThisYear) {
                if (event.type === 'Add Spouse') {
                    currentHousehold.push({ id: `future_spouse_${event.id}`, name: 'Spouse', age: event.current_age + event.years_from_now, gender: event.gender, is_parent: true, is_child_dependent: false, coverage_until_age: 25, uses_tobacco: false, is_pregnant: false, has_mec: false, aptc_eligible: true, utilization_level: event.utilization_level });
                    currentHasMarriedCouple = true;
                } else if (event.type === 'Add Child') {
                    currentHousehold.push({ id: `future_child_${event.id}`, name: 'Child', age: 0, gender: event.gender, is_parent: false, is_child_dependent: true, coverage_until_age: event.coverage_until_age, uses_tobacco: false, is_pregnant: false, has_mec: false, aptc_eligible: true, utilization_level: event.utilization_level });
                }
            }
            yearIndex++;
        }
        
        const forceInitials = projectionYears.some(({ household }) => 
            household.length >= 4 || household.map(p => p.name).join('').length > 11
        );

        startPremiumAnalysis(analysisWarning.totalCalls, incomes, projectionYears, currentInputs, forceInitials);
        setAnalysisWarning(null);
    }
  };

  const cancelAnalysisWarning = () => {
    setAnalysisWarning(null);
  };

  const isGenerating = isGeneratingPremiumAnalysis;
  const isAnyTaskRunning = isLoading || isGenerating;
  const subsidyAmount = result?.estimates?.[0]?.aptc ?? 0;
  const wizardSteps = ["Instructions", "Household Info", "Analysis & Results"];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_Instructions onNext={nextStep} coverageYear={coverageYear} />;
      case 2:
        return (
          <Step2_HouseholdIncome
            zipcode={zipcode}
            onZipcodeChange={handleZipcodeChange}
            place={place}
            isFetchingPlace={isFetchingPlace}
            placeError={placeError}
            countiesForZip={countiesForZip}
            selectedCountyFips={selectedCountyFips}
            onCountySelectionChange={handleCountySelectionChange}
            hasMarriedCouple={hasMarriedCouple}
            onHasMarriedCoupleChange={setHasMarriedCoupleWithClear}
            people={people}
            onPersonChange={handlePersonChange}
            onAddPerson={addPerson}
            onRemovePerson={removePerson}
            futureEvents={futureEvents}
            onAddFutureEvent={addFutureEvent}
            onUpdateFutureEvent={updateFutureEvent}
            onRemoveFutureEvent={removeFutureEvent}
            validationErrors={validationErrors}
            canProceed={canProceedFromStep2}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <Step3_Analysis
            isGenerating={isAnyTaskRunning}
            canCalculate={!!canCalculate}
            canGenerateAnalysis={!!canGenerateAnalysis}
            onCalculateSingleYear={handleCalculate}
            isCalculating={isLoading}
            onGeneratePremiumAnalysis={handleGeneratePremiumAnalysis}
            isGeneratingPremiumAnalysis={isGeneratingPremiumAnalysis}
            premiumAnalysisProgress={premiumAnalysisProgress}
            logEntry={isGeneratingPremiumAnalysis ? premiumAnalysisLogEntry : null}
            error={error}
            fallbackWarning={fallbackWarning}
            result={result}
            planStats={planStats}
            subsidyAmount={subsidyAmount}
            premiumAnalysisData={premiumAnalysisData}
            hoveredIncome={hoveredIncome}
            onHoverIncome={setHoveredIncome}
            income={income}
            onIncomeChange={onIncomeChangeWithCache}
            startIncome={startIncome}
            onStartIncomeChange={onStartIncomeChangeWithCache}
            endIncome={endIncome}
            onEndIncomeChange={onEndIncomeChangeWithCache}
            incomeStep={incomeStep}
            onIncomeStepChange={onIncomeStepChangeWithCache}
            onStopAnalysis={handleStopAnalysis}
            analysisWarning={analysisWarning}
            onConfirmAnalysis={confirmAndStartAnalysis}
            onCancelAnalysis={cancelAnalysisWarning}
            isUnsupportedState={isUnsupportedState}
            placeError={placeError}
            onBack={prevStep}
          />
        );
      default:
        return <Step1_Instructions onNext={nextStep} coverageYear={coverageYear} />;
    }
  };

  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-200 p-4 sm:p-6 lg:p-8 flex flex-col">
      <header className="w-full text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400">ACA Health Plan Forecaster</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Project your HealthCare.gov premiums and subsidies for today and for years to come.</p>
      </header>
      
      <main className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 space-y-8">
        <WizardStepper steps={wizardSteps} currentStep={currentStep} goToStep={goToStep} isNavDisabled={isAnyTaskRunning} />
        {renderStep()}
      </main>
    </div>
  );
};

export default App;