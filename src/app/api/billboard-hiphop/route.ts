import { supabase } from '@/lib/supabase';
import { isUpdating } from './update/route';

export async function GET() {
  const encoder = new TextEncoder();

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch latest data from Supabase
        const { data: latestStats, error: statsError } = await supabase
          .from('billboard_stats')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (statsError || !latestStats) {
          // If currently updating in background, inform the user
          if (isUpdating) {
            const message = {
              type: 'info',
              message: 'Data is being updated in the background. Please check back in a moment.',
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
            controller.close();
            return;
          }

          // No data available yet
          const message = {
            type: 'info',
            message: 'No data available yet. Background job will update soon.',
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
          controller.close();
          return;
        }

        // Fetch tracks for this stats record
        const { data: tracks, error: tracksError } = await supabase
          .from('billboard_tracks')
          .select('*')
          .eq('stats_id', latestStats.id)
          .order('position', { ascending: true });

        if (tracksError) {
          throw new Error(`Failed to fetch tracks: ${tracksError.message}`);
        }

        // Send tracks one by one
        (tracks || []).forEach((track) => {
          const update = {
            type: 'update',
            track: {
              position: track.position,
              title: track.title,
              artist: track.artist,
            },
            top40: latestStats.top40,
            top100: latestStats.top100,
            processed: tracks?.length || 0,
            total: tracks?.length || 0,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
        });

        // Send complete message
        const completeData = {
          type: 'complete',
          top40: latestStats.top40,
          top100: latestStats.top100,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`));
        controller.close();

      } catch (error) {
        console.error('Error fetching Billboard hip-hop stats:', error);
        const errorData = { type: 'error', error: 'Failed to fetch Billboard hip-hop statistics' };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
