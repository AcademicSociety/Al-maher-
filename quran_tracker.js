/**
 * quran_tracker.js - نظام تتبع التلاوة المباشر بالكلمة والآية (مصحح بالكامل)
 */

(function () {
  // ربط قراء mp3quran بمعرفات التلاوة في quran.com لجلب التوقيتات بدقة
  const RECITER_MAP = [
    { keywords: ['منشاوي', 'minsh'], id: 9 }, 
    { keywords: ['عبدالباسط', 'عبد الباسط', 'basit'], id: 2 }, 
    { keywords: ['حصري', 'husr'], id: 6 }, 
    { keywords: ['عفاسي', 'afs'], id: 7 }, 
    { keywords: ['سديس', 'sds'], id: 3 }, 
    { keywords: ['شريم', 'shur'], id: 10 }, 
    { keywords: ['معيقلي', 'maher'], id: 12 }, 
    { keywords: ['رفاعي', 'rifai'], id: 5 }, 
    { keywords: ['شاطري', 'shatri'], id: 4 }, 
    { keywords: ['بنا', 'bna'], id: 12 }, 
  ];

  let wordTimeline = [];
  let currentActiveWordEl = null;
  let currentActiveAyahEl = null;
  let isTrackerOpen = false;

  function toArabicDigits(num) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/\d/g, d => arabicDigits[d]);
  }

  function getQuranComReciterId(reciterName, serverUrl) {
    const searchString = (reciterName + ' ' + serverUrl).toLowerCase();
    for (const item of RECITER_MAP) {
      if (item.keywords.some(kw => searchString.includes(kw))) {
        return item.id;
      }
    }
    return 7; // العفاسي كافتراضي لأقرب توقيت وسرعة متوسطة
  }

  function injectTrackerUI() {
    if (document.getElementById('trackerModal')) return;

    const modalHtml = `
      <div id="trackerModal" class="t-modal">
        <div class="t-modal-content">
          <div class="t-header">
            <div>
              <h2 id="tTitle">المصحف المتزامن</h2>
              <p id="tSubTitle">جاري تحميل السورة...</p>
            </div>
            <button id="tCloseBtn" class="t-close">&times;</button>
          </div>
          <div id="tBody" class="t-body"></div>
        </div>
      </div>
    `;

    const styles = `
      <style>
        .t-modal {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10, 14, 23, 0.95); backdrop-filter: blur(8px);
          z-index: 100000; display: flex; justify-content: center; align-items: center;
          opacity: 0; visibility: hidden; transition: 0.3s ease;
          direction: rtl; font-family: 'Tajawal', sans-serif;
        }
        .t-modal.open { opacity: 1; visibility: visible; }
        .t-modal-content {
          background: #0f172a; border: 1px solid #d4af37; border-radius: 24px;
          width: 95%; max-width: 900px; height: 85vh; display: flex; flex-direction: column;
          box-shadow: 0 25px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(212, 175, 55, 0.05);
        }
        .t-header {
          padding: 20px 30px; border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          display: flex; justify-content: space-between; align-items: center;
        }
        .t-header h2 { color: #d4af37; font-size: 1.6rem; margin: 0; font-weight: bold; }
        .t-header p { color: #94a3b8; font-size: 0.9rem; margin: 5px 0 0 0; }
        .t-close {
          background: rgba(255,255,255,0.05); border: none; color: #f8fafc;
          font-size: 24px; width: 45px; height: 45px; border-radius: 50%;
          cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .t-close:hover { background: #ef4444; color: #fff; }
        .t-body {
          flex: 1; padding: 40px; overflow-y: auto; text-align: justify;
          line-height: 2.8; font-family: 'Amiri', serif; font-size: 2rem; color: #e2e8f0;
          scroll-behavior: smooth;
        }
        
        /* تحسين ألوان الـ Highlight للآية والكلمة بشكل واضح جداً */
        .t-ayah {
          display: inline; padding: 4px 6px; border-radius: 10px; transition: background-color 0.3s ease;
        }
        .t-ayah.active-ayah {
          background: rgba(212, 175, 55, 0.18) !important;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
        }
        .t-word {
          display: inline-block; padding: 2px 6px; margin: 2px 1px;
          border-radius: 8px; transition: all 0.15s ease-in-out; cursor: pointer; color: #cbd5e1;
        }
        .t-word:hover {
          color: #d4af37; background: rgba(251, 191, 36, 0.1);
        }
        .t-word.active-word {
          color: #0f172a !important;
          background: #d4af37 !important;
          font-weight: bold;
          transform: scale(1.08);
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.9);
        }
        .t-ayah-num {
          color: #10b981; font-size: 1.4rem; font-weight: bold; margin: 0 8px; font-family: 'Tajawal', sans-serif; display: inline-block;
        }
        .t-loader { text-align: center; color: #d4af37; font-family: 'Tajawal'; font-size: 1.2rem; margin-top: 50px; }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async function loadTrackerData(surahId, reciterId) {
    const tBody = document.getElementById('tBody');
    const tSubTitle = document.getElementById('tSubTitle');
    if (!tBody) return;
    
    tBody.innerHTML = '<div class="t-loader">⏳ جاري مزامنة الآيات والكلمات...</div>';
    wordTimeline = [];
    currentActiveWordEl = null;
    currentActiveAyahEl = null;

    try {
      // 1. جلب الآيات والكلمات من API القرآن
      let allVerses = [];
      let page = 1;
      let totalPages = 1;

      do {
        const versesReq = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=ar&words=true&word_fields=text_uthmani&page=${page}&per_page=50`);
        const versesData = await versesReq.json();
        if (versesData.verses) {
          allVerses = allVerses.concat(versesData.verses);
        }
        totalPages = versesData.pagination ? versesData.pagination.total_pages : 1;
        page++;
      } while (page <= totalPages);

      if (!allVerses.length) {
        tBody.innerHTML = '<div class="t-loader" style="color:#ef4444;">تعذر جلب نص السورة. يرجى المحاولة مرة أخرى.</div>';
        return;
      }

      // 2. جلب التوقيتات من القارئ، وإذا لم تتوفر يجلب القارئ البديل (العفاسي - 7) ضماناً للمزامنة
      let audioFiles = [];
      try {
        let timingReq = await fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/${surahId}`);
        let timingData = await timingReq.json();
        audioFiles = timingData.audio_files || [];
        
        if (!audioFiles.length && reciterId !== 7) {
          timingReq = await fetch(`https://api.quran.com/api/v4/recitations/7/by_chapter/${surahId}`);
          timingData = await timingReq.json();
          audioFiles = timingData.audio_files || [];
        }
      } catch (e) {
        console.warn("توقيتات القارئ غير متوفرة، جاري تجربة القارئ البديل.");
      }

      tBody.innerHTML = '';
      const timingMap = {};
      audioFiles.forEach(af => { timingMap[af.verse_key] = af; });

      // إضافة البسملة (إلا في الفاتحة والتوبة)
      if (parseInt(surahId) !== 1 && parseInt(surahId) !== 9) {
        tBody.innerHTML += '<div style="text-align: center; color: #d4af37; margin-bottom: 30px; font-size: 2.2rem;">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>';
      }

      // 3. رسم السورة وحساب التوقيتات الدقيقة لكل كلمة وآية
      allVerses.forEach(verse => {
        const vKey = verse.verse_key;
        const vTiming = timingMap[vKey];
        const segments = vTiming?.segments || [];
        
        const ayahSpan = document.createElement('span');
        ayahSpan.className = 't-ayah';

        const wordsOnly = verse.words.filter(w => w.char_type_name !== 'end');
        const vStart = vTiming?.timestamp_from || 0;
        const vEnd = vTiming?.timestamp_to || 0;
        const vDuration = vEnd - vStart;

        wordsOnly.forEach((w, idx) => {
          const wordSpan = document.createElement('span');
          wordSpan.className = 't-word';
          wordSpan.textContent = w.text_uthmani;

          let wordStart = 0;
          let wordEnd = 0;

          // البحث عن الكلمة في مصفوفة segments
          const seg = segments.find(s => s[0] === w.position);

          if (seg) {
            wordStart = seg[1];
            wordEnd = seg[2];

            // تصحيح التوقيت النسبي وتعميمه ليصبح توقيتاً مطلقاً بمستوى السورة
            if (vStart > 0 && wordStart < vStart) {
              wordStart += vStart;
              wordEnd += vStart;
            }
          } else if (vDuration > 0) {
            // توزيع وقت الآية بالتساوي على كلماتها في حال عدم توفر التوقيت بالكلمة
            const part = vDuration / wordsOnly.length;
            wordStart = vStart + (idx * part);
            wordEnd = wordStart + part;
          } else {
            wordStart = vStart;
            wordEnd = vEnd;
          }

          wordTimeline.push({
            start: wordStart,
            end: wordEnd,
            element: wordSpan,
            ayahElement: ayahSpan
          });

          // الضغط على أي كلمة للقفز بالصوت إليها
          wordSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            const player = document.getElementById('audioPlayer');
            if (player && wordStart > 0) {
              player.currentTime = wordStart / 1000;
              player.play();
            }
          });

          ayahSpan.appendChild(wordSpan);
        });

        const numSpan = document.createElement('span');
        numSpan.className = 't-ayah-num';
        numSpan.textContent = `﴿${toArabicDigits(verse.verse_number)}﴾`;
        ayahSpan.appendChild(numSpan);

        tBody.appendChild(ayahSpan);
      });

      if (tSubTitle) tSubTitle.textContent = 'مزامنة دقيقة بالكلمة جاهزة.';

    } catch (err) {
      console.error("Tracker Load Error:", err);
      if (tBody) tBody.innerHTML = '<div class="t-loader" style="color:#ef4444;">حدث خطأ أثناء تحميل السورة.</div>';
    }
  }

  // 4. دالة المزامنة وتطوير Highlight الكلمة والآية
  function syncAudio(currentTimeSec) {
    if (!isTrackerOpen || !wordTimeline.length) return;
    const currMs = currentTimeSec * 1000;
    
    // إيجاد الكلمة المنطوقة حالياً
    let activeItem = wordTimeline.find(item => currMs >= item.start && currMs <= item.end);

    // الحفاظ على التظليل في فترات السكتات والوقف بين الكلمات
    if (!activeItem && currMs > 0) {
      for (let i = wordTimeline.length - 1; i >= 0; i--) {
        if (currMs >= wordTimeline[i].start) {
          activeItem = wordTimeline[i];
          break;
        }
      }
    }

    if (activeItem) {
      if (currentActiveWordEl !== activeItem.element) {
        if (currentActiveWordEl) {
          currentActiveWordEl.classList.remove('active-word');
        }
        if (currentActiveAyahEl && currentActiveAyahEl !== activeItem.ayahElement) {
          currentActiveAyahEl.classList.remove('active-ayah');
        }

        activeItem.element.classList.add('active-word');
        activeItem.ayahElement.classList.add('active-ayah');
        
        currentActiveWordEl = activeItem.element;
        currentActiveAyahEl = activeItem.ayahElement;

        // التمرير التلقائي السلس إلى منتصف النافذة
        const modalBody = document.getElementById('tBody');
        if (modalBody && activeItem.element) {
          const bodyRect = modalBody.getBoundingClientRect();
          const elemRect = activeItem.element.getBoundingClientRect();
          const offset = (elemRect.top - bodyRect.top) + modalBody.scrollTop - (modalBody.clientHeight / 2);
          modalBody.scrollTo({ top: offset, behavior: 'smooth' });
        }
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectTrackerUI();
    const openBtn = document.getElementById('openTrackerBtn');
    const modal = document.getElementById('trackerModal');
    const closeBtn = document.getElementById('tCloseBtn');
    const player = document.getElementById('audioPlayer');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        const surahSelect = document.getElementById('surahSelect');
        const reciterSelect = document.getElementById('reciterSelect');
        
        currentActiveWordEl = null;
        currentActiveAyahEl = null;
        wordTimeline = [];

        const selectedIndex = parseInt(surahSelect.value);
        const actualSurahId = window.availableSurahs ? window.availableSurahs[selectedIndex] : (selectedIndex + 1 || 1);
        
        const surahName = surahSelect.options[surahSelect.selectedIndex]?.text || '';
        const reciterName = reciterSelect ? reciterSelect.options[reciterSelect.selectedIndex]?.text || '' : '';
        const serverUrl = player ? player.src || '' : '';

        const titleEl = document.getElementById('tTitle');
        if (titleEl) titleEl.textContent = surahName;
        
        if (modal) modal.classList.add('open');
        isTrackerOpen = true;

        const quranComReciterId = getQuranComReciterId(reciterName, serverUrl);
        loadTrackerData(actualSurahId, quranComReciterId);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modal) modal.classList.remove('open');
        isTrackerOpen = false;
        currentActiveWordEl = null;
        currentActiveAyahEl = null;
      });
    }

    if (player) {
      player.addEventListener('timeupdate', () => syncAudio(player.currentTime));
    }
  });
})();