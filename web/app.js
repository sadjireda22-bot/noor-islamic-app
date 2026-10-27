(() => {
'use strict';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const API = 'https://api.alquran.cloud/v1';

const surahNames = [
'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس',
'هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه',
'الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم',
'لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر',
'فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق',
'الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة',
'الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج',
'نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس',
'التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد',
'الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات',
'القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر',
'المسد','الإخلاص','الفلق','الناس'
];

let currentSurah = 1;
let currentAyahs = [];
let playIndex = 0;
let playingSurah = false;
let audio = null;
let toastTimer;

function toast(message) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    el.hidden = true;
  }, 2800);
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function showView(name) {
  const target = $('#view-' + name);
  if (!target) {
    toast('هذه الصفحة غير موجودة في الواجهة.');
    return;
  }
  $$('.view').forEach(section => {
    section.classList.toggle('active', section === target);
  });
  $$('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === name);
    if (button.dataset.view === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'quran' && !currentAyahs.length) loadSurah(currentSurah);
}

$$('[data-view]').forEach(button => {
  button.addEventListener('click', () => showView(button.dataset.view));
});
$$('[data-go]').forEach(button => {
  button.addEventListener('click', () => showView(button.dataset.go));
});

function applyTheme(theme) {
  if (!['green', 'brown', 'dark'].includes(theme)) theme = 'green';
  document.documentElement.dataset.theme = theme;
  safeSet('noor-theme', theme);
  $$('[data-theme-choice]').forEach(button => {
    button.classList.toggle('selected', button.dataset.themeChoice === theme);
  });
}

applyTheme(safeGet('noor-theme') || document.documentElement.dataset.theme || 'green');

$('#theme-header')?.addEventListener('click', () => {
  const themes = ['green', 'brown', 'dark'];
  const current = document.documentElement.dataset.theme || 'green';
  applyTheme(themes[(themes.indexOf(current) + 1) % themes.length]);
  toast('تم تغيير المظهر');
});

$('#sound-header')?.addEventListener('click', () => {
  const button = $('#sound-header');
  const muted = button.dataset.muted !== 'true';
  button.dataset.muted = String(muted);
  button.textContent = muted ? '🔇' : '🔊';
  toast(muted ? 'تم كتم مؤشر الصوت' : 'تم تفعيل مؤشر الصوت');
});

$$('[data-theme-choice]').forEach(button => {
  button.addEventListener('click', () => applyTheme(button.dataset.themeChoice));
});

const surahSelect = $('#surah-select');
const surahSearch = $('#surah-search');
const verseList = $('#verse-list');
const audioPlayer = $('#quran-audio');
audio = audioPlayer;

function fillSurahOptions(filter = '') {
  if (!surahSelect) return;
  const query = filter.trim().toLowerCase();
  const oldValue = surahSelect.value || String(currentSurah);
  const options = surahNames
    .map((name, index) => ({ name, number: index + 1 }))
    .filter(item => !query ||
      item.name.toLowerCase().includes(query) ||
      String(item.number).includes(query));

  surahSelect.innerHTML = '';
  options.forEach(item => {
    const option = document.createElement('option');
    option.value = item.number;
    option.textContent = `${item.number}. سورة ${item.name}`;
    surahSelect.appendChild(option);
  });

  if (options.some(item => String(item.number) === oldValue)) {
    surahSelect.value = oldValue;
  } else if (options.length) {
    surahSelect.value = String(options[0].number);
  }
}

fillSurahOptions();

surahSearch?.addEventListener('input', () => {
  fillSurahOptions(surahSearch.value);
});

surahSelect?.addEventListener('change', () => {
  loadSurah(Number(surahSelect.value));
});

function setAudioStatus(message) {
  const status = $('#audio-status');
  if (status) status.textContent = message;
}

function setSurahTitle(name, count = '') {
  const title = $('#surah-title');
  const meta = $('#surah-meta');
  if (title) title.textContent = 'سورة ' + name;
  if (meta) meta.textContent = count ? `${count} آية` : 'جارٍ تحميل الآيات...';
}

async function loadSurah(number) {
  if (!Number.isInteger(number) || number < 1 || number > 114) return;
  currentSurah = number;
  playingSurah = false;
  if (audio) audio.pause();

  if (surahSelect) {
    const exists = [...surahSelect.options].some(o => Number(o.value) === number);
    if (!exists) fillSurahOptions();
    if ([...surahSelect.options].some(o => Number(o.value) === number)) {
      surahSelect.value = String(number);
    }
  }

  const name = surahNames[number - 1];
  setSurahTitle(name);
  if (verseList) verseList.innerHTML = '<div class="empty">جارٍ تحميل الآيات...</div>';

  try {
    const cached = safeGet('noor-surah-' + number);
    let data = cached ? JSON.parse(cached) : null;

    if (!data) {
      const response = await fetch(`${API}/surah/${number}/quran-uthmani`);
      if (!response.ok) throw new Error('تعذر الاتصال بخدمة القرآن');
      const result = await response.json();
      if (result.code !== 200 || !result.data?.ayahs) throw new Error('تعذر قراءة بيانات السورة');
      data = result.data;
      safeSet('noor-surah-' + number, JSON.stringify(data));
    }

    if (number !== currentSurah) return;
    currentAyahs = data.ayahs || [];
    setSurahTitle(data.name || name, currentAyahs.length);
    renderAyahs();
  } catch (error) {
    if (verseList) {
      verseList.innerHTML = '<div class="empty">تعذر تحميل الآيات. تحقق من الإنترنت وحاول مجددًا.</div>';
    }
    setAudioStatus('لم يتم تحميل السورة.');
    toast(error.message || 'حدث خطأ أثناء تحميل السورة');
  }
}

function renderAyahs() {
  if (!verseList) return;
  if (!currentAyahs.length) {
    verseList.innerHTML = '<div class="empty">لا توجد آيات لعرضها.</div>';
    return;
  }

  verseList.innerHTML = currentAyahs.map((ayah, index) => `
    <article class="verse">
      <div class="verse-num">${ayah.numberInSurah || index + 1}</div>
      <div class="verse-content">
        <div class="verse-text">${escapeHTML(ayah.text || '')}</div>
        <div class="verse-actions">
          <button class="btn small soft" data-play-ayah="${index}">▶ استمع للآية</button>
          <button class="btn small soft" data-copy-ayah="${index}">نسخ الآية</button>
        </div>
      </div>
    </article>
  `).join('');
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[char]);
}

function selectedEdition() {
  const value = $('#reciter-select')?.value || 'ar.alafasy';
  const allowed = [
    'ar.alafasy', 'ar.abdulbasitmurattal', 'ar.husary',
    'ar.minshawi', 'ar.mahermuaiqly',
    'ar.abdurrahmaansudais', 'ar.saoodshuraym'
  ];
  return allowed.includes(value) ? value : 'ar.alafasy';
}

async function playAyah(index, continueSurah = false) {
  if (!audio || !currentAyahs[index]) return;
  const ayah = currentAyahs[index];
  playingSurah = continueSurah;
  playIndex = index;
  setAudioStatus(`جارٍ تشغيل الآية ${ayah.numberInSurah || index + 1}...`);

  try {
    const response = await fetch(`${API}/ayah/${ayah.number}/${selectedEdition()}`);
    if (!response.ok) throw new Error();
    const result = await response.json();
    const url = result.data?.audio;
    if (!url) throw new Error();
    audio.src = url;
    await audio.play();
    setAudioStatus(`الآية ${ayah.numberInSurah || index + 1} — ${surahNames[currentSurah - 1]}`);
  } catch {
    playingSurah = false;
    setAudioStatus('تعذر تشغيل التلاوة. تحقق من الإنترنت أو جرّب قارئًا آخر.');
    toast('تعذر تشغيل الصوت');
  }
}

verseList?.addEventListener('click', async event => {
  const playButton = event.target.closest('[data-play-ayah]');
  const copyButton = event.target.closest('[data-copy-ayah]');

  if (playButton) {
    playAyah(Number(playButton.dataset.playAyah));
  }
  if (copyButton) {
    const ayah = currentAyahs[Number(copyButton.dataset.copyAyah)];
    if (!ayah) return;
    try {
      await navigator.clipboard.writeText(ayah.text);
      toast('تم نسخ الآية');
    } catch {
      toast('تعذر النسخ من هذا المتصفح');
    }
  }
});

$('#play-surah')?.addEventListener('click', () => {
  if (!currentAyahs.length) {
    loadSurah(currentSurah);
    return;
  }
  playAyah(0, true);
});

audio?.addEventListener('ended', () => {
  if (playingSurah && playIndex + 1 < currentAyahs.length) {
    playAyah(playIndex + 1, true);
  } else {
    playingSurah = false;
    setAudioStatus('انتهت التلاوة.');
  }
});

$$('[data-view="quran"]').forEach(button => {
  button.addEventListener('click', () => {
    if (!currentAyahs.length) loadSurah(currentSurah);
  });
});

async function loadPrayerTimes() {
  const date = new Date();
  const dateString = [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear()
  ].join('-');

  const url = `https://api.aladhan.com/v1/timingsByCity/${dateString}?city=Oran&country=Algeria&method=3`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error();
    const result = await response.json();
    const data = result.data;
    const timings = data.timings;
    const names = [
      ['الفجر', 'Fajr'], ['الشروق', 'Sunrise'], ['الظهر', 'Dhuhr'],
      ['العصر', 'Asr'], ['المغرب', 'Maghrib'], ['العشاء', 'Isha']
    ];

    const prayerGrid = $('#prayer-grid') || $('#prayerGrid');
    const homeGrid = $('#home-prayers');
    const html = names.map(([name, key]) => `
      <div class="prayer-item">
        <strong>${name}</strong><span>${escapeHTML(timings[key] || '--:--')}</span>
      </div>
    `).join('');

    if (prayerGrid) prayerGrid.innerHTML = html;
    if (homeGrid) {
      homeGrid.innerHTML = names.filter((_, index) => index !== 1).map(([name, key]) => `
        <div class="prayer-item"><strong>${name}</strong><span>${escapeHTML(timings[key] || '--:--')}</span></div>
      `).join('');
    }

    const location = $('#home-location');
    if (location) location.textContent = 'وهران، الجزائر';

    const note = $('#home-prayer-note');
    if (note) note.textContent = 'المواقيت تقديرية وفق طريقة الحساب المختارة؛ تحقق من التوقيت المحلي المعتمد.';

    const dateElement = $('#prayer-date') || $('#prayerDate');
    if (dateElement && data.date?.hijri) {
      dateElement.textContent = `${data.date.hijri.day} ${data.date.hijri.month.ar}`;
    }
  } catch {
    const note = $('#home-prayer-note');
    if (note) note.textContent = 'تعذر تحميل المواقيت. تحقق من اتصال الإنترنت.';
    const grid = $('#prayer-grid') || $('#prayerGrid');
    if (grid) grid.innerHTML = '<div class="empty">تعذر تحميل المواقيت حاليًا.</div>';
  }
}

const todayHijri = $('#todayHijri');
if (todayHijri) {
  try {
    todayHijri.textContent = new Intl.DateTimeFormat('ar-DZ-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date());
  } catch {
    todayHijri.textContent = 'التقويم الهجري';
  }
}

function initDhikrCounters() {
  $$('.counter').forEach(counter => {
    if (counter.tagName !== 'BUTTON') return;
    counter.addEventListener('click', () => {
      const target = Number(counter.dataset.target || counter.dataset.count || 33);
      const current = Number(counter.dataset.current || 0) + 1;
      const next = Math.min(current, target);
      counter.dataset.current = String(next);
      counter.textContent = String(next);
      if (next >= target) {
        counter.classList.add('done');
        toast('أحسنت، اكتمل العدد');
      }
      safeSet('noor-counter-' + (counter.id || counter.textContent), String(next));
    });
  });
}

initDhikrCounters();
loadPrayerTimes();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

})();
