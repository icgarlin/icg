'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  song: string;
  streams: number;
  change: number;
}

export default function Home() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCSV() {
      try {
        const response = await fetch('/nipsey_hussle_songs_20251118.csv');
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());

        // Skip header and parse data
        const chartData = lines.slice(1).map(line => {
          const [song, , streams, change] = line.split(',');
          return {
            song: song.length > 20 ? song.substring(0, 20) + '...' : song,
            streams: parseInt(streams) || 0,
            change: parseInt(change) || 0,
          };
        }).filter(item => item.streams > 0);

        setData(chartData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading CSV:', error);
        setLoading(false);
      }
    }

    loadCSV();
  }, []);

  return (
    <div className="w-screen h-screen bg-[#D9D9D9] overflow-hidden relative">
      <Link
        href="/billboard"
        className="absolute top-4 right-4 md:top-6 md:right-6 z-10 bg-black text-white px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold hover:bg-gray-800 transition-colors"
      >
        Billboard
      </Link>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <h1
          className="absolute text-[8rem] sm:text-[12rem] md:text-[20rem] font-black tracking-tighter leading-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.08) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          ICG
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-2xl text-gray-700">Loading...</div>
        </div>
      ) : (
        <div className="w-full h-full px-2 py-4 md:px-0 md:py-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 40,
                right: 10,
                left: 0,
                bottom: 80
              }}
            >
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity={0.9} />
                  <stop offset="40%" stopColor="#8B5CF6" stopOpacity={0.8} />
                  <stop offset="80%" stopColor="#3B82F6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" opacity={0.5} />
              <XAxis
                dataKey="song"
                stroke="#999"
                style={{ fontSize: '9px' }}
                tick={{ fill: '#666' }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                stroke="#999"
                style={{ fontSize: '10px' }}
                tick={{ fill: '#666' }}
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '8px',
                  color: '#000',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#666', marginBottom: '4px', fontSize: '11px' }}
                itemStyle={{ color: '#EC4899', fontSize: '11px' }}
                formatter={(value: number) => [value.toLocaleString(), 'Streams']}
              />
              <Area
                type="monotone"
                dataKey="streams"
                stroke="#EC4899"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
