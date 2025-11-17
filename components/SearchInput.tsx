import React from 'react';
import type { ModelOption } from '../types';

interface SearchInputProps {
    query: string;
    setQuery: (query: string) => void;
    onSearch: () => void;
    isLoading: boolean;
    onGetLocation: () => void;
    locationStatus: 'idle' | 'fetching' | 'success' | 'error';
    modelOption: ModelOption;
    setModelOption: (model: ModelOption) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ query, setQuery, onSearch, isLoading, onGetLocation, locationStatus, modelOption, setModelOption }) => {
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            onSearch();
        }
    };
    
    const getLocationButtonContent = () => {
        switch (locationStatus) {
            case 'fetching':
                return (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                );
            case 'success':
                return (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                );
            default: // idle or error
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const locationButtonTitle = {
        idle: 'Use my current location',
        fetching: 'Getting location...',
        success: 'Location set!',
        error: 'Could not get location'
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                     <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., 'Cafes in Kadıköy' or 'dentists'"
                        className="w-full p-3 pr-12 bg-gray-700 border-2 border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-200 text-white placeholder-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={onGetLocation}
                        disabled={isLoading || locationStatus === 'fetching'}
                        className={`absolute inset-y-0 right-0 flex items-center justify-center w-12 rounded-r-md transition-colors duration-200 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-cyan-500 ${
                            locationStatus === 'success' 
                                ? 'text-green-400' 
                                : 'text-gray-400 hover:text-white'
                        } ${
                            locationStatus === 'error' && 'text-red-400'
                        } disabled:text-gray-500 disabled:cursor-not-allowed`}
                        aria-label={locationButtonTitle[locationStatus]}
                        title={locationButtonTitle[locationStatus]}
                    >
                        {getLocationButtonContent()}
                    </button>
                </div>
                <button
                    onClick={onSearch}
                    disabled={isLoading}
                    className="p-3 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Searching...
                        </>
                    ) : (
                        'Search'
                    )}
                </button>
            </div>
            <div className="flex justify-center items-center gap-4 mt-4" role="radiogroup" aria-labelledby="model-select-label">
                <span id="model-select-label" className="text-sm font-medium text-gray-400">
                    Arama Tipi:
                </span>
                <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg border border-gray-700">
                    <button
                        role="radio"
                        aria-checked={modelOption === 'fast'}
                        onClick={() => setModelOption('fast')}
                        disabled={isLoading}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 ${
                            modelOption === 'fast'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-gray-300 hover:bg-gray-700/50'
                        }`}
                    >
                        Hızlı Arama
                    </button>
                    <button
                        role="radio"
                        aria-checked={modelOption === 'deep'}
                        onClick={() => setModelOption('deep')}
                        disabled={isLoading}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 disabled:opacity-50 ${
                            modelOption === 'deep'
                                ? 'bg-cyan-600 text-white shadow-md'
                                : 'text-gray-300 hover:bg-gray-700/50'
                        }`}
                    >
                        Derin Arama
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchInput;