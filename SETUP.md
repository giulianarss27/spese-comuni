# Spese Comuni — Setup

## Prerequisiti
- Node.js 18+ (https://nodejs.org)
- Un progetto Firebase con Firestore e Authentication abilitati

## 1. Configura Firebase

Apri `src/firebase.js` e sostituisci le variabili placeholder con le credenziali del tuo progetto Firebase:

```js
const firebaseConfig = {
  apiKey: "la-tua-api-key",
  authDomain: "il-tuo-progetto.firebaseapp.com",
  projectId: "il-tuo-progetto",
  storageBucket: "il-tuo-progetto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

Trovi questi valori in: Firebase Console → Impostazioni progetto → Le tue app → App web.

## 2. Abilita Firebase Authentication

In Firebase Console:
- Vai su **Authentication** → **Sign-in method**
- Abilita **Email/Password**

## 3. Crea le regole Firestore

In Firebase Console → Firestore → **Rules**, incolla:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // Sessions: authenticated users can read if member, write to join
    match /sessions/{sessionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        request.auth.uid in resource.data.members ||
        request.auth.uid == resource.data.createdBy
      );
    }
    // Expenses: session members can read/write
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 4. Installa le dipendenze e avvia

```bash
cd spese-comuni
npm install
npm run dev
```

L'app sarà disponibile su http://localhost:5173

## 5. Build di produzione

```bash
npm run build
npm run preview
```

## Struttura file

```
spese-comuni/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/icon.svg         # Icona app
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx      # Navigazione inferiore
│   │   ├── CategoryIcon.jsx   # Icone categorie SVG
│   │   └── Spinner.jsx        # Loading spinner
│   ├── contexts/
│   │   └── AuthContext.jsx    # Stato autenticazione Firebase
│   ├── screens/
│   │   ├── LoginScreen.jsx
│   │   ├── RegisterScreen.jsx
│   │   ├── HomeScreen.jsx
│   │   ├── GroupDetailScreen.jsx
│   │   ├── AddExpenseScreen.jsx
│   │   ├── DebtsScreen.jsx
│   │   ├── NewSessionScreen.jsx
│   │   └── JoinSessionScreen.jsx
│   ├── utils/
│   │   ├── categories.js      # Definizione categorie + helpers
│   │   └── debtCalculator.js  # Algoritmo calcolo debiti
│   ├── App.jsx                # Router + route protection
│   ├── firebase.js            # Config Firebase ← DA COMPILARE
│   ├── index.css              # Tutti gli stili
│   └── main.jsx               # Entry point React
├── index.html
├── package.json
└── vite.config.js             # Vite + PWA plugin
```
