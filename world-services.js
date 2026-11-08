"use strict";
// Each service opens INSIDE World OS. No Syria OS links.
const serviceScreen=document.getElementById("serviceScreen");
const serviceBody=document.getElementById("serviceBody");
const serviceTitle=document.getElementById("serviceTitle");
function element(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function field(placeholder,type="text"){const n=document.createElement("input");n.type=type;n.placeholder=placeholder;return n}
function action(label,callback){const b=element("button",label);b.type="button";b.onclick=callback;return b}
function result(text){const p=element("div",text,"result");serviceBody.append(p);return p}
function openWorldService(id,title,icon){
 serviceBody.replaceChildren();serviceTitle.textContent=icon+" "+title;serviceScreen.classList.remove("hidden");
 const ar=document.documentElement.lang==="ar";
 const note=(a,b)=>result(ar?a:b);
 if(id==="salah"){
  const intro=element("p",ar?"أوقات الصلاة حسب المدينة والتاريخ.":"Prayer times by city and date.");serviceBody.append(intro);
  const city=field(ar?"اسم المدينة (مثل Berlin)":"City (e.g. Berlin)");serviceBody.append(city);
  serviceBody.append(action(ar?"عرض أوقات الصلاة":"Get prayer times",async()=>{
   const c=city.value.trim();if(!c)return;serviceBody.querySelectorAll(".result").forEach(x=>x.remove());
   const box=result(ar?"جارٍ التحميل…":"Loading…");
   try{const response=await fetch("https://api.aladhan.com/v1/timingsByCity?city="+encodeURIComponent(c)+"&country="+encodeURIComponent(cname(country))+"&method=3");const data=await response.json();if(data.code!==200)throw Error();const t=data.data.timings;box.textContent=Object.entries({Fajr:t.Fajr,Sunrise:t.Sunrise,Dhuhr:t.Dhuhr,Asr:t.Asr,Maghrib:t.Maghrib,Isha:t.Isha}).map(([k,v])=>k+" : "+v).join("\n");box.style.whiteSpace="pre-line"}catch{box.textContent=ar?"تعذر جلب الأوقات. تأكد من المدينة والاتصال.":"Unable to fetch times. Check city and connection."}
  }));return;
 }
 if(id==="post"){
  note("محرر منشورات محلي داخل World OS. لا توجد مشاركة عامة حتى يتم تجهيز قاعدة البيانات.","Local post editor. Public publishing is not yet enabled.");
  const titleInput=field(ar?"عنوان المنشور":"Post title");const body=element("textarea");body.rows=6;body.placeholder=ar?"اكتب المنشور":"Write your post";serviceBody.append(titleInput,body,action(ar?"حفظ مسودة على الجهاز":"Save draft locally",()=>{localStorage.setItem("worldos-post-draft",JSON.stringify({title:titleInput.value,body:body.value}));result(ar?"تم حفظ المسودة على هذا الجهاز.":"Draft saved on this device.")}));try{const d=JSON.parse(localStorage.getItem("worldos-post-draft")||"{}");titleInput.value=d.title||"";body.value=d.body||""}catch{}return;
 }
 if(id==="kefogpt"){note("مساعد الطالب العالمي قيد التطوير داخل World OS، ولا يتصل حاليًا بنموذج ذكاء اصطناعي.","The World OS student assistant is in development; no AI model is connected yet.");return}
 if(id==="map"||id==="https://www.openstreetmap.org"){
  note("خريطة عالمية مدمجة داخل World OS. يمكن تحريكها وتكبيرها.","Interactive world map inside World OS.");
  const frame=document.createElement("iframe");frame.title="World OS map";frame.src="https://www.openstreetmap.org/export/embed.html?bbox=-12%2C35%2C32%2C60&layer=mapnik";frame.loading="lazy";frame.referrerPolicy="no-referrer";frame.style.cssText="border:1px solid #ffffff33;border-radius:14px;width:100%;height:55vh";serviceBody.append(frame);return;
 }
 if(id==="currency"){
  note("محول عملات مباشر. أسعار مرجعية وليست أسعار السوق المحلية.","Live reference currency converter; not local cash-market prices.");
  const amount=field(ar?"المبلغ":"Amount","number");amount.value="100";
  const from=document.createElement("select"),to=document.createElement("select");
  for(const code of ["USD","EUR","GBP","TRY","CHF","CAD","AUD","JPY","SAR","AED"]){from.add(new Option(code,code));to.add(new Option(code,code))}
  from.value="USD";to.value="EUR";serviceBody.append(amount,from,to,action(ar?"تحويل":"Convert",async()=>{
   const box=result(ar?"جارٍ التحميل…":"Loading…");
   try{const n=Number(amount.value);if(!Number.isFinite(n)||n<0)throw Error();if(from.value===to.value){box.textContent=n.toFixed(2)+" "+to.value;return}
   const response=await fetch("https://api.frankfurter.dev/v1/latest?base="+from.value+"&symbols="+to.value);
   if(!response.ok)throw Error();const data=await response.json();box.textContent=(n*data.rates[to.value]).toFixed(2)+" "+to.value+" · "+data.date
   }catch{box.textContent=ar?"تعذر جلب سعر الصرف.":"Could not load exchange rate."}
  }));return;
 }
 if(id==="emergency"){
  note("للطوارئ اتصل برقم الطوارئ الرسمي في الدولة التي توجد فيها فعليًا. لا تعتمد على بلدك المختار داخل التطبيق.","For emergencies, call the official emergency number where you physically are, not necessarily your selected app country.");return;
 }
 if(id==="transport"||id==="professionals"||id==="news"){
  note("قسم مستقل قيد الإنشاء في World OS. سيتم ربطه ببيانات خاصة بالدولة المختارة.","Independent World OS module under construction, to be connected to selected-country data.");return;
 }
 if(id==="restaurants"||id==="shahed"||id==="") {
  note("هذه الخدمة ستعمل من داخل World OS، لكنها لم تُربط بعد ببيانات أو نظام نشر مستقل. لن يتم تحويلك إلى مشروع آخر.","This service will run inside World OS, but its independent data and publishing system is not ready. You will not be redirected.");
  return;
 }
 if(id==="https://translate.google.com"){
  note("الترجمة داخل World OS قيد التطوير. لم يتم ربط مزود ترجمة بعد.","In-app translation is being developed; no translation provider is connected.");return;
 }
 note("هذه الخدمة قيد التطوير داخل World OS.","This service is under development inside World OS.");
}
document.getElementById("backService").onclick=()=>{serviceScreen.classList.add("hidden");serviceBody.replaceChildren()};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!serviceScreen.classList.contains("hidden"))document.getElementById("backService").click()});
