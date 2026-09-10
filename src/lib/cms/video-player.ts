const cleanups = new Map<HTMLVideoElement, () => void>();
let listening = false;
export function initializeCmsVideos() {
  if (!listening) {
    listening = true;
    document.addEventListener('astro:before-swap', () => { for (const cleanup of cleanups.values()) cleanup(); cleanups.clear(); });
  }
  for (const video of document.querySelectorAll<HTMLVideoElement>('video[data-cms-video]')) {
    if (cleanups.has(video)) continue;
    const hlsUrl = video.dataset.cmsHls;
    if (!hlsUrl) continue;
    let disposed = false;
    let hls: import('hls.js').default | undefined;
    let started = false;
    const fallback = () => { hls?.destroy(); hls = undefined; if (video.src !== video.dataset.cmsFallback) { const time = video.currentTime, playing = !video.paused; video.src = video.dataset.cmsFallback || ''; video.addEventListener('loadedmetadata', () => { if (time) video.currentTime = time; if (playing) void video.play().catch(() => {}); }, { once: true }); } };
    const start = async () => {
      if (started || disposed) return; started = true;
      try {
        if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = hlsUrl; video.addEventListener('error', fallback, { once: true }); return; }
        const { default: Hls } = await import('hls.js');
        if (disposed || !Hls.isSupported()) return;
        const wasPlaying = !video.paused;
        hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: false, maxBufferLength: 6, maxMaxBufferLength: 12, maxBufferSize: 8 * 1024 * 1024, backBufferLength: 12 });
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) fallback(); });
        hls.on(Hls.Events.MANIFEST_PARSED, () => { if (wasPlaying || !video.paused || video.autoplay) { hls?.startLoad(); void video.play().catch(() => {}); } });
        hls.loadSource(hlsUrl); hls.attachMedia(video);
      } catch { fallback(); }
    };
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer.disconnect(); void start(); } }, { rootMargin: '200px' });
    observer.observe(video);
    const play = () => { void start(); hls?.startLoad(); };
    video.addEventListener('play', play);
    cleanups.set(video, () => { disposed = true; observer.disconnect(); hls?.destroy(); video.removeEventListener('play', play); video.removeEventListener('error', fallback); });
  }
}
