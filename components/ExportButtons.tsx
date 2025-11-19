import React from 'react';
import type { Business } from '../types';

interface ExportButtonsProps {
    businesses: Business[];
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ businesses }) => {
    
    const downloadCSV = () => {
        if (businesses.length === 0) return;

        const headers = Object.keys(businesses[0]);
        const csvRows = [];

        // Add headers
        csvRows.push(headers.join(','));

        // Add data
        for (const row of businesses) {
            const values = headers.map(header => {
                const val = (row as any)[header] || '';
                // Escape quotes and wrap in quotes to handle commas in data
                const escaped = ('' + val).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvContent = csvRows.join('\n');
        // Add BOM (\ufeff) so Excel recognizes UTF-8 encoding for Turkish characters
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'isletmeler.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadExcel = () => {
        // Access the global XLSX object loaded via script tag in index.html
        const XLSX = (window as any).XLSX;
        
        if (!XLSX) {
            console.error("XLSX library not found");
            return;
        }
        if (businesses.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(businesses);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "İşletmeler");
        
        // Generate file and trigger download
        XLSX.writeFile(wb, "isletmeler.xlsx");
    };

    return (
        <div className="flex flex-wrap gap-3 justify-end mb-4">
            <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors border border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
                title="Download as CSV"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.414l5 5a1 1 0 01.414 1.414V19a2 2 0 01-2 2z" />
                </svg>
                CSV İndir
            </button>
            <button
                onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
                title="Download as Excel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Excel İndir
            </button>
        </div>
    );
};

export default ExportButtons;