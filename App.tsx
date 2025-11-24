import React, { useState, useEffect, useCallback } from 'react';
import { liveClient } from './services/liveClient';
import { AppState, DisplayInfo, WeatherData, ConstructionUpdate, EventData } from './types';
import Visualizer from './components/Visualizer';
import { ConstructionCard, EventsCard, WeatherCard } from './components/InfoCards';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [displayInfo, setDisplayInfo] = useState<DisplayInfo>({ type: null });
  const [volume, setVolume] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to service events
    liveClient.onDisplayUpdate = (info) => {
      setDisplayInfo(info);
    };

    liveClient.onConnectionStateChange = (isConnected) => {
      setAppState(isConnected ? AppState.CONNECTED : AppState.IDLE);
    };

    liveClient.onError = (msg) => {
      setErrorMsg(msg);
      setAppState(AppState.ERROR);
    };

    liveClient.onVolumeUpdate = (vol) => {
      setVolume(vol);
    };

    return () => {
      liveClient.disconnect();
    };
  }, []);

  const handleStart = useCallback(async () => {
    setErrorMsg(null);
    setAppState(AppState.CONNECTING);
    setDisplayInfo({ type: 'GREETING' }); // Show initial state
    await liveClient.connect();
  }, []);

  const handleStop = useCallback(() => {
    liveClient.disconnect();
    setAppState(AppState.IDLE);
    setDisplayInfo({ type: null });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="z-10 w-full max-w-2xl flex flex-col items-center gap-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
            Soundscape Brantford
          </h1>
          <p className="text-gray-400 text-lg">Your interactive voice-powered city guide</p>
        </div>

        {/* Dynamic Content Area */}
        <div className="w-full min-h-[300px] flex items-center justify-center py-4">
          {appState === AppState.IDLE && !errorMsg && (
            <div className="text-gray-500 text-center animate-pulse">
              <p>Click "Start Interaction" to begin.</p>
            </div>
          )}

          {appState === AppState.CONNECTING && (
            <div className="flex flex-col items-center gap-3 text-blue-400">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Connecting to Brantford City Grid...</p>
            </div>
          )}
          
          {appState === AppState.ERROR && (
             <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-500/30 text-center">
                <p className="font-bold">Error</p>
                <p>{errorMsg}</p>
                <button 
                  onClick={() => setAppState(AppState.IDLE)} 
                  className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded text-sm transition-colors"
                >
                  Reset
                </button>
             </div>
          )}

          {appState === AppState.CONNECTED && (
            <div className="w-full flex justify-center transition-all duration-500">
              {displayInfo.type === 'GREETING' && (
                 <div className="text-center space-y-4 max-w-sm">
                    <div className="text-6xl animate-bounce">👋</div>
                    <p className="text-2xl font-light text-white">"Hello! I'm Soundscape Brantford."</p>
                    <div className="grid grid-cols-1 gap-2 text-gray-400 text-sm">
                      <div className="bg-gray-800 p-2 rounded">Current Weather</div>
                      <div className="bg-gray-800 p-2 rounded">Construction Updates</div>
                      <div className="bg-gray-800 p-2 rounded">Upcoming Events</div>
                    </div>
                 </div>
              )}
              {displayInfo.type === 'WEATHER' && displayInfo.data && (
                <WeatherCard data={displayInfo.data as WeatherData} />
              )}
              {displayInfo.type === 'CONSTRUCTION' && displayInfo.data && (
                <ConstructionCard data={displayInfo.data as ConstructionUpdate[]} />
              )}
              {displayInfo.type === 'EVENTS' && displayInfo.data && (
                <EventsCard data={displayInfo.data as EventData[]} />
              )}
            </div>
          )}
        </div>

        {/* Control & Visualizer Section */}
        <div className="w-full bg-gray-800/40 backdrop-blur-md border border-gray-700 p-6 rounded-3xl flex flex-col gap-4 shadow-2xl">
          
          <Visualizer isActive={appState === AppState.CONNECTED} volume={volume} />

          <div className="flex justify-center gap-4 mt-2">
            {appState === AppState.CONNECTED || appState === AppState.CONNECTING ? (
              <button
                onClick={handleStop}
                className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white transition-all duration-200 bg-red-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 hover:bg-red-500 active:scale-95"
              >
                 <span className="mr-2">Stop Session</span>
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-500 active:scale-95"
              >
                <span className="absolute top-0 right-0 -mt-2 -mr-2 w-3 h-3 rounded-full bg-green-400 animate-ping"></span>
                <span className="mr-2">Start Interaction</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </button>
            )}
          </div>
          
          <p className="text-center text-xs text-gray-500">
            Powered by Gemini Live API • Speak clearly into your microphone
          </p>
        </div>

      </div>
    </div>
  );
};

export default App;