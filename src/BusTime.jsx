import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const STORAGE_KEY = "busFavoritesByFile"; // { [jsonFile]: string[] }
const STATE_KEY = (file) => `busTimeState:${file}`;

const parseToMinutes = (t) => {
    // "09:35" → 분
    const [h, m] = (t || "").split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
    return h * 60 + m;
};

const minutesLeftFromNow = (hhmm) => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const target = parseToMinutes(hhmm);
    const diff = target - nowMin;
    return diff;
};

const BusTime = () => {
    const query = useQuery();
    const nav = useNavigate();

    const jsonFile = query.get("json") || "tomasan.json";
    const [loading, setLoading] = useState(true);

    // 원본 데이터
    const [data, setData] = useState([]);

    // UI 상태
    const [busNumbers, setBusNumbers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedBusNumber, setSelectedBusNumber] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [expandedRow, setExpandedRow] = useState(null);

    // 정류장 검색
    const [stopQuery, setStopQuery] = useState("");

    // 즐겨찾기 (파일별)
    const [favoritesByFile, setFavoritesByFile] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });
    const favoritesForThisFile = useMemo(
        () => favoritesByFile[jsonFile] || [],
        [favoritesByFile, jsonFile]
    );

    const getTitleByJson = (fileName) => {
        if (fileName.includes("tomasan")) return "삼칠/대산 ▶ 창원/마산";
        if (fileName.includes("tohaman")) return "칠원/함안 ▶ 창원/마산";
        return "정류장 버스 시간표";
    };
    const title = getTitleByJson(jsonFile);

    // 데이터 로드 + 즐겨찾기 마이그레이션 + 상태 복원
    useEffect(() => {
        setLoading(true);
        fetch(`/${jsonFile}`)
            .then((res) => res.json())
            .then((json) => {
                const filteredData = json.filter((d) => {
                    const prefix = d.busNumber.split("-")[0];
                    return prefix === "113" || prefix === "250";
                });
                setData(filteredData);

                const uniqueNumbers = [
                    ...new Set(filteredData.map((d) => d.busNumber.split("-")[0])),
                ];
                setBusNumbers(uniqueNumbers);

                const allStops = new Set();
                filteredData.forEach((item) =>
                    item.route.forEach((r) => allStops.add(r.stop))
                );
                setLocations([...allStops]);
            })
            .finally(() => setLoading(false));

        // 즐겨찾기 (구키 → 파일별 저장) 1회 마이그레이션
        try {
            const legacy = localStorage.getItem("busFavorites");
            if (legacy) {
                const arr = JSON.parse(legacy);
                setFavoritesByFile((prev) => {
                    const current = prev[jsonFile] || [];
                    const merged = Array.from(
                        new Set([...(current || []), ...(Array.isArray(arr) ? arr : [])])
                    );
                    const next = { ...prev, [jsonFile]: merged };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                    localStorage.removeItem("busFavorites");
                    return next;
                });
            } else {
                setFavoritesByFile((prev) => {
                    if (prev[jsonFile]) return prev;
                    const next = { ...prev, [jsonFile]: [] };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                    return next;
                });
            }
        } catch {
            /* ignore */
        }

        // 상태 복원
        try {
            const raw = localStorage.getItem(STATE_KEY(jsonFile));
            if (raw) {
                const parsed = JSON.parse(raw);
                setSelectedBusNumber(parsed.selectedBusNumber || []);
                setSelectedLocation(parsed.selectedLocation || "");
                setStopQuery(parsed.stopQuery || "");
            } else {
                // 초기값
                setSelectedBusNumber([]);
                setSelectedLocation("");
            }
        } catch {
            /* ignore */
        }
        setExpandedRow(null);
    }, [jsonFile]);

    // 상태 저장(딥링크 & 로컬)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set("json", jsonFile);
        if (selectedLocation) params.set("stop", selectedLocation);
        else params.delete("stop");
        if (selectedBusNumber.length)
            params.set("routes", selectedBusNumber.join(","));
        else params.delete("routes");
        nav({ search: params.toString() }, { replace: true });

        const payload = {
            selectedBusNumber,
            selectedLocation,
            stopQuery,
        };
        localStorage.setItem(STATE_KEY(jsonFile), JSON.stringify(payload));
    }, [jsonFile, selectedLocation, selectedBusNumber, stopQuery, nav]);

    // 정류장 검색 목록
    const filteredLocations = useMemo(
        () =>
            locations.filter((l) =>
                l.toLowerCase().includes(stopQuery.toLowerCase())
            ),
        [locations, stopQuery]
    );

    // 필터링 + 정렬 (즐겨찾기만 보기 제거됨)
    const filteredData = useMemo(() => {
        if (!selectedLocation || selectedBusNumber.length === 0) return [];
        const results = data
            .filter((d) => selectedBusNumber.includes(d.busNumber.split("-")[0]))
            .map((d) => {
                const stopInfo = d.route.find((r) => r.stop === selectedLocation);
                if (!stopInfo) return null;
                return {
                    busNumber: d.busNumber,
                    time: stopInfo.time,
                    route: d.route,
                    terminal: d.endPoint,
                };
            })
            .filter(Boolean);

        // 다음 출발 순 정렬
        results.sort(
            (a, b) => parseToMinutes(a.time) - parseToMinutes(b.time)
        );
        return results;
    }, [data, selectedBusNumber, selectedLocation]);

    const handleRowClick = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    // 파일별 즐겨찾기 토글 (UI 유지)
    const toggleFavorite = (busNumberPrefix, location) => {
        const key = `${busNumberPrefix}-${location}`;
        setFavoritesByFile((prev) => {
            const cur = prev[jsonFile] || [];
            const updated = cur.includes(key)
                ? cur.filter((k) => k !== key)
                : [...cur, key];
            const next = { ...prev, [jsonFile]: updated };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    // 노선 전체선택/해제
    const selectAllRoutes = () => setSelectedBusNumber(busNumbers);
    const clearAllRoutes = () => setSelectedBusNumber([]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            {/* 헤더 */}
            <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-green-100">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🚌</span>
                        <h1 className="text-xl font-extrabold text-emerald-800 tracking-tight">
                            {title}
                        </h1>
                    </div>
                </div>

                {/* 스티키 필터 바 */}
                <div className="border-t border-green-100">
                    <div className="max-w-4xl mx-auto px-4 py-3">
                        {/* 노선 빠른 액션 */}
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
                                    className="text-xs px-2 py-1 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                >
                                    전체 선택
                                </button>
                                <button
                                    type="button"
                                    onClick={clearAllRoutes}
                                    className="text-xs px-2 py-1 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                >
                                    전체 해제
                                </button>
                            </div>
                        </div>

                        {/* 노선 칩(토글) */}
                        <div className="flex flex-wrap gap-2">
                            {busNumbers.map((n) => {
                                const active = selectedBusNumber.includes(n);
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() =>
                                            setSelectedBusNumber((prev) =>
                                                prev.includes(n)
                                                    ? prev.filter((x) => x !== n)
                                                    : [...prev, n]
                                            )
                                        }
                                        className={
                                            "px-3 py-1.5 rounded-full text-sm border transition " +
                                            (active
                                                ? "bg-emerald-600 border-emerald-600 text-white shadow"
                                                : "bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50")
                                        }
                                    >
                                        {n}
                                    </button>
                                );
                            })}
                        </div>

                        {/* 정류장 검색 콤보 */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <label className="block text-emerald-900 text-sm font-medium mb-1">
                                    정류장
                                </label>
                                <input
                                    value={stopQuery}
                                    onChange={(e) => setStopQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && filteredLocations.length > 0) {
                                            setSelectedLocation(filteredLocations[0]);
                                        }
                                    }}
                                    placeholder="정류장 검색 (예: 용호, 칠서)"
                                    className="w-full p-2 rounded-md border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2 bg-white"
                                />
                                <select
                                    value={selectedLocation || ""}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    className="w-full p-2 rounded-md border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value="" disabled>
                                        정류장을 선택하세요
                                    </option>
                                    {filteredLocations.length === 0 ? (
                                        <option value="" disabled>
                                            검색 결과가 없습니다
                                        </option>
                                    ) : (
                                        filteredLocations.map((location, index) => (
                                            <option key={index} value={location}>
                                                {location}
                                            </option>
                                        ))
                                    )}
                                </select>
                                {(selectedLocation || stopQuery) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStopQuery("");
                                            setSelectedLocation("");
                                        }}
                                        className="mt-2 text-xs text-emerald-700 underline"
                                    >
                                        정류장 선택 초기화
                                    </button>
                                )}
                            </div>

                            {/* 즐겨찾기 칩 (보기/바로선택 용도, ‘즐겨찾기만 보기’는 없음) */}
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
                                                    className="relative inline-flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 px-3 py-1.5 rounded-full border border-yellow-200 shadow-sm transition"
                                                    title={`${bus}번 - ${loc}`}
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
                                                        className="ml-1 inline-grid place-items-center w-5 h-5 rounded-full bg-yellow-300/70 hover:bg-yellow-400 text-yellow-900 text-xs font-bold"
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
                    </div>
                </div>
            </header>

            {/* 본문 */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="w-full space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-14 rounded-md bg-emerald-100/50 animate-pulse" />
                        ))}
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">🌿</div>
                        <p className="text-emerald-800 font-semibold">
                            조건에 맞는 버스가 없어요.
                        </p>
                        <p className="text-emerald-700 text-sm mt-1">
                            정류장이나 노선을 변경해 보세요.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-emerald-900">
                                {selectedLocation} 버스 시간
                            </h3>
                            <button
                                onClick={() => {
                                    setSelectedBusNumber([]);
                                    setSelectedLocation("");
                                    setExpandedRow(null);
                                }}
                                className="text-sm text-emerald-700 underline"
                            >
                                필터 초기화
                            </button>
                        </div>

                        {filteredData.map((row, index) => {
                            const prefix = row.busNumber.split("-")[0];
                            const favKey = `${prefix}-${selectedLocation}`;
                            const isFav = favoritesForThisFile.includes(favKey);
                            const left = minutesLeftFromNow(row.time);
                            const imminent = left >= 0 && left <= 10;

                            return (
                                <div
                                    key={index}
                                    className="rounded-xl border border-emerald-100 overflow-hidden bg-white shadow-sm"
                                >
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className={
                                            "flex justify-between items-center cursor-pointer px-4 py-3 " +
                                            (imminent ? "bg-amber-50" : "bg-emerald-50 hover:bg-emerald-100")
                                        }
                                        onClick={() => handleRowClick(index)}
                                        onKeyDown={(e) => e.key === "Enter" && handleRowClick(index)}
                                    >
                                        <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 text-white text-sm font-bold">
                        {prefix}
                      </span>
                                            <div className="text-emerald-900">
                                                <div className="font-semibold">
                                                    {row.time}{" "}
                                                    <span className="text-emerald-700 text-sm">
                            ({row.busNumber})
                          </span>
                                                </div>
                                                {left >= 0 && (
                                                    <div className="text-xs text-emerald-700">
                                                        D-{left}분{" "}
                                                        {imminent && (
                                                            <span className="ml-1 px-1.5 py-0.5 bg-amber-300/70 text-amber-900 rounded">
                                임박
                              </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            aria-pressed={isFav}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(prefix, selectedLocation);
                                            }}
                                            className={
                                                "text-2xl " + (isFav ? "text-yellow-500" : "text-yellow-400")
                                            }
                                            title="즐겨찾기 추가/제거"
                                        >
                                            {isFav ? "★" : "☆"}
                                        </button>
                                    </div>

                                    {expandedRow === index && (
                                        <div className="p-4">
                                            <strong className="text-emerald-800 block mb-2">
                                                버스 노선
                                            </strong>
                                            <div className="text-gray-700 text-sm flex flex-wrap gap-1">
                                                {row.route.map((stop, i) => (
                                                    <span key={i}>
                            <span className="font-medium text-emerald-700">
                              {stop.time}
                            </span>{" "}
                                                        ({stop.stop})
                                                        {i !== row.route.length - 1 && " → "}
                          </span>
                                                ))}
                                            </div>
                                            <div className="mt-3 text-sm text-emerald-800">
                                                <strong>종점:</strong> {row.terminal}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BusTime;