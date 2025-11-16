import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-4 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                    Local Business Finder
                </h1>
            </div>
            <p className="text-lg text-gray-400">
                Find local businesses powered by Gemini and Google Maps.
            </p>
        </header>
    );
};

export default Header;
