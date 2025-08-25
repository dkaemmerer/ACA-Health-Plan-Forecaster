

export interface Person {
  id: string; // Unique ID for React key prop, not sent to API
  name: string;
  aptc_eligible: boolean;
  age: number;
  has_mec: boolean; // Minimum Essential Coverage
  is_pregnant: boolean;
  is_parent: boolean;
  is_child_dependent: boolean;
  coverage_until_age: number;
  uses_tobacco: boolean;
  gender: 'Male' | 'Female';
  utilization_level: 'Low' | 'Medium' | 'High';
}

export interface FutureSpouse {
  id: string;
  type: 'Add Spouse';
  years_from_now: number;
  current_age: number;
  gender: 'Male' | 'Female';
  utilization_level: 'Low' | 'Medium' | 'High';
}

export interface FutureChild {
  id: string;
  type: 'Add Child';
  years_from_now: number;
  gender: 'Male' | 'Female';
  coverage_until_age: number;
  utilization_level: 'Low' | 'Medium' | 'High';
}

export type FutureEvent = FutureSpouse | FutureChild;

export type UnemploymentStatus = 'None' | 'Received' | 'Mixed';

export interface Household {
  income: number;
  people: Omit<Person, 'id' | 'name' | 'is_child_dependent' | 'coverage_until_age'>[];
  has_married_couple: boolean;
  unemployment_received: 'None';
}

export interface Place {
  countyfips: string;
  state: string;
  zipcode: string;
  countyName: string;
}

export interface County {
    zipcode: string;
    name: string;
    fips: string;
    state: string;
}

export interface CountiesResponse {
    counties: County[];
}

export interface EstimateRequestPayload {
  household: Household;
  place: Place;
  year: number;
}

export interface Estimate {
  aptc: number | null;
  hardship_exemption: boolean;
  is_medicaid_chip: boolean;
  in_coverage_gap: boolean;
}

export interface EstimateResponse {
  estimates: Estimate[];
}

export interface PlanPremiums {
  min: number;
  max: number;
  mean: number;
}

export interface PlanStat {
  metal_level: 'Bronze' | 'Silver' | 'Gold' | string;
  total: number;
  premiums: PlanPremiums;
  oopc: PlanPremiums;
}

export type PlanStatsResponse = PlanStat[];

export interface PlanStatsRequestPayload {
  market: 'Individual';
  household: Household;
  place: Place;
  year: number;
}

export interface PremiumAnalysisCellValue {
  stats: PlanStat[] | null;
  aptc: number | null;
}

export interface PremiumAnalysisRow {
  income: number;
  values: (PremiumAnalysisCellValue | null)[];
}
export interface PremiumAnalysisData {
  columnHeaders: string[];
  rowData: PremiumAnalysisRow[];
}

export type MetalLevel = 'Bronze' | 'Silver' | 'Gold';
export type CostTier = 'min' | 'mean' | 'max';

export interface ServiceResponse<T> {
  data: T;
  usedYear: number;
  fallbackOccurred: boolean;
}