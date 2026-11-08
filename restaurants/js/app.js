/* =========================================================
   SYRIA OS — RESTAURANTS MODULE
   APP.JS — V3 CREATIVE (مع Hero Slider)
========================================================= */

import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const RestaurantApp = {

  favorites: [],
  favoritesMode: false,
  selectedCategory: "all",
  searchQuery: "",

  userLat: null,
  userLng: null,

  restaurantsData: [],

  /* ========================================== */
  init() {
    this.cacheDom();
    this.enableProtection();
    this.initHeroSlider();
    this.initCategories();
    this.initBottomNav();
    this.initAddRestaurant();
    this.initShare();
    this.initSearch();
    this.initBackToTop();
    this.initScrollListener();
    this.initClearFilters();

    this.loadRestaurants();
    this.initLocation();
  },

  /* ========================================== */
  cacheDom() {
    this.list = document.getElementById("restaurantsList");
    this.skeleton = document.getElementById("skeletonLoader");
    this.emptyState = document.getElementById("emptyState");
    this.emptyMessage = document.getElementById("emptyMessage");
    this.resultsInfo = document.getElementById("resultsInfo");
    this.resultsCount = document.getElementById("resultsCount");
    this.activeFilters = document.getElementById("activeFilters");
    this.filterTag = document.getElementById("filterTag");
    this.clearFiltersBtn = document.getElementById("clearFilters");
    this.totalRestaurants = document.getElementById("totalRestaurants");
    this.backToTopBtn = document.getElementById("backToTop");
    this.favCountBadge = document.getElementById("favCount");
    this.searchInput = document.getElementById("searchInput");
    this.clearSearchBtn = document.getElementById("clearSearch");
    this.suggestionsBox = document.getElementById("searchSuggestions");
    this.resetSearchBtn = document.getElementById("resetSearch");
  },

  /* ========================================== */
  enableProtection() {
    if (window.location.hostname !== "localhost") {
      document.addEventListener("contextmenu", e => e.preventDefault());
    }
  },

  /* ==========================================
     HERO SLIDER
  ========================================== */
  initHeroSlider() {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".hero-dot");
    if (slides.length === 0) return;

    let currentSlide = 0;
    const totalSlides = slides.length;

    setInterval(() => {
      slides[currentSlide].classList.remove("active");
      if (dots[currentSlide]) dots[currentSlide].classList.remove("active");

      currentSlide = (currentSlide + 1) % totalSlides;

      slides[currentSlide].classList.add("active");
      if (dots[currentSlide]) dots[currentSlide].classList.add("active");
    }, 4000);

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        slides[currentSlide].classList.remove("active");
        dots[currentSlide].classList.remove("active");
        currentSlide = index;
        slides[currentSlide].classList.add("active");
        dots[currentSlide].classList.add("active");
      });
    });
  },

  /* ==========================================
     USER GPS
  ========================================== */
  initLocation() {
    if (!navigator.geolocation) {
      console.log("GPS unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat = Number(pos.coords.latitude);
        this.userLng = Number(pos.coords.longitude);
        this.renderRestaurants();
      },
      (err) => {
        console.log("GPS ERROR:", err.message);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 600000
      }
    );
  },

  /* ==========================================
     TO RAD
  ========================================== */
  toRad(value) {
    return value * Math.PI / 180;
  },

  /* ==========================================
     DISTANCE (HAVERSINE)
  ========================================== */
  calculateDistance(lat1, lon1, lat2, lon2) {
    lat1 = Number(lat1);
    lon1 = Number(lon1);
    lat2 = Number(lat2);
    lon2 = Number(lon2);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return null;
    }

    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /* ==========================================
     CATEGORIES
  ========================================== */
  initCategories() {
    const buttons = document.querySelectorAll(".restaurants-category");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });

        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");

        this.selectedCategory = btn.dataset.category || "all";
        this.searchQuery = "";
        if (this.searchInput) this.searchInput.value = "";
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = "none";
        if (this.suggestionsBox) this.suggestionsBox.style.display = "none";

        this.renderRestaurants();

        document.querySelector(".restaurants-list")?.scrollIntoView({ behavior: "smooth" });
      });
    });
  },

  /* ==========================================
     SEARCH SYSTEM
  ========================================== */
  initSearch() {
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
        this.showSuggestions(value);
        this.renderRestaurants();
      }, 300);
    });

    if (this.clearSearchBtn) {
      this.clearSearchBtn.addEventListener("click", () => {
        this.searchInput.value = "";
        this.searchQuery = "";
        this.clearSearchBtn.style.display = "none";
        if (this.suggestionsBox) this.suggestionsBox.style.display = "none";
        this.renderRestaurants();
        this.searchInput.focus();
      });
    }

    if (this.resetSearchBtn) {
      this.resetSearchBtn.addEventListener("click", () => {
        this.searchQuery = "";
        this.selectedCategory = "all";
        this.favoritesMode = false;
        if (this.searchInput) this.searchInput.value = "";
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = "none";
        if (this.suggestionsBox) this.suggestionsBox.style.display = "none";

        document.querySelectorAll(".restaurants-category").forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        const allBtn = document.querySelector('[data-category="all"]');
        if (allBtn) {
          allBtn.classList.add("active");
          allBtn.setAttribute("aria-pressed", "true");
        }

        const favBtn = document.getElementById("favoritesBtn");
        if (favBtn) favBtn.classList.remove("active");

        this.renderRestaurants();
      });
    }

    document.addEventListener("click", (e) => {
      if (this.suggestionsBox && this.searchInput) {
        if (!this.searchInput.contains(e.target) && !this.suggestionsBox.contains(e.target)) {
          this.suggestionsBox.style.display = "none";
        }
      }
    });
  },

  /* ==========================================
     SHOW SUGGESTIONS
  ========================================== */
  showSuggestions(query) {
    if (!this.suggestionsBox) return;

    if (!query || query.length < 1) {
      this.suggestionsBox.style.display = "none";
      return;
    }

    const allNames = this.restaurantsData
      .map(item => item.data.restaurantName)
      .filter(name => name && name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    if (allNames.length === 0) {
      this.suggestionsBox.style.display = "none";
      return;
    }

    this.suggestionsBox.innerHTML = allNames
      .map(name => `<div class="suggestion-item">🔍 ${name}</div>`)
      .join("");

    this.suggestionsBox.style.display = "block";

    this.suggestionsBox.querySelectorAll(".suggestion-item").forEach(item => {
      item.addEventListener("click", () => {
        const text = item.textContent.replace("🔍 ", "");
        this.searchInput.value = text;
        this.searchQuery = text;
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = "block";
        this.suggestionsBox.style.display = "none";
        this.renderRestaurants();
      });
    });
  },

  /* ==========================================
     CLEAR FILTERS BUTTON
  ========================================== */
  initClearFilters() {
    if (!this.clearFiltersBtn) return;

    this.clearFiltersBtn.addEventListener("click", () => {
      this.searchQuery = "";
      this.selectedCategory = "all";
      this.favoritesMode = false;

      if (this.searchInput) this.searchInput.value = "";
      if (this.clearSearchBtn) this.clearSearchBtn.style.display = "none";

      document.querySelectorAll(".restaurants-category").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      const allBtn = document.querySelector('[data-category="all"]');
      if (allBtn) {
        allBtn.classList.add("active");
        allBtn.setAttribute("aria-pressed", "true");
      }

      const favBtn = document.getElementById("favoritesBtn");
      if (favBtn) favBtn.classList.remove("active");

      this.renderRestaurants();
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

  /* ==========================================
     SCROLL LISTENER
  ========================================== */
  initScrollListener() {
    if (!this.backToTopBtn) return;

    window.addEventListener("scroll", () => {
      if (window.scrollY > 500) {
        this.backToTopBtn.style.display = "flex";
      } else {
        this.backToTopBtn.style.display = "none";
      }
    });
  },

  /* ==========================================
     BOTTOM NAV
  ========================================== */
  initBottomNav() {
    const favoritesBtn = document.getElementById("favoritesBtn");
    if (!favoritesBtn) return;

    favoritesBtn.addEventListener("click", () => {
      this.favoritesMode = !this.favoritesMode;
      favoritesBtn.classList.toggle("active");
      this.renderRestaurants();
    });

    // أزرار التبويب الأخرى
    const searchTabBtn = document.querySelector('[data-tab="search"]');
    if (searchTabBtn) {
      searchTabBtn.addEventListener("click", () => {
        if (this.searchInput) {
          this.searchInput.focus();
          this.searchInput.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    const shareTabBtn = document.querySelector('[data-tab="share"]');
    if (shareTabBtn) {
      shareTabBtn.addEventListener("click", () => {
        this.initShare()();
      });
    }
  },

  /* ========================================== */
  initAddRestaurant() {
    const addBtn = document.getElementById("addRestaurantBtn");
    if (!addBtn) return;

    addBtn.addEventListener("click", () => {
      window.location.href = "./add-restaurant.html";
    });
  },

  /* ========================================== */
  initShare() {
    const shareBtn = document.getElementById("shareBtn");
    if (!shareBtn) {
      // الزر الجديد في الشريط السفلي
      const shareTabBtn = document.querySelector('[data-tab="share"]');
      if (shareTabBtn) {
        shareTabBtn.addEventListener("click", async () => {
          const shareData = {
            title: "KeFo Food | Syria OS",
            text: "اكتشف أفضل المطاعم القريبة منك مع KeFo Food - منصة المطاعم الذكية 🍽️",
            url: window.location.href
          };

          try {
            if (navigator.share) {
              await navigator.share(shareData);
            } else {
              await navigator.clipboard.writeText(shareData.url);
              this.showToast("✅ تم نسخ الرابط للمشاركة");
            }
          } catch (err) {}
        });
      }
      return;
    }

    shareBtn.addEventListener("click", async () => {
      const shareData = {
        title: "KeFo Food | Syria OS",
        text: "اكتشف أفضل المطاعم القريبة منك مع KeFo Food - منصة المطاعم الذكية 🍽️",
        url: window.location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(shareData.url);
          this.showToast("✅ تم نسخ الرابط للمشاركة");
        }
      } catch (err) {}
    });
  },

  /* ==========================================
     FIREBASE — LIVE DATA
  ========================================== */
  loadRestaurants() {
    onSnapshot(
      collection(db, "restaurants"),
      (snapshot) => {
        this.restaurantsData = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          data: docSnap.data()
        }));

        this.renderRestaurants();
        this.hideSkeleton();
      },
      (error) => {
        console.error("Firestore error:", error);
        this.hideSkeleton();
        this.showEmptyState("حدث خطأ في تحميل البيانات. تأكد من اتصالك بالإنترنت.");
      }
    );
  },

  /* ==========================================
     HIDE SKELETON
  ========================================== */
  hideSkeleton() {
    if (this.skeleton) {
      this.skeleton.style.display = "none";
    }
  },

  /* ==========================================
     SHOW EMPTY STATE
  ========================================== */
  showEmptyState(message) {
    if (this.emptyState) {
      this.emptyState.style.display = "flex";
    }
    if (this.emptyMessage) {
      this.emptyMessage.textContent = message || "لم نعثر على مطاعم تطابق بحثك";
    }
    if (this.list) {
      this.list.innerHTML = "";
    }
    if (this.resultsInfo) {
      this.resultsInfo.style.display = "none";
    }
    if (this.activeFilters) {
      this.activeFilters.style.display = "none";
    }
  },

  /* ==========================================
     HIDE EMPTY STATE
  ========================================== */
  hideEmptyState() {
    if (this.emptyState) {
      this.emptyState.style.display = "none";
    }
  },

  /* ==========================================
     RENDER — MAIN
  ========================================== */
  renderRestaurants() {
    if (!this.list) return;

    this.favorites = JSON.parse(
      localStorage.getItem("kefo_restaurant_favorites") || "[]"
    );

    let restaurants = [];

    this.restaurantsData.forEach(item => {
      const id = item.id;
      const data = item.data;

      if (data.status === "expired") return;

      if (
        this.selectedCategory !== "all" &&
        data.mainCategory !== this.selectedCategory
      ) return;

      if (this.favoritesMode && !this.favorites.includes(id)) return;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const name = (data.restaurantName || "").toLowerCase();
        const desc = (data.description || "").toLowerCase();
        const type = (data.mainCategory || "").toLowerCase();
        const area = (data.area || "").toLowerCase();

        const match =
          name.includes(query) ||
          desc.includes(query) ||
          type.includes(query) ||
          area.includes(query);

        if (!match) return;
      }

      const distance =
        this.userLat !== null && this.userLng !== null
          ? this.calculateDistance(
              this.userLat,
              this.userLng,
              data.latitude,
              data.longitude
            )
          : null;

      restaurants.push({ id, data, distance });
    });

    restaurants.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    this.updateUIInfo(restaurants);

    if (restaurants.length === 0) {
      let msg = "لم نعثر على مطاعم تطابق بحثك";
      if (this.favoritesMode) msg = "لم تضف أي مطعم للمفضلة بعد";
      if (this.searchQuery) msg = `لا توجد نتائج لـ "${this.searchQuery}"`;
      this.showEmptyState(msg);
      return;
    }

    this.hideEmptyState();

    let html = "";

    restaurants.forEach(item => {
      const id = item.id;
      const data = item.data;

      let distanceText = "📍 غير محدد";
      if (item.distance !== null) {
        distanceText =
          item.distance < 1
            ? `📍 ${Math.round(item.distance * 1000)}م`
            : `📍 ${item.distance.toFixed(1)}كم`;
      }

      const isFav = this.favorites.includes(id);
      const favIcon = isFav ? "❤️" : "🤍";

      const coverImage =
        data.coverImage ||
        "https://images.unsplash.com/photo-1552566626-52f8b828add9";

      const restaurantName = data.restaurantName || "مطعم";
      const description = data.description || "مطعم عربي";

      let statusHTML = "";
      if (data.status === "open") {
        statusHTML = '<span class="restaurant-status">🟢 مفتوح</span>';
      } else if (data.status === "closing") {
        statusHTML = '<span class="restaurant-status closing">🟡 يغلق قريباً</span>';
      } else if (data.status === "closed") {
        statusHTML = '<span class="restaurant-status closed">🔴 مغلق</span>';
      }

      html += `
  <article class="restaurant-card" data-id="${id}">
    <div class="restaurant-image-wrapper">
      <img class="restaurant-image" 
           loading="lazy" 
           src="${coverImage}" 
           alt="${restaurantName}"
           onerror="this.src='https://images.unsplash.com/photo-1552566626-52f8b828add9'">
      <div class="restaurant-image-overlay">
        <span class="restaurant-name-on-image">${restaurantName}</span>
        ${statusHTML}
      </div>
    </div>
    <div class="restaurant-content">
      <div class="restaurant-info-row">
        <span class="restaurant-type">${description}</span>
        <div class="restaurant-rating-mini" data-id="${id}">
          <span class="rating-stars-placeholder">☆ ☆ ☆ ☆ ☆</span>
          <span class="rating-text-placeholder">(0)</span>
        </div>
      </div>
      <div class="restaurant-actions-row">
        <span class="restaurant-distance">${distanceText}</span>
        <div class="restaurant-actions-right">
          ${data.deliveryAvailable ? '<span class="delivery-badge">🚀 توصيل</span>' : ''}
          <button class="restaurant-fav-btn" data-id="${id}" aria-label="${isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">
            ${favIcon}
          </button>
        </div>
      </div>
      <a href="./restaurant.html?id=${id}" class="restaurant-btn">
        عرض المطعم
      </a>
    </div>
  </article>
`;
    });

    this.list.innerHTML = html;

    // EVENT DELEGATION للمفضلة
    this.list.onclick = (e) => {
      const favBtn = e.target.closest(".restaurant-fav-btn");
      if (favBtn) {
        const btnId = favBtn.dataset.id;
        this.toggleFavorite(btnId);
      }
    };

    this.updateFavoriteIcons();

    // ⭐ تحميل التقييمات للبطاقات
    setTimeout(() => this.loadAllRatings(), 100);
  },

  /* ==========================================
     LOAD RATINGS FOR ALL RESTAURANTS
  ========================================== */
  async loadAllRatings() {
    const cards = document.querySelectorAll(".restaurant-rating-mini");
    if (cards.length === 0) return;

    for (const card of cards) {
      const restaurantId = card.dataset.id;
      if (!restaurantId) continue;

      try {
        const ratingsSnap = await getDocs(
          collection(db, "restaurants", restaurantId, "ratings")
        );

        let totalStars = 0;
        let count = 0;

        ratingsSnap.forEach(docSnap => {
          totalStars += docSnap.data().stars || 0;
          count++;
        });

        const average = count > 0 ? (totalStars / count).toFixed(1) : null;

        const starsPlaceholder = card.querySelector(".rating-stars-placeholder");
        const textPlaceholder = card.querySelector(".rating-text-placeholder");

        if (starsPlaceholder && average !== null) {
          starsPlaceholder.textContent = "★".repeat(Math.round(parseFloat(average)));
          starsPlaceholder.style.color = "#f39c12";
        }

        if (textPlaceholder) {
          textPlaceholder.textContent = `(${count})`;
        }

      } catch (error) {
        console.error(`Ratings error for ${restaurantId}:`, error);
      }
    }
  },

  /* ==========================================
     UPDATE UI INFO (COUNT, FILTERS, BADGE)
  ========================================== */
  updateUIInfo(restaurants) {
    if (this.totalRestaurants) {
      const total = this.restaurantsData.filter(item => item.data.status !== "expired").length;
      this.totalRestaurants.textContent = `🍽️ ${total} مطعم`;
    }

    if (this.resultsInfo && this.resultsCount) {
      this.resultsInfo.style.display = "flex";
      this.resultsCount.textContent = `✅ تم العثور على ${restaurants.length} مطعم`;
    }

    if (this.activeFilters && this.filterTag) {
      let hasFilter = false;
      let filterText = "";

      if (this.selectedCategory !== "all") {
        filterText = `تصنيف: ${this.selectedCategory}`;
        hasFilter = true;
      }
      if (this.searchQuery) {
        filterText += filterText ? ` | ` : "";
        filterText += `بحث: "${this.searchQuery}"`;
        hasFilter = true;
      }
      if (this.favoritesMode) {
        filterText += filterText ? ` | ` : "";
        filterText += `❤️ المفضلة`;
        hasFilter = true;
      }

      if (hasFilter) {
        this.activeFilters.style.display = "flex";
        this.filterTag.textContent = filterText;
      } else {
        this.activeFilters.style.display = "none";
      }
    }

    if (this.favCountBadge) {
      const count = this.favorites.length;
      if (count > 0) {
        this.favCountBadge.style.display = "inline-flex";
        this.favCountBadge.textContent = count;
      } else {
        this.favCountBadge.style.display = "none";
      }
    }
  },

  /* ==========================================
     FAVORITES
  ========================================== */
  updateFavoriteIcons() {
    document.querySelectorAll(".restaurant-fav-btn").forEach(btn => {
      const id = btn.dataset.id;
      btn.innerHTML = this.favorites.includes(id) ? "❤️" : "🤍";
    });
  },

  /* ========================================== */
  toggleFavorite(id) {
    const index = this.favorites.indexOf(id);

    if (index > -1) {
      this.favorites.splice(index, 1);
      this.showToast("🗑️ تمت إزالة المطعم من المفضلة");
    } else {
      this.favorites.push(id);
      this.showToast("❤️ تمت إضافة المطعم إلى المفضلة");
    }

    localStorage.setItem(
      "kefo_restaurant_favorites",
      JSON.stringify(this.favorites)
    );

    this.renderRestaurants();
  },

  /* ==========================================
     TOAST NOTIFICATION
  ========================================== */
  showToast(message) {
    const existing = document.querySelector(".kefo-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "kefo-toast";
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

};

/* ========================================== */
document.addEventListener("DOMContentLoaded", () => {
  RestaurantApp.init();
});
