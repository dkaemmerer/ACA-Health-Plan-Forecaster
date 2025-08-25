

import type { EstimateRequestPayload, EstimateResponse, PlanStatsRequestPayload, PlanStatsResponse, ServiceResponse, CountiesResponse } from '../types';

const API_URL_BASE = 'https://marketplace-int.api.healthcare.gov/api/v1/households/eligibility/estimates';
const STATS_API_URL_BASE = 'https://marketplace-int.api.healthcare.gov/api/v1/plans/search/stats';
const COUNTIES_API_URL_BASE = 'https://marketplace-int.api.healthcare.gov/api/v1/counties/by/zip';

const performPostFetch = async <T>(baseUrl: string, payload: { year: number } & any): Promise<T> => {
    const API_URL = `${baseUrl}?year=${payload.year}`;
    const body = JSON.stringify(payload);

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://www.healthcare.gov',
            'Referer': 'https://www.healthcare.gov/',
        },
        body,
    });

    if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText} for year ${payload.year}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || JSON.stringify(errorData);
        } catch (e) {
            // Ignore if error response is not JSON
        }
        throw new Error(errorMessage);
    }
    return await response.json() as T;
};

const fetchPostWithFallback = async <T>(baseUrl: string, payload: { year: number } & any): Promise<ServiceResponse<T>> => {
    const originalYear = payload.year;
    
    try {
        const data = await performPostFetch<T>(baseUrl, payload);
        return { data, usedYear: originalYear, fallbackOccurred: false };
    } catch (error) {
        const today = new Date();
        const isFallbackPeriod = today.getMonth() >= 10; // Nov or Dec

        if (isFallbackPeriod && originalYear > today.getFullYear()) {
            console.warn(`POST API call for year ${originalYear} failed. Attempting fallback to ${originalYear - 1}.`);
            const fallbackYear = originalYear - 1;
            const fallbackPayload = { ...payload, year: fallbackYear };

            try {
                const data = await performPostFetch<T>(baseUrl, fallbackPayload);
                return { data, usedYear: fallbackYear, fallbackOccurred: true };
            } catch (fallbackError) {
                console.error(`Fallback POST API call for year ${fallbackYear} also failed. Throwing original error.`);
                throw error;
            }
        }
        throw error;
    }
};

const performGetFetch = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Origin': 'https://www.healthcare.gov',
            'Referer': 'https://www.healthcare.gov/',
        },
    });

    if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText} for URL ${url}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || JSON.stringify(errorData);
        } catch (e) { /* Ignore */ }
        throw new Error(errorMessage);
    }
    return await response.json() as T;
};


export const getCountiesByZip = async (zip: string, year: number): Promise<ServiceResponse<CountiesResponse>> => {
    const originalYear = year;
    const originalUrl = `${COUNTIES_API_URL_BASE}/${zip}?year=${originalYear}`;

    try {
        const data = await performGetFetch<CountiesResponse>(originalUrl);
        return { data, usedYear: originalYear, fallbackOccurred: false };
    } catch (error) {
        const today = new Date();
        const isFallbackPeriod = today.getMonth() >= 10; // Nov or Dec

        if (isFallbackPeriod && originalYear > today.getFullYear()) {
            console.warn(`GET API call for year ${originalYear} failed. Attempting fallback to ${originalYear - 1}.`);
            const fallbackYear = originalYear - 1;
            const fallbackUrl = `${COUNTIES_API_URL_BASE}/${zip}?year=${fallbackYear}`;
            try {
                const data = await performGetFetch<CountiesResponse>(fallbackUrl);
                return { data, usedYear: fallbackYear, fallbackOccurred: true };
            } catch (fallbackError) {
                 console.error(`Fallback GET API call for year ${fallbackYear} also failed. Throwing original error.`);
                 throw error;
            }
        }
        throw error;
    }
};


export const getEligibilityEstimate = async (payload: EstimateRequestPayload): Promise<ServiceResponse<EstimateResponse>> => {
    return fetchPostWithFallback<EstimateResponse>(API_URL_BASE, payload);
};

export const getPlanStats = async (payload: PlanStatsRequestPayload): Promise<ServiceResponse<PlanStatsResponse>> => {
    return fetchPostWithFallback<PlanStatsResponse>(STATS_API_URL_BASE, payload);
};