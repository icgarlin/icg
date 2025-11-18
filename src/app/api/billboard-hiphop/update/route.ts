import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase';

interface SongInfo {
  position: number;
  title: string;
  artist: string;
  isHipHop?: boolean;
}

export let isUpdating = false;

export async function GET(request: Request) {
  // Verify this is a cron job request (for security)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (isUpdating) {
    return Response.json({ message: 'Update already in progress' });
  }

  try {
    isUpdating = true;
    const result = await updateBillboardData();
    return Response.json({
      message: 'Billboard data updated successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error updating Billboard data:', error);
    return Response.json(
      { error: 'Failed to update Billboard data' },
      { status: 500 }
    );
  } finally {
    isUpdating = false;
  }
}

async function updateBillboardData() {
  console.log('Starting Billboard data update...');

  // Step 1: Scrape Billboard Hot 100
  const billboardResponse = await fetch('https://www.billboard.com/charts/hot-100/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!billboardResponse.ok) {
    throw new Error(`Billboard fetch error: ${billboardResponse.statusText}`);
  }

  const html = await billboardResponse.text();
  const songs = parseBillboardData(html);

  console.log(`Parsed ${songs.length} songs from Billboard`);

  // Step 2: Check genres with Discogs
  const discogsToken = process.env.DISCOGS_TOKEN;
  if (!discogsToken) {
    throw new Error('DISCOGS_TOKEN not found in environment variables');
  }

  const hipHopTracks: SongInfo[] = [];
  let top40Count = 0;
  let top100Count = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const isHipHop = await checkIfHipHop(song.artist, song.title, discogsToken);

    if (isHipHop) {
      const trackWithGenre = { ...song, isHipHop };
      hipHopTracks.push(trackWithGenre);

      if (song.position <= 40) top40Count++;
      top100Count++;

      console.log(`Found hip-hop track: #${song.position} ${song.title} - ${song.artist}`);
    }

    // Wait 1.2 seconds between requests
    if (i < songs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
  }

  // Save to Supabase
  const { data: statsData, error: statsError } = await supabase
    .from('billboard_stats')
    .insert({
      top40: top40Count,
      top100: top100Count,
    })
    .select()
    .single();

  if (statsError) {
    throw new Error(`Failed to insert stats: ${statsError.message}`);
  }

  // Save tracks to Supabase
  if (hipHopTracks.length > 0) {
    const tracksToInsert = hipHopTracks.map(track => ({
      stats_id: statsData.id,
      position: track.position,
      title: track.title,
      artist: track.artist,
    }));

    const { error: tracksError } = await supabase
      .from('billboard_tracks')
      .insert(tracksToInsert);

    if (tracksError) {
      throw new Error(`Failed to insert tracks: ${tracksError.message}`);
    }
  }

  console.log(`Update complete: ${top40Count} in Top 40, ${top100Count} in Top 100`);

  return {
    top40: top40Count,
    top100: top100Count,
    tracks: hipHopTracks.length,
    timestamp: Date.now(),
  };
}

function parseBillboardData(html: string): SongInfo[] {
  const songs: SongInfo[] = [];

  try {
    const $ = cheerio.load(html);

    // Find the main chart list - Billboard uses specific class for chart items
    $('ul.o-chart-results-list-row').each((index: number, element: any) => {
      const $el = $(element);

      // Stop after 100 entries
      if (index >= 100) return false;

      // Extract position from the rank span
      const positionText = $el.find('span.c-label').first().text().trim();
      const position = parseInt(positionText) || (index + 1);

      // Extract title from h3 with id
      const title = $el.find('h3#title-of-a-story').text().trim();

      // Extract artist from the span after the title
      const artist = $el.find('span.c-label.a-no-trucate').first().text().trim() ||
                    $el.find('h3#title-of-a-story').parent().find('span').last().text().trim();

      if (title && artist && position <= 100) {
        songs.push({
          position,
          title: title.replace(/\s+/g, ' ').trim(),
          artist: artist.replace(/\s+/g, ' ').trim(),
        });
      }
    });

    // Sort by position
    songs.sort((a, b) => a.position - b.position);

    console.log(`Parsed ${songs.length} unique songs from Billboard Hot 100`);

    return songs;
  } catch (error) {
    console.error('Error parsing Billboard data:', error);
    return [];
  }
}

async function checkIfHipHop(artist: string, title: string, token: string): Promise<boolean> {
  try {
    const searchQuery = encodeURIComponent(`${artist} ${title}`);
    const searchUrl = `https://api.discogs.com/database/search?q=${searchQuery}&type=release&per_page=5`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Discogs token=${token}`,
        'User-Agent': 'BillboardHipHopCounter/1.0',
      },
    });

    if (response.status === 429) {
      console.warn(`Rate limit hit for ${artist} - ${title}, skipping...`);
      return false;
    }

    if (!response.ok) {
      console.warn(`Discogs API error for ${artist} - ${title}: ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    return checkDiscogsGenre(data);
  } catch (error) {
    console.error(`Error checking genre for ${artist} - ${title}:`, error);
    return false;
  }
}

function checkDiscogsGenre(data: any): boolean {
  if (data.results && data.results.length > 0) {
    for (const result of data.results.slice(0, 3)) {
      const genres = result.genre || [];
      const styles = result.style || [];

      const allGenreData = [...genres, ...styles].map((g: string) => g.toLowerCase());

      if (allGenreData.some((g: string) =>
        (g.includes('hip hop') && allGenreData.length === 1) ||
        (g.includes('rap') && allGenreData.length <= 4) ||
        g.includes('trap') ||
        g.includes('drill') || 
        g.includes('gangsta')
      )) {
        return true;
      }
    }
  }

  return false;
}
