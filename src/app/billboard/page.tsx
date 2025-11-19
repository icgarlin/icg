'use client';

import { useEffect, useState } from 'react';

function TickerCounter({ targetNumber, label }: { targetNumber: number; label: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = targetNumber / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setCount(targetNumber);
        clearInterval(timer);
      } else {
        setCount(Math.floor(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [targetNumber]);

  return (
    <div className="flex flex-col items-center gap-2 px-4 md:px-8">
      <div className="text-3xl md:text-5xl font-bold text-black">
        {count.toLocaleString()}
      </div>
      <div className="text-base md:text-lg text-gray-700">
        {label}
      </div>
    </div>
  );
}

interface Track {
  position: number;
  title: string;
  artist: string;
}

export default function Home() {
  const [stats, setStats] = useState<{ top40: number; top100: number }>({ top40: 0, top100: 0 });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 100 });

  useEffect(() => {
    // Reset state before starting
    setTracks([]);
    setStats({ top40: 0, top100: 0 });
    setLoading(true);
    setError(null);

    const eventSource = new EventSource('/api/billboard-hiphop');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'update') {
        // Add new hip-hop track to the list
        setTracks((prev) => [...prev, data.track]);
        setStats({ top40: data.top40, top100: data.top100 });
        setProgress({ processed: data.processed, total: data.total });
      } else if (data.type === 'complete') {
        // Final update
        setStats({ top40: data.top40, top100: data.top100 });
        setLoading(false);
        eventSource.close();
      } else if (data.type === 'info') {
        // Info message (e.g., updating in background)
        setError(null);
        setLoading(false);
        eventSource.close();
      } else if (data.type === 'error') {
        setError(data.error);
        setLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError('Connection error');
      setLoading(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-[#F5F5F7] overflow-hidden relative flex flex-col items-center selection:bg-blue-500/20">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-200/40 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-pink-200/30 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      <a
        href="/"
        className="absolute top-6 left-6 z-20 bg-white/50 hover:bg-white/80 border border-white/40 text-gray-900 px-6 py-2.5 rounded-full text-sm font-medium transition-all hover:scale-105 hover:shadow-lg backdrop-blur-md"
      >
        ← Back to Home
      </a>

      <div className="relative z-10 w-full max-w-5xl h-full px-4 md:px-8 pt-24 pb-8 flex flex-col">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 mb-2">
            Billboard Top Hip-Hop
          </h1>
          <p className="text-gray-500 text-lg">Live tracking of chart performance</p>
        </div>

        <div className="flex justify-center gap-8 mb-10">
          {error ? (
            <div className="text-base md:text-xl text-red-500 text-center bg-red-50 px-4 py-2 rounded-lg border border-red-100">
              Error: {error}
            </div>
          ) : (
            <>
              <div className="glass-panel px-8 py-4 rounded-2xl flex flex-col items-center min-w-[140px]">
                <span className="text-4xl font-bold text-gray-900">{stats.top40}</span>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1">Top 40</span>
              </div>
              <div className="glass-panel px-8 py-4 rounded-2xl flex flex-col items-center min-w-[140px]">
                <span className="text-4xl font-bold text-gray-900">{stats.top100}</span>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1">Top 100</span>
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center glass-panel rounded-3xl p-8">
            <div className="w-full max-w-md space-y-4">
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Analyzing tracks...</span>
                <span>{Math.round((progress.processed / progress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                />
              </div>
              <div className="text-center text-xs text-gray-400 font-mono">
                {progress.processed} / {progress.total} TRACKS PROCESSED
              </div>
            </div>
          </div>
        ) : (
          tracks.length > 0 && (
            <div className="flex-1 min-h-0 glass-panel rounded-3xl p-1 overflow-hidden ring-1 ring-black/5">
              <div className="h-full overflow-y-auto p-4 md:p-6 space-y-2 custom-scrollbar">
                {tracks.map((track, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-4 p-3 hover:bg-white/50 rounded-xl transition-all duration-200 border border-transparent hover:border-white/40 hover:shadow-sm"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                      {track.position}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-gray-900 truncate text-base">{track.title}</div>
                      <div className="text-gray-500 text-sm truncate font-medium">{track.artist}</div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono text-gray-400 px-3 py-1 rounded-full border border-gray-200">
                      #{track.position}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
