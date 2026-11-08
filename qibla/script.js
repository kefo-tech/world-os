// script.js
(function() {
  'use strict';

  // --- عناصر DOM ---
  const compassCircle = document.getElementById('compassCircle');
  const needle = document.getElementById('needle');
  const rotationIndicator = document.getElementById('rotationIndicator');
  const headingValue = document.getElementById('headingValue');
  const qiblaAngleSpan = document.getElementById('qiblaAngle');
  const statusText = document.getElementById('statusText');

  // --- ثوابت القبلة (مكة المكرمة) ---
  // إحداثيات مكة: خط عرض 21.4225° شمالاً، خط طول 39.8262° شرقاً
  const MAKKAH_LAT = 21.4225;
  const MAKKAH_LNG = 39.8262;

  // زاوية القبلة للموقع الحالي (سيتم حسابها بناءً على GPS)
  let qiblaAngle = 0;       // زاوية القبلة بالنسبة لشمال الحقيقي (بالدرجات)
  let currentHeading = 0;   // اتجاه الهاتف (السمت) بالنسبة للشمال الحقيقي
  let isCompassReady = false;
  let isGpsReady = false;

  // --- حساب زاوية القبلة (باستخدام إحداثيات المستخدم) ---
  function calculateQiblaAngle(lat, lng) {
    const lat1 = lat * Math.PI / 180;
    const lng1 = lng * Math.PI / 180;
    const lat2 = MAKKAH_LAT * Math.PI / 180;
    const lng2 = MAKKAH_LNG * Math.PI / 180;

    const dLng = lng2 - lng1;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; // 0-360
    return bearing;
  }

  // --- تحديث اتجاه البوصلة بناءً على قيمة الهيدينغ ---
  function updateCompass(headingDeg, qiblaDeg) {
    // headingDeg: اتجاه الهاتف (0=شمال, 90=شرق ...)
    // qiblaDeg: زاوية القبلة (بالدرجات من الشمال)
    // نحتاج لتدوير البوصلة بحيث تشير الإبرة إلى القبلة:
    // الإبرة ثابتة في الأعلى، لكننا ندير البوصلة عكس اتجاه الهاتف
    // ثم ندير الإبرة بزاوية القبلة بالنسبة للشمال.
    
    // تدوير البوصلة بحيث يكون الشمال الحقيقي في الأعلى (تعويض اتجاه الهاتف)
    // لكي تبقى الإبرة تشير إلى القبلة، نضبط دوران البوصلة على -headingDeg
    // وندير الإبرة بزاوية القبلة.
    const compassRotation = -headingDeg;
    // الإبرة تدور بزاوية القبلة (بالنسبة للشمال)
    const needleRotation = qiblaDeg;

    compassCircle.style.transform = `rotate(${compassRotation}deg)`;
    needle.style.transform = `translate(-50%, -50%) rotate(${needleRotation}deg)`;

    // تحديث المؤشر الرقمي
    rotationIndicator.textContent = `${Math.round(qiblaDeg)}°`;
    headingValue.textContent = `${Math.round(headingDeg)}°`;
    qiblaAngleSpan.textContent = `${Math.round(qiblaDeg)}°`;
  }

  // --- تحديث حالة الاتصال ---
  function updateStatus(message, isError = false) {
    statusText.textContent = message;
    if (isError) {
      statusText.style.color = '#f8a5a5';
    } else {
      statusText.style.color = '#b0d0f0';
    }
  }

  // --- معالج بيانات البوصلة (مستشعر الاتجاه) ---
  function handleOrientation(event) {
    // نستخدم absolute orientation إن وجدت (alpha, beta, gamma)
    let alpha = event.alpha;    // 0-360 (زاوية الالتفاف حول المحور Z)
    let beta = event.beta;      // -180 - 180 (الانحدار)
    let gamma = event.gamma;    // -90 - 90 (الميل)

    // في iOS 13+، قد يكون alpha معوضاً تلقائياً (شمال حقيقي) إذا كان event.webkitCompassHeading متاحاً
    // لكننا نستخدم الطريقة التقليدية مع مرشح بسيط.
    // بالنسبة للأجهزة التي تدعم absolute orientation، نستخدمها.
    if (typeof event.absolute === 'boolean' && event.absolute === true) {
      // بعض المتصفحات توفر alpha كقيمة مطلقة (شمال حقيقي) إذا كانت absolute=true
      // لكننا نفضل استخدام webkitCompassHeading إن وجد.
    }

    // محاولة الحصول على الاتجاه من webkitCompassHeading (iOS)
    let heading = null;
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
      heading = event.webkitCompassHeading; // 0-360 (شمال حقيقي)
    } else if (event.alpha !== null && event.alpha !== undefined) {
      // في بعض الأجهزة، alpha تعطي الاتجاه ولكن قد تحتاج إلى تعويض.
      // نستخدم alpha مباشرة مع العلم أنها قد تكون شمال مغناطيسي،
      // لكننا نتعامل معها كشمال حقيقي مبسط (مع العلم بالانحراف المغناطيسي غير المحسوب).
      heading = event.alpha;
    }

    if (heading !== null && !isNaN(heading)) {
      currentHeading = (heading + 360) % 360;
      isCompassReady = true;
      // إذا كان GPS جاهزاً، نقوم بتحديث البوصلة
      if (isGpsReady) {
        updateCompass(currentHeading, qiblaAngle);
        updateStatus('جاهز ✅');
      } else {
        updateStatus('في انتظار الموقع...');
      }
    } else {
      updateStatus('مستشعر الاتجاه غير متوفر', true);
    }
  }

  // --- الحصول على موقع المستخدم (GPS) لحساب زاوية القبلة ---
  function getLocation() {
    if (!navigator.geolocation) {
      updateStatus('GPS غير مدعوم في هذا المتصفح', true);
      // استخدام زاوية افتراضية (مكة) إذا لم يتوفر GPS
      qiblaAngle = 0;
      isGpsReady = true;
      if (isCompassReady) updateCompass(currentHeading, qiblaAngle);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        qiblaAngle = calculateQiblaAngle(lat, lng);
        isGpsReady = true;
        if (isCompassReady) {
          updateCompass(currentHeading, qiblaAngle);
          updateStatus('جاهز ✅');
        } else {
          updateStatus('في انتظار البوصلة...');
        }
        // تحديث زاوية القبلة في الواجهة
        qiblaAngleSpan.textContent = `${Math.round(qiblaAngle)}°`;
      },
      (error) => {
        console.warn('خطأ في GPS:', error.message);
        updateStatus('تعذر الحصول على الموقع، استخدم زاوية افتراضية', true);
        // تعيين زاوية القبلة افتراضياً (للمستخدم في مكة تقريباً)
        qiblaAngle = 0; 
        isGpsReady = true;
        if (isCompassReady) updateCompass(currentHeading, qiblaAngle);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  // --- بدء استماع مستشعر الاتجاه ---
  function startOrientationListener() {
    if (window.DeviceOrientationEvent) {
      // نطلب الإذن على iOS 13+ (نظراً لتغييرات السياسة)
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, true);
              updateStatus('تم الإذن، جارٍ التحديث...');
            } else {
              updateStatus('تم رفض الإذن للمستشعر', true);
            }
          })
          .catch(err => {
            console.warn('خطأ في طلب الإذن:', err);
            // نحاول الإضافة مباشرة (لأجهزة أندرويد أو المتصفحات الأخرى)
            window.addEventListener('deviceorientation', handleOrientation, true);
          });
      } else {
        // المتصفحات التي لا تطلب إذناً صريحاً (أندرويد، ديسكتوب)
        window.addEventListener('deviceorientation', handleOrientation, true);
        updateStatus('جارٍ التحديث...');
      }
    } else {
      updateStatus('مستشعر الاتجاه غير مدعوم', true);
    }
  }

  // --- دالة إعادة الضبط (طلب الإذن مجدداً) ---
  function resetSensors() {
    updateStatus('جارٍ إعادة الضبط...');
    // إعادة طلب الموقع
    isGpsReady = false;
    isCompassReady = false;
    getLocation();
    // إعادة ربط المستشعر (في حال كان بحاجة لإعادة إذن)
    // نزيل المستمعين ثم نضيفهم مجدداً
    window.removeEventListener('deviceorientation', handleOrientation);
    startOrientationListener();
    // إعادة تعيين القيم المعروضة
    headingValue.textContent = '--°';
    qiblaAngleSpan.textContent = '--°';
    rotationIndicator.textContent = '0°';
    compassCircle.style.transform = `rotate(0deg)`;
    needle.style.transform = `translate(-50%, -50%) rotate(0deg)`;
    // محاولة جلب الموقع فوراً
    setTimeout(() => {
      getLocation();
    }, 300);
  }

  // --- التهيئة ---
  function init() {
    // طلب الموقع
    getLocation();
    // بدء مستشعر الاتجاه
    startOrientationListener();

    // زر إعادة الضبط
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetSensors);
    }

    // معالج إضافي للخطأ في حال فشل المستشعر
    window.addEventListener('error', (e) => {
      if (e.message && e.message.includes('DeviceOrientation')) {
        updateStatus('مشكلة في مستشعر الاتجاه', true);
      }
    });
  }

  // تشغيل التطبيق بعد تحميل الصفحة
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();