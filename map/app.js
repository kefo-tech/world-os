/************************************************
 * Navigation Mode - City Report (Fixed)
 ************************************************/

/* ================================
   Firebase Config
================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDBpj59oQ4BbSCLQi117Rn-gZjZ7awujV4",
    authDomain: "report-77313.firebaseapp.com",
    projectId: "report-77313",
    storageBucket: "report-77313.appspot.com",
    messagingSenderId: "664112522932",
    appId: "1:664112522932:web:ed636e68015bd089fb19e1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ================================
   DOM
================================ */
const $ = (id) => document.getElementById(id);

const btnQuickAdd = $("btnQuickAdd");
const btnLocate = $("btnLocate");
const btnRefresh = $("btnRefresh");
const btnSubmitReport = $("btnSubmitReport");
const btnSound = $("btnSound");
const btnOpenPanel = $("btnOpenPanel");
const btnClosePanel = $("btnClosePanel");
const btnStartDriving = $("btnStartDriving");

const sidePanel = $("sidePanel");
const modalAdd = $("modalAdd");
const driveOverlay = $("driveOverlay");

const reportType = $("reportType");
const reportText = $("reportText");
const addMsg = $("addMsg");

const statusEl = $("status");
const feedEl = $("feed");
const radiusEl = $("radius");
const typeFilterEl = $("typeFilter");
const liveLocationText = $("liveLocationText");
const activeAlertBox = $("activeAlertBox");
const alertTitle = $("alertTitle");
const alertSub = $("alertSub");
const toastEl = $("toast");

/* ================================
   State
================================ */
let map;
let userMarker = null;
let userCircle = null;
let watchId = null;

let userPosition = null;
let currentHeading = null;
let reports = [];
let markerMap = new Map();
let soundEnabled = true;

let wakeLockSentinel = null;
let wakeLockEnabled = false;
let drivingStarted = false;

const reportAlertState = new Map();

const REPORT_COLLECTION = "road_reports";
const MAX_REPORT_FETCH_HOURS = 24;
const DEFAULT_RADIUS = 700;
const FIXED_REPORT_TTL_MS = 60 * 60 * 1000;

/* ================================
   Init
================================ */
initMap();
bindUI();
subscribeReports();
setupProtection();

/* ================================
   UI
================================ */
function bindUI() {
  btnQuickAdd?.addEventListener("click", openAddModal);

  btnLocate?.addEventListener("click", () => {
    centerOnUser();
  });

  btnRefresh?.addEventListener("click", () => {
    renderAll();
    toast("تم تحديث الواجهة");
  });

  btnSubmitReport?.addEventListener("click", submitReport);

  btnSound?.addEventListener("click", () => {
    toggleSound();
  });

  btnOpenPanel?.addEventListener("click", () => {
    sidePanel?.classList.remove("hidden-panel");
  });

  btnClosePanel?.addEventListener("click", () => {
    sidePanel?.classList.add("hidden-panel");
  });

  btnStartDriving?.addEventListener("click", async () => {
    drivingStarted = true;
    driveOverlay?.classList.add("hidden");
    sidePanel?.classList.add("hidden-panel");
    centerOnUser();
    await requestWakeLock(false);
    toast("تم بدء وضع القيادة");
  });

  radiusEl?.addEventListener("change", renderAll);
  typeFilterEl?.addEventListener("change", renderAll);

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && wakeLockEnabled && !wakeLockSentinel) {
      await requestWakeLock(true);
    }
  });
}

/* ================================
   Map
================================ */
function initMap() {
  map = L.map("map", {
    zoomControl: true,
    attributionControl: true
  }).setView([35.0, 38.5], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(
      onLocationUpdate,
      onLocationError,
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000
      }
    );
  } else {
    setStatus("المتصفح لا يدعم تحديد الموقع.");
  }
}

function onLocationUpdate(pos) {
  const { latitude, longitude, heading, accuracy, speed } = pos.coords;

  currentHeading = Number.isFinite(heading) ? heading : currentHeading;
  userPosition = {
    lat: latitude,
    lng: longitude,
    accuracy: accuracy || 0,
    speed: speed || 0,
    heading: currentHeading
  };

  if (liveLocationText) {
    liveLocationText.textContent =
      `موقعك مباشر الآن${accuracy ? ` • دقة ${Math.round(accuracy)}م` : ""}`;
  }

  const latlng = [latitude, longitude];

  if (!userMarker) {
    userMarker = L.circleMarker(latlng, {
      radius: 8,
      color: "#22c55e",
      weight: 3,
      fillColor: "#22c55e",
      fillOpacity: 0.95
    }).addTo(map);

    userCircle = L.circle(latlng, {
      radius: accuracy || 30,
      color: "#22c55e",
      fillColor: "#22c55e",
      fillOpacity: 0.08,
      weight: 1
    }).addTo(map);

    map.setView(latlng, 16);
  } else {
    userMarker.setLatLng(latlng);
    userCircle.setLatLng(latlng);
    userCircle.setRadius(Math.max(accuracy || 20, 15));
  }

  checkNearbyAlerts();
  renderAll();
}

function onLocationError(err) {
  console.error(err);
  setStatus("تعذر الوصول إلى الموقع. تأكد من إعطاء الإذن.");
  if (liveLocationText) liveLocationText.textContent = "تعذر تحديد الموقع";
}

function centerOnUser() {
  if (!userPosition) {
    toast("⚠️ الموقع غير متاح بعد، انتظر قليلاً");
    return;
  }
  map.setView([userPosition.lat, userPosition.lng], 16, { animate: true });
  toast("📌 تم التوسيط على موقعك");
}

/* ================================
   Firestore
================================ */
function subscribeReports() {
  const cutoff = Date.now() - (MAX_REPORT_FETCH_HOURS * 60 * 60 * 1000);

  db.collection(REPORT_COLLECTION)
    .where("createdAt", ">=", cutoff)
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      reports = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      cleanupExpiredLocally();
      syncMarkers();
      renderAll();
      checkNearbyAlerts();
    }, (err) => {
      console.error(err);
      setStatus("حدث خطأ أثناء تحميل البلاغات.");
    });
}

function cleanupExpiredLocally() {
  const now = Date.now();
  // FIX: Changed condition to properly filter expired reports
  reports = reports.filter(r => {
    const isExpired = (r.expiresAt || 0) <= now;
    const isClosed = r.status === "closed" || r.status === "inactive";
    return !isExpired && !isClosed;
  });
}

/* ================================
   Reports
================================ */
function openAddModal() {
  if (!userPosition) {
    toast("⚠️ انتظر حتى يتم تحديد موقعك أولاً");
    // FIX: Better visual feedback
    if (btnQuickAdd) {
      btnQuickAdd.style.transform = "scale(0.9)";
      setTimeout(() => {
        btnQuickAdd.style.transform = "";
      }, 200);
    }
    return;
  }

  if (addMsg) addMsg.textContent = "⏱️ مدة البلاغ ساعة واحدة فقط.";
  modalAdd?.classList.remove("hidden");
}

async function submitReport() {
  if (!userPosition) {
    if (addMsg) addMsg.textContent = "⚠️ الموقع غير متاح بعد.";
    return;
  }

  const type = reportType?.value;
  const text = reportText?.value.trim() || "";

  if (!type) {
    if (addMsg) addMsg.textContent = "⚠️ اختر نوع البلاغ.";
    return;
  }

  const now = Date.now();

  const data = {
    type,
    text,
    lat: userPosition.lat,
    lng: userPosition.lng,
    geohint: `${userPosition.lat.toFixed(3)},${userPosition.lng.toFixed(3)}`,
    createdAt: now,
    expiresAt: now + FIXED_REPORT_TTL_MS,
    status: "active",
    userName: "مستخدم مجهول",
    confirmations: 0,
    dismissals: 0,
    directionMode: "current",
    heading: Number.isFinite(userPosition.heading) ? userPosition.heading : null
  };

  try {
    await db.collection(REPORT_COLLECTION).add(data);
    if (addMsg) addMsg.textContent = "✅ تم نشر البلاغ. مدة البلاغ ساعة واحدة.";
    if (reportText) reportText.value = "";
    modalAdd?.classList.add("hidden");
    toast("✅ تم نشر البلاغ بنجاح");
  } catch (err) {
    console.error(err);
    if (addMsg) addMsg.textContent = "❌ تعذر نشر البلاغ.";
    toast("❌ فشل نشر البلاغ");
  }
}

/* ================================
   Render
================================ */
function renderAll() {
  renderFeed();
  updateStatusSummary();
}

function renderFeed() {
  if (!feedEl) return;

  const filtered = getFilteredReports(true);

  if (!filtered.length) {
    feedEl.innerHTML = `<div class="empty">📭 لا توجد بلاغات قريبة مطابقة حاليًا.</div>`;
    return;
  }

  feedEl.innerHTML = filtered.map(reportCardHTML).join("");
  bindFeedActions(feedEl);
}

function getFilteredReports(nearbyOnly = false) {
  const radius = Number(radiusEl?.value || DEFAULT_RADIUS);
  const typeFilter = typeFilterEl?.value || "all";

  return reports
    .filter(r => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (nearbyOnly && userPosition) {
        const d = haversine(userPosition.lat, userPosition.lng, r.lat, r.lng);
        return d <= radius;
      }
      return true;
    })
    .map(r => ({
      ...r,
      distance: userPosition ? haversine(userPosition.lat, userPosition.lng, r.lat, r.lng) : null
    }))
    .sort((a, b) => {
      if (userPosition && a.distance != null && b.distance != null) return a.distance - b.distance;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function reportCardHTML(r) {
  const createdAtText = relativeTime(r.createdAt);
  const expiresAtText = relativeTime(r.expiresAt);
  const distanceText = r.distance != null ? `${Math.round(r.distance)}م` : "—";
  const text = escapeHtml(r.text || "بدون وصف إضافي");

  return `
    <div class="card">
      <div class="card-top">
        <div class="type-chip chip-${escapeClassName(r.type)}">${escapeHtml(r.type)}</div>
        <div class="meta">${distanceText}</div>
      </div>

      <div class="meta">
        بواسطة ${escapeHtml(r.userName || "مستخدم")} • ${createdAtText} • ينتهي ${expiresAtText}
      </div>

      <div class="card-text">${text}</div>

      <div class="meta">
        ✅ تأكيدات: ${r.confirmations || 0} • ❌ لم يعد موجودًا: ${r.dismissals || 0}
      </div>

      <div class="card-bottom">
        <button class="mini-btn info" data-go="${r.id}">📍 عرض على الخريطة</button>
        <button class="mini-btn success" data-confirm="${r.id}">✅ تأكيد البلاغ</button>
        <button class="mini-btn warn" data-dismiss="${r.id}">❌ لم يعد موجودًا</button>
      </div>
    </div>
  `;
}

function bindFeedActions(root) {
  root.querySelectorAll("[data-go]").forEach(btn => {
    btn.onclick = () => focusReport(btn.dataset.go);
  });

  root.querySelectorAll("[data-confirm]").forEach(btn => {
    btn.onclick = () => confirmReport(btn.dataset.confirm);
  });

  root.querySelectorAll("[data-dismiss]").forEach(btn => {
    btn.onclick = () => dismissReport(btn.dataset.dismiss);
  });
}

function updateStatusSummary() {
  if (!statusEl) return;
  const allCount = reports.length;
  const nearbyCount = getFilteredReports(true).length;

  statusEl.textContent = userPosition
    ? `📊 إجمالي البلاغات النشطة: ${allCount} • القريبة منك: ${nearbyCount}`
    : `📊 إجمالي البلاغات النشطة: ${allCount}`;
}

/* ================================
   Markers
================================ */
function syncMarkers() {
  const seen = new Set();

  for (const r of reports) {
    seen.add(r.id);
    let marker = markerMap.get(r.id);
    const latlng = [r.lat, r.lng];

    if (!marker) {
      marker = L.marker(latlng, {
        icon: L.divIcon({
          className: "custom-report-marker",
          html: markerHTML(r.type),
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -26]
        })
      });

      marker.bindPopup(`
        <div style="direction:rtl;text-align:right;min-width:220px">
          <strong>${escapeHtml(r.type)}</strong><br>
          ${escapeHtml(r.text || "بدون وصف")}<br><br>
          <small>👤 بواسطة: ${escapeHtml(r.userName || "مستخدم")}</small>
        </div>
      `);

      marker.addTo(map);
      markerMap.set(r.id, marker);
    } else {
      marker.setLatLng(latlng);
    }
  }

  for (const [id, marker] of markerMap.entries()) {
    if (!seen.has(id)) {
      map.removeLayer(marker);
      markerMap.delete(id);
    }
  }
}

function markerHTML(type) {
  const emojiMap = {
    "زحمة": "🚗",
    "حفرة": "🕳️",
    "أعمال بناء": "🚧",
    "حادث": "⚠️",
    "إغلاق طريق": "⛔",
    "جسم خطر": "📛",
    "أخرى": "📍"
  };

  return `
    <div style="
      width:28px;
      height:28px;
      border-radius:50%;
      background:#0f172a;
      border:2px solid rgba(255,255,255,.25);
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 8px 18px rgba(0,0,0,.35);
      font-size:15px;
    ">${emojiMap[type] || "📍"}</div>
  `;
}

function focusReport(id) {
  const report = reports.find(r => r.id === id);
  if (!report) return;

  map.setView([report.lat, report.lng], 17);
  const marker = markerMap.get(id);
  if (marker) marker.openPopup();

  sidePanel?.classList.add("hidden-panel");
  toast(`🔍 تم التركيز على بلاغ: ${report.type}`);
}

/* ================================
   Update Counters
================================ */
async function confirmReport(id) {
  try {
    await db.collection(REPORT_COLLECTION).doc(id).update({
      confirmations: firebase.firestore.FieldValue.increment(1)
    });
    toast("✅ تم تأكيد البلاغ");
  } catch (err) {
    console.error(err);
    toast("❌ تعذر تأكيد البلاغ");
  }
}

async function dismissReport(id) {
  try {
    await db.collection(REPORT_COLLECTION).doc(id).update({
      dismissals: firebase.firestore.FieldValue.increment(1)
    });
    toast("✅ تم تسجيل أن البلاغ لم يعد موجودًا");
  } catch (err) {
    console.error(err);
    toast("❌ تعذر تحديث البلاغ");
  }
}

/* ================================
   Alerts
================================ */
function checkNearbyAlerts() {
  if (!userPosition || !reports.length) {
    updateActiveAlertBox(null);
    return;
  }

  const alertCandidates = reports
    .map(r => ({
      ...r,
      distance: haversine(userPosition.lat, userPosition.lng, r.lat, r.lng)
    }))
    .filter(r => r.distance <= 700)
    .filter(matchesDirectionIfNeeded)
    .sort((a, b) => a.distance - b.distance);

  if (!alertCandidates.length) {
    updateActiveAlertBox(null);
    return;
  }

  const nearest = alertCandidates[0];
  updateActiveAlertBox(nearest);

  for (const report of alertCandidates) {
    processProgressiveAlert(report);
  }
}

function matchesDirectionIfNeeded(report) {
  if (report.directionMode !== "current") return true;
  if (!Number.isFinite(report.heading)) return true;
  if (!Number.isFinite(userPosition?.heading)) return true;

  const diff = angleDiff(userPosition.heading, report.heading);
  return diff <= 65;
}

function processProgressiveAlert(report) {
  const now = Date.now();
  const distance = report.distance;

  let st = reportAlertState.get(report.id);
  if (!st) {
    st = {
      lastBand: null,
      passed: false,
      minDistance: Infinity,
      lastDistance: Infinity,
      enteredNear: false,
      lastSpokenAt: 0
    };
    reportAlertState.set(report.id, st);
  }

  if (st.passed) return;

  if (distance < st.minDistance) st.minDistance = distance;
  if (distance <= 700) st.enteredNear = true;

  if (st.enteredNear && st.minDistance <= 60 && distance > 120 && distance > st.lastDistance + 20) {
    st.passed = true;
    st.lastDistance = distance;
    return;
  }

  const band = getDistanceBand(distance);
  const canSpeak = now - st.lastSpokenAt > 4000;

  if (band !== null && band !== st.lastBand && canSpeak) {
    st.lastBand = band;
    st.lastSpokenAt = now;
    speakAlert(report, distance);
  }

  st.lastDistance = distance;
}

function getDistanceBand(distance) {
  if (distance <= 100) return 100;
  if (distance <= 300) return 300;
  if (distance <= 500) return 500;
  if (distance <= 700) return 700;
  return null;
}

function updateActiveAlertBox(report) {
  if (!activeAlertBox) return;

  if (!report) {
    activeAlertBox.classList.add("hidden");
    // FIX: Cancel speech when alert disappears
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    return;
  }

  activeAlertBox.classList.remove("hidden");
  if (alertTitle) alertTitle.textContent = `⚠️ تنبيه قريب: ${report.type}`;
  if (alertSub) alertSub.textContent = `${Math.round(report.distance)} متر • ${report.text || "بدون وصف"}`;
}

function speakAlert(report, distance) {
  const rounded = Math.max(0, Math.round(distance / 10) * 10);
  const message = `تنبيه، ${report.type} أمامك بعد ${rounded} متر`;

  toast(message);

  if (!soundEnabled) return;

  tryBeep();

  // FIX: Cancel previous speech before speaking new one
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = "ar";
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  }
}

/* ================================
   Sound
================================ */
function toggleSound() {
  soundEnabled = !soundEnabled;
  if (btnSound) btnSound.textContent = soundEnabled ? "🔊" : "🔇";
  toast(soundEnabled ? "🔊 تم تفعيل الصوت" : "🔇 تم إيقاف الصوت");
  
  // FIX: Cancel speech when sound is disabled
  if (!soundEnabled && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function tryBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.start();
    osc.stop(ctx.currentTime + 0.19);
  } catch (e) {
    console.warn("beep failed", e);
  }
}

/* ================================
   Wake Lock
================================ */
async function requestWakeLock(isRestore = false) {
  if (!("wakeLock" in navigator)) {
    wakeLockEnabled = false;
    wakeLockSentinel = null;
    toast("💡 المتصفح لا يدعم إبقاء الشاشة مضاءة");
    return false;
  }

  if (document.visibilityState !== "visible") {
    if (!isRestore) toast("⚠️ افتح الصفحة بالكامل أولاً ثم فعّل وضع القيادة");
    return false;
  }

  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockEnabled = true;

    if (!isRestore) toast("💡 تم تفعيل إبقاء الشاشة مضاءة");

    wakeLockSentinel.addEventListener("release", async () => {
      wakeLockSentinel = null;

      if (wakeLockEnabled && document.visibilityState === "visible") {
        try {
          await requestWakeLock(true);
        } catch (e) {
          console.error("reacquire wake lock failed:", e);
          wakeLockEnabled = false;
          toast("⚠️ تم فقدان إبقاء الشاشة مضاءة");
        }
        return;
      }

      wakeLockEnabled = false;
      toast("💡 تم إلغاء إبقاء الشاشة مضاءة");
    });

    return true;
  } catch (err) {
    console.error("Wake Lock error:", err);
    wakeLockSentinel = null;
    wakeLockEnabled = false;

    let msg = "❌ تعذر تفعيل إبقاء الشاشة مضاءة";
    if (err && err.name) msg += `: ${err.name}`;
    toast(msg);

    return false;
  }
}

/* ================================
   Protection
================================ */
function setupProtection() {
  document.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });

  document.addEventListener("selectstart", (e) => {
    const tag = e.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("dragstart", (e) => e.preventDefault(), { passive: false });
}

/* ================================
   Helpers
================================ */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function angleDiff(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function relativeTime(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const abs = Math.abs(diff);

  const seconds = Math.round(abs / 1000);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  let text;
  if (minutes < 1) {
    text = seconds <= 5 ? "الآن" : `${seconds} ثانية`;
  } else if (minutes < 60) {
    text = `${minutes} دقيقة`;
  } else if (hours < 24) {
    text = `${hours} ساعة`;
  } else {
    text = `${days} يوم`;
  }

  // FIX: Properly indicate past vs future
  return diff >= 0 ? `منذ ${text}` : `بعد ${text}`;
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeClassName(str = "") {
  return String(str).replace(/\s/g, "\\ ");
}

function toast(msg) {
  if (!toastEl) return;
  
  // FIX: Clear timeout properly
  if (toastEl._timer) {
    clearTimeout(toastEl._timer);
    toastEl._timer = null;
  }
  
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  
  toastEl._timer = setTimeout(() => {
    toastEl.classList.add("hidden");
    toastEl._timer = null;
  }, 4000);
}
