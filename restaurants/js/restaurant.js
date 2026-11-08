/* =========================================================
   KEFO FOOD — RESTAURANT.JS V2
   يدعم: بحث | تصنيفات | سكيليتون | حالة فارغة |
   معلومات سريعة | مفضلة | توست | مشاركة | رجوع |
   تقييم المطعم بالنجوم ⭐
================================== ======================= */

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  setDoc,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const RestaurantPage = {

  restaurantId: null,
  restaurantData: null,
  currentCategory: "all",
  searchQuery: "",
  mealsData: [],
  favorites: [],
  userRating: 0,
  selectedStars: 0,

  /* ========================================== */
  init() {
    this.cacheDom();
    this.enableProtection();
    this.initBackButton();
    this.initShare();
    this.initMenuSearch();
    this.initBackToTop();
    this.initScrollListener();
    this.initRatingModal();
    this.loadRestaurant();
  },

  /* ========================================== */
  cacheDom() {
    this.menu = document.getElementById("restaurantMenu");
    this.skeleton = document.getElementById("skeletonLoader");
    this.emptyState = document.getElementById("emptyState");
    this.emptyMessage = document.getElementById("emptyMessage");
    this.resultsInfo = document.getElementById("resultsInfo");
    this.resultsCount = document.getElementById("resultsCount");
    this.activeFilters = document.getElementById("activeFilters");
    this.filterTag = document.getElementById("filterTag");
    this.clearFiltersBtn = document.getElementById("clearFilters");
    this.backToTopBtn = document.getElementById("backToTop");
    this.searchInput = document.getElementById("menuSearchInput");
    this.clearSearchBtn = document.getElementById("clearMenuSearch");
    this.resetSearchBtn = document.getElementById("resetMenuSearch");
    this.filtersContainer = document.getElementById("filtersContainer");

    // التقييم
    this.ratingRow = document.getElementById("ratingRow");
    this.ratingAverage = document.getElementById("ratingAverage");
    this.ratingStarsDisplay = document.getElementById("ratingStarsDisplay");
    this.ratingCount = document.getElementById("ratingCount");
    this.rateBtn = document.getElementById("rateRestaurantBtn");
    this.ratingModal = document.getElementById("ratingModal");
    this.closeRatingModal = document.getElementById("closeRatingModal");
    this.ratingStarsInput = document.getElementById("ratingStarsInput");
    this.ratingHint = document.getElementById("ratingHint");
    this.cancelRating = document.getElementById("cancelRating");
    this.submitRating = document.getElementById("submitRating");
  },

  /* ========================================== */
  enableProtection() {
    if (window.location.hostname !== "localhost") {
      document.addEventListener("contextmenu", e => e.preventDefault());
    }
  },

  /* ========================================== */
  initBackButton() {
    const backBtn = document.getElementById("backBtn");
    if (!backBtn) return;
    backBtn.addEventListener("click", () => {
      window.location.href = "./index.html";
    });
  },

  /* ========================================== */
  /* ========================================== */
initShare() {
  const shareBtn = document.getElementById("shareRestaurantBtn");
  if (!shareBtn) return;

  shareBtn.addEventListener("click", async () => {
    const name = this.restaurantData?.restaurantName || "هذا المطعم";
    const desc = this.restaurantData?.description || "مطعم رائع";
    const category = this.restaurantData?.mainCategory || "";
    const rating = this.restaurantData?.rating || "";
    
    let shareText = `لقد أحببت أن أشاركك هذا المطعم ${name}`;
    
    if (category) {
      shareText += ` - ${category}`;
    }
    
    if (desc && desc.length < 60) {
      shareText += `\n${desc}`;
    }
    
    if (rating) {
      shareText += `\n⭐ ${rating}`;
    }
    
    shareText += `\n\nعبر منصة Syria OS:\n`;

    const shareData = {
      title: `${name} | Syria OS`,
      text: shareText,
      url: "https://kefo-tech.github.io/syria"
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareText);
        this.showToast("✅ تم نسخ النص للمشاركة");
      }
    } catch (err) {}
  });
},

  /* ==========================================
     MENU SEARCH
  ========================================== */
  initMenuSearch() {
    if (!this.searchInput) return;

    let debounceTimer;

    this.searchInput.addEventListener("input", (e) => {
      const value = e.target.value.trim();
      if (this.clearSearchBtn) {
        this.clearSearchBtn.style.display = value ? "block" : "none";
      }

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.searchQuery = value;
        this.renderMeals();
      }, 300);
    });

    if (this.clearSearchBtn) {
      this.clearSearchBtn.addEventListener("click", () => {
        this.searchInput.value = "";
        this.searchQuery = "";
        this.clearSearchBtn.style.display = "none";
        this.renderMeals();
        this.searchInput.focus();
      });
    }

    if (this.resetSearchBtn) {
      this.resetSearchBtn.addEventListener("click", () => {
        this.searchQuery = "";
        this.currentCategory = "all";
        if (this.searchInput) this.searchInput.value = "";
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = "none";
        this.resetFiltersUI();
        this.renderMeals();
      });
    }
  },

  /* ========================================== */
  resetFiltersUI() {
    document.querySelectorAll(".restaurant-filter").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    const allBtn = document.querySelector('[data-category="all"]');
    if (allBtn) {
      allBtn.classList.add("active");
      allBtn.setAttribute("aria-pressed", "true");
    }
  },

  /* ========================================== */
  initClearFilters() {
    if (!this.clearFiltersBtn) return;
    this.clearFiltersBtn.addEventListener("click", () => {
      this.searchQuery = "";
      this.currentCategory = "all";
      if (this.searchInput) this.searchInput.value = "";
      if (this.clearSearchBtn) this.clearSearchBtn.style.display = "none";
      this.resetFiltersUI();
      this.renderMeals();
    });
  },

  /* ==========================================
     BACK TO TOP
  ========================================== */
  initBackToTop() {
    if (!this.backToTopBtn) return;
    this.backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  },

  initScrollListener() {
    if (!this.backToTopBtn) return;
    window.addEventListener("scroll", () => {
      this.backToTopBtn.style.display = window.scrollY > 500 ? "flex" : "none";
    });
  },

  /* ==========================================
     RATING MODAL
  ========================================== */
  initRatingModal() {
    // فتح النافذة
    if (this.rateBtn) {
      this.rateBtn.addEventListener("click", () => {
        if (this.ratingModal) {
          this.ratingModal.style.display = "flex";
          this.selectedStars = 0;
          this.updateStarInput();
          this.submitRating.disabled = true;
          this.ratingHint.textContent = "اختر من 1 إلى 5 نجوم";
        }
      });
    }

    // إغلاق النافذة
    if (this.closeRatingModal) {
      this.closeRatingModal.addEventListener("click", () => {
        this.ratingModal.style.display = "none";
      });
    }

    if (this.cancelRating) {
      this.cancelRating.addEventListener("click", () => {
        this.ratingModal.style.display = "none";
      });
    }

    // النقر خارج النافذة يغلقها
    if (this.ratingModal) {
      this.ratingModal.addEventListener("click", (e) => {
        if (e.target === this.ratingModal) {
          this.ratingModal.style.display = "none";
        }
      });
    }

    // النجوم التفاعلية
    if (this.ratingStarsInput) {
      const stars = this.ratingStarsInput.querySelectorAll("span");

      stars.forEach(star => {
        star.addEventListener("click", () => {
          this.selectedStars = parseInt(star.dataset.star);
          this.updateStarInput();
          this.submitRating.disabled = false;

          const hints = ["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"];
          this.ratingHint.textContent = hints[this.selectedStars];
        });

        star.addEventListener("mouseenter", () => {
          const val = parseInt(star.dataset.star);
          stars.forEach((s, i) => {
            if (i < val) s.textContent = "★";
            else s.textContent = "☆";
          });
        });

        star.addEventListener("mouseleave", () => {
          this.updateStarInput();
        });
      });
    }

    // إرسال التقييم
    if (this.submitRating) {
      this.submitRating.addEventListener("click", () => {
        this.submitUserRating();
      });
    }
  },

  /* ========================================== */
  updateStarInput() {
    if (!this.ratingStarsInput) return;
    const stars = this.ratingStarsInput.querySelectorAll("span");

    stars.forEach((star, i) => {
      if (i < this.selectedStars) {
        star.textContent = "★";
        star.classList.add("active", "selected");
      } else {
        star.textContent = "☆";
        star.classList.remove("active", "selected");
      }
    });
  },

  /* ==========================================
     SUBMIT RATING
  ========================================== */
  async submitUserRating() {
    if (!this.selectedStars || !this.restaurantId) return;

    const deviceId = this.getDeviceId();

    try {
      // حفظ التقييم في subcollection
      const ratingRef = doc(
        db,
        "restaurants",
        this.restaurantId,
        "ratings",
        deviceId
      );

      await setDoc(ratingRef, {
        stars: this.selectedStars,
        deviceId: deviceId,
        createdAt: new Date().toISOString()
      });

      // حفظ معرف الجهاز محليًا
      localStorage.setItem(`rated_${this.restaurantId}`, this.selectedStars);
      this.userRating = this.selectedStars;

      // إغلاق النافذة
      this.ratingModal.style.display = "none";

      // تحديث الزر
      if (this.rateBtn) {
        this.rateBtn.textContent = "✅ تم تقييمك";
        this.rateBtn.classList.add("voted");
      }

      // تحديث العرض
      this.loadRatings();

      this.showToast(`⭐ تم تقييم المطعم بـ ${this.selectedStars} نجوم`);

    } catch (error) {
      console.error("Rating error:", error);
      this.showToast("❌ حدث خطأ في إرسال التقييم");
    }
  },

  /* ==========================================
     LOAD RATINGS
  ========================================== */
  async loadRatings() {
    if (!this.restaurantId) return;

    try {
      const ratingsSnap = await getDocs(
        collection(db, "restaurants", this.restaurantId, "ratings")
      );

      let totalStars = 0;
      let count = 0;
      let userStars = 0;

      ratingsSnap.forEach(docSnap => {
        const data = docSnap.data();
        totalStars += data.stars || 0;
        count++;
      });

      // حساب المتوسط
      const average = count > 0 ? (totalStars / count).toFixed(1) : null;

      // التحقق من تقييم المستخدم الحالي
      const deviceId = this.getDeviceId();
      const userRatingDoc = ratingsSnap.docs.find(d => d.id === deviceId);
      if (userRatingDoc) {
        userStars = userRatingDoc.data().stars;
        this.userRating = userStars;
      } else {
        // التحقق من localStorage
        const savedRating = localStorage.getItem(`rated_${this.restaurantId}`);
        if (savedRating) {
          this.userRating = parseInt(savedRating);
        }
      }

      // تحديث الواجهة
      this.updateRatingDisplay(average, count, userStars);

    } catch (error) {
      console.error("Load ratings error:", error);
    }
  },

  /* ==========================================
     UPDATE RATING DISPLAY
  ========================================== */
  updateRatingDisplay(average, count, userStars) {
    // متوسط التقييم
    if (this.ratingAverage) {
      this.ratingAverage.textContent = average !== null ? average : "---";
    }

    // ⭐ تحديث restaurantRating في الهيرو
    const heroRating = document.getElementById("restaurantRating");
    if (heroRating) {
      if (average !== null) {
        const starsDisplay = "⭐".repeat(Math.round(parseFloat(average)));
        heroRating.textContent = `${starsDisplay} ${average}`;
      } else {
        heroRating.textContent = `⭐ ---`;
      }
    }

    // عدد المقيمين
    if (this.ratingCount) {
      this.ratingCount.textContent = count > 0 ? `(${count} تقييم)` : "(0 تقييم)";
    }

    // النجوم المعروضة
    if (this.ratingStarsDisplay && average !== null) {
      this.ratingStarsDisplay.innerHTML = this.generateStarsHTML(parseFloat(average));
    } else if (this.ratingStarsDisplay) {
      this.ratingStarsDisplay.innerHTML = '<span class="star-empty">☆</span><span class="star-empty">☆</span><span class="star-empty">☆</span><span class="star-empty">☆</span><span class="star-empty">☆</span>';
    }

    // زر التقييم
    if (this.rateBtn) {
      if (userStars > 0) {
        this.rateBtn.textContent = `✅ تقييمك: ${userStars}⭐`;
        this.rateBtn.classList.add("voted");
      } else {
        this.rateBtn.textContent = "⭐ قيّم المطعم";
        this.rateBtn.classList.remove("voted");
      }
    }
  },

  /* ==========================================
     GENERATE STARS HTML
  ========================================== */
  generateStarsHTML(average) {
    let html = "";
    const fullStars = Math.floor(average);
    const decimal = average - fullStars;
    const hasHalf = decimal >= 0.25 && decimal < 0.75;
    const roundUp = decimal >= 0.75;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        html += '<span class="star-filled">★</span>';
      } else if (i === fullStars + 1 && hasHalf) {
        html += '<span class="star-half">★</span>';
      } else if (i === fullStars + 1 && roundUp) {
        html += '<span class="star-filled">★</span>';
      } else {
        html += '<span class="star-empty">☆</span>';
      }
    }

    return html;
  },

  /* ==========================================
     DEVICE ID (بدون مكتبة خارجية)
  ========================================== */
  getDeviceId() {
    let deviceId = localStorage.getItem("kefo_device_id");
    if (!deviceId) {
      deviceId = "device_" + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
      localStorage.setItem("kefo_device_id", deviceId);
    }
    return deviceId;
  },

  /* ==========================================
     LOAD RESTAURANT
  ========================================== */
  async loadRestaurant() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      this.showEmptyState("معرف المطعم غير موجود.");
      this.hideSkeleton();
      return;
    }

    this.restaurantId = id;

    try {
      const ref = doc(db, "restaurants", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        this.showEmptyState("المطعم غير موجود.");
        this.hideSkeleton();
        return;
      }

      this.restaurantData = snap.data();
      this.populateRestaurantInfo();
      this.initRestaurantFavorite();
      this.loadCategories();
      this.loadMeals();
      this.loadRatings();
      this.hideSkeleton();

    } catch (error) {
      console.error("Load error:", error);
      this.showEmptyState("حدث خطأ في تحميل بيانات المطعم.");
      this.hideSkeleton();
    }
  },

  /* ==========================================
     POPULATE INFO
  ========================================== */
  populateRestaurantInfo() {
    const data = this.restaurantData;

    document.title = `${data.restaurantName || "مطعم"} | KeFo Food`;

    document.getElementById("restaurantName").textContent = data.restaurantName || "مطعم";
    document.getElementById("restaurantDescription").textContent = data.description || "";

    const cover = document.getElementById("restaurantCover");
    cover.src = data.coverImage || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5";

    const statusEl = document.getElementById("restaurantStatus");
    if (data.status === "open") {
      statusEl.textContent = "🟢 مفتوح";
    } else if (data.status === "closing") {
      statusEl.textContent = "🟡 يغلق قريباً";
    } else if (data.status === "closed") {
      statusEl.textContent = "🔴 مغلق";
    } else {
      statusEl.textContent = "🟡 غير معروف";
    }

    document.getElementById("restaurantDistance").textContent = "📍 جاري التحديد...";
    this.calculateAndShowDistance(data);

    document.getElementById("workingHours").textContent = data.workingHours || "غير محدد";
    document.getElementById("deliveryInfo").textContent = data.deliveryAvailable ? "🚀 توصيل متاح" : "❌ لا يوجد توصيل";

    document.getElementById("callBtn").href = `tel:${data.phone || "#"}`;
    document.getElementById("whatsappBtn").href = `https://wa.me/${(data.whatsapp || "").replace(/\+/g, "")}`;

    const mapsBtn = document.getElementById("mapsBtn");
    if (data.latitude != null && data.longitude != null) {
      mapsBtn.href = `https://maps.google.com/?q=${data.latitude},${data.longitude}`;
      mapsBtn.target = "_blank";
    } else {
      mapsBtn.href = "#";
      mapsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("موقع المطعم غير محدد.");
      });
    }
  },

  /* ==========================================
     GPS DISTANCE
  ========================================== */
  calculateAndShowDistance(data) {
    if (!data.latitude || !data.longitude) {
      document.getElementById("restaurantDistance").textContent = "📍 غير محدد";
      return;
    }

    if (!navigator.geolocation) {
      document.getElementById("restaurantDistance").textContent = "📍 غير محدد";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const distance = this.calculateDistance(userLat, userLng, data.latitude, data.longitude);

        if (distance !== null) {
          const text = distance < 1
            ? `📍 ${Math.round(distance * 1000)}م`
            : `📍 ${distance.toFixed(1)}كم`;
          document.getElementById("restaurantDistance").textContent = text;
        }
      },
      () => {
        document.getElementById("restaurantDistance").textContent = "📍 غير محدد";
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
  },

  toRad(value) {
    return value * Math.PI / 180;
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    lat1 = Number(lat1); lon1 = Number(lon1);
    lat2 = Number(lat2); lon2 = Number(lon2);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return null;

    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /* ==========================================
     CATEGORIES
  ========================================== */
  loadCategories() {
    if (!this.filtersContainer) return;

    onSnapshot(
      collection(db, "restaurants", this.restaurantId, "categories"),
      (snapshot) => {
        let html = '<button class="restaurant-filter active" data-category="all" aria-pressed="true">🌟 الكل</button>';

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          html += `<button class="restaurant-filter" data-category="${data.name}" aria-pressed="false">${data.name}</button>`;
        });

        this.filtersContainer.innerHTML = html;
        this.initFilters();
      }
    );
  },

  initFilters() {
    const filters = document.querySelectorAll(".restaurant-filter");

    filters.forEach(btn => {
      btn.addEventListener("click", () => {
        filters.forEach(f => {
          f.classList.remove("active");
          f.setAttribute("aria-pressed", "false");
        });

        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");

        this.currentCategory = btn.dataset.category;
        this.renderMeals();
      });
    });
  },

  /* ==========================================
     LOAD MEALS
  ========================================== */
  loadMeals() {
    if (!this.menu) return;

    onSnapshot(
      collection(db, "restaurants", this.restaurantId, "meals"),
      (snapshot) => {
        this.mealsData = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          data: docSnap.data()
        }));

        document.getElementById("mealsCount").textContent = `${this.mealsData.length} وجبة`;

        this.renderMeals();
      }
    );
  },

  /* ==========================================
     RENDER MEALS
  ========================================== */
  renderMeals() {
    if (!this.menu) return;

    let meals = [...this.mealsData];

    if (this.currentCategory !== "all") {
      meals = meals.filter(item => item.data.categoryName === this.currentCategory);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      meals = meals.filter(item => {
        const name = (item.data.name || "").toLowerCase();
        const desc = (item.data.description || "").toLowerCase();
        return name.includes(query) || desc.includes(query);
      });
    }

    this.updateUIInfo(meals);

    if (meals.length === 0) {
      let msg = "لم نعثر على وجبات";
      if (this.searchQuery) msg = `لا توجد نتائج لـ "${this.searchQuery}"`;
      if (this.currentCategory !== "all") msg = `لا توجد وجبات في تصنيف "${this.currentCategory}"`;
      this.showEmptyState(msg);
      return;
    }

    this.hideEmptyState();

    let html = "";

    meals.forEach(item => {
      const data = item.data;
      const name = data.name || "وجبة";
      const image = data.image || "https://images.unsplash.com/photo-1544025162-d76694265947";
      const desc = data.description || "لا يوجد وصف.";
      const category = data.categoryName || "";
      const price = data.price || 0;
      const discountPrice = data.discountPrice;
      const hasDiscount = discountPrice && discountPrice < price;

      html += `
        <div class="food-card" data-id="${item.id}">
          <button class="food-close" aria-label="إغلاق">✕</button>
          <div class="food-preview">
            <img src="${image}" alt="${name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544025162-d76694265947'">
            <div class="food-info">
              <h2>${name}</h2>
              <div class="food-prices">
                ${hasDiscount ? `<div class="food-old-price">${price} ل.س</div>` : ""}
                <div class="food-price">${hasDiscount ? discountPrice : price} ل.س</div>
              </div>
            </div>
          </div>
          <div class="food-details">
            <h3>الوصف</h3>
            <div class="food-description">${desc}</div>
            ${category ? `<div class="food-category">${category}</div>` : ""}
            <button class="meal-fav-btn" data-meal-id="${item.id}">
              🤍 أضف للمفضلة
            </button>
          </div>
        </div>
      `;
    });

    this.menu.innerHTML = html;

    this.initMealCards();
    this.initMealFavorites();
  },

  /* ==========================================
     MEAL CARDS — OPEN / CLOSE
  ========================================== */
  initMealCards() {
    document.querySelectorAll(".food-card").forEach(card => {
      const preview = card.querySelector(".food-preview");
      const closeBtn = card.querySelector(".food-close");

      if (preview) {
        preview.addEventListener("click", () => {
          const wasActive = card.classList.contains("active");

          document.querySelectorAll(".food-card").forEach(c => c.classList.remove("active"));

          if (!wasActive) {
            card.classList.add("active");
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          card.classList.remove("active");
        });
      }
    });
  },

  /* ==========================================
     MEAL FAVORITES
  ========================================== */
  initMealFavorites() {
    const saved = JSON.parse(localStorage.getItem("kefo_meal_favorites") || "[]");

    document.querySelectorAll(".meal-fav-btn").forEach(btn => {
      const mealId = btn.dataset.mealId;
      const isFav = saved.includes(mealId);

      btn.innerHTML = isFav ? "❤️ محفوظ" : "🤍 أضف للمفضلة";

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentSaved = JSON.parse(localStorage.getItem("kefo_meal_favorites") || "[]");

        if (currentSaved.includes(mealId)) {
          const updated = currentSaved.filter(id => id !== mealId);
          localStorage.setItem("kefo_meal_favorites", JSON.stringify(updated));
          btn.innerHTML = "🤍 أضف للمفضلة";
          this.showToast("🗑️ تمت إزالة الوجبة من المفضلة");
        } else {
          currentSaved.push(mealId);
          localStorage.setItem("kefo_meal_favorites", JSON.stringify(currentSaved));
          btn.innerHTML = "❤️ محفوظ";
          this.showToast("❤️ تمت إضافة الوجبة للمفضلة");
        }
      });
    });
  },

  /* ==========================================
     RESTAURANT FAVORITE
  ========================================== */
  initRestaurantFavorite() {
    const btn = document.getElementById("favoriteRestaurantBtn");
    if (!btn) return;

    const saved = JSON.parse(localStorage.getItem("kefo_restaurant_favorites") || "[]");
    const isFav = saved.includes(this.restaurantId);

    btn.querySelector(".action-icon").textContent = isFav ? "❤️" : "🤍";
    btn.querySelector("span:last-child").textContent = isFav ? "محفوظ" : "المفضلة";

    btn.addEventListener("click", () => {
      const currentSaved = JSON.parse(localStorage.getItem("kefo_restaurant_favorites") || "[]");

      if (currentSaved.includes(this.restaurantId)) {
        const updated = currentSaved.filter(id => id !== this.restaurantId);
        localStorage.setItem("kefo_restaurant_favorites", JSON.stringify(updated));
        btn.querySelector(".action-icon").textContent = "🤍";
        btn.querySelector("span:last-child").textContent = "المفضلة";
        this.showToast("🗑️ تمت إزالة المطعم من المفضلة");
      } else {
        currentSaved.push(this.restaurantId);
        localStorage.setItem("kefo_restaurant_favorites", JSON.stringify(currentSaved));
        btn.querySelector(".action-icon").textContent = "❤️";
        btn.querySelector("span:last-child").textContent = "محفوظ";
        this.showToast("❤️ تمت إضافة المطعم للمفضلة");
      }
    });
  },

  /* ==========================================
     UI HELPERS
  ========================================== */
  updateUIInfo(meals) {
    if (this.resultsInfo && this.resultsCount) {
      this.resultsInfo.style.display = "flex";
      this.resultsCount.textContent = `✅ ${meals.length} وجبة`;
    }

    if (this.activeFilters && this.filterTag) {
      let hasFilter = false;
      let text = "";

      if (this.currentCategory !== "all") {
        text = `تصنيف: ${this.currentCategory}`;
        hasFilter = true;
      }
      if (this.searchQuery) {
        text += text ? ` | ` : "";
        text += `بحث: "${this.searchQuery}"`;
        hasFilter = true;
      }

      if (hasFilter) {
        this.activeFilters.style.display = "flex";
        this.filterTag.textContent = text;
      } else {
        this.activeFilters.style.display = "none";
      }
    }
  },

  showEmptyState(message) {
    if (this.emptyState) this.emptyState.style.display = "flex";
    if (this.emptyMessage) this.emptyMessage.textContent = message || "لم نعثر على نتائج";
    if (this.menu) this.menu.innerHTML = "";
    if (this.resultsInfo) this.resultsInfo.style.display = "none";
  },

  hideEmptyState() {
    if (this.emptyState) this.emptyState.style.display = "none";
  },

  hideSkeleton() {
    if (this.skeleton) this.skeleton.style.display = "none";
  },

  /* ==========================================
     TOAST
  ========================================== */
  showToast(message) {
    const existing = document.querySelector(".kefo-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "kefo-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

};

/* ========================================== */
document.addEventListener("DOMContentLoaded", () => {
  RestaurantPage.init();
});
