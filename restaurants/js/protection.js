/* =========================================================
   KEFO FOOD — PROTECTION.JS
   حماية شاملة: كمبيوتر + موبايل
========================================================= */

(function () {
  "use strict";

  // السماح بالحماية فقط على النطاق الحي (وليس localhost)
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log("🛡️ Protection disabled on localhost");
    return;
  }

  /* ==========================================
     1. تعطيل زر الفأرة الأيمن (كمبيوتر)
  ========================================== */
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    return false;
  });

  /* ==========================================
     2. تعطيل اختصارات لوحة المفاتيح
  ========================================== */
  document.addEventListener("keydown", function (e) {
    // Ctrl+U (عرض المصدر)
    if (e.ctrlKey && e.key === "u") {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I / F12 (أدوات المطور)
    if (
      (e.ctrlKey && e.shiftKey && e.key === "I") ||
      e.key === "F12"
    ) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+J (كونسول)
    if (e.ctrlKey && e.shiftKey && e.key === "J") {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+C (تحديد عنصر)
    if (e.ctrlKey && e.shiftKey && e.key === "C") {
      e.preventDefault();
      return false;
    }

    // Ctrl+S (حفظ الصفحة)
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      return false;
    }

    // Ctrl+P (طباعة)
    if (e.ctrlKey && e.key === "p") {
      e.preventDefault();
      return false;
    }

    // Ctrl+A (تحديد الكل)
    if (e.ctrlKey && e.key === "a") {
      e.preventDefault();
      return false;
    }
  });

  /* ==========================================
     3. تعطيل النسخ والقص (كمبيوتر)
  ========================================== */
  document.addEventListener("copy", function (e) {
    e.preventDefault();
    return false;
  });

  document.addEventListener("cut", function (e) {
    e.preventDefault();
    return false;
  });

  /* ==========================================
     4. تعطيل النقر الطويل (موبايل)
  ========================================== */
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length > 1) {
      // منع اللمس المتعدد
      e.preventDefault();
    }
  }, { passive: false });

  let touchTimer;
  document.addEventListener("touchstart", function (e) {
    touchTimer = setTimeout(function () {
      // النقر الطويل يُظهر قائمة النسخ على الموبايل
      e.preventDefault();
    }, 500);
  }, { passive: false });

  document.addEventListener("touchend", function () {
    clearTimeout(touchTimer);
  });

  document.addEventListener("touchmove", function () {
    clearTimeout(touchTimer);
  });

  /* ==========================================
     5. تعطيل السحب (موبايل)
  ========================================== */
  document.addEventListener("dragstart", function (e) {
    e.preventDefault();
    return false;
  });

  /* ==========================================
     6. تعطيل التحديد
  ========================================== */
  document.addEventListener("selectstart", function (e) {
    e.preventDefault();
    return false;
  });

  /* ==========================================
     7. CSS إضافية لمنع التحديد
  ========================================== */
  const style = document.createElement("style");
  style.textContent = `
    * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }

    /* السماح بالتحديد في حقول الإدخال فقط */
    input, textarea, [contenteditable="true"] {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);

  /* ==========================================
     8. كشف أدوات المطور (اختياري)
  ========================================== */
  let devToolsOpen = false;
  const threshold = 160;

  function detectDevTools() {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-size:2rem;font-family:Tahoma;color:#7d1523;">🔒 الرجاء إغلاق أدوات المطور للمتابعة</div>';
      }
    } else {
      if (devToolsOpen) {
        devToolsOpen = false;
        window.location.reload();
      }
    }
  }

  setInterval(detectDevTools, 1000);

  /* ==========================================
     9. منع iframe تضمين
  ========================================== */
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }

  console.log("🛡️ Protection active");

})();
