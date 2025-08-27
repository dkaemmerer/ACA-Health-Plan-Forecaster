


import React, { useState, useEffect, ReactNode } from 'react';
import type { Person, Place, FutureEvent, FutureSpouse, FutureChild, County } from '../types.ts';
import PersonCard from './PersonCard.tsx';
import { PlusIcon, InfoIcon, TrashIcon, PencilIcon } from './icons.tsx';

interface Step2Props {
  zipcode: string;
  onZipcodeChange: (zip: string) => void;
  place: Place | null;
  isFetchingPlace: boolean;
  placeError: ReactNode | null;
  countiesForZip: County[] | null;
  selectedCountyFips: string | null;
  onCountySelectionChange: (fips: string) => void;
  hasMarriedCouple: boolean;
  onHasMarriedCoupleChange: (val: boolean) => void;
  people: Person[];
  onPersonChange: (id: string, updatedPerson: Partial<Person>) => void;
  onAddPerson: () => void;
  onRemovePerson: (id: string) => void;
  futureEvents: FutureEvent[];
  onAddFutureEvent: (event: Omit<FutureEvent, 'id'>) => void;
  onUpdateFutureEvent: (id: string, event: Omit<FutureEvent, 'id'>) => void;
  onRemoveFutureEvent: (id: string) => void;
  validationErrors: string[];
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
}

const FutureEventForm: React.FC<{ 
    onAdd: (event: Omit<FutureEvent, 'id'>) => void;
    onUpdate: (id: string, event: Omit<FutureEvent, 'id'>) => void;
    onCancel: () => void;
    eventToEdit: FutureEvent | null;
    hasMarriedCouple: boolean;
    futureEvents: FutureEvent[];
}> = ({ onAdd, onUpdate, onCancel, eventToEdit, hasMarriedCouple, futureEvents }) => {
    const [eventType, setEventType] = useState<'Add Spouse' | 'Add Child'>('Add Spouse');
    const [years, setYears] = useState<number>(1);
    const [spouseAge, setSpouseAge] = useState<number>(30);
    const [gender, setGender] = useState<'Male' | 'Female'>('Female');
    const [coverageUntil, setCoverageUntil] = useState<number>(25);
    const [utilizationLevel, setUtilizationLevel] = useState<'Low' | 'Medium' | 'High'>('Low');
    const [formError, setFormError] = useState<string | null>(null);

    const isEditing = eventToEdit !== null;

    useEffect(() => {
        if (isEditing) {
            setEventType(eventToEdit.type);
            setYears(eventToEdit.years_from_now);
            setGender(eventToEdit.gender);
            setUtilizationLevel(eventToEdit.utilization_level);
            if (eventToEdit.type === 'Add Spouse') {
                setSpouseAge(eventToEdit.current_age);
            } else { // 'Add Child'
                setCoverageUntil(eventToEdit.coverage_until_age);
            }
        } else {
            // Reset to default values for a new event
            setEventType('Add Spouse');
            setYears(1);
            setSpouseAge(30);
            setGender('Female');
            setCoverageUntil(25);
            setUtilizationLevel('Low');
            setFormError(null);
        }
    }, [eventToEdit, isEditing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (eventType === 'Add Spouse') {
            if (hasMarriedCouple) {
                setFormError("Cannot add a future spouse; the household already includes a married couple.");
                return;
            }
            if (futureEvents.some(e => e.type === 'Add Spouse' && e.id !== eventToEdit?.id)) {
                setFormError("Cannot add more than one future spouse event.");
                return;
            }
            const eventData: Omit<FutureSpouse, 'id'> = { type: 'Add Spouse' as const, years_from_now: years, current_age: spouseAge, gender, utilization_level: utilizationLevel };
            if (isEditing) {
                onUpdate(eventToEdit.id, eventData);
            } else {
                onAdd(eventData);
            }
        } else {
            const eventData: Omit<FutureChild, 'id'> = { type: 'Add Child' as const, years_from_now: years, gender, coverage_until_age: coverageUntil, utilization_level: utilizationLevel };
            if (isEditing) {
                onUpdate(eventToEdit.id, eventData);
            } else {
                onAdd(eventData);
            }
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 space-y-4">
            <h4 className="font-semibold text-lg">{isEditing ? 'Edit Future Event' : 'Add a Future Event'}</h4>
            <div>
                <label className="block text-sm font-medium">Event Type</label>
                <select value={eventType} onChange={e => setEventType(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="Add Spouse">Add Spouse</option>
                    <option value="Add Child">Add Child</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium">In how many years?</label>
                    <input type="number" value={years} onChange={e => setYears(parseInt(e.target.value))} min="1" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Gender</label>
                    <select value={gender} onChange={e => setGender(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>Female</option>
                        <option>Male</option>
                    </select>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium">Healthcare Needs</label>
                <select value={utilizationLevel} onChange={e => setUtilizationLevel(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </select>
            </div>
            {eventType === 'Add Spouse' && (
                <div>
                    <label className="block text-sm font-medium">Spouse's Current Age</label>
                    <input type="number" value={spouseAge} onChange={e => setSpouseAge(parseInt(e.target.value))} min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
            )}
            {eventType === 'Add Child' && (
                 <div>
                    <label className="block text-sm font-medium">Coverage Until Age</label>
                    <select value={coverageUntil} onChange={e => setCoverageUntil(parseInt(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        {Array.from({ length: 26 }, (_, i) => i).map(age => <option key={age} value={age}>{age}</option>)}
                    </select>
                </div>
            )}
            {formError && <p className="text-sm text-red-500 font-medium">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">{isEditing ? 'Update Event' : 'Add Event'}</button>
            </div>
        </form>
    );
}

const Step2_HouseholdIncome: React.FC<Step2Props> = (props) => {
  const [showFutureEventForm, setShowFutureEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FutureEvent | null>(null);

  const handleAddEvent = (event: Omit<FutureEvent, 'id'>) => {
    props.onAddFutureEvent(event);
    setShowFutureEventForm(false);
    setEditingEvent(null);
  };

  const handleUpdateEvent = (id: string, event: Omit<FutureEvent, 'id'>) => {
    props.onUpdateFutureEvent(id, event);
    setShowFutureEventForm(false);
    setEditingEvent(null);
  };

  const handleCancelForm = () => {
    setShowFutureEventForm(false);
    setEditingEvent(null);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Column 1: Household Members */}
        <div className="space-y-8">
          <section>
            <div className="flex justify-between items-center border-b-2 border-blue-200 dark:border-blue-800 pb-2 mb-4">
              <h2 className="text-2xl font-semibold">Household Members ({props.people.length})</h2>
              <button
                type="button"
                onClick={props.onAddPerson}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition-colors"
              >
                <PlusIcon />
                Add Person
              </button>
            </div>
            <div className="space-y-4">
              {props.people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onUpdate={props.onPersonChange}
                  onRemove={props.onRemovePerson}
                  canRemove={props.people.length > 1}
                />
              ))}
            </div>
          </section>
        </div>
        
        {/* Column 2: Household Info & Future Events */}
        <div className="space-y-8">
            <section>
                <h2 className="text-2xl font-semibold border-b-2 border-blue-200 dark:border-blue-800 pb-2 mb-4">Location Information</h2>
                <div>
                    <label htmlFor="zipcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ZIP Code</label>
                    <input
                    type="text"
                    id="zipcode"
                    value={props.zipcode}
                    onChange={(e) => props.onZipcodeChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., 60040"
                    maxLength={5}
                    />
                    {props.isFetchingPlace && <p className="text-sm text-blue-500 mt-1">Looking up location...</p>}
                    {props.placeError && <p className="text-sm text-red-500 mt-1">{props.placeError}</p>}
                    
                    {props.countiesForZip && props.countiesForZip.length > 1 && (
                        <div className="mt-4">
                            <label htmlFor="county-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Multiple counties found. Please select one:
                            </label>
                            <select
                                id="county-select"
                                value={props.selectedCountyFips || ''}
                                onChange={(e) => props.onCountySelectionChange(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="" disabled>Select a county...</option>
                                {props.countiesForZip.map(county => (
                                    <option key={county.fips} value={county.fips}>
                                        {county.name}, {county.state}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {props.place && !props.isFetchingPlace && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Location: {props.place.countyName}, {props.place.state}
                        </p>
                    )}
                </div>
            </section>
            <section>
                <h2 className="text-2xl font-semibold border-b-2 border-blue-200 dark:border-blue-800 pb-2 mb-4">Marriage Status</h2>
                <div className="flex items-center">
                    <div className="flex h-5 items-center">
                        <input id="married" name="married" type="checkbox" checked={props.hasMarriedCouple} onChange={(e) => props.onHasMarriedCoupleChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="married" className="font-medium text-gray-700 dark:text-gray-300">Household includes a married couple?</label>
                    </div>
                </div>
            </section>
            <section>
            <div className="flex justify-between items-center border-b-2 border-blue-200 dark:border-blue-800 pb-2 mb-4">
              <h2 className="text-2xl font-semibold">Future Life Events</h2>
              {!showFutureEventForm && (
                <button
                  type="button"
                  onClick={() => { setShowFutureEventForm(true); setEditingEvent(null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors"
                >
                  <PlusIcon />
                  Add Future Event
                </button>
              )}
            </div>
            <div className="space-y-4">
                {showFutureEventForm && <FutureEventForm onAdd={handleAddEvent} onUpdate={handleUpdateEvent} onCancel={handleCancelForm} eventToEdit={editingEvent} hasMarriedCouple={props.hasMarriedCouple} futureEvents={props.futureEvents} />}
                {props.futureEvents.map(event => {
                    if (editingEvent?.id === event.id) {
                        return null;
                    }
                    return (
                        <div key={event.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{event.type} in {event.years_from_now} year{event.years_from_now > 1 ? 's' : ''}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                   {event.type === 'Add Spouse' 
                                     ? `(Current Age: ${event.current_age}, Gender: ${event.gender}, Needs: ${event.utilization_level})` 
                                     : `(Gender: ${event.gender}, Covered until age ${event.coverage_until_age}, Needs: ${event.utilization_level})`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setEditingEvent(event); setShowFutureEventForm(true); }}
                                    className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900"
                                    aria-label="Edit future event"
                                >
                                    <PencilIcon />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => props.onRemoveFutureEvent(event.id)}
                                    className="p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-900"
                                    aria-label="Remove future event"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    )
                })}
                {props.futureEvents.length === 0 && !showFutureEventForm && <p className="text-sm text-gray-500">No future events planned. Add events to see their impact in the long-term analysis.</p>}
            </div>
          </section>
        </div>
      </div>
      
      {props.validationErrors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <InfoIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-md font-medium text-red-800 dark:text-red-200">Please fix the following issues:</h3>
              <ul className="mt-2 list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                {props.validationErrors.map((error, i) => <li key={i}>{error}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="pt-6 flex justify-between">
          <button
              type="button"
              onClick={props.onBack}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors"
          >
              Back
          </button>
          <button
              type="button"
              onClick={props.onNext}
              disabled={!props.canProceed}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
              Next: Analyze
          </button>
      </div>
    </div>
  );
};

export default Step2_HouseholdIncome;