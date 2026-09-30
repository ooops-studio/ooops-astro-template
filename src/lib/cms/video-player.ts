import './video-player.css';

const cleanups = new Map<HTMLVideoElement, () => void>();
let listening = false;
type PlaybackStatus = { allowed: boolean; reason: string | null; retryAfterSeconds: number | null };

export function initializeCmsVideos() {
  if (!listening) {
    listening = true;
    document.addEventListener('astro:before-swap', () => { for (const cleanup of cleanups.values()) cleanup(); cleanups.clear(); });
  }
  for (const video of document.querySelectorAll<HTMLVideoElement>('video[data-cms-video]')) {
    if (cleanups.has(video)) continue;
    const hlsUrl = video.dataset.cmsHls;
    const statusUrl = video.dataset.cmsStatus;
    const fallbackUrl = video.dataset.cmsFallback || video.getAttribute('src') || '';
    if (!hlsUrl && !statusUrl) continue;
    const el = (video.dataset.cmsLocale || document.documentElement.lang).startsWith('el');
    const copy = {
      blocked: el ? 'Το βίντεο δεν είναι διαθέσιμο αυτή τη στιγμή.' : 'This video is temporarily unavailable.',
      busy: el ? 'Η αναπαραγωγή είναι προσωρινά απασχολημένη. Δοκιμάστε ξανά σε λίγο.' : 'Video playback is busy. Please try again shortly.',
      retry: el ? 'Δοκιμή ξανά' : 'Try again'
    };
    let container = video.closest<HTMLElement>('.cms-video-container');
    if (!container) { container = document.createElement('div'); container.className = 'cms-video-container'; video.parentNode!.insertBefore(container, video); container.appendChild(video); }
    const downloads = [...container.querySelectorAll<HTMLAnchorElement>('a[data-cms-download], a.cms-video-download')];
    for (const link of downloads) { link.dataset.cmsDownload ||= link.getAttribute('href') || ''; if (statusUrl) { link.hidden = true; link.removeAttribute('href'); } }
    const message = document.createElement('div'); message.className = 'cms-video-status'; message.hidden = true; message.setAttribute('role', 'status');
    const text = document.createElement('p');
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = copy.retry;
    message.appendChild(text); message.appendChild(retry); container.appendChild(message);
    const poster = document.createElement('img'); poster.className = 'cms-video-retained-poster'; poster.alt = ''; poster.hidden = true;
    if (video.poster) poster.src = video.poster;
    if (video.width) poster.width = video.width;
    if (video.height) poster.height = video.height;
    video.parentNode!.insertBefore(poster, video.nextSibling);
    let disposed = false, started = false, starting = false, handlingError = false, blocked = false;
    let hls: import('hls.js').default | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const lifetime = new AbortController();
    const status = async (): Promise<PlaybackStatus> => {
      if (!statusUrl) return { allowed: true, reason: null, retryAfterSeconds: null };
      try {
        const response = await fetch(statusUrl, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(5000)]) });
        const data: unknown = await response.json();
        if (typeof data !== 'object' || !data || !('allowed' in data) || typeof data.allowed !== 'boolean') throw new Error('Invalid playback status');
        const value = data as PlaybackStatus;
        if (!response.ok && value.allowed) throw new Error('Unavailable playback status');
        return value;
      } catch { return { allowed: false, reason: 'unavailable', retryAfterSeconds: 5 }; }
    };
    const showBlocked = (value: PlaybackStatus) => {
      if (disposed) return;
      blocked = true; started = false;
      hls?.destroy(); hls = undefined;
      video.pause(); video.removeAttribute('src'); video.load();
      video.hidden = true; poster.hidden = !video.poster;
      for (const link of downloads) { link.hidden = true; link.removeAttribute('href'); }
      message.hidden = false;
      text.textContent = value.reason === 'busy' ? copy.busy : copy.blocked;
      clearTimeout(retryTimer);
      retry.hidden = value.reason === 'allowance_reached';
      retry.disabled = true;
      if (!retry.hidden) retryTimer = setTimeout(() => { retry.disabled = false; }, Math.min(60, Math.max(1, value.retryAfterSeconds || 5)) * 1000);
    };
    const showReady = () => {
      blocked = false; message.hidden = true; poster.hidden = true; video.hidden = false;
      for (const link of downloads) { if (link.dataset.cmsDownload) { link.href = link.dataset.cmsDownload; link.hidden = false; } }
    };
    const fallback = async () => {
      if (disposed || blocked || handlingError) return;
      handlingError = true;
      const value = await status();
      if (disposed) return;
      if (!value.allowed) { showBlocked(value); handlingError = false; return; }
      hls?.destroy(); hls = undefined;
      if (!fallbackUrl || video.getAttribute('src') === fallbackUrl) {
        showBlocked({ allowed: false, reason: 'unavailable', retryAfterSeconds: 5 });
      } else {
        const time = video.currentTime, playing = !video.paused;
        video.src = fallbackUrl;
        video.addEventListener('loadedmetadata', () => { if (disposed || blocked) return; if (time) video.currentTime = time; if (playing) void video.play().catch(() => {}); }, { once: true });
      }
      handlingError = false;
    };
    const start = async (playAfter = false) => {
      if (started || starting || disposed) return;
      starting = true;
      try {
        const value = await status();
        if (disposed) return;
        if (!value.allowed) { showBlocked(value); return; }
        showReady(); started = true;
        if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
        } else if (hlsUrl) {
          const { default: Hls } = await import('hls.js');
          if (disposed) return;
          if (Hls.isSupported()) {
            hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: false, maxBufferLength: 6, maxMaxBufferLength: 12, maxBufferSize: 8 * 1024 * 1024, backBufferLength: 12 });
            hls.on(Hls.Events.ERROR, (_event, data) => {
              // Policy responses must stop retries even before hls.js declares a fatal error.
              if (data.response?.code === 429 || data.response?.code === 503) {
                hls?.stopLoad(); void status().then(result => showBlocked(result.allowed ? { allowed: false, reason: 'busy', retryAfterSeconds: 5 } : result));
              } else if (data.fatal) void fallback();
            });
            hls.on(Hls.Events.MANIFEST_PARSED, () => { if (playAfter || !video.paused || video.autoplay) { hls?.startLoad(); void video.play().catch(() => {}); } });
            hls.loadSource(hlsUrl); hls.attachMedia(video);
          } else video.src = fallbackUrl;
        } else video.src = fallbackUrl;
        if (playAfter || video.autoplay) void video.play().catch(() => {});
      } catch { await fallback(); }
      finally { starting = false; }
    };
    const error = () => { void fallback(); };
    const play = () => { if (blocked) { video.pause(); return; } void start(true); hls?.startLoad(); };
    const retryPlayback = () => { void start(true); };
    video.addEventListener('error', error); video.addEventListener('play', play); retry.addEventListener('click', retryPlayback);
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer.disconnect(); void start(); } }, { rootMargin: '200px' });
    observer.observe(video);
    cleanups.set(video, () => {
      disposed = true; lifetime.abort(); clearTimeout(retryTimer); observer.disconnect(); hls?.destroy();
      video.removeEventListener('play', play); video.removeEventListener('error', error); retry.removeEventListener('click', retryPlayback);
      message.remove(); poster.remove();
    });
  }
}
