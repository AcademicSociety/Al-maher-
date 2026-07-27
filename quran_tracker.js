// (quran_tracker.js)

document.addEventListener('DOMContentLoaded', () => {
  const openTrackerBtn = document.getElementById('openTrackerBtn');
  const trackerModal = document.getElementById('trackerModal');
  const closeTrackerModal = document.getElementById('closeTrackerModal');
  const trackerContent = document.getElementById('trackerContent');
  const trackerTitle = document.getElementById('trackerTitle');
  const trackerSubTitle = document.getElementById('trackerSubTitle');
  
  let currentTrackerAyahs = [];
  let activeAyahIndex = -1;

  openTrackerBtn.addEventListener('click', () => {

    if (typeof availableSurahs === 'undefined' || !availableSurahs[currentSurahIndex]) {
      alert('الرجاء تشغيل سورة أولاً!');
      return;
    }

    const surahNum = availableSurahs[currentSurahIndex];
    const surahName = surahNames[surahNum - 1] || 'سورة ' + surahNum;
    const reciterName = currentReciter ? currentReciter.name : 'القارئ الحالي';

    trackerTitle.textContent = `📖 سورة ${surahName}`;
    trackerSubTitle.textContent = `بصوت: ${reciterName} | المزامنة التفاعلية تعمل`;
    
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

  function fetchAndDisplayTrackerSurah(surahNum) {
    trackerContent.innerHTML = '<p style="text-align: center; color: var(--accent-gold);">جاري تحميل آيات السورة...</p>';
    
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 200) {
          currentTrackerAyahs = data.data.ayahs;
          renderTrackerAyahs(surahNum);
        } else {
          trackerContent.innerHTML = '<p style="text-align: center; color: #ef4444;">فشل في تحميل نص السورة.</p>';
        }
      })
      .catch(() => {
        trackerContent.innerHTML = '<p style="text-align: center; color: #ef4444;">تأكد من اتصالك بالإنترنت.</p>';
      });
  }

  function renderTrackerAyahs(surahNum) {
    let html = '';
    
    if (surahNum !== 9 && surahNum !== 1) {
      html += '<div style="text-align: center; color: var(--accent-gold); margin-bottom: 20px; font-size: 1.8rem; width: 100%;">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div><div style="display: inline;">';
    } else {
      html += '<div style="display: inline;">';
    }

    currentTrackerAyahs.forEach((ayah, index) => {
      let text = ayah.text;
      if (surahNum !== 1 && ayah.numberInSurah === 1) {
        text = text.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', '').trim();
      }

      html += `<span class="tracker-ayah" id="ayah-span-${index}" style="padding: 3px 6px; border-radius: 8px; transition: all 0.3s ease; cursor: pointer;" title="اضغط للانتقال التقريري للآية">${text} <span style="color: var(--accent-gold); font-size: 1.1rem; font-family: 'Tajawal', sans-serif;">﴿${ayah.numberInSurah}﴾</span></span> `;
    });

    html += '</div>';
    trackerContent.innerHTML = html;

    document.querySelectorAll('.tracker-ayah').forEach((el, idx) => {
      el.addEventListener('click', () => {
        if (audioPlayer && audioPlayer.duration) {
          const jumpTime = (idx / currentTrackerAyahs.length) * audioPlayer.duration;
          audioPlayer.currentTime = jumpTime;
        }
      });
    });
  }

  if (typeof audioPlayer !== 'undefined') {
    audioPlayer.addEventListener('timeupdate', () => {
      if (!trackerModal.classList.contains('open') || currentTrackerAyahs.length === 0 || !audioPlayer.duration) return;

      const progressRatio = audioPlayer.currentTime / audioPlayer.duration;
      const estimatedIndex = Math.min(
        Math.floor(progressRatio * currentTrackerAyahs.length),
        currentTrackerAyahs.length - 1
      );

      if (estimatedIndex !== activeAyahIndex) {
        if (activeAyahIndex !== -1) {
          const prevEl = document.getElementById(`ayah-span-${activeAyahIndex}`);
          if (prevEl) {
            prevEl.style.background = 'transparent';
            prevEl.style.color = 'var(--text-main)';
            prevEl.style.boxShadow = 'none';
          }
        }

        activeAyahIndex = estimatedIndex;
        const currentEl = document.getElementById(`ayah-span-${activeAyahIndex}`);
        if (currentEl) {
          currentEl.style.background = 'rgba(16, 185, 129, 0.2)'; // لون أخضر شفاف وأنيق
          currentEl.style.color = '#fff';
          currentEl.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.3)';
          
          currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }
});