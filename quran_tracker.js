/**
 * quran_tracker.js - نظام تتبع التلاوة المباشر بالكلمة والآية (Karaoke / Lyrics Style)
 * متوافق مع API Quran.com v4
 */

(function () {
  // خريطة معرفات القراء في API Quran.com
  const RECITER_MAP = [
    { keywords: ['منشاوي', 'minshawi'], murattal: 8, mujawwad: 9 },
    { keywords: ['عبد الباسط', 'عبدالباسط', 'abdul basit', 'abdulbaset'], murattal: 2, mujawwad: 1 },
    { keywords: ['حصري', 'husary', 'hussary'], murattal: 6, mujawwad: 12 },
    { keywords: ['عفاسي', 'alafasy', 'afasy', 'مشاري'], murattal: 7, mujawwad: 7 },
    { keywords: ['سديس', 'sudais'], murattal: 3, mujawwad: 3 },
    { keywords: ['شريم', 'shuraym', 'shuraim'], murattal: 10, mujawwad: 10 },
    { keywords: ['معيقلي', 'maher', 'muaiqly'], murattal: 12, mujawwad: 12 },
    { keywords: ['شاطري', 'shatri'], murattal: 4, mujawwad: 4 },
    { keywords: ['بنا', 'banna'], murattal: 5, mujawwad: 5 },
    { keywords: ['أيوب', 'ayyoub'], murattal: 11, mujawwad: 11 },
    { keywords: ['أخضر', 'akhdar'], murattal: 1, mujawwad: 1 }
  ];

  let wordTimeline = [];
  let currentActiveWordEl = null;
  let currentActiveAyahEl = null;
  let isTrackerOpen = false;
  let isLoading = false;

  // تحويل الأرقام إلى أرقام عربية
  function toArabicDigits(num) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/\d/g, d => arabicDigits[d]);
  }

  // تحديد معرف القارئ المناسب لـ Quran.com
  function getQuranComReciterId(reciterName, isMujawwad = false) {
    if (!reciterName) return 8; // المنشاوي مرتل كافتراضي
    const nameLower = reciterName.toLowerCase();

    for (const item of RECITER_MAP) {
      if (item.keywords.some(kw => nameLower.includes(kw))) {
        return (isMujawwad || nameLower.includes('مجود')) ? item.mujawwad : item.murattal;
      }
    }
    return 8; // Fallback
  }

  // إنشاء واجهة الـ Modal تلقائياً لو مش موجودة في الـ HTML
  function injectTrackerModal() {
    if (document.getElementById('trackerModal')) return;

    const modalHtml = `
      <div id="trackerModal" class="tracker-modal">
        <div class="tracker-modal-content">
          <div class="tracker-header">
            <div class="tracker-titles">
              <h2 id="trackerTitle">تتبع التلاوة المباركة</h2>
              <p id="trackerSubTitle">جاري تحميل البيانات...</p>
            </div>
            <button id="closeTrackerModal" class="tracker-close-btn">&times;</button>
          </div>
          <div id="trackerStatus" class="tracker-status-bar" style="display:none;"></div>
          <div id="trackerContent" class="tracker-body"></div>
        </div>
      </div>
    `;

    const styles = `
      <style>
        .tracker-modal {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10, 14, 23, 0.85);
          backdrop-filter: blur(12px);
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        .tracker-modal.open {
          opacity: 1;
          visibility: visible;
        }
        .tracker-modal-content {
          background: #131c2e;
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          width: 90%;
          max-width: 850px;
          height: 82vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          overflow: hidden;
          font-family: 'Tajawal', 'Amiri', sans-serif;
        }
        .tracker-header {
          padding: 18px 24px;
          background: #0a0e17;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tracker-titles h2 {
          color: #10b981;
          margin: 0;
          font-size: 1.4rem;
        }
        .tracker-titles p {
          color: #94a3b8;
          margin: 4px 0 0 0;
          font-size: 0.9rem;
        }
        .tracker-close-btn {
          background: rgba(255,255,255,0.05);
          border: none;
          color: #fff;
          font-size: 28px;
          width: 40px; height: 40px;
          border-radius: 50%;
          cursor: pointer;
          transition: 0.2s;
        }
        .tracker-close-btn:hover {
          background: #ef4444;
          color: #fff;
        }
        .tracker-status-bar {
          padding: 8px 16px;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          font-size: 0.85rem;
          text-align: center;
        }
        .tracker-body {
          flex: 1;
          padding: 30px 25px;
          overflow-y: auto;
          line-height: 2.8;
          text-align: justify;
          direction: rtl;
          font-family: 'Amiri', serif;
          font-size: 1.6rem;
          color: #e2e8f0;
        }
        .tracker-ayah-block {
          display: inline;
          padding: 4px 6px;
          margin: 0 2px;
          border-radius: 10px;
          transition: background-color 0.3s ease;
        }
        .tracker-ayah-block.active-ayah {
          background: rgba(16, 185, 129, 0.08);
        }
        .tracker-word {
          display: inline-block;
          padding: 0 4px;
          margin: 2px 1px;
          border-radius: 6px;
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .tracker-word.active-word {
          color: #10b981;
          background: rgba(16, 185, 129, 0.22);
          font-weight: bold;
          transform: scale(1.08);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
          border-bottom: 2px solid #10b981;
        }
        .ayah-number-badge {
          color: #f59e0b;
          font-size: 1.2rem;
          font-weight: bold;
          margin: 0 6px;
          user-select: none;
        }
        .tracker-loading-spinner {
          text-align: center;
          padding: 50px 0;
          color: #94a3b8;
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // جلب نص الآيات والكلمات والتوقيتات الزمنية
  async function loadTrackerData(surahId, reciterName, isMujawwad = false) {
    const trackerContent = document.getElementById('trackerContent');
    const trackerSubTitle = document.getElementById('trackerSubTitle');
    const trackerStatus = document.getElementById('trackerStatus');

    if (isLoading) return;
    isLoading = true;

    trackerContent.innerHTML = `
      <div class="tracker-loading-spinner">
        <p>⚡ جاري مزامنة الكلمات والتوقيتات الزمنية للتلاوة...</p>
      </div>
    `;

    const recitationId = getQuranComReciterId(reciterName, isMujawwad);

    try {
      // 1. جلب كلمات وآيات السورة من Quran.com
      const versesReq = fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=ar&words=true&word_fields=text_uthmani&per_page=300`);
      // 2. جلب ملف التوقيتات الزمنية للكلمات والآيات
      const timingReq = fetch(`https://api.quran.com/api/v4/recitations/${recitationId}/by_chapter/${surahId}`);

      const [versesRes, timingRes] = await Promise.all([versesReq, timingReq]);
      const versesData = await versesRes.json();
      const timingData = await timingRes.json();

      const verses = versesData.verses || [];
      const audioFiles = timingData.audio_files || [];

      wordTimeline = [];
      trackerContent.innerHTML = '';

      if (verses.length === 0) {
        trackerContent.innerHTML = '<p style="text-align:center;">تعذر تحميل نص السورة حالياً.</p>';
        isLoading = false;
        return;
      }

      // خريطة التوقيتات الزمانية للآيات والكلمات
      const timingMap = {};
      audioFiles.forEach(af => {
        timingMap[af.verse_key] = af;
      });

      // بناء واجهة السورة وتجهيز الـ Timeline
      verses.forEach((verse, vIdx) => {
        const verseKey = verse.verse_key;
        const verseTiming = timingMap[verseKey];
        const verseBlock = document.createElement('span');
        verseBlock.className = 'tracker-ayah-block';
        verseBlock.id = `ayah-block-${verseKey}`;

        const words = verse.words || [];
        const segments = (verseTiming && verseTiming.segments) ? verseTiming.segments : [];

        words.forEach((w) => {
          if (w.char_type_name === 'end') return; // استبعاد رمز نهاية الآية من الكلمات

          const wordSpan = document.createElement('span');
          wordSpan.className = 'tracker-word';
          const wordKey = `${verseKey}:${w.position}`;
          wordSpan.id = `word-${wordKey}`;
          wordSpan.textContent = w.text_uthmani || w.text;

          // إضافة حدث الضغط لتقديم الصوت لهذه الكلمة
          wordSpan.addEventListener('click', () => {
            const item = wordTimeline.find(t => t.wordKey === wordKey);
            const audioPlayer = document.getElementById('audioPlayer');
            if (item && audioPlayer) {
              audioPlayer.currentTime = item.startMs / 1000;
              audioPlayer.play();
            }
          });

          verseBlock.appendChild(wordSpan);

          // إيجاد التوقيت الزمني الدقيق للكلمة
          let startMs = 0;
          let endMs = 0;

          const seg = segments.find(s => s[0] === w.position);
          if (seg) {
            startMs = seg[1];
            endMs = seg[2];
          } else if (verseTiming) {
            // توزيع تقريبي لو مفيش تقسيم للكلمة
            startMs = verseTiming.timestamp_from;
            endMs = verseTiming.timestamp_to;
          }

          wordTimeline.push({
            wordKey,
            verseKey,
            wordPosition: w.position,
            startMs,
            endMs,
            element: wordSpan,
            verseElement: verseBlock
          });
        });

        // إضافة رقم الآية
        const numSpan = document.createElement('span');
        numSpan.className = 'ayah-number-badge';
        numSpan.textContent = ` ﴿${toArabicDigits(verse.verse_number)}﴾ `;
        verseBlock.appendChild(numSpan);

        trackerContent.appendChild(verseBlock);
      });

      if (trackerSubTitle) {
        trackerSubTitle.textContent = `القارئ الحالي: ${reciterName || 'غير محدد'} | مزامنة دقيقة بالكلمة`;
      }

      if (trackerStatus) {
        trackerStatus.style.display = 'block';
        trackerStatus.textContent = `تم تحميل ${wordTimeline.length} كلمة بنجاح مع التوقيتات الزمانية.`;
        setTimeout(() => { trackerStatus.style.display = 'none'; }, 4000);
      }

    } catch (err) {
      console.error('خطأ في تحميل بيانات المزامنة:', err);
      trackerContent.innerHTML = '<p style="text-align:center; color:#ef4444;">حدث خطأ أثناء تحميل بيانات التتبع والمزامنة.</p>';
    } finally {
      isLoading = false;
    }
  }

  // تحديث التظليل بناءً على الوقت الحالي للصوت (timeupdate)
  function syncPlayback(currentTimeSec) {
    if (!isTrackerOpen || wordTimeline.length === 0) return;

    const currMs = currentTimeSec * 1000;

    // البحث عن الكلمة الحالية
    const currentItem = wordTimeline.find(item => currMs >= item.startMs && currMs <= item.endMs);

    if (currentItem) {
      // إزالة التظليل عن الكلمة والآية السابقة
      if (currentActiveWordEl && currentActiveWordEl !== currentItem.element) {
        currentActiveWordEl.classList.remove('active-word');
      }
      if (currentActiveAyahEl && currentActiveAyahEl !== currentItem.verseElement) {
        currentActiveAyahEl.classList.remove('active-ayah');
      }

      // إضافة التظليل للكلمة والآية الحالية
      currentItem.element.classList.add('active-word');
      currentItem.verseElement.classList.add('active-ayah');

      currentActiveWordEl = currentItem.element;
      currentActiveAyahEl = currentItem.verseElement;

      // التمرير السلس لنص الكلمة ليصبح في المنتصف
      currentItem.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }

  // الحصول على معلومات التشغيل الحالية
  function getCurrentPlaybackInfo() {
    const surahSelect = document.getElementById('surahSelect');
    const reciterSelect = document.getElementById('reciterSelect');

    let surahId = 1;
    let reciterName = '';
    let isMujawwad = false;

    if (surahSelect && surahSelect.value) {
      surahId = surahSelect.value;
    } else if (window.currentSurahId) {
      surahId = window.currentSurahId;
    }

    if (reciterSelect) {
      const selectedOption = reciterSelect.options[reciterSelect.selectedIndex];
      if (selectedOption) {
        reciterName = selectedOption.textContent || selectedOption.innerText;
      }
    } else if (window.currentReciterName) {
      reciterName = window.currentReciterName;
    }

    if (reciterName.includes('مجود')) {
      isMujawwad = true;
    }

    return { surahId, reciterName, isMujawwad };
  }

  // تهيئة التطبيق عند الجاهزية
  document.addEventListener('DOMContentLoaded', () => {
    injectTrackerModal();

    const openTrackerBtn = document.getElementById('openTrackerBtn');
    const trackerModal = document.getElementById('trackerModal');
    const closeTrackerModal = document.getElementById('closeTrackerModal');
    const audioPlayer = document.getElementById('audioPlayer') || document.querySelector('audio');

    // فتح النافذة
    if (openTrackerBtn) {
      openTrackerBtn.addEventListener('click', () => {
        const info = getCurrentPlaybackInfo();
        const trackerTitle = document.getElementById('trackerTitle');
        if (trackerTitle) {
          const surahSelect = document.getElementById('surahSelect');
          const surahName = surahSelect ? surahSelect.options[surahSelect.selectedIndex]?.text : `سورة رقم ${info.surahId}`;
          trackerTitle.textContent = `تتبع التلاوة - ${surahName}`;
        }

        trackerModal.classList.add('open');
        isTrackerOpen = true;

        loadTrackerData(info.surahId, info.reciterName, info.isMujawwad);
      });
    }

    // إغلاق النافذة
    if (closeTrackerModal) {
      closeTrackerModal.addEventListener('click', () => {
        trackerModal.classList.remove('open');
        isTrackerOpen = false;
      });
    }

    // إغلاق عند الضغط خارج النافذة
    window.addEventListener('click', (e) => {
      if (e.target === trackerModal) {
        trackerModal.classList.remove('open');
        isTrackerOpen = false;
      }
    });

    // الاستماع لتقدم الصوت للمزامنة المباشرة
    if (audioPlayer) {
      audioPlayer.addEventListener('timeupdate', () => {
        syncPlayback(audioPlayer.currentTime);
      });
    }
  });

})();