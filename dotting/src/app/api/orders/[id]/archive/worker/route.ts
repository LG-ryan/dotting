import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import archiver from 'archiver'
import { Readable } from 'stream'

/**
 * POST /api/orders/[id]/archive/worker
 * 유산 상자 생성 Worker (내부 API)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 내부 API 인증
  const secret = request.headers.get('X-Internal-Secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { id: orderId } = await params
  
  // Supabase 서버 클라이언트 (Service Role)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  try {
    const startTime = Date.now()
    
    // 1. 주문 정보 조회
    const { data: order } = await supabase
      .from('orders')
      .select(`
        id,
        session_id,
        package,
        sessions (
          id,
          subject_name,
          subject_relation
        )
      `)
      .eq('id', orderId)
      .single()
    
    if (!order || !order.sessions) {
      throw new Error('Order or session not found')
    }
    
    const session = Array.isArray(order.sessions) ? order.sessions[0] : order.sessions
    
    // 2. audio_playlists 조회 (moment_index 순)
    const { data: playlists } = await supabase
      .from('audio_playlists')
      .select('*')
      .eq('session_id', order.session_id)
      .order('moment_index', { ascending: true })
    
    if (!playlists || playlists.length === 0) {
      throw new Error('No audio playlists found')
    }
    
    // 진행률 업데이트 헬퍼
    const updateProgress = async (progress: number, estimatedSeconds?: number) => {
      // 10% 단위로만 업데이트
      const roundedProgress = Math.floor(progress / 10) * 10
      await supabase
        .from('orders')
        .update({
          archive_progress: roundedProgress,
          archive_estimated_seconds: estimatedSeconds,
        })
        .eq('id', orderId)
    }
    
    // 3. 스트리밍 ZIP 생성 (최대 압축)
    const archive = archiver('zip', {
      zlib: { level: 9 }  // 최대 압축 (20-30% 크기 감소)
    })
    
    const chunks: Buffer[] = []
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))
    
    // 4. 오디오 파일 다운로드 및 추가 (40% 가중치)
    const episodes = []
    const totalAudios = playlists.length
    
    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i]
      
      if (!playlist.audio_url) continue
      
      // Supabase Storage에서 오디오 다운로드
      const { data: audioData } = await supabase
        .storage
        .from('audio-recordings')
        .download(playlist.audio_url.replace('audio-recordings/', ''))
      
      if (audioData) {
        const fileName = `${String(i + 1).padStart(3, '0')}_${playlist.title || 'audio'}.mp3`
        
        // 스트림에 추가
        const buffer = Buffer.from(await audioData.arrayBuffer())
        archive.append(buffer, { name: `audios/${fileName}` })
        
        episodes.push({
          moment_index: playlist.moment_index,
          title: playlist.title || `에피소드 ${i + 1}`,
          audio_file: `audios/${fileName}`,
          duration: playlist.duration_seconds || 0,
        })
      }
      
      // 진행률 업데이트 (0-40%)
      const audioProgress = ((i + 1) / totalAudios) * 40
      const elapsed = (Date.now() - startTime) / 1000
      const estimated = (elapsed / audioProgress) * (100 - audioProgress)
      await updateProgress(audioProgress, Math.ceil(estimated))
    }
    
    // 5. metadata.json 생성 (45%)
    const metadata = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      project: {
        id: order.session_id,
        name: `${session.subject_name}의 이야기`,
        subject_name: session.subject_name,
        subject_relation: session.subject_relation,
        package_type: order.package,
      },
      episodes: episodes,
      stats: {
        total_episodes: episodes.length,
        total_duration_seconds: episodes.reduce((sum, ep) => sum + ep.duration, 0),
      },
    }
    
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })
    await updateProgress(45)
    
    // 6. Start.html 생성 (50%)
    const startHtml = generateStartHtml(metadata)
    archive.append(startHtml, { name: 'Start.html' })
    await updateProgress(50)
    
    // 7. Guide.pdf 생성 (55%) - 현재는 txt로 대체
    const guideText = generateGuideText(session.subject_name)
    archive.append(guideText, { name: 'Guide.txt' })
    await updateProgress(55)
    
    // 8. 압축 완료 (99%)
    await archive.finalize()
    await updateProgress(99)
    
    // 99%에서 잠시 대기 (봉인 여운)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 9. Storage 업로드
    const zipBuffer = Buffer.concat(chunks)
    const fileName = `${orderId}/${session.subject_name}_이야기_DOTTING.zip`
    
    const { error: uploadError } = await supabase
      .storage
      .from('archives')
      .upload(fileName, zipBuffer, {
        contentType: 'application/zip',
        upsert: true,
      })
    
    if (uploadError) {
      throw uploadError
    }
    
    // 10. DB 업데이트 (100%)
    await supabase
      .from('orders')
      .update({
        archive_url: fileName,
        archive_status: 'ready',
        archive_progress: 100,
        archive_generated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
    
    return NextResponse.json({
      success: true,
      archiveUrl: fileName,
    })
    
  } catch (error) {
    console.error('Archive generation failed:', error)
    
    // 실패 상태 업데이트
    await supabase
      .from('orders')
      .update({
        archive_status: 'failed',
      })
      .eq('id', orderId)
    
    return NextResponse.json({ 
      error: 'Archive generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// Start.html 템플릿 생성
function generateStartHtml(metadata: any): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.project.name}</title>
  <style>
    /* 유니버설 프리미엄 스타일 */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #FFFBF5;
      color: #1A365D;
      padding: 40px 24px;
      max-width: 800px;
      margin: 0 auto;
      font-size: 17px;
      line-height: 1.6;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 1px solid #E5E7EB;
    }
    
    .title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .subtitle {
      font-size: 14px;
      color: #6B7280;
    }
    
    .player {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .current-episode {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    
    .btn {
      background: #1A365D;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
      cursor: pointer;
      font-size: 14px;
      height: 40px;
    }
    
    .btn:hover {
      background: #2A4A6F;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .progress-container {
      margin-bottom: 8px;
    }
    
    .progress-bar {
      width: 100%;
      height: 4px;
      background: #E5E7EB;
      border-radius: 2px;
      overflow: hidden;
      cursor: pointer;
    }
    
    .progress-fill {
      height: 100%;
      background: #F59E0B;
      transition: width 0.1s linear;
    }
    
    .time {
      font-size: 14px;
      color: #6B7280;
    }
    
    .playlist {
      background: white;
      border-radius: 16px;
      padding: 24px;
    }
    
    .playlist-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .episode-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .episode-item:hover {
      background: #F3F4F6;
    }
    
    .episode-item.playing {
      background: #FEF3C7;
      font-weight: 600;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
      font-size: 12px;
      color: #9CA3AF;
    }
    
    /* Heritage 모드 */
    [data-package="heritage"] .title {
      background: linear-gradient(135deg, #F59E0B 0%, #FCD34D 50%, #F59E0B 100%);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: heritage-glow 3s ease-in-out infinite;
    }
    
    @keyframes heritage-glow {
      0%, 100% {
        background-position: 0% 50%;
        filter: brightness(1);
      }
      50% {
        background-position: 100% 50%;
        filter: brightness(1.2);
      }
    }
    
    [data-package="heritage"] .episode-item.playing::before {
      content: "●";
      color: #F59E0B;
    }
  </style>
</head>
<body data-package="${metadata.project.package_type}">
  <div class="header">
    <h1 class="title">${metadata.project.name}</h1>
    <p class="subtitle">DOTTING Archive · ${new Date(metadata.generated_at).toLocaleDateString('ko-KR')}</p>
  </div>
  
  <div class="player">
    <div class="current-episode" id="currentEpisode">에피소드를 선택해주세요</div>
    
    <div class="controls">
      <button class="btn" id="playBtn">▶️ 재생</button>
      <button class="btn" id="pauseBtn" style="display:none;">⏸️ 일시정지</button>
      <button class="btn" id="prevBtn">⏮️ 이전</button>
      <button class="btn" id="nextBtn">⏭️ 다음</button>
    </div>
    
    <div class="progress-container">
      <div class="progress-bar" id="progressBar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
    </div>
    
    <div class="time">
      <span id="currentTime">0:00</span> / <span id="duration">0:00</span>
    </div>
    
    <audio id="audio" preload="metadata"></audio>
  </div>
  
  <div class="playlist">
    <div class="playlist-title">📋 에피소드 목록</div>
    <div id="episodeList"></div>
  </div>
  
  <div class="footer">
    이 파일은 인터넷 없이도 재생됩니다<br>
    DOTTING.kr
  </div>
  
  <script>
    const metadata = ${JSON.stringify(metadata)};
    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const currentEpisodeEl = document.getElementById('currentEpisode');
    const episodeListEl = document.getElementById('episodeList');
    
    let currentIndex = 0;
    
    // 에피소드 목록 렌더링
    metadata.episodes.forEach((episode, index) => {
      const item = document.createElement('div');
      item.className = 'episode-item';
      item.textContent = episode.title;
      item.onclick = () => loadEpisode(index);
      episodeListEl.appendChild(item);
    });
    
    // 에피소드 로드
    function loadEpisode(index) {
      currentIndex = index;
      const episode = metadata.episodes[index];
      audio.src = episode.audio_file;
      currentEpisodeEl.textContent = episode.title;
      
      // 재생 중 표시
      document.querySelectorAll('.episode-item').forEach((item, i) => {
        item.classList.toggle('playing', i === index);
      });
      
      audio.play();
    }
    
    // 재생/일시정지
    playBtn.onclick = () => audio.play();
    pauseBtn.onclick = () => audio.pause();
    
    audio.onplay = () => {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
    };
    
    audio.onpause = () => {
      playBtn.style.display = 'inline-block';
      pauseBtn.style.display = 'none';
    };
    
    // 이전/다음
    prevBtn.onclick = () => {
      if (currentIndex > 0) loadEpisode(currentIndex - 1);
    };
    
    nextBtn.onclick = () => {
      if (currentIndex < metadata.episodes.length - 1) loadEpisode(currentIndex + 1);
    };
    
    // 진행 바
    audio.ontimeupdate = () => {
      const percent = (audio.currentTime / audio.duration) * 100;
      progressFill.style.width = percent + '%';
      currentTimeEl.textContent = formatTime(audio.currentTime);
    };
    
    audio.onloadedmetadata = () => {
      durationEl.textContent = formatTime(audio.duration);
    };
    
    progressBar.onclick = (e) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audio.currentTime = percent * audio.duration;
    };
    
    // 시간 포맷
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }
    
    // 첫 번째 에피소드 자동 로드
    if (metadata.episodes.length > 0) {
      loadEpisode(0);
    }
  </script>
</body>
</html>`
}

// Guide 텍스트 생성 (v4.3: 전달 철학 + 메모란 추가)
function generateGuideText(subjectName: string): string {
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   소중한 이야기를 간직하는 방법

━━━━━━━━━━━━━━━━━━━━━━━━━━━━


[사용법]

1단계
  이 폴더에서
  "Start.html" 파일을 찾아주세요

2단계
  파일을 두 번 눌러주세요
  (더블클릭)

3단계
  브라우저가 열리면서
  자동으로 이야기가 재생됩니다


━━━━━━━━━━━━━━━━━━━━━━━━━━━━


[유산을 전달하는 마음]

이 상자는 시간이 지나도
변하지 않는 목소리를 담았습니다

USB나 외장하드에 복사하여
자녀에게 전해주세요

함께 듣는 시간이
또 하나의 소중한 기억이 됩니다


━━━━━━━━━━━━━━━━━━━━━━━━━━━━


[기록]

가족과 함께 목소리를 들었던 날

날짜: ___________________

함께한 사람: ___________________


━━━━━━━━━━━━━━━━━━━━━━━━━━━━

모든 이야기는 계속됩니다 ●●●
DOTTING.kr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}
