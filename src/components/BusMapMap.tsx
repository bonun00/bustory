import React from 'react';

type MapProps = {
    containerRef: React.RefObject<HTMLDivElement | null>;
    locateMe: () => void;
    locStatus: "idle" | "locating" | "ok" | "error";
};

const BusStopFinderIcon = ({ className }: { className: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        {/* 지도 핀 */}
        <path
            d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />

        {/* 버스 */}
        <rect x="8" y="6.5" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="12.5" r="0.8" fill="currentColor" />
        <circle cx="14" cy="12.5" r="0.8" fill="currentColor" />
    </svg>
);

export const Map: React.FC<MapProps> = ({ containerRef, locateMe, locStatus }) => {
    return (
        <main className="relative">
            <div ref={containerRef} className="w-full h-[72vh] sm:h-[74vh] bg-emerald-100/40" />
            <div className="absolute right-4 bottom-[28vh] sm:bottom-[26vh] z-20">
                <button
                    onClick={locateMe}
                    className="w-12 h-12 rounded-full bg-white shadow-lg border border-emerald-200 grid place-items-center hover:shadow-xl active:scale-95 transition"
                    title="내 위치 찾기"
                    aria-label="내 위치 찾기"
                >
                    {locStatus === "locating" ? (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
                            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" fill="none" />
                        </svg>
                    ) : (
                        <BusStopFinderIcon className="w-5 h-5 text-emerald-700" />
                    )}
                </button>
            </div>
        </main>
    );
};