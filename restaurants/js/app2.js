/* =========================================================
   SYRIA OS — APP2.JS
   REAL VISITS COUNTER (محدث ليتوافق مع V2)
========================================================= */

import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  onSnapshot,
  increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const visitsRef = doc(db, "analytics", "dailyVisits");

/* ==========================================
   ADD VISIT
========================================== */
async function addVisit() {
  try {
    await setDoc(
      visitsRef,
      { count: increment(1) },
      { merge: true }
    );
  } catch (error) {
    console.error("VISIT ERROR:", error);
  }
}

/* ==========================================
   LIVE COUNTER
========================================== */
function listenVisits() {
  const box = document.getElementById("dailyVisits");
  if (!box) return;

  onSnapshot(
    visitsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        box.textContent = "👥 زوار اليوم: 0";
        return;
      }
      const data = snapshot.data();
      box.textContent = `👥 زوار اليوم: ${data.count || 0}`;
    },
    (error) => {
      console.error("Counter error:", error);
      box.textContent = "👥 زوار اليوم: ...";
    }
  );
}

/* ========================================== */
document.addEventListener("DOMContentLoaded", () => {
  addVisit();
  listenVisits();
});
