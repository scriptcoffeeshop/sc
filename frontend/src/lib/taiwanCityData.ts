import taiwanCityData from "./taiwanCityData.json";

export interface TaiwanCityData {
  counties: string[];
  districts: [string[], string[]][];
}

export const TAIWAN_CITY_DATA = taiwanCityData as TaiwanCityData;
