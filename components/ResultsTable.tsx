import React from 'react';
import type { Business } from '../types';

interface ResultsTableProps {
    businesses: Business[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ businesses }) => {
    if (businesses.length === 0) {
        return <p className="text-center text-gray-400">No results found.</p>;
    }

    const headers = Object.keys(businesses[0]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                    <tr>
                        {headers.map((header) => (
                            <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-800">
                    {businesses.map((business, index) => (
                        <tr key={index} className="hover:bg-gray-800/50 transition-colors duration-200">
                            {headers.map((header) => (
                                <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                    {business[header as keyof Business]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResultsTable;
