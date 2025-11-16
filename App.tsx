import React, { useState, useEffect, useCallback } from 'react';
import { findBusinesses } from './services/geminiService';
import type { Business, GroundingChunk } from './types';
import Header from './components/Header';
import SearchInput from './components/SearchInput';
import ResultsTable from './components/ResultsTable';
import SourceLinks from './components/SourceLinks';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import WelcomeMessage from './components/WelcomeMessage';

const App: React.FC = () => {
    const [query, setQuery] = useState<string>('');
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (err) => {
                    console.warn(`Geolocation error: ${err.message}. Searches may be less accurate.`);
                }
            );
        }
    }, []);

    const parseCsv = (csvText: string): Business[] => {
        try {
            const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) return [];

            // A robust, manual CSV line parser that handles quoted fields.
            const parseCsvLine = (line: string): string[] => {
                const values: string[] = [];
                let currentVal = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];

                    if (char === '"') {
                        // Handle escaped quotes ("")
                        if (inQuotes && line[i + 1] === '"') {
                            currentVal += '"';
                            i++; // Skip the next quote
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        values.push(currentVal);
                        currentVal = '';
                    } else {
                        currentVal += char;
                    }
                }
                values.push(currentVal); // Add the last value
                return values;
            };

            const headers = parseCsvLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, '')); // Clean headers
            const requiredHeaders = ['İşletme Adı', 'Kategori', 'Adres', 'Telefon Numarası', 'Web Sitesi', 'E-posta'];
            if (!requiredHeaders.every(h => headers.includes(h))) {
                 console.error("CSV headers do not match expected format.", {expected: requiredHeaders, received: headers});
                 throw new Error("The data received from the API was not in the expected format. Please try a different query.");
            }

            return lines.slice(1).map(line => {
                const values = parseCsvLine(line);
                const entry: { [key: string]: string } = {};
                headers.forEach((header, index) => {
                    if (header) { 
                      // Clean the value by removing potential surrounding quotes and trimming whitespace.
                      const cleanedValue = values[index]?.trim().replace(/^"|"$/g, '');
                      entry[header] = cleanedValue || 'N/A';
                    }
                });
                return entry as unknown as Business;
            });
        } catch (e) {
            console.error("Failed to parse CSV:", e);
            if (e instanceof Error) {
                throw new Error(`Failed to parse the data: ${e.message}`);
            }
            throw new Error("An unknown error occurred while parsing the data.");
        }
    };


    const handleSearch = useCallback(async () => {
        if (!query.trim()) {
            setError("Please enter a search query.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setBusinesses([]);
        setSources([]);

        try {
            const result = await findBusinesses(query, userLocation);
            const parsedBusinesses = parseCsv(result.csvData);
            setBusinesses(parsedBusinesses);
            setSources(result.sources);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [query, userLocation]);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <div className="container mx-auto p-4 md:p-8 max-w-5xl">
                <Header />
                <main>
                    <SearchInput
                        query={query}
                        setQuery={setQuery}
                        onSearch={handleSearch}
                        isLoading={isLoading}
                    />
                    <div className="mt-8 p-6 bg-gray-800/50 rounded-lg shadow-xl min-h-[400px] flex flex-col justify-center">
                        {isLoading && <LoadingSpinner />}
                        {error && !isLoading && <ErrorMessage message={error} />}
                        {!isLoading && !error && businesses.length > 0 && (
                            <>
                                <ResultsTable businesses={businesses} />
                                <SourceLinks sources={sources} />
                            </>
                        )}
                        {!isLoading && !error && businesses.length === 0 && <WelcomeMessage />}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;