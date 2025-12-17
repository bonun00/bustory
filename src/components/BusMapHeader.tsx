import React from 'react';
import { BusStop } from '../types';

interface HeaderProps {
    goBack: () => void;
    favorites: BusStop[];
    handleStopClick: (stop: BusStop, options?: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ goBack, favorites, handleStopClick }) => {
    return (
        <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-emerald-100">
            <div className="max-w-screen-md mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={goBack}
                            className="mr-2 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 hover:bg-white hover:shadow-sm active:scale-95 transition inline-flex items-center gap-1"
                            aria-label="뒤로가기"
                            title="뒤로가기"
                        >
                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <span className="inline-block px-2.5 py-1 text-[11px] font-semibold tracking-wider text-emerald-700 bg-emerald-100 rounded-full">
                            Bustory
                        </span>
                        <h1 className="text-lg font-bold text-emerald-900 tracking-tight">실시간 버스</h1>
                    </div>
                </div>

                {(favorites?.length ?? 0) > 0 && (
                    <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <span className="text-xs text-emerald-700 shrink-0">즐겨찾기:</span>
                        {favorites.map((fav) => (
                            <button
                                key={fav.node_id}
                                onClick={() => handleStopClick(fav, { zoom: true })}
                                className="shrink-0 px-3 py-1.5 rounded-full text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-white hover:shadow-sm transition"
                                title={fav.node_nm}
                            >
                                {fav.node_nm}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
};