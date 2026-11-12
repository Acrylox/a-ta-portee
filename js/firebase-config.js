'use strict';
/* Configuration du projet Firebase qui gère les comptes.
   Ces valeurs sont publiques par nature (elles identifient le projet, elles ne donnent aucun droit) :
   c'est le fichier firestore.rules, publié dans la console Firebase, qui protège les données.
   null = comptes désactivés : le site fonctionne alors uniquement avec la sauvegarde du navigateur. */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAh-bR6zrOYYPuWEmuH5grVVJ_1vLwB_Xw',
  authDomain: 'a-ta-portee.firebaseapp.com',
  projectId: 'a-ta-portee',
  storageBucket: 'a-ta-portee.firebasestorage.app',
  messagingSenderId: '547767182242',
  appId: '1:547767182242:web:8d92a71b31116aeeff08fb',
};
