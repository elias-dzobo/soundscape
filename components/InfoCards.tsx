import React from 'react';
import { ConstructionUpdate, EventData, WeatherData } from '../types';

export const WeatherCard: React.FC<{ data: WeatherData }> = ({ data }) => (
  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl text-white w-full max-w-md animate-fade-in">
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
      Current Weather
    </h2>
    <div className="flex justify-between items-center">
      <div className="text-6xl font-bold">{data.temperature}°C</div>
      <div className="text-right">
        <p className="text-xl font-medium">{data.condition}</p>
        <p className="text-blue-100">Humidity: {data.humidity}%</p>
        <p className="text-blue-100">Wind: {data.windSpeed} km/h</p>
      </div>
    </div>
  </div>
);

export const ConstructionCard: React.FC<{ data: ConstructionUpdate[] }> = ({ data }) => (
  <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-6 rounded-2xl shadow-xl text-white w-full max-w-md animate-fade-in">
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      Construction Updates
    </h2>
    <div className="space-y-4">
      {data.map(item => (
        <div key={item.id} className="bg-orange-900/30 p-3 rounded-lg border border-orange-400/30">
          <p className="font-bold text-lg">{item.location}</p>
          <p className="text-sm opacity-90">{item.description}</p>
          <div className="flex justify-between mt-2 text-xs uppercase tracking-wider font-semibold text-orange-200">
            <span>{item.status}</span>
            <span>Est: {item.completionEstimate}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const EventsCard: React.FC<{ data: EventData[] }> = ({ data }) => (
  <div className="bg-gradient-to-br from-purple-600 to-pink-700 p-6 rounded-2xl shadow-xl text-white w-full max-w-md animate-fade-in">
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      Upcoming Events
    </h2>
    <div className="space-y-4">
      {data.map(event => (
        <div key={event.id} className="bg-purple-900/30 p-3 rounded-lg border border-purple-400/30">
          <p className="font-bold text-lg">{event.title}</p>
          <p className="text-purple-200 text-sm">{event.date} @ {event.location}</p>
          <p className="text-sm mt-1 opacity-90">{event.description}</p>
        </div>
      ))}
    </div>
  </div>
);