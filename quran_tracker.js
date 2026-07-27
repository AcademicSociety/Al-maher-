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
      line-height: 2.4;
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
    .tracker-word.active-word {
      background-color: #fbbf24 !important;
      color: #0f172a !important;
      font-weight: bold;
      transform: scale(1.18);
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
    const surahName = surahNames[surahNum - 1] || 'سورة ' + surahNum;
    const reciterName = currentReciter ? currentReciter.name : 'القارئ الحالي';

    trackerTitle.textContent = `📖 سورة ${surahName}`;
    trackerSubTitle.textContent = `بصوت: ${reciterName} | مزامنة دقيقة (كلمة بكلمة)`;
    
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
    trackerContent.innerHTML = '<p style="text-align: center; color: var(--accent-gold);">جاري مزامنة الآيات بدقة...</p>';
    wordTimeline = [];
    
    try {

      const textRes = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNum}`);
      const textData = await textRes.json();
      

      const reciterId = currentMoshaf.server; 
      const timeRes = await fetch(`https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${surahNum}?segments=true`);
      const timeData = await timeRes.json();

      if (textData.verses && timeData.audio_file.verse_timings) {
        currentTrackerAyahs = textData.verses;
        renderTrackerAyahs(surahNum, timeData.audio_file.verse_timings);
      } else {
        throw new Error("بيانات ناقصة");
      }
    } catch (error) {
      trackerContent.innerHTML = '<p style="text-align: center; color: #ef4444;">عذراً، التزامن الدقيق غير متوفر لهذا القارئ أو السورة.</p>';
      console.error(error);
    }
  }

  function renderTrackerAyahs(surahNum, verseTimings) {
    let html = '';
    
    if (surahNum !== 9 && surahNum !== 1) {
      html += '<div style="text-align: center; color: var(--accent-gold); margin-bottom: 20px; font-size: 1.8rem; width: 100%;">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div><div style="display: inline;">';
    } else {
      html += '<div style="display: inline;">';
    }

    currentTrackerAyahs.forEach((ayah, aIdx) => {
      let text = ayah.text_uthmani;
      if (surahNum !== 1 && ayah.verse_number === 1) {
        text = text.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', '').trim();
      }

      const words = text.split(/\s+/).filter(w => w.length > 0);
      let ayahWordsHtml = '';
      
 
      const timingObj = verseTimings.find(t => t.verse_key === ayah.verse_key);
      const segments = timingObj && timingObj.segments ? timingObj.segments : [];

      words.forEach((wordText, wIdx) => {

        let startTime = 0;
        let endTime = 0;
        
        if (segments[wIdx]) {
            startTime = segments[wIdx][1] / 1000; // تحويل من مللي ثانية إلى ثانية
            endTime = segments[wIdx][2] / 1000;
        }

        wordTimeline.push({
          aIdx,
          wIdx,
          key: `${aIdx}-${wIdx}`,
          startTime: startTime,
          endTime: endTime
        });

        ayahWordsHtml += `<span class="tracker-word" id="word-span-${aIdx}-${wIdx}">${wordText}</span> `;
      });

      html += `<span class="tracker-ayah" id="ayah-span-${aIdx}">${ayahWordsHtml}<span style="color: var(--accent-gold); font-size: 1.1rem; font-family: 'Tajawal', sans-serif;">﴿${ayah.verse_number}﴾</span></span> `;
    });

    html += '</div>';
    trackerContent.innerHTML = html;


    wordTimeline.forEach(item => {
      const el = document.getElementById(`word-span-${item.key}`);
      if (el && item.startTime > 0) {
        el.addEventListener('click', () => {
          if (audioPlayer) {
            audioPlayer.currentTime = item.startTime;
          }
        });
      }
    });

    activeAyahIndex = -1;
    activeWordKey = null;
  }

  if (typeof audioPlayer !== 'undefined') {
    audioPlayer.addEventListener('timeupdate', () => {
      if (!trackerModal.classList.contains('open') || wordTimeline.length === 0) return;

      const currentTime = audioPlayer.currentTime;


      let currentItem = wordTimeline.find(w => currentTime >= w.startTime && currentTime < w.endTime);

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