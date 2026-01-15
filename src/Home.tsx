import React, {useState} from "react";
import {useNavigate} from 'react-router-dom';
import {motion} from "framer-motion";

const Home: React.FC = () => {
    const navigate = useNavigate();

    const handleNavigation = (filename: string): void => {
        navigate(`/busTime?json=${filename}`);
    };
    const goToMap = (): void => {
        navigate('/map');
    };

    const [showTooltip, setShowTooltip] = useState(() => {
        return !localStorage.getItem("hideNearestStopTooltip");
    });

    const hideTooltipForever = () => {
        localStorage.setItem("hideNearestStopTooltip", "1");
        setShowTooltip(false);
    };

    const closeTooltip = () => {
        setShowTooltip(false);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-green-100 px-6">
            {/* 헤더 */}
            <header className="pt-12 pb-8 text-center">
                {/* 상단 라벨 */}
                <motion.span
                    initial={{opacity: 0, y: -10}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.6}}
                    className="inline-block px-3 py-1 mb-4 text-xs font-medium text-green-700 bg-green-100 rounded-full"
                >
                    함안 · 마산 농어촌 버스
                </motion.span>

                {/* 메인 타이틀 */}
                <motion.h1
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.8, delay: 0.2}}
                    className="text-4xl md:text-6xl font-extrabold tracking-tight text-green-800 drop-shadow-md"
                >
                    함안 <span className="text-green-600">↔</span> 마산{" "}
                    <span className="relative inline-block">
                            <span className="underline decoration-green-400 decoration-4 underline-offset-4">
                              버스 시간
                            </span>
                        {/* 밑줄 애니메이션 */}
                        <motion.span
                            initial={{width: 0}}
                            animate={{width: "100%"}}
                            transition={{duration: 0.8, delay: 0.5}}
                            className="absolute left-0 bottom-0 h-[4px] bg-green-400"
                        />
                        </span>
                </motion.h1>

                {/* 보조 설명 */}
                <motion.p
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    transition={{duration: 1, delay: 0.8}}
                    className="mt-4 text-gray-600 text-base md:text-lg"
                >
                    지역 농어촌 노선을 <span className="font-semibold text-green-700">간편하고 빠르게</span> 확인하세요
                </motion.p>
            </header>

            {/* 버튼 그룹 (메인 컨텐츠) */}
            <main className="flex-1 flex items-center justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                    <button
                        onClick={() => handleNavigation('tomasan_V1.json')}
                        className="group relative w-full p-7 rounded-2xl
                                       bg-green-700 text-white font-bold
                                       border border-green-800 shadow-lg
                                       hover:shadow-2xl hover:translate-y-[-2px]
                                       active:scale-95 active:shadow-md
                                       focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400
                                       transition-all duration-200
                                       text-xl md:text-2xl leading-snug drop-shadow"
                    >
                        <div className="flex items-center justify-between">
                                <span className="tracking-wide group-hover:scale-105 transition-transform">
                                    창원/마산 방면
                                </span>
                            <span
                                className="text-3xl md:text-4xl transform group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </button>

                    <button
                        onClick={() => handleNavigation('tohaman_V1.json')}
                        className="group relative w-full p-7 rounded-2xl
                                       bg-green-700 text-white font-bold
                                       border border-green-800 shadow-lg
                                       hover:shadow-2xl hover:translate-y-[-2px]
                                       active:scale-95 active:shadow-md
                                       focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400
                                       transition-all duration-200
                                       text-xl md:text-2xl leading-snug drop-shadow"
                    >
                        <div className="flex items-center justify-between">
                                <span className="tracking-wide group-hover:scale-105 transition-transform">
                                    삼칠/대산 방면
                                </span>
                            <span
                                className="text-3xl md:text-4xl transform group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </button>


                    {showTooltip && (
                        <div
                            className="
      fixed z-50
      bottom-[160px]
      left-1/2 -translate-x-1/2
      max-w-[90vw]
      bg-emerald-600
      text-white
      text-sm
      px-4 py-3
      rounded-xl
      shadow-lg
    "
                        >
                            <div className="flex items-start gap-3">
      <span className="leading-snug">
        지금 현재 위치에서 가장 가까운 버스정류장의 도착 정보를 <br />
        바로 찾아볼 수 있어요
      </span>

                                {/* 닫기 */}
                                <button
                                    onClick={closeTooltip}
                                    aria-label="툴팁 닫기"
                                    className="ml-1 text-emerald-100 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* 하단 액션 */}
                            <div className="mt-2 flex justify-end">
                                <button
                                    onClick={hideTooltipForever}
                                    className="
          text-xs
          text-emerald-100
          hover:text-white
          underline
          underline-offset-2
        "
                                >
                                    다시는 보지 않음
                                </button>
                            </div>

                            {/* 말풍선 꼬리 */}
                            <span
                                className="
        absolute
        bottom-[-6px]
        left-1/2 -translate-x-1/2
        h-3 w-3
        bg-emerald-600
        rotate-45
      "
                            />
                        </div>
                    )}





                    <button
                        onClick={goToMap}
                        aria-label="가까운 정류장 찾기"
                        className="
    fixed z-40
    bottom-20
    left-1/2 -translate-x-1/2
    h-18 w-18
    rounded-full
    bg-white
    border border-gray-200
    shadow-md
    flex items-center justify-center
    active:scale-95
    transition
  "
                    >
                        {/* 정류장 아이콘 */}
                        <svg
                            viewBox="0 0 24 24"
                            className="h-[30px] w-[30px] text-gray-800"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z"/>
                            <circle cx="12" cy="10" r="2.5"/>
                        </svg>


                        <span className="absolute top-3 right-3 flex h-3 w-3">
                        <span
                            className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70 animate-ping"
                        />
                        <span
                            className="absolute top-1/2 left-1/2
                                     -translate-x-1/2 -translate-y-1/2
                                     h-2.5 w-2.5 rounded-full bg-red-500"
                        />
                      </span>

                    </button>

                </div>
            </main>

            {/* 푸터 */}
            <footer className="py-8 text-center text-sm text-gray-500">
                © 2025 Bustory | 문의 : <a href="mailto:bustory1@gmail.com"
                                         className="hover:underline">bustory1@gmail.com</a>
            </footer>
        </div>
    );
};

export default Home;