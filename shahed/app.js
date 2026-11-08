// ==========================================
// 🔐 إعداد Firebase (معلومات عامة - ليست سرية)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyA15okly94Qb9XXSMdVdhGg5D4lMqLW1Iw",
    authDomain: "kefo-posts.firebaseapp.com",
    projectId: "kefo-posts",
    storageBucket: "kefo-posts.firebasestorage.app",
    messagingSenderId: "647282320196",
    appId: "1:647282320196:web:9991aa9db6dfec8eb72d11",
    measurementId: "G-R9ZQ566K4H"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// ☁️ Cloudinary - بدون مفاتيح حساسة (آمن)
// ==========================================
const CLOUDINARY_CONFIG = {
    cloudName: 'dfkj1qhal',
    uploadPreset: 'shahid_eyan_preset', // تم إنشاؤه في لوحة التحكم
    folder: 'shahid-eyan'
};

// ==========================================
// 📋 أنواع البلاغات
// ==========================================
const REPORT_TYPES = [
    { value: 'فساد', label: '🕵️ فساد', color: '#ff0044' },
    { value: 'حفر', label: '🚧 حفريات', color: '#ff8800' },
    { value: 'احتيال', label: '🎭 احتيال', color: '#ff00ff' },
    { value: 'شكوى مدنية', label: '⚖️ شكوى مدنية', color: '#4488ff' },
    { value: 'بيئة', label: '🌍 بيئة', color: '#00cc66' },
    { value: 'خدمات', label: '🏥 خدمات', color: '#00ddff' },
    { value: 'أمان', label: '🛡️ أمان', color: '#ffcc00' },
    { value: 'تعليم', label: '📚 تعليم', color: '#9966ff' },
    { value: 'صحة', label: '💊 صحة', color: '#ff66aa' },
    { value: 'مواصلات', label: '🚗 مواصلات', color: '#66ccff' },
    { value: 'أخرى', label: '📌 أخرى', color: '#888888' }
];

// ==========================================
// 📦 متغيرات عامة
// ==========================================
const app = document.getElementById('app');
let currentUser = null;
let allPosts = [];
let currentTab = 'all';
let toastTimeout = null;
let votedPosts = JSON.parse(localStorage.getItem('votedPosts') || '{}');
let visitorId = localStorage.getItem('visitorId');
let uploadedImages = [];
let isUploading = false;
let lightboxImages = [];
let lightboxIndex = 0;

if (!visitorId) {
    visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('visitorId', visitorId);
}

// ==========================================
// 🛡️ حماية من أدوات المطور
// ==========================================
(function protectDevTools() {
    // منع زر اليمين
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showToast('⚠️ هذه الميزة غير متاحة', true);
        return false;
    });

    // منع اختصارات المطور
    document.addEventListener('keydown', (e) => {
        // منع F12
        if (e.key === 'F12') {
            e.preventDefault();
            showToast('⚠️ أدوات المطور غير متاحة', true);
            return false;
        }
        // منع Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
            e.preventDefault();
            showToast('⚠️ أدوات المطور غير متاحة', true);
            return false;
        }
        // منع Ctrl+Shift+J
        if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
            e.preventDefault();
            showToast('⚠️ أدوات المطور غير متاحة', true);
            return false;
        }
        // منع Ctrl+U (عرض المصدر)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
            e.preventDefault();
            showToast('⚠️ عرض المصدر غير متاح', true);
            return false;
        }
        // منع Ctrl+S (حفظ الصفحة)
        if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault();
            showToast('⚠️ حفظ الصفحة غير متاح', true);
            return false;
        }
    });

    // منع السحب
    document.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
    });

    // منع النقر مع الضغط (بعض المتصفحات)
    document.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            e.preventDefault();
            return false;
        }
    });

    console.log('🛡️ تم تفعيل الحماية من أدوات المطور');
})();

// ==========================================
// 🖼️ Lightbox - تكبير الصور
// ==========================================
function openLightbox(images, index) {
    lightboxImages = images;
    lightboxIndex = index;
    
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.id = 'lightboxOverlay';
    
    overlay.innerHTML = `
        <button class="lightbox-close" id="lightboxClose">✕</button>
        <div class="lightbox-content">
            <img src="${images[index]}" alt="صورة مكبرة" id="lightboxImage" />
        </div>
        <div class="lightbox-counter">${index + 1} / ${images.length}</div>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // إغلاق عند النقر على الخلفية
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeLightbox();
    });
    
    // زر الإغلاق
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    
    // التنقل بين الصور (لوحة المفاتيح)
    document.addEventListener('keydown', lightboxKeyHandler);
    
    // التنقل باللمس (سحب)
    let touchStartX = 0;
    overlay.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    overlay.addEventListener('touchend', (e) => {
        const diff = touchStartX - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) lightboxNext();
            else lightboxPrev();
        }
    });
}

function closeLightbox() {
    const overlay = document.getElementById('lightboxOverlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', lightboxKeyHandler);
}

function lightboxNext() {
    if (lightboxIndex < lightboxImages.length - 1) {
        lightboxIndex++;
        updateLightboxImage();
    } else {
        showToast('⚠️ هذه آخر صورة', true);
    }
}

function lightboxPrev() {
    if (lightboxIndex > 0) {
        lightboxIndex--;
        updateLightboxImage();
    } else {
        showToast('⚠️ هذه أول صورة', true);
    }
}

function updateLightboxImage() {
    const img = document.getElementById('lightboxImage');
    const counter = document.querySelector('.lightbox-counter');
    if (img) img.src = lightboxImages[lightboxIndex];
    if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

function lightboxKeyHandler(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') lightboxNext();
    if (e.key === 'ArrowLeft') lightboxPrev();
}

// ==========================================
// 📤 دالة رفع الصور إلى Cloudinary
// ==========================================
async function uploadImageToCloudinary(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);
        formData.append('folder', CLOUDINARY_CONFIG.folder);
        
        const timestamp = Date.now();
        const publicId = `report_${timestamp}_${Math.random().toString(36).substr(2, 6)}`;
        formData.append('public_id', publicId);
        formData.append('tags', 'temp_10_days');
        
        fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.secure_url) {
                resolve(data.secure_url);
            } else {
                reject(new Error(data.error?.message || 'فشل رفع الصورة'));
            }
        })
        .catch(reject);
    });
}

// ==========================================
// 👥 دوال مساعدة
// ==========================================
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    if (toastTimeout) clearTimeout(toastTimeout);
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (isError) {
        toast.style.borderColor = '#ff0044';
        toast.style.boxShadow = '0 0 30px rgba(255,0,68,0.2)';
    }
    document.body.appendChild(toast);
    
    toastTimeout = setTimeout(() => {
        toast.remove();
        toastTimeout = null;
    }, 3500);
}

function getTimeLeft(createdAt) {
    const expireDays = 10;
    const expireAt = createdAt + (expireDays * 24 * 60 * 60 * 1000);
    const diff = expireAt - Date.now();
    if (diff <= 0) return 'انتهى';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}ي ${hours}س`;
    return `${hours}س`;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar', { day: '2-digit', month: 'short' }) + ' ' + 
           date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
}

function getTypeLabel(value) {
    const found = REPORT_TYPES.find(t => t.value === value);
    return found ? found.label : value;
}

function getTypeColor(value) {
    const found = REPORT_TYPES.find(t => t.value === value);
    return found ? found.color : '#888';
}

function getMood() {
    const moods = ['✨', '💪', '🔥', '🌟', '⚡', '🎯'];
    return moods[Math.floor(Math.random() * moods.length)];
}

// ==========================================
// 👥 عدّاد الزيارات
// ==========================================
async function updateVisitorCounter() {
    try {
        const counterRef = db.collection('visitors').doc('counter');
        await counterRef.set({
            count: firebase.firestore.FieldValue.increment(1),
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        const doc = await counterRef.get();
        if (doc.exists) {
            const el = document.querySelector('.visitor-counter .count');
            if (el) el.textContent = doc.data().count || 0;
        }
    } catch (error) {
        console.error('خطأ في تحديث العداد:', error);
    }
}

// ==========================================
// 📨 مشاركة دعوة صديق
// ==========================================
function shareInvite() {
    const message = `جرّب خدمة شاهد عيان : نشر بلاغات لحماية المواطن.\nعلى منصة Syria OS\nبوابة خدمات ذكية بواجهة عربية حديثة تعرض الطقس والموقع والخدمات في مكان واحد.\nالرابط: https://kefo-tech.github.io/syria/`;
    
    if (navigator.share) {
        navigator.share({
            title: 'شاهد عيان - منصة البلاغات المجتمعية',
            text: message,
        }).then(() => {
            showToast('✅ تم المشاركة بنجاح!');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                console.error('خطأ في المشاركة:', error);
                fallbackShare(message);
            }
        });
    } else {
        fallbackShare(message);
    }
}

function fallbackShare(message) {
    // محاولة نسخ الرابط إلى الحافظة
    if (navigator.clipboard) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('📋 تم نسخ الرسالة! شاركها مع أصدقائك');
        }).catch(() => {
            // إذا فشل النسخ، نفتح نافذة جديدة للمشاركة
            const encoded = encodeURIComponent(message);
            window.open(`https://wa.me/?text=${encoded}`, '_blank');
        });
    } else {
        // افتح واتساب مباشرة كحل بديل
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
}

// ==========================================
// 📋 عرض شاشة تسجيل الدخول
// ==========================================
function renderLogin() {
    app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-icon">👁️</div>
                <h1 class="login-title">شاهد عيان</h1>
                <p class="login-desc">منصة البلاغات المجتمعية</p>
                
                <div id="authForm">
                    <input class="auth-input" id="emailInput" type="email" placeholder="📧 البريد الإلكتروني" />
                    <input class="auth-input" id="passwordInput" type="password" placeholder="🔒 كلمة المرور" />
                    
                    <button class="btn-login" id="loginBtn">🔑 تسجيل الدخول</button>
                    
                    <div class="auth-actions">
                        <button class="btn-secondary" id="registerBtn">📝 إنشاء حساب</button>
                        <button class="btn-secondary" id="resetBtn">🔄 نسيت كلمة المرور</button>
                    </div>
                </div>
                
                <p style="color:rgba(255,255,255,0.1);font-size:0.6rem;margin-top:16px;">
                    ✦ صوتك يصل ✦
                </p>
            </div>
        </div>
        
        <!-- Footer ثابت -->
        <div class="footer">
            <button class="btn-invite" id="inviteBtn">📤 دعوة صديق</button>
            <span class="copyright">جميع الحقوق محفوظة © 2026 شاهد عيان</span>
        </div>
    `;
    
    // ربط زر الدعوة
    document.getElementById('inviteBtn').addEventListener('click', shareInvite);
    
    // ربط أحداث تسجيل الدخول
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) {
            showToast('⚠️ الرجاء إدخال البريد وكلمة المرور', true);
            return;
        }
        loginBtn.disabled = true;
        loginBtn.innerHTML = '⏳ جاري...';
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            let msg = '❌ فشل تسجيل الدخول';
            if (error.code === 'auth/user-not-found') msg = '❌ هذا البريد غير مسجل';
            else if (error.code === 'auth/wrong-password') msg = '❌ كلمة المرور غير صحيحة';
            else if (error.code === 'auth/invalid-email') msg = '❌ البريد غير صحيح';
            else if (error.code === 'auth/too-many-requests') msg = '⚠️ حاول لاحقاً';
            else msg = '❌ ' + error.message;
            showToast(msg, true);
            loginBtn.disabled = false;
            loginBtn.innerHTML = '🔑 تسجيل الدخول';
        }
    });
    
    registerBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) {
            showToast('⚠️ الرجاء إدخال البريد وكلمة المرور', true);
            return;
        }
        if (password.length < 6) {
            showToast('⚠️ كلمة المرور 6 أحرف على الأقل', true);
            return;
        }
        registerBtn.disabled = true;
        registerBtn.innerHTML = '⏳ جاري...';
        try {
            const userCred = await auth.createUserWithEmailAndPassword(email, password);
            const name = email.split('@')[0];
            await userCred.user.updateProfile({ displayName: name });
            showToast('✅ تم إنشاء الحساب بنجاح!');
        } catch (error) {
            let msg = '❌ فشل إنشاء الحساب';
            if (error.code === 'auth/email-already-in-use') msg = '❌ هذا البريد مستخدم بالفعل';
            else if (error.code === 'auth/weak-password') msg = '❌ كلمة المرور ضعيفة';
            else msg = '❌ ' + error.message;
            showToast(msg, true);
            registerBtn.disabled = false;
            registerBtn.innerHTML = '📝 إنشاء حساب';
        }
    });
    
    resetBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) {
            showToast('⚠️ الرجاء إدخال البريد', true);
            return;
        }
        resetBtn.disabled = true;
        resetBtn.innerHTML = '⏳ جاري...';
        try {
            await auth.sendPasswordResetEmail(email);
            showToast('📧 تم إرسال رابط إعادة التعيين');
        } catch (error) {
            showToast('❌ ' + error.message, true);
        } finally {
            resetBtn.disabled = false;
            resetBtn.innerHTML = '🔄 نسيت كلمة المرور';
        }
    });
    
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });
}

// ==========================================
// 📱 عرض التطبيق الرئيسي
// ==========================================
function renderApp() {
    if (!currentUser) {
        renderLogin();
        return;
    }
    
    const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم';
    const userPhoto = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1a1a2e&color=ffd200&size=128`;
    
    // تصفية المنشورات حسب التاب
    let filteredPosts = currentTab === 'all' ? allPosts : allPosts.filter(p => p.authorId === currentUser.uid);
    const displayPosts = filteredPosts.slice(0, 10);
    const hasMorePosts = filteredPosts.length > 10;
    
    let postsHTML = '';
    if (displayPosts.length === 0) {
        postsHTML = `
            <div class="empty-state">
                <span class="icon">📭</span>
                <p>${currentTab === 'all' ? 'لا توجد بلاغات بعد' : 'ليس لديك بلاغات'}</p>
                <p style="font-size:0.7rem;color:rgba(255,255,255,0.2);margin-top:4px;">
                    ${currentTab === 'all' ? 'كن أول من ينشر بلاغاً!' : 'أنشئ بلاغك الأول الآن!'}
                </p>
            </div>
        `;
    } else {
        postsHTML = displayPosts.map(post => {
            const timeLeft = getTimeLeft(post.createdAt);
            const isExpired = timeLeft === 'انتهى';
            const isOwner = post.authorId === currentUser.uid;
            const hasVoted = votedPosts[post.id] || false;
            const typeColor = getTypeColor(post.type);
            
            // عرض الصور إذا وجدت
            let imagesHTML = '';
            if (post.images && post.images.length > 0) {
                const imagesData = post.images.map(img => `'${img}'`).join(',');
                imagesHTML = `
                    <div class="post-images">
                        ${post.images.map((img, idx) => `
                            <img src="${img}" alt="صورة البلاغ" loading="lazy" onclick="openLightbox([${imagesData}], ${idx})" />
                        `).join('')}
                    </div>
                `;
            }
            
            return `
                <div class="post-card" style="opacity:${isExpired ? 0.3 : 1};">
                    <span class="post-type" style="border-color:${typeColor}40;color:${typeColor};">${getTypeLabel(post.type)}</span>
                    <div class="post-header">
                        <div class="post-avatar">${getInitials(post.authorName)}</div>
                        <span class="post-author">${post.authorName || 'مجهول'}</span>
                        <span class="post-time">${formatDate(post.createdAt)}</span>
                        ${isOwner ? `<button class="btn-delete" data-id="${post.id}">🗑️</button>` : ''}
                    </div>
                    <p class="post-content">${post.content}</p>
                    ${imagesHTML}
                    ${post.location ? `<div class="post-location">📍 ${post.location}</div>` : ''}
                    <div class="post-footer">
                        <div class="post-votes">
                            <button class="vote-btn truth ${hasVoted ? 'voted' : ''}" data-id="${post.id}" data-type="truth" ${hasVoted ? 'disabled' : ''}>
                                👍 ${post.truthVotes || 0}
                            </button>
                            <button class="vote-btn false ${hasVoted ? 'voted' : ''}" data-id="${post.id}" data-type="false" ${hasVoted ? 'disabled' : ''}>
                                👎 ${post.falseVotes || 0}
                            </button>
                        </div>
                        <span class="post-expire">⏳ ${timeLeft}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // بناء خيارات أنواع البلاغات
    const typeOptions = REPORT_TYPES.map(t => 
        `<option value="${t.value}">${t.label}</option>`
    ).join('');
    
    // عرض معاينة الصور المرفوعة
    let previewHTML = '';
    if (uploadedImages.length > 0) {
        previewHTML = `
            <div class="upload-preview">
                ${uploadedImages.map((url, index) => `
                    <div class="preview-item">
                        <img src="${url}" alt="صورة مرفوعة" onclick="openLightbox(uploadedImages, ${index})" />
                        <button class="remove-btn" data-index="${index}">✕</button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    app.innerHTML = `
        <!-- Header -->
        <header class="header" id="mainHeader">
            <h1 class="logo">👁️ شاهد عيان</h1>
            <div class="logo-sub">✦ منصة البلاغات المجتمعية ✦</div>
        </header>
        
        <!-- عداد الزيارات -->
        <div class="visitor-counter">
            👥 زوار المنصة: <span class="count">0</span>
        </div>
        
        <!-- معلومات المستخدم -->
        <div class="user-info">
            <img class="user-avatar" src="${userPhoto}" alt="${userName}" />
            <div style="flex:1;min-width:0;margin-right:10px;">
                <div class="user-name">${userName}</div>
                <div class="user-email">${currentUser.email || ''}</div>
            </div>
            <button class="btn-logout" id="logoutBtn">🚪 خروج</button>
        </div>
        
        <!-- تبويب -->
        <div class="tabs">
            <button class="tab-btn ${currentTab === 'all' ? 'active' : ''}" data-tab="all">🌍 الكل</button>
            <button class="tab-btn ${currentTab === 'my' ? 'active' : ''}" data-tab="my">📁 ملفي</button>
        </div>
        
        <!-- نموذج النشر -->
        <div class="post-form">
            <div class="form-group">
                <label class="form-label">📋 نوع البلاغ</label>
                <select class="form-select" id="reportType">
                    ${typeOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">✍️ تفاصيل البلاغ</label>
                <textarea class="form-textarea" id="reportContent" placeholder="اكتب تفاصيل البلاغ هنا..." maxlength="2000"></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">🖼️ إرفاق صور (اختياري)</label>
                <div class="upload-area" id="uploadArea">
                    <span class="icon">📸</span>
                    <div class="text">اضغط لاختيار صور</div>
                    <div class="hint">يدعم JPG, PNG, GIF (حتى 10 ميجابايت)</div>
                </div>
                <input type="file" id="fileInput" accept="image/*" multiple style="display:none;" />
                ${previewHTML}
            </div>
            
            <div class="form-group">
                <button class="btn-location" id="locationBtn">📍 تحديد موقع البلاغ</button>
                <div class="location-info" id="locationInfo">لم يتم تحديد موقع</div>
            </div>
            
            <button class="btn-submit" id="submitBtn">🚀 نشر البلاغ</button>
        </div>
        
        <!-- قائمة المنشورات -->
        <div class="posts-list" id="postsList">
            ${postsHTML}
        </div>
        
        ${hasMorePosts ? `<div class="load-more" id="loadMore">⬇️ تحميل المزيد</div>` : ''}
        
        <!-- Footer ثابت -->
        <div class="footer">
            <button class="btn-invite" id="inviteBtn">📤 دعوة صديق</button>
            <span class="copyright">جميع الحقوق محفوظة © 2026 شاهد عيان</span>
        </div>
    `;
    
    // ==========================================
    // 🔗 ربط الأحداث
    // ==========================================
    
    // تحديث عداد الزيارات
    updateVisitorCounter();
    
    // تأثير تصغير الهيدر عند التمرير
    const header = document.getElementById('mainHeader');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > 30) {
            header.classList.add('shrink');
        } else {
            header.classList.remove('shrink');
        }
        lastScrollY = currentScrollY;
    }, { passive: true });
    
    // زر الدعوة
    document.getElementById('inviteBtn').addEventListener('click', shareInvite);
    
    // تبويبات
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            renderApp();
        });
    });
    
    // زر الخروج
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await auth.signOut();
        showToast('👋 تم تسجيل الخروج');
    });
    
    // ===== رفع الصور =====
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files.length === 0) return;
        
        if (isUploading) {
            showToast('⏳ جاري رفع الصور...', true);
            return;
        }
        
        isUploading = true;
        showToast('⏳ جاري رفع الصور...');
        
        try {
            for (const file of files) {
                if (file.size > 10 * 1024 * 1024) {
                    showToast(`⚠️ الصورة ${file.name} كبيرة جداً (حد 10 ميجابايت)`, true);
                    continue;
                }
                if (!file.type.startsWith('image/')) {
                    showToast(`⚠️ الملف ${file.name} ليس صورة`, true);
                    continue;
                }
                const url = await uploadImageToCloudinary(file);
                if (url) {
                    uploadedImages.push(url);
                    showToast(`✅ تم رفع ${file.name}`);
                }
            }
            renderApp();
        } catch (error) {
            console.error('خطأ في رفع الصور:', error);
            showToast('❌ فشل رفع بعض الصور: ' + error.message, true);
        } finally {
            isUploading = false;
            fileInput.value = '';
        }
    });
    
    // حذف صورة من المعاينة
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            uploadedImages.splice(index, 1);
            renderApp();
        });
    });
    
    // ===== زر تحديد الموقع =====
    let userLocation = null;
    document.getElementById('locationBtn').addEventListener('click', () => {
        const btn = document.getElementById('locationBtn');
        const info = document.getElementById('locationInfo');
        
        if (!navigator.geolocation) {
            showToast('⚠️ متصفحك لا يدعم تحديد الموقع', true);
            return;
        }
        
        btn.textContent = '⏳ جاري تحديد الموقع...';
        btn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = `${position.coords.latitude}, ${position.coords.longitude}`;
                info.textContent = `📍 تم تحديد الموقع: ${userLocation}`;
                info.style.color = '#ffd200';
                btn.textContent = '📍 تم تحديد الموقع ✓';
                btn.className = 'btn-location active';
                btn.disabled = false;
                showToast('✅ تم تحديد الموقع بنجاح');
            },
            (error) => {
                console.error('خطأ في تحديد الموقع:', error);
                showToast('⚠️ لم نتمكن من تحديد موقعك', true);
                btn.textContent = '📍 تحديد موقع البلاغ';
                btn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
    
    // ===== زر النشر =====
    document.getElementById('submitBtn').addEventListener('click', async () => {
        const type = document.getElementById('reportType').value;
        const content = document.getElementById('reportContent').value.trim();
        
        if (!content) {
            showToast('✏️ الرجاء كتابة تفاصيل البلاغ', true);
            return;
        }
        
        if (content.length < 5) {
            showToast('✏️ النص قصير جداً (5 أحرف على الأقل)', true);
            return;
        }
        
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ جاري النشر...';
        
        try {
            const imagesToSave = [...uploadedImages];
            
            await db.collection('posts').add({
                type: type,
                content: content,
                images: imagesToSave,
                location: userLocation || null,
                authorId: currentUser.uid,
                authorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم',
                authorPhoto: currentUser.photoURL || '',
                createdAt: Date.now(),
                truthVotes: 0,
                falseVotes: 0,
                mood: getMood()
            });
            
            document.getElementById('reportContent').value = '';
            uploadedImages = [];
            userLocation = null;
            document.getElementById('locationInfo').textContent = 'لم يتم تحديد موقع';
            document.getElementById('locationInfo').style.color = 'rgba(255,215,0,0.4)';
            document.getElementById('locationBtn').textContent = '📍 تحديد موقع البلاغ';
            document.getElementById('locationBtn').className = 'btn-location';
            
            showToast('✅ تم نشر البلاغ بنجاح!');
        } catch (error) {
            console.error('خطأ في النشر:', error);
            showToast('❌ فشل النشر: ' + error.message, true);
        } finally {
            btn.disabled = false;
            btn.textContent = '🚀 نشر البلاغ';
        }
    });
    
    // ===== أزرار التصويت =====
    document.querySelectorAll('.vote-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id;
            const type = btn.dataset.type;
            
            if (votedPosts[postId]) {
                showToast('⚠️ سبق لك التصويت على هذا البلاغ', true);
                return;
            }
            
            try {
                const field = type === 'truth' ? 'truthVotes' : 'falseVotes';
                await db.collection('posts').doc(postId).update({
                    [field]: firebase.firestore.FieldValue.increment(1)
                });
                
                votedPosts[postId] = true;
                localStorage.setItem('votedPosts', JSON.stringify(votedPosts));
                showToast('✅ تم التصويت بنجاح!');
                renderApp();
            } catch (error) {
                console.error('خطأ في التصويت:', error);
                showToast('❌ فشل التصويت: ' + error.message, true);
            }
        });
    });
    
    // ===== أزرار الحذف =====
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id;
            if (!confirm('🗑️ هل تريد حذف هذا البلاغ نهائياً؟')) return;
            try {
                await db.collection('posts').doc(postId).delete();
                showToast('🗑️ تم حذف البلاغ');
            } catch (error) {
                showToast('❌ فشل الحذف: ' + error.message, true);
            }
        });
    });
    
    // ===== تحميل المزيد =====
    const loadMore = document.getElementById('loadMore');
    if (loadMore) {
        loadMore.addEventListener('click', () => {
            const currentCount = document.querySelectorAll('.post-card').length;
            const newPosts = filteredPosts.slice(currentCount, currentCount + 10);
            
            if (newPosts.length > 0) {
                let newHTML = '';
                newPosts.forEach(post => {
                    const timeLeft = getTimeLeft(post.createdAt);
                    const isExpired = timeLeft === 'انتهى';
                    const isOwner = post.authorId === currentUser.uid;
                    const hasVoted = votedPosts[post.id] || false;
                    const typeColor = getTypeColor(post.type);
                    
                    let imagesHTML = '';
                    if (post.images && post.images.length > 0) {
                        const imagesData = post.images.map(img => `'${img}'`).join(',');
                        imagesHTML = `
                            <div class="post-images">
                                ${post.images.map((img, idx) => `
                                    <img src="${img}" alt="صورة البلاغ" loading="lazy" onclick="openLightbox([${imagesData}], ${idx})" />
                                `).join('')}
                            </div>
                        `;
                    }
                    
                    newHTML += `
                        <div class="post-card" style="opacity:${isExpired ? 0.3 : 1};">
                            <span class="post-type" style="border-color:${typeColor}40;color:${typeColor};">${getTypeLabel(post.type)}</span>
                            <div class="post-header">
                                <div class="post-avatar">${getInitials(post.authorName)}</div>
                                <span class="post-author">${post.authorName || 'مجهول'}</span>
                                <span class="post-time">${formatDate(post.createdAt)}</span>
                                ${isOwner ? `<button class="btn-delete" data-id="${post.id}">🗑️</button>` : ''}
                            </div>
                            <p class="post-content">${post.content}</p>
                            ${imagesHTML}
                            ${post.location ? `<div class="post-location">📍 ${post.location}</div>` : ''}
                            <div class="post-footer">
                                <div class="post-votes">
                                    <button class="vote-btn truth ${hasVoted ? 'voted' : ''}" data-id="${post.id}" data-type="truth" ${hasVoted ? 'disabled' : ''}>
                                        👍 ${post.truthVotes || 0}
                                    </button>
                                    <button class="vote-btn false ${hasVoted ? 'voted' : ''}" data-id="${post.id}" data-type="false" ${hasVoted ? 'disabled' : ''}>
                                        👎 ${post.falseVotes || 0}
                                    </button>
                                </div>
                                <span class="post-expire">⏳ ${timeLeft}</span>
                            </div>
                        </div>
                    `;
                });
                
                document.getElementById('postsList').insertAdjacentHTML('beforeend', newHTML);
                
                // إعادة ربط الأحداث للأزرار الجديدة
                document.querySelectorAll('.vote-btn:not([disabled])').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const postId = btn.dataset.id;
                        const type = btn.dataset.type;
                        if (votedPosts[postId]) {
                            showToast('⚠️ سبق لك التصويت', true);
                            return;
                        }
                        try {
                            const field = type === 'truth' ? 'truthVotes' : 'falseVotes';
                            await db.collection('posts').doc(postId).update({
                                [field]: firebase.firestore.FieldValue.increment(1)
                            });
                            votedPosts[postId] = true;
                            localStorage.setItem('votedPosts', JSON.stringify(votedPosts));
                            showToast('✅ تم التصويت بنجاح!');
                            renderApp();
                        } catch (error) {
                            showToast('❌ فشل التصويت: ' + error.message, true);
                        }
                    });
                });
                
                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const postId = btn.dataset.id;
                        if (!confirm('🗑️ هل تريد حذف هذا البلاغ؟')) return;
                        try {
                            await db.collection('posts').doc(postId).delete();
                            showToast('🗑️ تم الحذف');
                        } catch (error) {
                            showToast('❌ فشل الحذف: ' + error.message, true);
                        }
                    });
                });
                
                if (currentCount + newPosts.length >= filteredPosts.length) {
                    loadMore.style.display = 'none';
                }
            }
        });
    }
}

// ==========================================
// 📡 الاستماع للمنشورات (Realtime)
// ==========================================
function listenPosts() {
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            allPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            if (currentUser) renderApp();
        }, (error) => {
            console.error('خطأ في جلب المنشورات:', error);
            if (error.code === 'permission-denied') {
                showToast('⚠️ مشكلة في الصلاحيات', true);
            }
        });
}

// ==========================================
// 🗑️ حذف المنشورات المنتهية (10 أيام)
// ==========================================
setInterval(async () => {
    const now = Date.now();
    const expireDays = 10;
    const expireMs = expireDays * 24 * 60 * 60 * 1000;
    
    for (const post of allPosts) {
        if (post.createdAt && (now - post.createdAt) > expireMs) {
            try {
                await db.collection('posts').doc(post.id).delete();
                console.log('🗑️ تم حذف منشور منتهي:', post.id);
            } catch (error) {
                // تجاهل
            }
        }
    }
}, 60000);

// ==========================================
// 👤 مراقبة حالة تسجيل الدخول
// ==========================================
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        renderApp();
    } else {
        renderLogin();
    }
});

// ==========================================
// 🚀 بدء التطبيق
// ==========================================
listenPosts();

console.log('👁️ شاهد عيان - منصة البلاغات المجتمعية');
console.log('📱 تم التحميل بنجاح!');
console.log('🛡️ الحماية من أدوات المطور مفعلة');
console.log('🖼️ ميزة تكبير الصور مفعلة');
console.log('📤 زر دعوة صديق مفعل');
console.log('🔽 تأثير تصغير الهيدر مفعل');
