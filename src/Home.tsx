    import React from "react";
    import { useNavigate } from 'react-router-dom';
    import { motion } from "framer-motion";

    const Home: React.FC = () => {
        const navigate = useNavigate();

        const handleNavigation = (filename: string): void => {
            navigate(`/busTime?json=${filename}`);
        };
        const goToMap = (): void => {
            navigate('/map');
        };

        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-green-100 px-6">
                {/* 헤더 */}
                <header className="pt-12 pb-8 text-center">
                    {/* 상단 라벨 */}
                    <motion.span
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-block px-3 py-1 mb-4 text-xs font-medium text-green-700 bg-green-100 rounded-full"
                    >
                        함안 · 마산 농어촌 버스
                    </motion.span>

                    {/* 메인 타이틀 */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-4xl md:text-6xl font-extrabold tracking-tight text-green-800 drop-shadow-md"
                    >
                        함안 <span className="text-green-600">↔</span> 마산{" "}
                        <span className="relative inline-block">
                            <span className="underline decoration-green-400 decoration-4 underline-offset-4">
                              버스 시간
                            </span>
                            {/* 밑줄 애니메이션 */}
                            <motion.span
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.8, delay: 0.5 }}
                                className="absolute left-0 bottom-0 h-[4px] bg-green-400"
                            />
                        </span>
                    </motion.h1>

                    {/* 보조 설명 */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.8 }}
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
                                    칠원/함안 → 창원/마산
                                </span>
                                <span className="text-3xl md:text-4xl transform group-hover:translate-x-1 transition-transform">→</span>
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
                                    창원/마산 → 칠원/함안
                                </span>
                                <span className="text-3xl md:text-4xl transform group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </button>

                        <button
                            onClick={goToMap}
                            className="group relative col-span-1 md:col-span-2 p-7 rounded-2xl
                                       bg-blue-600 text-white font-bold text-left
                                       border border-blue-700 shadow-lg
                                       hover:shadow-2xl hover:translate-y-[-2px]
                                       active:scale-95 active:shadow-md
                                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                                       transition-all duration-200
                                       text-xl md:text-2xl leading-snug drop-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold">버스 정류장 지도 보기</p>
                                    <p className="text-base md:text-lg text-blue-100 mt-1">실시간 정류장 도착정보를 확인하세요</p>
                                </div>
                                <span className="text-3xl md:text-4xl transform group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </button>
                    </div>
                </main>

                {/* 푸터 */}
                <footer className="py-8 text-center text-sm text-gray-500">
                    © 2025 Bustory | 문의 : <a href="mailto:bustory1@gmail.com" className="hover:underline">bustory1@gmail.com</a>
                </footer>
            </div>
        );
    };

    export default Home;