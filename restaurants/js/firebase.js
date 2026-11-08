import {
initializeApp
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
getAuth
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
getFirestore,
serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {

apiKey:"AIzaSyDR8mf8c0Xuz7081LRwMXA673whNiLlrlY",

authDomain:"bt-chat-bee9f.firebaseapp.com",

projectId:"bt-chat-bee9f",

storageBucket:"bt-chat-bee9f.firebasestorage.app",

messagingSenderId:"1067808015150",

appId:"1:1067808015150:web:51b62156dc0370ff9070bf"

};

const app =
initializeApp(firebaseConfig);

const auth =
getAuth(app);

const db =
getFirestore(app);

export {
auth,
db,
serverTimestamp
};
