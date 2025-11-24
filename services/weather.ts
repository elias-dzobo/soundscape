import { WeatherData } from "../types";
import { BRANTFORD_COORDINATES } from "../constants";

const WEATHER_API_BASE = "https://api.open-meteo.com/v1/forecast";

const WEATHER_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
  "weather_code",
];

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Light snow showers",
  86: "Snow showers",
  95: "Thunderstorms",
  96: "Storms w/ hail",
  99: "Thunder hail",
};

const interpretWeatherCode = (code?: number) =>
  WEATHER_CODE_MAP[code ?? -1] ?? "Conditions unknown";

export async function fetchBrantfordWeather(): Promise<WeatherData> {
  const url = new URL(WEATHER_API_BASE);
  url.searchParams.set("latitude", BRANTFORD_COORDINATES.latitude.toString());
  url.searchParams.set("longitude", BRANTFORD_COORDINATES.longitude.toString());
  url.searchParams.set("current", WEATHER_PARAMS.join(","));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Weather service unavailable");
  }

  const payload = await response.json();
  const current = payload?.current;
  if (!current) {
    throw new Error("Weather data missing");
  }

  return {
    temperature: Math.round(current.temperature_2m),
    condition: interpretWeatherCode(current.weather_code),
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.wind_speed_10m),
  };
}

