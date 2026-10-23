const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const API='https://api.alquran.cloud/v1';
const names=['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];
let allSurahs=[], currentView='home', toastTimer, quranSearchIndex=null, quranSearchPromise=null;
function toast(s){let t=$('#toast');t.textContent=s;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,3000)}
function arNum(n){return new Intl.NumberFormat('ar-DZ').format(n)}
function hijriToday(){try{return new Intl.DateTimeFormat('ar-DZ-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).format(new Date())}catch{return 'التقويم الهجري'}}$('#todayHijri').textContent=hijriToday();
$('#themeBtn').onclick=()=>document.body.classList.toggle('light');
function showView(v){currentView=v;$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));let c=$('#contentView');c.hidden=['home'].includes(v);if(v==='home'){c.hidden=true;window.scrollTo({top:0,behavior:'smooth'});return}c.innerHTML='';if(v==='quran')renderQuranList();if(v==='azkar')renderAzkar();if(v==='calendar')renderCalendar();if(v==='about')renderAbout();c.scrollIntoView({behavior:'smooth',block:'start'})}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
async function getSurahs(){try{let cached=localStorage.getItem('noor_surahs');if(cached)allSurahs=JSON.parse(cached);else{let r=await fetch(API+'/surah');if(!r.ok)throw 0;allSurahs=(await r.json()).data;localStorage.setItem('noor_surahs',JSON.stringify(allSurahs))}}catch{allSurahs=names.map((name,i)=>({number:i+1,name,englishName:'',numberOfAyahs:0,revelationType:''}))}}
function renderQuranList(){
 let c=$('#contentView');
 c.innerHTML=`<button class="backbtn" data-back>← الرئيسية</button>
 <h2>القرآن الكريم</h2>
 <p class="muted">114 سورة • يمكنك البحث عن اسم سورة أو كلمة أو عبارة من آية</p>
 <section class="quran-search-box" aria-label="البحث في القرآن الكريم">
  <label for="quranSearchInput">بحث في آيات القرآن الكريم</label>
  <div class="quran-search-row"><input class="search" id="quranSearchInput" placeholder="مثال: إن مع العسر يسرا" aria-label="اكتب كلمة أو عبارة من آية"><button class="goldbtn" id="quranSearchBtn">بحث</button></div>
  <p class="tiny">يتجاهل البحث التشكيل واختلافات الألف الشائعة، ويتيح فتح السورة عند الآية مباشرة.</p>
  <div id="quranSearchResults" class="quran-search-results" aria-live="polite"></div>
 </section>
 <label for="surahSearch">البحث في أسماء السور</label>
 <input class="search" id="surahSearch" placeholder="اسم السورة أو رقمها..." aria-label="البحث عن سورة">
 <div class="surah-list" id="surahList"><div class="loading">جارٍ تجهيز فهرس السور…</div></div>`;
 c.querySelector('[data-back]').onclick=()=>showView('home');
 c.querySelector('#quranSearchBtn').onclick=searchQuran;
 c.querySelector('#quranSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter')searchQuran()});
 c.querySelector('#surahSearch').addEventListener('input',fillSurahList);
 getSurahs().then(()=>fillSurahList());
}
function normalizeArabic(value){
 return String(value||'').normalize('NFC')
  .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'')
  .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي')
  .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/\s+/g,' ').trim().toLowerCase();
}
function plainArabic(value){
 return String(value||'').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[ٱ۞۩]/g,c=>c==='ٱ'?'ا':'').replace(/\u0640/g,'');
}
function fillSurahList(){
 let list=$('#surahList');if(!list)return;
 let q=normalizeArabic($('#surahSearch')?.value||'');
 let arr=allSurahs.filter(s=>normalizeArabic(s.name).includes(q)||normalizeArabic(s.englishName||'').includes(q)||normalizeArabic(s.number).includes(q));
 list.innerHTML=arr.map(s=>`<button class="surah-row" data-surah="${s.number}"><span class="surah-num">${arNum(s.number)}</span><span><b>${esc(s.name)}</b><small>${arNum(s.numberOfAyahs||0)} آية • ${s.revelationType==='Meccan'?'مكية':s.revelationType==='Medinan'?'مدنية':''}</small></span></button>`).join('')||'<p class="muted">لا توجد نتائج</p>';
 list.querySelectorAll('[data-surah]').forEach(b=>b.onclick=()=>openSurah(+b.dataset.surah));
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function getCachedQuranSurah(n){
 try{
  const raw=localStorage.getItem('noor_quran_search_index');if(!raw)return null;
  const compact=JSON.parse(raw),row=Array.isArray(compact)?compact.find(item=>Number(item[0])===n):null;
  if(!row||!Array.isArray(row[1]))return null;
  return {number:n,name:names[n-1],numberOfAyahs:row[1].length,ayahs:row[1].map(a=>({numberInSurah:a[0],text:a[1]}))};
 }catch{return null}
}
function cachedSurahsForSearch(){
 const out=[];
 for(let n=1;n<=114;n++){
  try{
   const raw=localStorage.getItem('noor_surah_'+n);if(!raw)continue;
   const d=JSON.parse(raw);if(!Array.isArray(d.ayahs))continue;
   out.push({number:n,name:d.name||names[n-1],ayahs:d.ayahs.map(a=>({numberInSurah:a.numberInSurah,text:a.text}))});
  }catch{}
 }
 return out;
}
async function getQuranSearchIndex(){
 if(quranSearchIndex)return {surahs:quranSearchIndex,complete:true};
 try{
  const saved=localStorage.getItem('noor_quran_search_index');
  if(saved){
   const compact=JSON.parse(saved);
   if(Array.isArray(compact)&&compact.length===114&&Array.isArray(compact[0])){
    quranSearchIndex=compact.map(row=>({number:row[0],name:names[row[0]-1]||'',ayahs:row[1].map(a=>({numberInSurah:a[0],text:a[1]}))}));
    return {surahs:quranSearchIndex,complete:true};
   }
  }
 }catch{}
 if(!quranSearchPromise){
  quranSearchPromise=(async()=>{
   const r=await fetch(`${API}/quran/quran-uthmani`);
   if(!r.ok)throw Error('تعذر تحميل فهرس القرآن');
   const payload=await r.json(), source=payload?.data?.surahs;
   if(!Array.isArray(source)||source.length!==114)throw Error('بيانات البحث غير مكتملة');
   const compact=source.map(s=>[s.number,(s.ayahs||[]).map(a=>[a.numberInSurah,a.text])]);
   quranSearchIndex=compact.map(row=>({number:row[0],name:names[row[0]-1]||'',ayahs:row[1].map(a=>({numberInSurah:a[0],text:a[1]}))}));
   try{localStorage.setItem('noor_quran_search_index',JSON.stringify(compact))}catch{}
   return {surahs:quranSearchIndex,complete:true};
  })().finally(()=>{quranSearchPromise=null});
 }
 return quranSearchPromise;
}
async function searchQuran(){
 const input=$('#quranSearchInput'), output=$('#quranSearchResults'), button=$('#quranSearchBtn');
 if(!input||!output||!button)return;
 const raw=input.value.trim(), query=normalizeArabic(raw);
 if(query.length<2){output.innerHTML='<p class="muted">اكتب حرفين على الأقل للبحث.</p>';return}
 const tokens=query.split(/\s+/).filter(Boolean);
 button.disabled=true;button.textContent='جارٍ البحث…';
 output.innerHTML='<div class="loading">جارٍ تجهيز فهرس البحث في القرآن الكريم… قد يستغرق ذلك قليلًا في أول مرة.</div>';
 try{
  let surahs,complete=true;
  try{const result=await getQuranSearchIndex();surahs=result.surahs;complete=result.complete}
  catch{surahs=cachedSurahsForSearch();complete=false;if(!surahs.length)throw Error('لا يوجد فهرس محفوظ. اتصل بالإنترنت لتحميل فهرس البحث الكامل أول مرة.');}
  const matches=[];
  for(const surah of surahs){
   for(const ayah of surah.ayahs){
    const verse=normalizeArabic(ayah.text);
    if(tokens.every(token=>verse.includes(token)))matches.push({surah:surah.number,surahName:names[surah.number-1]||surah.name,ayah:ayah.numberInSurah,text:ayah.text});
   }
  }
  const shown=matches.slice(0,50);
  const intro=complete?`عُثر على ${arNum(matches.length)} نتيجة في القرآن الكريم.`:`البحث دون إنترنت شمل ${arNum(surahs.length)} سورة محفوظة فقط؛ اتصل بالإنترنت للبحث في القرآن كاملًا.`;
  output.innerHTML=`<p class="search-summary">${esc(intro)}${matches.length>50?` عرض أول 50 نتيجة.`:''}</p>`+
   (shown.length?`<div class="search-result-list">${shown.map(m=>`<button class="search-result" data-go-surah="${m.surah}" data-go-ayah="${m.ayah}"><b>${esc(m.surahName)} <span>• سورة ${arNum(m.surah)}، آية ${arNum(m.ayah)}</span></b><span class="search-result-text">${esc(plainArabic(m.text))}</span><small>اضغط للانتقال إلى الآية ←</small></button>`).join('')}</div>`:'<p class="muted">لم نجد آيات مطابقة. جرّب كلمة أخرى أو جزءًا أقصر من العبارة.</p>');
  output.querySelectorAll('[data-go-surah]').forEach(b=>b.onclick=()=>openSurah(+b.dataset.goSurah,+b.dataset.goAyah));
 }catch(e){output.innerHTML=`<p class="muted">${esc(e.message||'تعذر إجراء البحث. تحقق من الاتصال وحاول مجددًا.')}</p>`}
 finally{button.disabled=false;button.textContent='بحث'}
}
function renderAyahs(data,fontMode){
 return data.ayahs.map(a=>`<span class="ayah" id="ayah-${a.numberInSurah}" data-ayah="${a.numberInSurah}">${esc(fontMode==='plain'?plainArabic(a.text):a.text)} <span class="ayah-num">۞ ${arNum(a.numberInSurah)}</span></span>`).join('');
}
async function openSurah(n,focusAyah){
 let c=$('#contentView');c.innerHTML=`<button class="backbtn" id="backSurahs">← فهرس السور</button><h2>${esc(names[n-1])}</h2><div class="loading">جارٍ جلب النص القرآني من مصدر البيانات…</div>`;$('#backSurahs').onclick=renderQuranList;
 try{
  let data=JSON.parse(localStorage.getItem('noor_surah_'+n)||'null');
  if(!data)data=getCachedQuranSurah(n);
  if(!data){let r=await fetch(`${API}/surah/${n}/quran-uthmani`);if(!r.ok)throw Error();data=(await r.json()).data;try{localStorage.setItem('noor_surah_'+n,JSON.stringify(data))}catch{}}
  const fontMode=localStorage.getItem('noor_quran_font')||'quran';
  c.innerHTML=`<button class="backbtn" id="backSurahs">← فهرس السور</button><h2>${esc(data.name)}</h2><p class="muted">${arNum(data.numberOfAyahs)} آية</p><div class="font-switch" role="group" aria-label="نوع الخط"><button class="font-choice ${fontMode==='quran'?'chosen':''}" data-font="quran">الخط القرآني</button><button class="font-choice ${fontMode==='plain'?'chosen':''}" data-font="plain">خط عربي عادي</button></div><p class="tiny">الخط العادي يعرض الكلمات دون التشكيل وعلامات الوقف، أما النص القرآني الأصلي فيبقى محفوظًا كما ورد من المصدر.</p><article id="ayahText" class="ayah-text ${fontMode==='plain'?'plain-font':'quran-font'}">${renderAyahs(data,fontMode)}</article>`;
  $('#backSurahs').onclick=renderQuranList;
  c.querySelectorAll('[data-font]').forEach(btn=>btn.onclick=()=>{
   const mode=btn.dataset.font;localStorage.setItem('noor_quran_font',mode);
   const article=$('#ayahText');article.classList.toggle('plain-font',mode==='plain');article.classList.toggle('quran-font',mode==='quran');article.innerHTML=renderAyahs(data,mode);
   c.querySelectorAll('[data-font]').forEach(b=>b.classList.toggle('chosen',b===btn));
   if(focusAyah){const target=$(`#ayah-${focusAyah}`);if(target)target.classList.add('search-target')}
  });
  if(focusAyah){const target=$(`#ayah-${focusAyah}`);if(target){target.classList.add('search-target');setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'center'}),80)}}
 }catch{c.innerHTML='<button class="backbtn" id="backSurahs">← فهرس السور</button><h2>تعذر تحميل النص</h2><p>اتصل بالإنترنت مرة واحدة لتحميل هذه السورة وحفظها على الجهاز.</p>';$('#backSurahs').onclick=renderQuranList}
}
function renderAzkar(){let c=$('#contentView');c.innerHTML=`<button class="backbtn" data-back>← الرئيسية</button><h2>الأذكار اليومية</h2><p class="muted">نصوص مختارة؛ راجع أذكارك من مصدر موثوق.</p><div class="feature-grid"><button class="feature" data-z="morning">أذكار الصباح<small>ابدأ يومك بالذكر</small></button><button class="feature" data-z="evening">أذكار المساء<small>اختم يومك بالذكر</small></button><button class="feature" data-z="sleep">أذكار النوم<small>قبل النوم</small></button></div><div id="azkarItems"></div>`;c.querySelector('[data-back]').onclick=()=>showView('home');c.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>showZ(b.dataset.z))}
const azkar={morning:[['أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.','مرة'],['اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.','مرة'],['سبحان الله وبحمده','مئة مرة (ورد مشهور)']],evening:[['أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.','مرة'],['اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.','مرة'],['أعوذ بكلمات الله التامات من شر ما خلق.','ثلاث مرات']],sleep:[['باسمك اللهم أموت وأحيا.','مرة'],['اللهم قني عذابك يوم تبعث عبادك.','ثلاث مرات'],['سبحان الله','33 مرة'],['الحمد لله','33 مرة'],['الله أكبر','34 مرة']]};
function showZ(k){let el=$('#azkarItems');el.innerHTML=azkar[k].map(([t,count])=>`<div class="azkar-item">${esc(t)}<br><span class="counter">${esc(count)}</span></div>`).join('')}
function renderCalendar(){let c=$('#contentView');let dates=[['1 رمضان','بداية رمضان — تاريخ متوقع'],['1 شوال','عيد الفطر — يثبت بالإعلان الرسمي'],['9 ذو الحجة','يوم عرفة'],['10 ذو الحجة','عيد الأضحى — يثبت بالإعلان الرسمي'],['12 ربيع الأول','المولد النبوي وفق تقويم شائع، مع اختلاف التحديد']];c.innerHTML='<button class="backbtn" data-back>← الرئيسية</button><h2>التقويم والمناسبات الإسلامية</h2><p>التاريخ الهجري اليوم: <b>'+esc(hijriToday())+'</b></p><p class="tiny">تواريخ المناسبات هنا تعريفية وليست إعلانًا رسميًا. يعتمد ثبوت رمضان والعيدين في الجزائر على الجهات المختصة ورؤية الهلال.</p>'+dates.map(x=>`<div class="azkar-item"><b>${x[0]}</b><br><span class="muted">${x[1]}</span></div>`).join('');c.querySelector('[data-back]').onclick=()=>showView('home')}
function renderAbout(){let c=$('#contentView');c.innerHTML='<button class="backbtn" data-back>← الرئيسية</button><h2>حول نُور</h2><p>نسخة أولية قابلة للتطوير من تطبيق نور الإسلامي.</p><div class="azkar-item"><b>القرآن الكريم</b><br>النص عند الاتصال: AlQuran Cloud API، بالرسم العثماني. تُحفظ السور التي تم تحميلها على الجهاز.</div><div class="azkar-item"><b>مواقيت الصلاة</b><br>AlAdhan API، طريقة الحساب 3 (Muslim World League) كإعداد ابتدائي، وليست فتوى أو اعتمادًا رسميًا.</div><div class="azkar-item"><b>الخصوصية</b><br>لا يُطلب حساب مستخدم. عند جلب المواقيت يُرسل اسم المدينة إلى خدمة خارجية. يمكن استخدام التطبيق دون تحديد الموقع الدقيق.</div><p class="tiny">هذه نسخة تأسيسية وليست إصدارًا نهائيًا مدققًا شرعيًا. يُستحسن مراجعة النصوص والأذكار والتواريخ قبل النشر العام.</p>';c.querySelector('[data-back]').onclick=()=>showView('home')}
async function loadPrayer(){let grid=$('#prayerGrid');grid.innerHTML='<div class="loading">جارٍ جلب المواقيت…</div>';try{let d=new Date(),date=[String(d.getDate()).padStart(2,'0'),String(d.getMonth()+1).padStart(2,'0'),d.getFullYear()].join('-'),url=`https://api.aladhan.com/v1/timingsByCity/${date}?city=Oran&country=Algeria&method=3`;let r=await fetch(url);if(!r.ok)throw 0;let j=(await r.json()).data;let p=j.timings;$('#prayerDate').textContent=j.date.hijri.day+' '+j.date.hijri.month.ar;let items=[['الفجر',p.Fajr],['الشروق',p.Sunrise],['الظهر',p.Dhuhr],['العصر',p.Asr],['المغرب',p.Maghrib],['العشاء',p.Isha]];grid.innerHTML=items.map(([n,t])=>`<div class="prayer"><b>${n}</b><span>${esc(t)}</span></div>`).join('')}catch{grid.innerHTML='<div class="loading">تعذر الاتصال. تحقق من الإنترنت ثم اضغط تحديث.</div>'}}
$('#refreshPrayer').onclick=loadPrayer;loadPrayer();
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
