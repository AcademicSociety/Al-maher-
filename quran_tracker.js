/**
 * quran_tracker.js - نظام تتبع التلاوة المباشر بالكلمة والآية
 * واجهة فخمة تليق بالقرآن الكريم ومزامنة دقيقة.
 */

(function () {
  // ربط قراء mp3quran بمعرفات التلاوة في quran.com لجلب التوقيتات
  const RECITER_MAP = [
    { keywords: ['منشاوي', 'minsh'], id: 8 }, // المنشاوي
    { keywords: ['عبدالباسط', 'عبد الباسط', 'basit'], id: 2 }, // عبد الباسط
    { keywords: ['حصري', 'husr'], id: 6 }, // الحصري
    { keywords: ['عفاسي', 'afs'], id: 7 }, // العفاسي
    { keywords: ['سديس', 'sds'], id: 3 }, // السديس
    { keywords: ['شريم', 'shur'], id: 10 }, // الشريم
    { keywords: ['معيقلي', 'maher'], id: 12 }, // المعيقلي
    { keywords: ['رفاعي', 'rifai'], id: 5 }, // هاني الرفاعي (أقرب توقيت)
    { keywords: ['أخضر', 'akdr'], id: 1 } // إبراهيم الأخضر
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
    return 8; // المنشاوي كافتراضي لو القارئ مش مدعوم في quran.com
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
          opacity: 0; visibility: hidden; transition: 0.3s;
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
        .t-close:hover { background: #ef4444; }
        .t-body {
          flex: 1; padding: 40px; overflow-y: auto; text-align: justify;
          line-height: 2.6; font-family: 'Amiri', serif; font-size: 2rem; color: #e2e8f0;
        }
        .t-ayah {
          display: inline; padding: 5px; border-radius: 12px; transition: 0.3s;
        }
        .t-ayah.active-ayah { background: rgba(212, 175, 55, 0.05); }
        .t-word {
          display: inline-block; padding: 0 4px; margin: 2px 1px;
          border-radius: 8px; transition: 0.2s; cursor: pointer; color: #cbd5e1;
        }
        .t-word.active-word {
          color: #d4af37; background: rgba(212, 175, 55, 0.15);
          transform: scale(1.05); text-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
        }
        .t-ayah-num {
          color: #10b981; font-size: 1.4rem; font-weight: bold; margin: 0 8px; font-family: 'Tajawal', sans-serif;
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
    tBody.innerHTML = '<div class="t-loader">⏳ جاري مزامنة الآيات والكلمات...</div>';

    try {
      // جلب الآيات والكلمات
      const versesReq = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=ar&words=true&word_fields=text_uthmani&per_page=300`);
      const versesData = await versesReq.json();
      
      // جلب التوقيتات
      const timingReq = await fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/${surahId}`);
      const timingData = await timingReq.json();

      const verses = versesData.verses || [];
      const audioFiles = timingData.audio_files || [];
      wordTimeline = [];
      tBody.innerHTML = '';

      if (!verses.length) {
        tBody.innerHTML = '<div class="t-loader" style="color:#ef4444;">تعذر جلب السورة.</div>';
        return;
      }

      // تجهيز خريطة التوقيتات
      const timingMap = {};
      audioFiles.forEach(af => { timingMap[af.verse_key] = af; });

      // إضافة البسملة لو مكنتش الفاتحة ولا التوبة
      if (surahId !== 1 && surahId !== 9) {
        tBody.innerHTML += '<div style="text-align: center; color: #d4af37; margin-bottom: 30px; font-size: 2.2rem;">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>';
      }

      // رسم السورة
      verses.forEach(verse => {
        const vKey = verse.verse_key;
        const vTiming = timingMap[vKey];
        const segments = vTiming?.segments || [];
        
        const ayahSpan = document.createElement('span');
        ayahSpan.className = 't-ayah';

        verse.words.forEach(w => {
          if (w.char_type_name === 'end') return;

          const wordSpan = document.createElement('span');
          wordSpan.className = 't-word';
          wordSpan.textContent = w.text_uthmani;

          // البحث عن توقيت الكلمة
          let start = 0, end = 0;
          const seg = segments.find(s => s[0] === w.position);
          if (seg) {
            start = seg[1];
            end = seg[2];
          } else if (vTiming) {
            start = vTiming.timestamp_from;
            end = vTiming.timestamp_to;
          }

          wordTimeline.push({
            start, end, element: wordSpan, ayahElement: ayahSpan
          });

          // تشغيل الصوت من الكلمة عند الضغط عليها
          wordSpan.addEventListener('click', () => {
            const player = document.getElementById('audioPlayer');
            if (player && start) {
              player.currentTime = start / 1000;
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

      tSubTitle.textContent = 'مزامنة دقيقة بالكلمة جاهزة.';

    } catch (err) {
      console.error(err);
      tBody.innerHTML = '<div class="t-loader" style="color:#ef4444;">حدث خطأ في المزامنة. قد لا يدعم النظام هذا القارئ بشكل دقيق بالكلمة.</div>';
    }
  }

  function syncAudio(currentTimeSec) {
    if (!isTrackerOpen || !wordTimeline.length) return;
    const currMs = currentTimeSec * 1000;
    
    // إيجاد الكلمة المنطوقة حالياً
    const activeItem = wordTimeline.find(item => currMs >= item.start && currMs <= item.end);

    if (activeItem) {
      if (currentActiveWordEl && currentActiveWordEl !== activeItem.element) {
        currentActiveWordEl.classList.remove('active-word');
      }
      if (currentActiveAyahEl && currentActiveAyahEl !== activeItem.ayahElement) {
        currentActiveAyahEl.classList.remove('active-ayah');
      }

      activeItem.element.classList.add('active-word');
      activeItem.ayahElement.classList.add('active-ayah');
      
      currentActiveWordEl = activeItem.element;
      currentActiveAyahEl = activeItem.ayahElement;

      // تمرير الشاشة تلقائياً للكلمة
      activeItem.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // لو مفيش كلمة حالية (سكوت بين الآيات)، شيل الهايلايت من الكلمة بس سيبه ع الآية
      if (currentActiveWordEl) currentActiveWordEl.classList.remove('active-word');
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
        // قراءة الداتا من الواجهة الحالية
        const surahSelect = document.getElementById('surahSelect');
        const reciterSelect = document.getElementById('reciterSelect');
        const moshafSelect = document.getElementById('moshafSelect');
        
        const surahId = parseInt(surahSelect.value) + 1; // الـ option value بيبدأ من 0
        const surahName = surahSelect.options[surahSelect.selectedIndex]?.text || '';
        const reciterName = reciterSelect.options[reciterSelect.selectedIndex]?.text || '';
        const serverUrl = document.getElementById('audioPlayer').src || '';

        document.getElementById('tTitle').textContent = surahName;
        
        modal.classList.add('open');
        isTrackerOpen = true;

        const quranComReciterId = getQuranComReciterId(reciterName, serverUrl);
        loadTrackerData(surahId, quranComReciterId);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        isTrackerOpen = false;
      });
    }

    if (player) {
      player.addEventListener('timeupdate', () => syncAudio(player.currentTime));
    }
  });
})();