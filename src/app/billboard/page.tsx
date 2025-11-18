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
    <div className="min-h-screen px-4" style={{ backgroundColor: '#D9D9D9' }}>
      <div className="flex justify-center pt-8 md:pt-16">
        <svg
          width="100%"
          height="100"
          viewBox="0 0 600 150"
          xmlns="http://www.w3.org/2000/svg"
          className="max-w-full md:max-w-2xl"
        >
          <defs>
            <path
              id="curve"
              d="M 50,100 Q 300,20 550,100"
              fill="transparent"
            />
          </defs>
          <text
            fontSize="40"
            fontWeight="600"
            fill="#000000"
            textAnchor="middle"
            className="text-2xl md:text-5xl"
          >
            <textPath href="#curve" startOffset="50%">
              Billboard Top Hip-Hop
            </textPath>
          </text>
        </svg>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mt-8 md:mt-12">
        {error ? (
          <div className="text-base md:text-xl text-red-600 text-center">Error: {error}</div>
        ) : (
          <>
            <TickerCounter targetNumber={stats.top40} label="Top 40" />
            <TickerCounter targetNumber={stats.top100} label="Top 100" />
          </>
        )}
      </div>

      {loading && (
        <div className="text-center mt-6 text-gray-700 px-4">
          <div className="text-sm md:text-lg">Analyzing tracks... {progress.processed} / {progress.total}</div>
          <div className="w-full max-w-md mx-auto mt-2 bg-gray-300 rounded-full h-2">
            <div
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.processed / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {tracks.length > 0 && (
        <div className="max-w-4xl mx-auto mt-8 md:mt-12 px-4 pb-8">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6 text-center">Hip-Hop Tracks on Billboard Hot 100</h2>
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
            <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
              {tracks.map((track, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 md:gap-4 p-2 md:p-3 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs md:text-sm">
                    #{track.position}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="font-semibold text-black truncate text-sm md:text-base">{track.title}</div>
                    <div className="text-gray-600 text-xs md:text-sm truncate">{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
