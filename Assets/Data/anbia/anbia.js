document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.innerHTML = `
        .anbia-premium-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .anbia-card {
            background: linear-gradient(145deg, #1e293b, #0f172a);
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 200px;
            cursor: pointer;
        }
        .anbia-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 4px;
            background: linear-gradient(90deg, var(--accent-gold), var(--accent-emerald));
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .anbia-card:hover {
            transform: translateY(-8px) scale(1.02);
            border-color: var(--accent-gold);
            box-shadow: 0 10px 25px rgba(212, 175, 55, 0.15);
        }
        .anbia-card:hover::before {
            opacity: 1;
        }
        .anbia-icon-bg {
            position: absolute;
            font-size: 6rem;
            opacity: 0.04;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 0;
            pointer-events: none;
        }
        .anbia-title-wrapper {
            position: relative;
            z-index: 1;
            margin-bottom: 20px;
        }
        .anbia-title {
            color: var(--accent-gold);
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 5px;
            font-family: 'Amiri', serif;
        }
        .anbia-subtitle {
            color: #94a3b8;
            font-size: 0.85rem;
        }
        .anbia-actions {
            position: relative;
            z-index: 1;
            display: flex;
            gap: 10px;
            margin-top: auto;
        }
        .btn-anbia-play {
            flex: 1;
            background: rgba(212, 175, 55, 0.1);
            color: var(--accent-gold);
            border: 1px solid var(--accent-gold);
            padding: 10px;
            border-radius: 10px;
            font-size: 0.95rem;
            font-weight: bold;
            pointer-events: none; /* عشان الضغطة تروح للكارت كله */
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .btn-anbia-share {
            background: #27272a;
            color: #fff;
            border: 1px solid #3f3f46;
            padding: 10px 15px;
            border-radius: 10px;
            cursor: pointer;
            transition: 0.3s;
            z-index: 5;
        }
        .btn-anbia-share:hover { background: #3f3f46; }
        
        #anbiaModalPlayBtn:hover { transform: scale(1.1); }
        #anbiaModalPlayBtn:active { transform: scale(0.95); }
    `;
    document.head.appendChild(style);

    const anbiaGrid = document.getElementById('anbiaGrid');
    const searchInput = document.getElementById('anbiaSearch');
    let allStories = []; 

    fetch('Assets/Data/anbia/anbia.json')
        .then(response => response.json())
        .then(data => {
            allStories = data;
            renderAnbiaCards(allStories);
        })
        .catch(error => {
            console.error('حصل مشكلة في تحميل قصص الأنبياء:', error);
            anbiaGrid.innerHTML = '<p style="color: #ef4444; text-align: center; width: 100%;">❌ تعذر تحميل قصص الأنبياء. تأكد من اتصالك بالإنترنت.</p>';
        });

    function renderAnbiaCards(stories) {
        anbiaGrid.innerHTML = ''; 
        if (stories.length === 0) {
            anbiaGrid.innerHTML = '<p style="color: #aaa; text-align: center; width: 100%; grid-column: 1/-1;">مفيش نتايج مطابقة لبحثك 😔</p>';
            return;
        }

        stories.forEach(story => {
            const card = document.createElement('div');
            card.className = 'anbia-card';
            card.innerHTML = `
                <div class="anbia-icon-bg">✨</div>
                <div class="anbia-title-wrapper">
                    <h3 class="anbia-title">سيدنا ${story.title}</h3>
                    <p class="anbia-subtitle">عليه السلام</p>
                </div>
                <div class="anbia-actions">
                    <button class="btn-anbia-play">
                        <span class="icon">🎙️</span> <span class="text">فتح القصة</span>
                    </button>
                    <button class="btn-anbia-share copy-anbia-link" data-url="${story.audio}" title="نسخ رابط القصة">🔗</button>
                </div>
            `;

            card.addEventListener('click', () => {
                openAnbiaPlayer(story.title, story.audio);
            });

            card.querySelector('.copy-anbia-link').addEventListener('click', (e) => {
                e.stopPropagation();
                const link = e.currentTarget.dataset.url;
                navigator.clipboard.writeText(link);
                const originalText = e.currentTarget.innerHTML;
                e.currentTarget.innerHTML = '✔';
                setTimeout(() => e.currentTarget.innerHTML = originalText, 1500);
            });

            anbiaGrid.appendChild(card);
        });
    }

    const modal = document.getElementById('anbiaAudioModal');
    const closeModalBtn = document.getElementById('closeAnbiaModal');
    const modalTitle = document.getElementById('anbiaModalTitle');
    const modalAudio = document.getElementById('anbiaModalAudio');
    const modalPlayBtn = document.getElementById('anbiaModalPlayBtn');
    const seekbar = document.getElementById('anbiaSeekbar');
    const currentTimeEl = document.getElementById('anbiaCurrentTime');
    const durationTimeEl = document.getElementById('anbiaDurationTime');
    const speedControl = document.getElementById('anbiaSpeedControl');
    const downloadBtn = document.getElementById('anbiaModalDownloadBtn');
    const globalAudioPlayer = document.getElementById('audioPlayer'); // المشغل الرئيسي بتاع السور

    function openAnbiaPlayer(title, audioUrl) {
        if(globalAudioPlayer && !globalAudioPlayer.paused) {
            globalAudioPlayer.pause();
        }

        modalTitle.textContent = `قصة سيدنا ${title}`;
        modalAudio.src = audioUrl;
        downloadBtn.href = audioUrl;
        downloadBtn.download = `قصة_سيدنا_${title}.mp3`;
        
        seekbar.value = 0;
        speedControl.value = "1";
        modalAudio.playbackRate = 1;
        currentTimeEl.textContent = "00:00";
        durationTimeEl.textContent = "00:00";

        modal.classList.add('open');
        modalAudio.play();
        modalPlayBtn.innerHTML = '⏸';
    }

    modalPlayBtn.addEventListener('click', () => {
        if (modalAudio.paused) {
            modalAudio.play();
            modalPlayBtn.innerHTML = '⏸';
        } else {
            modalAudio.pause();
            modalPlayBtn.innerHTML = '▶';
        }
    });

    modalAudio.addEventListener('timeupdate', () => {
        if (modalAudio.duration) {
            const progress = (modalAudio.currentTime / modalAudio.duration) * 100;
            seekbar.value = progress;
            currentTimeEl.textContent = formatTime(modalAudio.currentTime);
            durationTimeEl.textContent = formatTime(modalAudio.duration);
        }
    });

    seekbar.addEventListener('input', (e) => {
        if (modalAudio.duration) {
            const seekTo = modalAudio.duration * (e.target.value / 100);
            modalAudio.currentTime = seekTo;
        }
    });

    speedControl.addEventListener('change', (e) => {
        modalAudio.playbackRate = parseFloat(e.target.value);
    });

    function closePlayer() {
        modal.classList.remove('open');
        modalAudio.pause();
        modalAudio.src = ""; // تفريغ الصوت
    }

    closeModalBtn.addEventListener('click', closePlayer);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePlayer();
        }
    });

    function formatTime(sec) {
        if (isNaN(sec)) return "00:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        if (!term) {
            renderAnbiaCards(allStories); 
            return;
        }
        const filtered = allStories.filter(story => 
            story.title.toLowerCase().includes(term)
        );
        renderAnbiaCards(filtered);
    });
});
