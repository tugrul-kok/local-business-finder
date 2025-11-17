import React from 'react';

const WelcomeMessage: React.FC = () => {
    return (
        <div className="text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-300">Ready to Find a Business?</h2>
            <p className="mt-2 max-w-md mx-auto">
                Enter a query like "Italian restaurants in Ankara" or use the location button to find businesses near you.
            </p>
        </div>
    );
};

export default WelcomeMessage;