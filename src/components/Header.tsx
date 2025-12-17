import React from 'react';

interface HeaderProps {
    isCompact: boolean;
    title: string;
    refreshing: boolean;
    goBack: () => void;
    handleRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isCompact, title, refreshing, goBack, handleRefresh }) => {
    return (
        <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-green-100 transition-all">
            <div
                className={`max-w-4xl mx-auto px-4 flex items-center justify-between transition-all ${
                    isCompact ? "py-2" : "py-4"
                }`}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={goBack}
                        className="mr-2 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 hover:bg-white hover:shadow-sm active:scale-95 transition inline-flex items-center gap-1"
                        aria-label="뒤로가기"
                        title="뒤로가기"
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                  strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <h1
                        className={`font-extrabold text-emerald-800 tracking-tight transition-all ${
                            isCompact ? "text-base md:text-lg" : "text-lg md:text-xl"
                        }`}
                    >
                        {title}
                    </h1>
                </div>

                <button
                    type="button"
                    onClick={handleRefresh}
                    className="text-xs px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:scale-95 transition inline-flex items-center gap-1"
                    title="새로고침"
                >
                    {refreshing ? (
                        <>
                            <span className="inline-block w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"/>
                            새로고침…
                        </>
                    ) : (
                        <>↻ 새로고침</>
                    )}
                </button>
            </div>
        </header>
    );
};