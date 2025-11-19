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
import ExportButtons from './components/ExportButtons';

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
                if (e instanceof Error && (e.message.includes("overloaded") || e.message.includes("UNAVAILABLE"))) {
                    console.warn(`Primary model (${primaryModel}) failed. Attempting fallback with ${fallbackModel}.`);
                    setLoadingMessage(`Primary model is busy. Trying ${fallbackModelOption} search...`);
                    result = await findBusinesses(query, userLocation, fallbackModel);
                } else {
                    // Re-throw non-overload errors to be caught by the outer catch block
                    throw e;
                }
            }

            // If we get here, one of the calls succeeded
            setBusinesses(result.businesses);
            setSources(result.sources);

        } catch (e) {
            // This catches the re-thrown error from the primary call, or any error from the fallback call
            if (e instanceof Error) {
                if (e.message.includes("overloaded") || e.message.includes("UNAVAILABLE")) {
                    setError("Both search models are currently overloaded. Please try again in a few moments.");
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
                                <ExportButtons businesses={sortedBusinesses} />
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