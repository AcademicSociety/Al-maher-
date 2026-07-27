// (quran_tracker.js)

document.addEventListener('DOMContentLoaded', () => {
  const openTrackerBtn = document.getElementById('openTrackerBtn');
  const trackerModal = document.getElementById('trackerModal');
  const closeTrackerModal = document.getElementById('closeTrackerModal');
  const trackerContent = document.getElementById('trackerContent');
  const trackerTitle = document.getElementById('trackerTitle');
  const trackerSubTitle = document.getElementById('trackerSubTitle');
  
  let currentTrackerAyahs = [];
  let wordTimeline = [];
  let activeAyahIndex = -1;
  let activeWordKey = null;

  const style = document.createElement('style');
  style.innerHTML = `
    .tracker-ayah {
      display: inline;
      padding: 4px 6px;
      margin: 2px;
      border-radius: 8px;
      transition: background-color 0.3s ease, border-color 0.3s ease;
      line-height: 2.5;
      border: 1px solid transparent;
    }
    .tracker-ayah.active-ayah {
      background-color: rgba(16, 185, 129, 0.18);
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
    }
    .tracker-word {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 4px;
      transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s ease, color 0.15s ease;
      cursor: pointer;
    }
    .tracker-word:hover {
      background-color: rgba(251, 191, 36, 0.2);
    }
    .tracker-word.active-word {
      background-color: #fbbf24 !important;
      color: #0f172a !important;
      font-weight: bold;
      transform: scale(1.15);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
      position: relative;
      z-index: 5;
    }
  `;
  document.head.appendChild(style);

  openTrackerBtn.addEventListener('click', () => {
    if (typeof availableSurahs === 'undefined' || !availableSurahs[currentSurahIndex]) {
      alert('الرجاء تشغيل سورة أولاً!');
      return;
    }

    const surahNum = availableSurahs[currentSurahIndex];
    const surahName = (typeof surahNames !== 'undefined' && surahNames[surahNum - 1]) ? surahNames[surahNum - 1] : 'سورة ' + surahNum;
    const reciterName = (typeof currentReciter !== 'undefined' && currentReciter) ? currentReciter.name : 'القارئ الحالي';

    trackerTitle.textContent = `📖 سورة ${surahName}`;
    trackerSubTitle.textContent = `بصوت: ${reciterName} | التظليل والمزامنة الذكية`;
    
    trackerModal.classList.add('open');
    fetchAndDisplayTrackerSurah(surahNum);
  });

  closeTrackerModal.addEventListener('click', () => {
    trackerModal.classList.remove('open');
  });

  window.addEventListener('click', (e) => {
    if (e.target === trackerModal) {
      trackerModal.classList.remove('open');
    }
  });

  async function fetchAndDisplayTrackerSurah(surahNum) {
    trackerContent.innerHTML = '<p style="text-align: center; color: var(--accent-gold); font-size: 1.2rem;">جاري تحميل نص السورة والمزامنة...</p>';
    wordTimeline = [];
    activeAyahIndex = -1;
    activeWordKey = null;

    try {
      const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNum}`);
      if (!res.ok) throw new Error('فشل جلب نص السورة');
      const data = await res.json();

      if (data && data.verses && data.verses.length > 0) {
        currentTrackerAyahs = data.verses;
        renderTrackerAyahs(surahNum);
      } else {
        throw new Error('لا توجد آيات');
      }
    } catch (error) {
      console.error(error);
      fetchFallbackQuranText(surahNum);
    }
  }

  async function fetchFallbackQuranText(surahNum) {
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
      const data = await res.json();
      if (data && data.data && data.data.ayahs) {
        currentTrackerAyahs = data.data.ayahs.map(a => ({
          verse_key: `${surahNum}:${a.numberInSurah}`,
          verse_number: a.numberInSurah,
          text_uthmani: a.text
        }));
        renderTrackerAyahs(surahNum);
      } else {
        trackerContent.innerHTML = '<p style="text-align: center; color: #ef4444;">تعذر تحميل نص السورة، يرجى التأكد من الاتصال بالإنترنت.</p>';
      }
    } catch (e) {
      trackerContent.innerHTML = '<p style="text-align: center; color: #ef4444;">حدث خطأ أثناء تحميل السورة.</p>';
    }
  }

  function renderTrackerAyahs(surahNum) {
    let html = '';
    
    if (surahNum !== 9 && surahNum !== 1) {
      html += '<div style="text-align: center; color: var(--accent-gold); margin-bottom: 20px; font-size: 1.8rem; font-family: \'Amiri\', serif; width: 100%;">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div><div style="display: inline;">';
    } else {
      html += '<div style="display: inline;">';
    }

    let totalChars = 0;
    const ayahDataList = [];

    currentTrackerAyahs.forEach((ayah, aIdx) => {
      let text = ayah.text_uthmani || '';
      if (surahNum !== 1 && ayah.verse_number === 1) {
        text = text.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '').trim();
      }

      const words = text.split(/\s+/).filter(w => w.length > 0);
      const ayahCharCount = words.reduce((sum, w) => sum + w.length, 0);
      totalChars += ayahCharCount;

      ayahDataList.push({
        aIdx,
        verse_number: ayah.verse_number,
        words,
        ayahCharCount
      });
    });

    const hasBasmalaAudio = (surahNum !== 9 && surahNum !== 1);
    const basmalaWeight = hasBasmalaAudio ? 25 : 0; 
    const grandTotalWeight = totalChars + basmalaWeight;

    let currentWeight = hasBasmalaAudio ? basmalaWeight : 0;

    ayahDataList.forEach((item) => {
      let ayahWordsHtml = '';

      item.words.forEach((wordText, wIdx) => {
        const wordWeight = wordText.length;
        const startRatio = currentWeight / grandTotalWeight;
        currentWeight += wordWeight;
        const endRatio = currentWeight / grandTotalWeight;

        wordTimeline.push({
          aIdx: item.aIdx,
          wIdx,
          key: `${item.aIdx}-${wIdx}`,
          startRatio,
          endRatio
        });

        ayahWordsHtml += `<span class="tracker-word" id="word-span-${item.aIdx}-${wIdx}">${wordText}</span> `;
      });

      html += `<span class="tracker-ayah" id="ayah-span-${item.aIdx}">${ayahWordsHtml}<span style="color: var(--accent-gold); font-size: 1.1rem; font-family: 'Tajawal', sans-serif; font-weight: bold;"> ﴿${item.verse_number}﴾ </span></span> `;
    });

    html += '</div>';
    trackerContent.innerHTML = html;

    wordTimeline.forEach(item => {
      const el = document.getElementById(`word-span-${item.key}`);
      if (el) {
        el.addEventListener('click', () => {
          if (audioPlayer && audioPlayer.duration) {
            audioPlayer.currentTime = item.startRatio * audioPlayer.duration;
            audioPlayer.play();
          }
        });
      }
    });
  }

  // تحديث التظليل أثناء تشغيل الصوت
  if (typeof audioPlayer !== 'undefined') {
    audioPlayer.addEventListener('timeupdate', () => {
      if (!trackerModal.classList.contains('open') || wordTimeline.length === 0 || !audioPlayer.duration) return;

      const progressRatio = audioPlayer.currentTime / audioPlayer.duration;
      if (isNaN(progressRatio)) return;

      let currentItem = wordTimeline.find(w => progressRatio >= w.startRatio && progressRatio < w.endRatio);
      
      if (!currentItem && progressRatio >= 0.99) {
        currentItem = wordTimeline[wordTimeline.length - 1];
      }

      if (currentItem) {
        if (currentItem.aIdx !== activeAyahIndex) {
          if (activeAyahIndex !== -1) {
            const prevAyah = document.getElementById(`ayah-span-${activeAyahIndex}`);
            if (prevAyah) prevAyah.classList.remove('active-ayah');
          }
          activeAyahIndex = currentItem.aIdx;
          const curAyah = document.getElementById(`ayah-span-${activeAyahIndex}`);
          if (curAyah) {
            curAyah.classList.add('active-ayah');
            curAyah.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }

        if (currentItem.key !== activeWordKey) {
          if (activeWordKey) {
            const prevWord = document.getElementById(`word-span-${activeWordKey}`);
            if (prevWord) prevWord.classList.remove('active-word');
          }
          activeWordKey = currentItem.key;
          const curWord = document.getElementById(`word-span-${activeWordKey}`);
          if (curWord) {
            curWord.classList.add('active-word');
          }
        }
      }
    });
  }
});