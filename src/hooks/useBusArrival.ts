import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import { ArrivalInfo, BusStop } from '../types';

const isProdHost =
    typeof window !== "undefined" &&
    !/^(localhost|127\.0\.0\.1)$/i.test(location.hostname);

let BUS_API_BASE = import.meta.env.VITE_BUS_API_BASE || "/api";
if (isProdHost && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(BUS_API_BASE)) {
    BUS_API_BASE = "/api";
}

function normalizeFromArray(raw: any): ArrivalInfo[] {
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const now = Date.now();

    return list.map((it) => {
        const expRaw = it.expireAt ?? it.expire_at ?? null;
        let expireAtMs =
            typeof expRaw === "number"
                ? expRaw
                : expRaw
                    ? Date.parse(expRaw)
                    : NaN;

        if (!Number.isFinite(expireAtMs)) {
            const remainSec = Math.max(
                0,
                Number(it.arrTime ?? it.arrSec ?? 0) || 0
            );
            expireAtMs = now + remainSec * 1000;
        }

        return {
            routeNo: it.routeNo ?? "",
            arrPrevStationCnt: Number(it.arrPrevStationCnt ?? 0) || 0,
            expireAtMs: Number.isFinite(expireAtMs) ? expireAtMs : now,
            nodeId: it.nodeId ?? "",
            nodeNm: it.nodeNm ?? "",
            routeId: it.routeId ?? "",
            routeTp: it.routeTp ?? "",
            vehicleTp: it.vehicleTp ?? "",
        };
    });
}

const busKeyOf = (b: ArrivalInfo) => b.routeId || `${b.routeNo}__${b.nodeId}`;

export function useBusArrival(selectedStop: BusStop | null) {
    const [arrivalInfo, setArrivalInfo] = useState<ArrivalInfo[]>([]);
    const [arrStatus, setArrStatus] = useState("idle");
    const abortRef = useRef<AbortController | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());

    // const getRemainSec = useCallback(
    //     (expireAtMs: number) => Math.max(0, Math.floor(((Number(expireAtMs) || 0) - nowMs) / 1000)),
    //     [nowMs]
    // );
    const getRemainSec = useCallback((expireAtMs: number) => {
        const now = Date.now();
        return Math.max(0, Math.floor(((Number(expireAtMs) || 0) - now) / 1000));
    }, []);

    const mergeWithContinuity = useCallback(
        (prevList: ArrivalInfo[], nextList: ArrivalInfo[]) => {
            const now = Date.now();
            const getRemain = (expireAtMs: number) =>
                Math.max(0, Math.floor(((Number(expireAtMs) || 0) - now) / 1000));
            const prevMap = new Map(prevList.map((b) => [busKeyOf(b), b]));
            const merged = nextList.map((n) => {
                const key = busKeyOf(n);
                const p = prevMap.get(key);
                if (!p) return n;

                const prevRemain = getRemain(p.expireAtMs);
                const serverRemain = getRemain(n.expireAtMs);
                const EPS = 2;

                if (serverRemain >= prevRemain - EPS) {
                    return {
                        ...n,
                        expireAtMs: now + prevRemain * 1000,
                    };
                }
                const keep = Math.min(prevRemain, serverRemain);
                return {
                    ...n,
                    expireAtMs: now + keep * 1000,
                };
            });
            return merged;
        },
        []
    );

    const fetchArrival = useCallback(async () => {
        if (!selectedStop) return;
        setArrStatus("loading");
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch(
                `${BUS_API_BASE}/bus?nodeId=${encodeURIComponent(selectedStop.node_id)}`,
                { signal: controller.signal }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.json();

            const normalized = normalizeFromArray(raw);
            setArrivalInfo((prev) => mergeWithContinuity(prev, normalized));
            setArrStatus("ok");
        } catch (e: any) {
            if (e.name === "AbortError") {
                setArrStatus("idle");
                return;
            }
            setArrStatus("error");
        } finally {
            abortRef.current = null;
        }
    }, [selectedStop, mergeWithContinuity]);

    useEffect(() => {
        if (!selectedStop) return;
        fetchArrival();
    }, [selectedStop, fetchArrival]);

    const sortedArrival = useMemo(() => {

        return [...arrivalInfo].sort((a, b) => getRemainSec(a.expireAtMs) - getRemainSec(b.expireAtMs));
    }, [arrivalInfo, getRemainSec]);

    return { arrivalInfo: sortedArrival, arrStatus, fetchArrival, getRemainSec };
}
