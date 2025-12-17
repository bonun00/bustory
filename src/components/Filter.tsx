import React from 'react';

interface FilterProps {
    isCompact: boolean;
    selectedLocation: string;
    setSelectedLocation: (location: string) => void;
    filteredLocations: string[];
    busNumbers: string[];
    selectedBusNumber: string[];
    setSelectedBusNumber: (busNumbers: string[]) => void;
    onlyUpcoming: boolean;
    setOnlyUpcoming: (onlyUpcoming: boolean) => void;
    favoritesForThisFile: string[];
    selectAllRoutes: () => void;
    clearAllRoutes: () => void;
    toggleFavorite: (busNumberPrefix: string, location: string) => void;
    setExpandedRow: (row: number | null) => void;
}

export const Filter: React.FC<FilterProps> = ({
                                                  isCompact,
                                                  selectedLocation,
                                                  setSelectedLocation,
                                                  filteredLocations,
                                                  busNumbers,
                                                  selectedBusNumber,
                                                  setSelectedBusNumber,
                                                  onlyUpcoming,
                                                  setOnlyUpcoming,
                                                  favoritesForThisFile,
                                                  selectAllRoutes,
                                                  clearAllRoutes,
                                                  toggleFavorite,
                                                  setExpandedRow,
                                              }) => {
    return (
        <div
            className={`sticky z-20 border-b border-green-100 bg-gradient-to-b from-green-50 to-green-100 transition-all ${
                isCompact ? "py-1" : "py-3"
            }`}
            style={{
                top: isCompact ? 48 : 64, // Header 높이에 맞춰 고정
            }}
        >
            <div className="max-w-4xl mx-auto px-4 transition-all">
                {/* ✅ compact 모드일 땐 '정류장 셀렉트'만 보여줌 */}
                {isCompact ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        <label className="sm:col-span-1 block text-emerald-900 text-xs font-medium">
                            정류장
                        </label>
                        <select
                            value={selectedLocation || ""}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="sm:col-span-2 w-full p-2 rounded-md border border-emerald-300
                focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                        >
                            <option value="" disabled>
                                정류장을 선택하세요
                            </option>
                            {filteredLocations.length === 0 ? (
                                <option value="" disabled>
                                    목록이 없습니다
                                </option>
                            ) : (
                                filteredLocations.map((location, index) => (
                                    <option key={index} value={location}>
                                        {location}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                ) : (
                    <>
                        {/* 전체 모드일 때는 전체 필터 표시 */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm text-emerald-900 font-medium">
                버스 노선
                  {selectedBusNumber.length > 0 && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {selectedBusNumber.length}개 선택
                  </span>
                  )}
              </span>
                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={selectAllRoutes}
                                    className="text-xs px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:scale-95 transition"
                                >
                                    전체 선택
                                </button>
                                <button
                                    type="button"
                                    onClick={clearAllRoutes}
                                    className="text-xs px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:scale-95 transition"
                                >
                                    전체 해제
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setOnlyUpcoming(!onlyUpcoming)}
                                    className={
                                        "text-xs px-2.5 py-1 rounded-md border transition active:scale-95 " +
                                        (onlyUpcoming
                                            ? "border-emerald-600 bg-emerald-600 text-white hover:shadow"
                                            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50")
                                    }
                                    title="현재 시간 이후 버스만 보기"
                                >
                                    ⏱️ 지금 이후만
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                            {busNumbers.map((n) => {
                                const active = selectedBusNumber.includes(n);
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() =>
                                            setSelectedBusNumber(
                                                active
                                                    ? selectedBusNumber.filter((x) => x !== n)
                                                    : [...selectedBusNumber, n]
                                            )
                                        }
                                        className={
                                            "px-4 py-2 rounded-full text-base border transition " +
                                            (active
                                                ? "bg-emerald-600 border-emerald-600 text-white shadow hover:shadow-md"
                                                : "bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50")
                                        }
                                    >
                                        {n}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <label className="block text-emerald-900 text-sm font-medium mb-1">
                                    정류장
                                </label>
                                <select
                                    value={selectedLocation || ""}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    className="w-full p-2.5 rounded-md border border-emerald-300
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value="" disabled>
                                        정류장을 선택하세요
                                    </option>
                                    {filteredLocations.length === 0 ? (
                                        <option value="" disabled>
                                            목록이 없습니다
                                        </option>
                                    ) : (
                                        filteredLocations.map((location, index) => (
                                            <option key={index} value={location}>
                                                {location}
                                            </option>
                                        ))
                                    )}
                                </select>
                                {selectedLocation && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedLocation("")}
                                        className="mt-2 text-xs text-emerald-700 underline"
                                    >
                                        정류장 선택 초기화
                                    </button>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                  <span className="text-emerald-900 text-sm font-medium">
                    즐겨찾기
                  </span>
                                    {favoritesForThisFile.length > 0 && (
                                        <span className="text-xs text-emerald-700">
                      {favoritesForThisFile.length}개
                    </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {favoritesForThisFile.length === 0 ? (
                                        <div className="text-xs text-emerald-600">
                                            등록된 즐겨찾기가 없습니다
                                        </div>
                                    ) : (
                                        favoritesForThisFile.map((fav, idx) => {
                                            const [bus, loc] = fav.split("-");
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedBusNumber([bus]);
                                                        setSelectedLocation(loc);
                                                        setExpandedRow(null);
                                                    }}
                                                    className="relative inline-flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200
                            text-yellow-900 px-3 py-1.5 rounded-full border border-yellow-200
                            shadow-sm active:scale-95 transition"
                                                    title={`${bus}번 · ${loc}`}
                                                >
                          <span className="text-xs font-medium">
                            {bus}번 · {loc}
                          </span>
                                                    <span
                                                        role="button"
                                                        aria-label="즐겨찾기 삭제"
                                                        title="즐겨찾기 삭제"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFavorite(bus, loc);
                                                        }}
                                                        className="ml-1 inline-grid place-items-center w-5 h-5 rounded-full
                              bg-yellow-300/70 hover:bg-yellow-400 text-yellow-900 text-xs font-bold"
                                                    >
                            ×
                          </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};