import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const STORAGE_KEY = "busFavoritesByFile"; // { [jsonFile]: string[] }
const STATE_KEY = (file) => `busTimeState:${file}`;

const parseToMinutes = (t) => {
    const [h, m] = (t || "").split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
    return h * 60 + m;
};

const minutesLeftFromNow = (hhmm) => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const target = parseToMinutes(hhmm);
    return target - nowMin; // 음수면 지남
};

const BusTime = () => {
    const query = useQuery();
    const nav = useNavigate();

    const jsonFile = query.get("json") || "tomasan.json";

    // 로딩/리프레시
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 헤더 축소 상태 (센티넬 관찰로 전환)
    const [isCompact, setIsCompact] = useState(false);
    const sentinelRef = useRef(null);

    // 원본 데이터
    const [data, setData] = useState([]);

    // UI 상태
    const [busNumbers, setBusNumbers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedBusNumber, setSelectedBusNumber] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [expandedRow, setExpandedRow] = useState(null);

    // “지금 이후만” 토글
    const [onlyUpcoming, setOnlyUpcoming] = useState(false);

    // 뒤로가기
    const navigate = useNavigate();
    const goBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    };

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
        if (fileName.includes("tomasan")) return "칠원/함안 ▶ 창원/마산";
        if (fileName.includes("tohaman")) return "창원/마산 ▶ 칠원/함안";
        return "정류장 버스 시간표";
    };
    const title = getTitleByJson(jsonFile);

    // 데이터 로드 함수 (초기/새로고침 공용)
    const fetchData = async () => {
        try {
            const res = await fetch(`/${jsonFile}`);
            const json = await res.json();
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
        } catch (e) {
            console.error(e);
        }
    };

    // 데이터 로드 + 즐겨찾기 마이그레이션 + 상태 복원
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);

            // 즐겨찾기 마이그레이션
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

            // 상태 복원 (검색어 제거)
            try {
                const raw = localStorage.getItem(STATE_KEY(jsonFile));
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (!mounted) return;
                    setSelectedBusNumber(parsed.selectedBusNumber || []);
                    setSelectedLocation(parsed.selectedLocation || "");
                    setOnlyUpcoming(Boolean(parsed.onlyUpcoming));
                } else {
                    setSelectedBusNumber([]);
                    setSelectedLocation("");
                    setOnlyUpcoming(false);
                }
            } catch {
                /* ignore */
            }
            setExpandedRow(null);
        })();

        return () => {
            mounted = false;
        };
    }, [jsonFile]);

    // 상태 저장(딥링크 & 로컬) — 검색 관련 제거
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set("json", jsonFile);
        if (selectedLocation) params.set("stop", selectedLocation);
        else params.delete("stop");
        if (selectedBusNumber.length)
            params.set("routes", selectedBusNumber.join(","));
        else params.delete("routes");
        if (onlyUpcoming) params.set("after", "now");
        else params.delete("after");

        nav({ search: params.toString() }, { replace: true });

        const payload = { selectedBusNumber, selectedLocation, onlyUpcoming };
        localStorage.setItem(STATE_KEY(jsonFile), JSON.stringify(payload));
    }, [jsonFile, selectedLocation, selectedBusNumber, onlyUpcoming, nav]);

    // 헤더 축소: IntersectionObserver로 부드럽게
    useEffect(() => {
        const target = sentinelRef.current;
        if (!target) return;

        const obs = new IntersectionObserver(
            (entries) => {
                const e = entries[0];
                // 상단에서 24px 이상 스크롤되면 컴팩트
                const topPassed = e.boundingClientRect.top < -24 || e.intersectionRatio < 1;
                setIsCompact(topPassed);
            },
            {
                root: null, // viewport
                threshold: [1], // sentinel이 완전히 보일 때만 1
                rootMargin: "-24px 0px 0px 0px", // 24px 지나면 compact
            }
        );
        obs.observe(target);
        return () => obs.disconnect();
    }, []);

    // 정류장 목록 (검색 제거 → 전부 그대로)
    const filteredLocations = locations;

    // 필터링 + 정렬 (+ 지금 이후만)
    const filteredData = useMemo(() => {
        if (!selectedLocation || selectedBusNumber.length === 0) return [];
        let results = data
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

        if (onlyUpcoming) {
            results = results.filter((r) => minutesLeftFromNow(r.time) >= 0);
        }

        results.sort((a, b) => parseToMinutes(a.time) - parseToMinutes(b.time));
        return results;
    }, [data, selectedBusNumber, selectedLocation, onlyUpcoming]);

    const handleRowClick = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    // 파일별 즐겨찾기 토글
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

    const selectAllRoutes = () => setSelectedBusNumber(busNumbers);
    const clearAllRoutes = () => setSelectedBusNumber([]);

    // 새로고침
    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
            {/* 헤더 */}
            <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-green-100 transition-all">
                {/* 상단 타이틀 바 */}
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
                        <span
                            className={`inline-block px-2.5 py-1 text-[11px] font-semibold tracking-wider text-green-700 bg-green-100 rounded-full transition-all ${
                                isCompact ? "opacity-80 scale-95" : ""
                            }`}
                        >
              Bustory
            </span>
                        <h1
                            className={`font-extrabold text-emerald-800 tracking-tight transition-all ${
                                isCompact ? "text-base md:text-lg" : "text-lg md:text-xl"
                            }`}
                        >
                            {title}
                        </h1>
                    </div>

                    {/* 우측 액션: 새로고침 */}
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

                {/* 스티키 필터 바 */}
                <div className={`border-t border-green-100 transition-all ${isCompact ? "py-1" : ""}`}>
                    <div className={`max-w-4xl mx-auto px-4 transition-all ${isCompact ? "py-1.5" : "py-3"}`}>
                        {isCompact ? (
                            // 👇 컴팩트 모드: "정류장 드롭다운"만 노출 (검색 제거)
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                <label className="sm:col-span-1 block text-emerald-900 text-xs font-medium">
                                    정류장
                                </label>
                                <select
                                    value={selectedLocation || ""}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    className="sm:col-span-2 w-full p-2 rounded-md border border-emerald-300
                     focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white
                     text-sm"
                                >
                                    <option value="" disabled>정류장을 선택하세요</option>
                                    {filteredLocations.length === 0 ? (
                                        <option value="" disabled>목록이 없습니다</option>
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
                            // 👇 일반 모드: 전체 UI(검색 제거)
                            <>
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

                                        {/* 지금 이후만 토글 */}
                                        <button
                                            type="button"
                                            onClick={() => setOnlyUpcoming((v) => !v)}
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

                                {/* 노선 칩(토글) */}
                                <div className="flex flex-wrap gap-2.5">
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

                                {/* 정류장 선택 (검색 제거) */}
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
                                            <option value="" disabled>정류장을 선택하세요</option>
                                            {filteredLocations.length === 0 ? (
                                                <option value="" disabled>목록이 없습니다</option>
                                            ) : (
                                                filteredLocations.map((location, index) => (
                                                    <option key={index} value={location}>
                                                        {location}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        {(selectedLocation) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedLocation("");
                                                }}
                                                className="mt-2 text-xs text-emerald-700 underline"
                                            >
                                                정류장 선택 초기화
                                            </button>
                                        )}
                                    </div>

                                    {/* 즐겨찾기 칩 */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-emerald-900 text-sm font-medium">즐겨찾기</span>
                                            {favoritesForThisFile.length > 0 && (
                                                <span className="text-xs text-emerald-700">{favoritesForThisFile.length}개</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {favoritesForThisFile.length === 0 ? (
                                                <div className="text-xs text-emerald-600">등록된 즐겨찾기가 없습니다</div>
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
                                                            <span className="text-xs font-medium">{bus}번 · {loc}</span>
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
            </header>

            {/* 스크롤 센티넬: 헤더 바로 아래에 두어서 스크롤 지점 감지 */}
            <div ref={sentinelRef} aria-hidden="true" className="h-0.5 w-full" />

            {/* 본문 */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="w-full space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-14 rounded-md bg-emerald-100/60 animate-pulse" />
                        ))}
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-emerald-800 font-semibold">조건에 맞는 버스가 없어요.</p>
                        <p className="text-emerald-700 text-sm mt-1">정류장이나 노선을 변경해 보세요.</p>
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
                                <div key={index} className="rounded-xl border border-emerald-100 overflow-hidden bg-white shadow-sm">
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className={
                                            "flex justify-between items-center cursor-pointer px-4 py-3 transition-colors " +
                                            (imminent ? "bg-amber-50" : "bg-emerald-50 hover:bg-emerald-100")
                                        }
                                        onClick={() => handleRowClick(index)}
                                        onKeyDown={(e) => e.key === "Enter" && handleRowClick(index)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* 번호 배지 */}
                                            <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-600 text-white text-base font-bold">
                        {prefix}
                      </span>
                                            <div className="text-emerald-900">
                                                <div className="font-extrabold text-lg md:text-xl">
                                                    {row.time}{" "}
                                                    <span className="text-emerald-700 text-sm font-medium">
                            ({row.busNumber})
                          </span>
                                                </div>
                                                {Number.isFinite(left) && (
                                                    <div className="text-sm text-emerald-700">
                                                        {left < 0 ? (
                                                            <>지남</>
                                                        ) : (
                                                            <>
                                                                D-{left}분{" "}
                                                                {imminent && (
                                                                    <span className="ml-1 px-1.5 py-0.5 bg-amber-300/70 text-amber-900 rounded">
                                    임박
                                  </span>
                                                                )}
                                                            </>
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
                                                "text-2xl active:scale-95 transition " +
                                                (isFav ? "text-yellow-500" : "text-yellow-400 hover:text-yellow-500")
                                            }
                                            title="즐겨찾기 추가/제거"
                                        >
                                            {isFav ? "★" : "☆"}
                                        </button>
                                    </div>

                                    {expandedRow === index && (
                                        <div className="p-4">
                                            <strong className="text-emerald-800 block mb-2">버스 노선</strong>
                                            <div className="text-gray-700 text-sm flex flex-wrap gap-1">
                                                {row.route.map((stop, i) => (
                                                    <span key={i}>
                            <span className="font-medium text-emerald-700">{stop.time}</span> ({stop.stop})
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