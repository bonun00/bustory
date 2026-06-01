import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        steady: {
            executor: 'ramping-arrival-rate',
            timeUnit: '1s',
            preAllocatedVUs: 50,
            maxVUs: 300,
            stages: [
                { duration: '1m', target: 30 },   // 워밍업
                { duration: '2m', target: 120 },  // 측정구간
                { duration: '1m', target: 0 },    // 정리
            ],
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<500', 'p(99)<1200'],
    },
    discardResponseBodies: true,
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const USE_CACHE = (__ENV.USE_CACHE || 'true') === 'true';

const nodeIds = [
    "TSB389000300","TSB389000689","TSB389000298","TSB389000307","TSB389000385",
    "TSB389000301","TSB389000302","TSB389000073","TSB389000389"
];

const hot = [
    "TSB390000832", // 예: 이전에 테스트하던 키
    "TSB389000300",
    "TSB417000041",
];

export default function () {
    const useHot = Math.random() < 0.7;
    const key = useHot
        ? hot[Math.floor(Math.random() * hot.length)]
        : nodeIds[Math.floor(Math.random() * nodeIds.length)];

    const headers = USE_CACHE
        ? { 'Accept': 'application/json' }
        : { 'Accept': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };

    const res = http.get(`${BASE}/bus?nodeId=${key}`, { headers });

    check(res, { '200 OK': r => r.status === 200 });

    sleep(Math.random() * 0.2);
}