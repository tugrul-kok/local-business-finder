import React from 'react';
import type { Business, SortConfig } from '../types';

interface ResultsTableProps {
    businesses: Business[];
    onSort: (key: keyof Business) => void;
    sortConfig: SortConfig | null;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ businesses, onSort, sortConfig }) => {
    if (businesses.length === 0) {
        return <p className="text-center text-gray-400">No results found.</p>;
    }

    const headers = Object.keys(businesses[0]) as Array<keyof Business>;

    const getAriaSort = (key: keyof Business) => {
        if (sortConfig?.key !== key) return 'none';
        return sortConfig.direction;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                    <tr>
                        {headers.map((header) => (
                            <th 
                                key={header} 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none transition-colors hover:bg-gray-700/50"
                                onClick={() => onSort(header)}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSort(header)}
                                tabIndex={0}
                                role="button"
                                aria-sort={getAriaSort(header)}
                                aria-label={`Sort by ${header}`}
                            >
                                <div className="flex items-center">
                                    {header}
                                    {sortConfig?.key === header && (
                                        <span className="inline-block ml-2 text-emerald-400" aria-hidden="true">
                                            {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-800">
                    {businesses.map((business, index) => (
                        <tr key={index} className="hover:bg-gray-800/50 transition-colors duration-200">
                            {headers.map((header) => {
                                const cellValue = business[header as keyof Business];
                                return (
                                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                        {header === 'Google Maps Linki' && cellValue && cellValue !== 'N/A' ? (
                                            <a 
                                                href={cellValue} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 hover:underline"
                                            >
                                                <span>View on Map</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                </svg>
                                            </a>
                                        ) : (
                                            cellValue
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResultsTable;