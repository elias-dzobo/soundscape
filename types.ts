export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export interface ConstructionUpdate {
  id: string;
  location: string;
  description: string;
  status: 'Ongoing' | 'Scheduled' | 'Completed';
  completionEstimate: string;
  startDateISO?: string;
  endDateISO?: string;
}

export interface EventData {
  id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  startDateISO?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface DisplayInfo {
  type: 'WEATHER' | 'CONSTRUCTION' | 'EVENTS' | 'GREETING' | null;
  data?: WeatherData | ConstructionUpdate[] | EventData[];
}