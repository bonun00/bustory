import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    const handleNavigation = (filename) => {
        navigate(`/busTime?json=${filename}`);
    };
    const goToMap = () => {
        navigate('/map'); // 지도 페이지로 이동
    };

    return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6">
            {/* 제목 */}
            <h1 className="text-2xl font-medium text-gray-800 mb-8 text-center">
                함안 - 마산 버스 시간
            </h1>

            {/* 버튼 그룹 */}
            <div className="space-y-4 w-full max-w-sm">
                <button
                    onClick={() => handleNavigation('tomasan.json')}
                    className="w-full bg-green-700 hover:bg-green-600 text-white font-medium py-4 px-6 rounded-lg shadow-lg active:scale-95 transition-all"
                >
                    삼칠/대산 → 창원/마산
                </button>

                <button
                    onClick={() => handleNavigation('tohaman.json')}
                    className="w-full bg-green-700 hover:bg-green-600 text-white font-medium py-4 px-6 rounded-lg shadow-lg active:scale-95 transition-all"
                >
                    창원/마산 → 삼칠/대산
                </button>

                <button
                    onClick={goToMap}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-4 px-6 rounded-lg shadow-lg active:scale-95 transition-all"
                >
                    🗺️ 버스 정류장 지도 보기
                </button>

                {/* 문의 문구 */}
                <div className="pt-4 text-center text-sm text-gray-500">
                    ✉️ <a href="mailto:kogk402077@gmail.com" className="hover:underline">
                    문의 : kogk402077@gmail.com
                </a>
                </div>
            </div>
        </div>
    );
};

export default Home;