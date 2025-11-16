import React from 'react';

interface SearchInputProps {
    query: string;
    setQuery: (query: string) => void;
    onSearch: () => void;
    isLoading: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({ query, setQuery, onSearch, isLoading }) => {
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            onSearch();
        }
    };
    
    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., 'Cafes in Kadıköy, Istanbul' or 'nearby dentists'"
                className="flex-grow p-3 bg-gray-700 border-2 border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-200 text-white placeholder-gray-400"
                disabled={isLoading}
            />
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
    );
};

export default SearchInput;
