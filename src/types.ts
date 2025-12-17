export interface RouteInfo {
  stop: string;
  time: string;
}

export interface BusData {
  busNumber: string;
  route: RouteInfo[];
  endPoint: string;
}

export interface Favorites {
  [key: string]: string[];
}

export interface BusStop {
  node_id: string;
  node_nm: string;
  latitude: number;
  longitude: number;
}

export interface ArrivalInfo {
  routeNo: string;
  arrPrevStationCnt: number;
  expireAtMs: number;
  nodeId: string;
  nodeNm: string;
  routeId: string;
  routeTp: string;
  vehicleTp: string;
}
