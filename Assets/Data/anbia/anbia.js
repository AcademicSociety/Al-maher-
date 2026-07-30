

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
        .anbia-card.playing {
            border-color: var(--accent-emerald);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
            animation: pulse-glow 2s infinite;
        }
        .anbia-card.playing::before {
            background: var(--accent-emerald);
            opacity: 1;
        }
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
            50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.5); }
            100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
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
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .btn-anbia-play:hover {
            background: var(--accent-gold);
            color: #000;
        }
        .btn-anbia-play.active {
            background: var(--accent-emerald);
            color: #fff;
            border-color: var(--accent-emerald);
        }
        .btn-anbia-share {
            background: #27272a;
            color: #fff;
            border: 1px solid #3f3f46;
            padding: 10px 15px;
            border-radius: 10px;
            cursor: pointer;
            transition: 0.3s;
        }
        .btn-anbia-share:hover {
            background: #3f3f46;
        }
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
        anbiaGrid.innerHTML = ''; // تفريغ الشبكة الأول

        if (stories.length === 0) {
            anbiaGrid.innerHTML = '<p style="color: #aaa; text-align: center; width: 100%; grid-column: 1/-1;">مفيش نتايج مطابقة لبحثك 😔</p>';
            return;
        }

        stories.forEach((story, index) => {
            const card = document.createElement('div');
            card.className = 'anbia-card';
            card.id = `anbia-card-${story.id}`;
            
            card.innerHTML = `
                <div class="anbia-icon-bg">✨</div>
                <div class="anbia-title-wrapper">
                    <h3 class="anbia-title">سيدنا ${story.title}</h3>
                    <p class="anbia-subtitle">عليه السلام</p>
                </div>
                <div class="anbia-actions">
                    <button class="btn-anbia-play play-anbia-btn" data-url="${story.audio}" data-title="${story.title}" data-id="${story.id}">
                        <span class="icon">▶</span> <span class="text">استماع</span>
                    </button>
                    <button class="btn-anbia-share copy-anbia-link" data-url="${story.audio}" title="نسخ رابط القصة">
                        🔗
                    </button>
                </div>
            `;
            anbiaGrid.appendChild(card);
        });

        attachAnbiaEvents(); 
    }

    function attachAnbiaEvents() {
        const audioPlayer = document.getElementById('audioPlayer');

        document.querySelectorAll('.copy-anbia-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const link = e.currentTarget.dataset.url;
                navigator.clipboard.writeText(link);
                const originalText = e.currentTarget.innerHTML;
                e.currentTarget.innerHTML = '✔';
                setTimeout(() => e.currentTarget.innerHTML = originalText, 1500);
            });
        });

        document.querySelectorAll('.play-anbia-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const currentBtn = e.currentTarget;
                const url = currentBtn.dataset.url;
                const title = currentBtn.dataset.title;
                const id = currentBtn.dataset.id;

                if (audioPlayer.src === url && !audioPlayer.paused) {
                    audioPlayer.pause();
                    resetAllAnbiaCards();
                } else {
                    resetAllAnbiaCards();
                    
                    audioPlayer.src = url;
                    audioPlayer.play();
                    
                    const activeCard = document.getElementById(`anbia-card-${id}`);
                    if (activeCard) activeCard.classList.add('playing');
                    
                    currentBtn.classList.add('active');
                    currentBtn.querySelector('.icon').textContent = '⏸';
                    currentBtn.querySelector('.text').textContent = 'إيقاف';
                    
                    const displaySurahName = document.getElementById('displaySurahName');
                    const displayReciterName = document.getElementById('displayReciterName');
                    const displayMoshafName = document.getElementById('displayMoshafName');
                    
                    if(displaySurahName) displaySurahName.textContent = `قصة ${title}`;
                    if(displayReciterName) displayReciterName.textContent = 'قصص الأنبياء';
                    if(displayMoshafName) displayMoshafName.textContent = 'تسجيل صوتي';
                }
            });
        });
    }

    function resetAllAnbiaCards() {
        document.querySelectorAll('.anbia-card').forEach(card => card.classList.remove('playing'));
        document.querySelectorAll('.play-anbia-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.querySelector('.icon').textContent = '▶';
            btn.querySelector('.text').textContent = 'استماع';
        });
    }

    const audioPlayer = document.getElementById('audioPlayer');
    if(audioPlayer) {
        audioPlayer.addEventListener('pause', () => {

            document.querySelectorAll('.play-anbia-btn.active').forEach(btn => {
                btn.classList.remove('active');
                btn.querySelector('.icon').textContent = '▶';
                btn.querySelector('.text').textContent = 'استماع';
            });
            document.querySelectorAll('.anbia-card.playing').forEach(card => card.classList.remove('playing'));
        });
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