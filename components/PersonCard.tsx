
import React from 'react';
import type { Person } from '../types';
import { TrashIcon, InfoIcon } from './icons';

interface PersonCardProps {
  person: Person;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, onUpdate, onRemove, canRemove }) => {
  const handleChange = <K extends keyof Person,>(key: K, value: Person[K]) => {
    const updates: Partial<Person> = { [key]: value };
    if (key === 'is_child_dependent' && value === true) {
        updates.is_parent = false;
    }
    if (key === 'is_parent' && value === true) {
        updates.is_child_dependent = false;
    }
    onUpdate(person.id, updates);
  };

  const coverageAgeOptions = Array.from({ length: 26 }, (_, i) => i); // 0-25

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm relative">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-2 md:col-span-2">
          <label htmlFor={`name-${person.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
          <input
            type="text"
            id={`name-${person.id}`}
            value={person.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="mt-1 block w-full md:w-1/2 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor={`age-${person.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
          <input
            type="number"
            id={`age-${person.id}`}
            value={person.age}
            onChange={(e) => handleChange('age', parseInt(e.target.value, 10) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor={`gender-${person.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
          <select
            id={`gender-${person.id}`}
            value={person.gender}
            onChange={(e) => handleChange('gender', e.target.value as 'Male' | 'Female')}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>

        <div className="col-span-2">
          <label htmlFor={`utilization-${person.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Healthcare Needs</label>
          <select
            id={`utilization-${person.id}`}
            value={person.utilization_level}
            onChange={(e) => handleChange('utilization_level', e.target.value as 'Low' | 'Medium' | 'High')}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>

        <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-2 items-center mt-2">
           <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input id={`aptc_eligible-${person.id}`} type="checkbox" checked={person.aptc_eligible} onChange={(e) => handleChange('aptc_eligible', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </div>
            <div className="ml-2 text-sm flex items-center">
              <label htmlFor={`aptc_eligible-${person.id}`} className="font-medium text-gray-700 dark:text-gray-300">Seeking Coverage?</label>
              <span className="ml-1.5" title="Uncheck if this person already has other health insurance (e.g., from an employer, Medicare, or Medicaid) and is not applying for a new plan.">
                <InfoIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </span>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input id={`uses_tobacco-${person.id}`} type="checkbox" checked={person.uses_tobacco} onChange={(e) => handleChange('uses_tobacco', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </div>
            <div className="ml-2 text-sm">
              <label htmlFor={`uses_tobacco-${person.id}`} className="font-medium text-gray-700 dark:text-gray-300">Uses Tobacco?</label>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input id={`is_parent-${person.id}`} type="checkbox" checked={person.is_parent} disabled={person.is_child_dependent} onChange={(e) => handleChange('is_parent', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
            </div>
            <div className={`ml-2 text-sm ${person.is_child_dependent ? 'opacity-50' : ''}`}>
              <label htmlFor={`is_parent-${person.id}`} className="font-medium text-gray-700 dark:text-gray-300">Parent?</label>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input id={`is_child_dependent-${person.id}`} type="checkbox" checked={person.is_child_dependent} disabled={person.is_parent} onChange={(e) => handleChange('is_child_dependent', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
            </div>
            <div className={`ml-2 text-sm ${person.is_parent ? 'opacity-50' : ''}`}>
              <label htmlFor={`is_child_dependent-${person.id}`} className="font-medium text-gray-700 dark:text-gray-300">Child dependent?</label>
            </div>
          </div>
        </div>

        {person.is_child_dependent && (
          <div className="col-span-2 md:col-span-4 mt-2">
            <label htmlFor={`coverage_until_age-${person.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Coverage Until Age</label>
            <select
              id={`coverage_until_age-${person.id}`}
              value={person.coverage_until_age}
              onChange={(e) => handleChange('coverage_until_age', parseInt(e.target.value, 10))}
              className="mt-1 block w-full md:w-1/2 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {coverageAgeOptions.map(age => (
                  <option key={age} value={age} disabled={age < person.age}>{age}</option>
              ))}
            </select>
            {person.coverage_until_age < person.age && (
                <p className="text-xs text-red-500 mt-1">Age must be greater than or equal to current age.</p>
            )}
          </div>
        )}

      </div>
      
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(person.id)}
          className="absolute bottom-2 right-2 p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-700 focus:ring-red-500"
          aria-label={`Remove ${person.name}`}
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
};

export default PersonCard;
