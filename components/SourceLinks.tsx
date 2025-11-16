import React from 'react';
import type { GroundingChunk } from '../types';

interface SourceLinksProps {
    sources: GroundingChunk[];
}

const SourceLinks: React.FC<SourceLinksProps> = ({ sources }) => {
    if (!sources || sources.length === 0) {
        return null;
    }

    const mapSources = sources.filter(s => s.maps && s.maps.uri);

    if (mapSources.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-300 mb-3">
                Sources from Google Maps
            </h3>
            <ul className="space-y-2">
                {mapSources.map((source, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        <a
                            href={source.maps!.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-200"
                        >
                            {source.maps!.title || 'View on Google Maps'}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SourceLinks;
