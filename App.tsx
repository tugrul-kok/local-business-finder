import React, { useState, useCallback, useMemo } from 'react';
import { findBusinesses } from './services/geminiService';
import type { Business, GroundingChunk, SortConfig, ModelOption } from './types';
import Header from './components/Header';
import SearchInput from './components/SearchInput';
import ResultsTable from './components/ResultsTable';
import SourceLinks from './components/SourceLinks';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import WelcomeMessage from './components/WelcomeMessage';

const modelMapping: Record<ModelOption, string> = {
    fast: 'gemini-2.5-flash',
    deep: 'gemini-2.5-pro',
};

const App: React.FC = () => {
    const [query, setQuery] = useState<string>('');
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
    const [modelOption, setModelOption] = useState<ModelOption>('fast');
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    const handleGetLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            setLocationStatus('error');
            setTimeout(() => setLocationStatus('idle'), 3000);
            return;
        }

        setLocationStatus('fetching');
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setLocationStatus('success');
                // Reset status after a couple of seconds for feedback
                setTimeout(() => setLocationStatus('idle'), 2000);
            },
            (err) => {
                let message = "Could not get your location. Searches may be less accurate.";
                if (err.code === err.PERMISSION_DENIED) {
                    message = "You denied location access. Please enable it in your browser settings to use this feature.";
                }
                setError(message);
                setLocationStatus('error');
                // Reset status after a while
                setTimeout(() => setLocationStatus('idle'), 4000);
            }
        );
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
            const requiredHeaders = ['İşletme Adı', 'Kategori', 'Adres', 'Telefon Numarası', 'Web Sitesi', 'E-posta', 'Google Maps Linki', 'Değerlendirme Puanı', 'Değerlendirme Sayısı', 'Fiyat Aralığı', 'Çalışma Saatleri', 'Durum'];
            if (!requiredHeaders.every(h => headers.includes(h))) {
                 console.error("CSV headers do not match expected format.", {expected: requiredHeaders, received: headers});
                 throw new Error("The data received from the API was not in the expected format. Please try a different query.");
            }
            
            const headerCount = headers.length;
            const addressIndex = headers.indexOf('Adres');
            if (addressIndex === -1) {
                throw new Error("CSV data is missing the required 'Adres' column.");
            }

            return lines.slice(1).map(line => {
                // Use the robust parser first.
                let values = parseCsvLine(line);

                // Heuristic Correction: If column count is wrong, it's likely due to unquoted commas in the address.
                if (values.length !== headerCount) {
                    const simpleSplitValues = line.split(',');
                    if (simpleSplitValues.length > headerCount) {
                        const overflow = simpleSplitValues.length - headerCount;
                        // Re-join the parts that are supposed to be the address.
                        const addressParts = simpleSplitValues.slice(addressIndex, addressIndex + overflow + 1);
                        const correctedAddress = addressParts.join(', ').trim();
                        
                        // Reconstruct the array of values.
                        const correctedValues = [
                            ...simpleSplitValues.slice(0, addressIndex),
                            correctedAddress,
                            ...simpleSplitValues.slice(addressIndex + overflow + 1)
                        ];

                        if (correctedValues.length === headerCount) {
                           values = correctedValues;
                        } else {
                           console.warn("CSV parsing heuristic failed for line:", line);
                        }
                    }
                }
                
                // Final safety check to ensure values array matches header count
                while (values.length < headerCount) values.push('N/A');
                if (values.length > headerCount) values = values.slice(0, headerCount);

                const entry: { [key: string]: string } = {};
                headers.forEach((header, index) => {
                    if (header) { 
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

        const primaryModel = modelMapping[modelOption];
        const fallbackModelOption = modelOption === 'fast' ? 'deep' : 'fast';
        const fallbackModel = modelMapping[fallbackModelOption];
        
        setLoadingMessage(`Searching with ${modelOption === 'fast' ? 'Fast' : 'Deep'} Search...`);

        try {
            let result;
            try {
                result = await findBusinesses(query, userLocation, primaryModel);
            } catch (e) {
                if (e instanceof Error && e.message.includes("overloaded and could not respond")) {
                    console.warn(`Primary model (${primaryModel}) failed due to overload. Attempting fallback with ${fallbackModel}.`);
                    setLoadingMessage(`Primary model is busy. Trying ${fallbackModelOption} search...`);
                    result = await findBusinesses(query, userLocation, fallbackModel);
                } else {
                    // Re-throw non-overload errors to be caught by the outer catch block
                    throw e;
                }
            }

            // If we get here, one of the calls succeeded
            const parsedBusinesses = parseCsv(result.csvData);
            setBusinesses(parsedBusinesses);
            setSources(result.sources);

        } catch (e) {
            // This catches the re-thrown error from the primary call, or any error from the fallback call
            if (e instanceof Error) {
                if (e.message.includes("overloaded and could not respond")) {
                    setError("Both Fast and Deep search models are currently overloaded. Please try again in a few moments.");
                } else {
                    setError(e.message);
                }
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [query, userLocation, modelOption]);

    const sortedBusinesses = useMemo(() => {
        const sortableItems = [...businesses];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                
                // Using localeCompare for robust, case-insensitive string sorting
                const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return sortableItems;
    }, [businesses, sortConfig]);

    const handleSort = (key: keyof Business) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <div className="container mx-auto p-4 md:p-8 max-w-7xl">
                <Header />
                <main>
                    <SearchInput
                        query={query}
                        setQuery={setQuery}
                        onSearch={handleSearch}
                        isLoading={isLoading}
                        onGetLocation={handleGetLocation}
                        locationStatus={locationStatus}
                        modelOption={modelOption}
                        setModelOption={setModelOption}
                    />
                    <div className="mt-8 p-6 bg-gray-800/50 rounded-lg shadow-xl min-h-[400px] flex flex-col justify-center">
                        {isLoading && <LoadingSpinner message={loadingMessage} />}
                        {error && !isLoading && <ErrorMessage message={error} />}
                        {!isLoading && !error && businesses.length > 0 && (
                            <>
                                <ResultsTable 
                                    businesses={sortedBusinesses} 
                                    onSort={handleSort}
                                    sortConfig={sortConfig}
                                />
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