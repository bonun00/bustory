# 🚌 군 지역 버스 정보 서비스 (Rural Bus Information Service)

![App Screenshot](https://github.com/user-attachments/assets/42c59c1d-9108-4c91-bf08-611abfccfb3d)

> **대도시 위주의 버스 앱에서 소외된 군 지역 주민들을 위한 맞춤형 실시간 버스 정보 서비스입니다.**

공공데이터를 활용하여 정보 접근성이 낮은 군 단위 지역의 버스 노선, 실시간 위치, 도착 예정 시간을 직관적인 UI로 제공합니다.

---

## ✨ 주요 기능 (Key Features)

* 📍 **실시간 버스 위치**: 지도 위에 버스의 현재 위치를 실시간으로 표시하여 막연한 기다림을 해소합니다.
* ⏱️ **도착 정보 안내**: 선택한 정류장에 버스가 도착하기까지 남은 시간과 이전 정류장 정보를 제공합니다.
* 🛤️ **맞춤형 노선 조회**: 군 지역의 특성을 반영한 마을버스 및 공영버스 노선 정보를 상세히 조회할 수 있습니다.
* 👵 **시니어 프렌들리 UI**: 높은 대비의 색상과 큰 폰트를 사용하여 어르신들도 쉽게 정보를 확인할 수 있도록 설계했습니다.

---

## 🛠 기술 스택 (Tech Stack)

| 분류 | 기술 |
| :--- | :--- |
| **Language** | TypeScript |
| **API** | 국토교통부 공공데이터포털 (BusArrivalService API) |
| **Map** | Kakao Maps SDK |
| **State Management** | React Query (TanStack Query) |

---

## 🚀 시작하기 (Getting Started)

### 설치 방법

```bash
# 레포지토리 클론
git clone [https://github.com/username/rural-bus-project.git](https://github.com/username/rural-bus-project.git)

# 프로젝트 폴더 이동
cd rural-bus-project

# 패키지 설치
npm install

# 환경 변수(.env) 설정
# API_KEY=공공데이터포털_발급_키
