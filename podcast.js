// ====== ملف podcast.js ======

const YOUTUBE_API_KEY = 'AIzaSyBD4CGt6SZPv6JsJ3C2Cpyu5y7SrYooMM8'; 

let podcastPlayer; 

async function searchYouTubePodcasts(query) {
    const grid = document.getElementById('podcastGrid');
    
    grid.innerHTML = '<p style="color: #aaa; text-align: center; grid-column: 1/-1; padding: 20px;">جاري البحث في يوتيوب... ⏳</p>';

    if (YOUTUBE_API_KEY === 'YOUR_API_KEY_HERE') {
        grid.innerHTML = '<p style="color: #ef4444; text-align: center; grid-column: 1/-1; background: #272727; padding: 20px; border-radius: 8px;">⚠️ لازم تحط مفتاح YouTube API في أول سطر في ملف podcast.js عشان البحث يشتغل!</p>';
        return;
    }

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`);
        const data = await response.json();

        if (data.error) {
             grid.innerHTML = `<p style="color: #ef4444; text-align: center; grid-column: 1/-1;">حصل خطأ: ${data.error.message}</p>`;
             return;
        }

        if (!data.items || data.items.length === 0) {
            grid.innerHTML = '<p style="color: #aaa; text-align: center; grid-column: 1/-1;">مفيش نتايج مطابقة لبحثك.</p>';
            return;
        }

        renderPodcastCards(data.items);
    } catch (error) {
        grid.innerHTML = '<p style="color: #ef4444; text-align: center; grid-column: 1/-1;">حصل مشكلة في الاتصال بالإنترنت.</p>';
    }
}

function renderPodcastCards(items) {
    const grid = document.getElementById('podcastGrid');
    grid.innerHTML = '';

    items.forEach(item => {
        const videoId = item.id.videoId;
        const snippet = item.snippet;
        const title = snippet.title;
        const channel = snippet.channelTitle;
        const date = new Date(snippet.publishedAt).toLocaleDateString('ar-EG');
        const thumbnail = snippet.thumbnails.high ? snippet.thumbnails.high.url : snippet.thumbnails.default.url;

        const card = document.createElement('div');
        card.style.cssText = `
            background-color: #0f0f0f;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s;
            border: 1px solid #272727;
        `;
        
        card.onmouseover = () => card.style.transform = 'scale(1.02)';
        card.onmouseout = () => card.style.transform = 'scale(1)';

        card.innerHTML = `
            <div style="position: relative;">
                <img src="${thumbnail}" alt="${title}" style="width: 100%; height: auto; display: block; border-radius: 12px 12px 0 0;">
            </div>
            <div style="padding: 12px;">
                <h3 style="color: #fff; font-size: 1.05rem; margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                    ${title}
                </h3>
                <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 4px;">👤 ${channel}</p>
                <p style="color: #aaa; font-size: 0.8rem;">📅 نُشر في: ${date}</p>
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                     <button class="play-btn" style="flex: 1; background: var(--accent-emerald); color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        ▶ تشغيل
                    </button>
                     <button class="copy-link-btn" data-id="${videoId}" style="background: #272727; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;" title="نسخ الرابط">
                        🔗 
                    </button>
                </div>
            </div>
        `;

        card.querySelector('.play-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openPodcastPlayer(videoId, title);
        });
        
         card.addEventListener('click', () => {
             openPodcastPlayer(videoId, title);
         });

        card.querySelector('.copy-link-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const link = `https://www.youtube.com/watch?v=${videoId}`;
            navigator.clipboard.writeText(link);
            const btn = e.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '✔';
            setTimeout(() => btn.innerHTML = originalText, 1500);
        });

        grid.appendChild(card);
    });
}

function openPodcastPlayer(videoId, title) {
    const modal = document.getElementById('podcastVideoModal');
    const titleEl = document.getElementById('podcastModalTitle');
    
    const mainAudioPlayer = document.getElementById('audioPlayer');
    if (mainAudioPlayer && !mainAudioPlayer.paused) {
        mainAudioPlayer.pause();
    }
    
    if (typeof ytPlayer !== 'undefined' && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
             ytPlayer.pauseVideo();
             document.getElementById('ytSunnahBtn').textContent = '▶ تشغيل البث';
             if (typeof isYtPlaying !== 'undefined') isYtPlaying = false;
        }
    }

    titleEl.textContent = title;
    modal.classList.add('open');

    if (!podcastPlayer) {
        podcastPlayer = new YT.Player('podcastIframe', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': 1, 
                'controls': 1, 
                'rel': 0,      
                'modestbranding': 1,
                'playsinline': 1
            },
            events: {
                'onReady': function(event) {
                    event.target.playVideo();
                }
            }
        });
        document.getElementById('podcastIframe').style.position = 'absolute';
        document.getElementById('podcastIframe').style.top = '0';
        document.getElementById('podcastIframe').style.left = '0';
    } else {
        podcastPlayer.loadVideoById(videoId);
    }
}

document.getElementById('closePodcastModal').addEventListener('click', () => {
    document.getElementById('podcastVideoModal').classList.remove('open');
    if (podcastPlayer && typeof podcastPlayer.stopVideo === 'function') {
        podcastPlayer.stopVideo();
    }
});

document.getElementById('podcastVideoModal').addEventListener('click', (e) => {
    if (e.target.id === 'podcastVideoModal') {
        document.getElementById('podcastVideoModal').classList.remove('open');
        if (podcastPlayer && typeof podcastPlayer.stopVideo === 'function') {
             podcastPlayer.stopVideo();
        }
    }
});

let searchTimeout;
document.getElementById('podcastSearch').addEventListener('input', (e) => {
    const term = e.target.value.trim();
    clearTimeout(searchTimeout);
    
    if (!term) {
        searchTimeout = setTimeout(() => searchYouTubePodcasts('بودكاست ديني'), 1000);
        return;
    }

    searchTimeout = setTimeout(() => {
        searchYouTubePodcasts(term + ' بودكاست ديني');
    }, 1000);
});

document.addEventListener('DOMContentLoaded', () => {
    searchYouTubePodcasts('بودكاست ديني');
});