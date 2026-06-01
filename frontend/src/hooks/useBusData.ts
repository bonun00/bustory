import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusData, Favorites } from '../types';

const STORAGE_KEY = "busFavoritesByFile"; // { [jsonFile]: string[] }
const STATE_KEY = (file: string) => `busTimeState:${file}`;

const parseToMinutes = (t: string): number => {
    const [h, m] = (t || "").split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
    return h * 60 + m;
};

export const minutesLeftFromNow = (hhmm: string): number => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const target = parseToMinutes(hhmm);
    return target - nowMin; // 음수면 지남
};

export function useBusData(jsonFile: string) {
    const nav = useNavigate();
    const [data, setData] = useState<BusData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busNumbers, setBusNumbers] = useState<string[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [selectedBusNumber, setSelectedBusNumber] = useState<string[]>([]);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [onlyUpcoming, setOnlyUpcoming] = useState(false);
    const [favoritesByFile, setFavoritesByFile] = useState<Favorites>(() => {
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

    const fetchData = async () => {
        try {
            const res = await fetch(`/${jsonFile}`);
            const json: BusData[] = await res.json();

            const filteredData = json.filter((d) => {
                const prefix = d.busNumber.split("-")[0];
                return prefix === "113" || prefix === "250";
            });
            setData(filteredData);

            const uniqueNumbers: string[] = Array.from(
                new Set<string>(filteredData.map(d => d.busNumber.split("-")[0]))
            );
            setBusNumbers(uniqueNumbers);

            const allStops = new Set<string>();
            filteredData.forEach(item => item.route.forEach(r => allStops.add(r.stop)));
            setLocations(Array.from(allStops));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);

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
            } catch { /* ignore */ }

            try {
                const raw = localStorage.getItem(STATE_KEY(jsonFile));
                if (!mounted) return;
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
            } catch { /* ignore */ }
        })();

        return () => {
            mounted = false;
        };
    }, [jsonFile]);

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
            results = results.filter((r) => r && minutesLeftFromNow(r.time) >= 0);
        }

        results.sort((a, b) => parseToMinutes(a!.time) - parseToMinutes(b!.time));
        return results;
    }, [data, selectedBusNumber, selectedLocation, onlyUpcoming]);

    const toggleFavorite = (busNumberPrefix: string, location: string) => {
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

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    return {
        loading,
        refreshing,
        data,
        busNumbers,
        locations,
        selectedBusNumber,
        setSelectedBusNumber,
        selectedLocation,
        setSelectedLocation,
        onlyUpcoming,
        setOnlyUpcoming,
        favoritesForThisFile,
        filteredData,
        toggleFavorite,
        handleRefresh,
    };
}
