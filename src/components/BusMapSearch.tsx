import React from 'react';
import { BusStop } from '../types';

interface SearchProps {
    rawSearch: string;
    setRawSearch: (search: string) => void;
    showSuggestions: boolean;
    setShowSuggestions: (show: boolean) => void;
    suggestions: BusStop[];
    selectedSuggestion: number;
    setSelectedSuggestion: (index: number) => void;
    submitSearch: () => void;
    handleStopClick: (stop: BusStop, options?: any) => void;
}

export const Search: React.FC<SearchProps> = ({
    rawSearch,
    setRawSearch,
    showSuggestions,
    setShowSuggestions,
    suggestions,
    selectedSuggestion,
    setSelectedSuggestion,
    submitSearch,
    handleStopClick,
}) => {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-screen-md px-2 z-40">
            <div className="relative">
                <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-2xl shadow-sm px-3 py-2.5">
                    <input
                        value={rawSearch}
                        onChange={(e) => {
                            setRawSearch(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onKeyDown={(e) => {
                            if (!showSuggestions || suggestions.length === 0) {
                                if (e.key === "Enter") submitSearch();
                                return;
                            }
                            if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setSelectedSuggestion((selectedSuggestion + 1) % suggestions.length);
                            } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setSelectedSuggestion((selectedSuggestion - 1 + suggestions.length) % suggestions.length);
                            } else if (e.key === "Enter") {
                                e.preventDefault();
                                submitSearch();
                            } else if (e.key === "Escape") {
                                setShowSuggestions(false);
                            }
                        }}
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        className="w-full outline-none text-base text-emerald-900 placeholder:text-emerald-400"
                        placeholder="정류장 이름 검색"
                    />
                    <button
                        onClick={submitSearch}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 active:scale-95 transition"
                        aria-label="검색"
                    >
                        검색
                    </button>
                </div>

                {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute mt-2 w-full bg-white border border-emerald-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                        {suggestions.map((s, idx) => (
                            <li
                                key={s.node_id}
                                onMouseDown={() => {
                                    setShowSuggestions(false);
                                    handleStopClick(s, { zoom: true });
                                }}
                                className={
                                    "px-3 py-2 text-sm cursor-pointer " +
                                    (selectedSuggestion === idx ? "bg-emerald-50" : "hover:bg-emerald-50/60")
                                }
                            >
                                {s.node_nm}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};