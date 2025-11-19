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
    <div className="w-screen h-screen bg-[#F5F5F7] overflow-hidden relative flex items-center justify-center selection:bg-blue-500/20">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-200/40 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-pink-200/30 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      <div className="absolute top-6 right-6 z-20 flex gap-4">

        <Link
          href="/billboard"
          className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all hover:scale-105 hover:shadow-lg hover:bg-gray-900"
        >
          Billboard List
        </Link>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <h1
          className="text-[15vw] font-black tracking-tighter leading-none opacity-[0.03]"
          style={{
            color: '#000',
          }}
        >
          ICG
        </h1>
      </div>

      <div className="relative z-10 w-full max-w-7xl h-[80vh] px-4 md:px-8">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-gray-500 font-mono uppercase tracking-widest">Loading Data</div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full glass-panel rounded-3xl p-6 md:p-10 flex flex-col ring-1 ring-black/5">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">ICG</h2>
                {/* <p className="text-gray-500 text-sm md:text-base">Weekly performance metrics</p> */}
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs font-mono text-gray-600 border border-gray-200 bg-white/50 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                LIVE DATA
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 40
                  }}
                >
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#06B6D4" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="song"
                    stroke="rgba(0,0,0,0.4)"
                    style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}
                    tick={{ fill: 'rgba(0,0,0,0.5)' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(0,0,0,0.4)"
                    style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}
                    tick={{ fill: 'rgba(0,0,0,0.5)' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    width={40}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(0,0,0,0.05)',
                      borderRadius: '12px',
                      padding: '12px',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                    }}
                    itemStyle={{ color: '#171717', fontSize: '12px', fontWeight: 500 }}
                    labelStyle={{ color: '#6b7280', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    formatter={(value: number) => [
                      <span key="val" className="font-mono text-pink-600">{value.toLocaleString()}</span>,
                      'Streams'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="streams"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorGradient)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
