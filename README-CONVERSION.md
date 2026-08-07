# Oùça — conversion React Native / Expo

## Ce qui a été fait
Le prototype web (`OucaApp.jsx`, CSS-in-JS + `<div>`/`<svg>`) a été converti en
composants React Native natifs, puis rendu **fonctionnel localement** (SDK Expo 54,
pour matcher la version de l'appli Expo Go utilisée pour tester) :

- `src/theme.js` — couleurs (design tokens)
- `src/icons.js` — icônes SVG via `react-native-svg`
- `src/components.js` — Btn, Tag, Field, RowItem
- `src/OucaApp.js` — l'app complète (onboarding, 4 onglets, enregistrement
  vocal/photo/texte réel, fiche objet, paywall, invitation)
- `App.js` — point d'entrée

Ce qui est **réel** maintenant (plus de simulation) :
- **Sauvegarde persistante** : objets et membres sont stockés avec
  `@react-native-async-storage/async-storage` et survivent à la fermeture de l'app.
- **Vraie photo** : `expo-image-picker` ouvre la caméra ; le fichier est copié dans
  le stockage permanent de l'app via `expo-file-system` pour ne pas disparaître.
- **Vraie reconnaissance vocale** : `expo-speech-recognition` transcrit ta voix en
  direct (français Québec, `fr-CA`) et remplit le champ Position. Le champ Objet
  reste à compléter à la main : il n'y a pas d'IA embarquée pour deviner le nom de
  l'objet à partir de la phrase.
- **"Marquer comme prêté"** fonctionne et se persiste.

Ce qui reste volontairement simulé/local (pas de backend, tel que demandé) :
- L'invitation d'un membre du foyer ajoute juste une entrée "En attente" localement
  — personne ne reçoit vraiment de courriel/SMS.
- Le paywall Premium ne débite rien, il ferme juste la fenêtre.
- Sur un même appareil seulement : pas de synchronisation entre plusieurs téléphones.

## ⚠️ Seule la voix ne fonctionne PAS dans Expo Go
`expo-speech-recognition` est un module natif tiers : Expo Go ne l'embarque pas. Pour
tester le bouton **"Parler"**, il faut un vrai build natif — voir la section APK
ci-dessous, ou `npx expo run:android` / `npx expo run:ios` si tu as Android Studio /
Xcode.

Tout le reste fonctionne dans Expo Go, y compris la **caméra** (`expo-image-picker`
et `@react-native-async-storage/async-storage` sont inclus dans Expo Go) : onboarding,
sauvegarde persistante, photo, texte, recherche, fiche objet, "Marquer comme prêté",
invitation, paywall.

## Comment le lancer avec Expo Go
1. Récupère le dossier `ouca-app` et ouvre un terminal dedans.
2. `npm install`
3. `npx expo start`
4. Scanne le QR code avec l'app **Expo Go** (Android/iOS).

## Comment obtenir un vrai APK installable (sans ordinateur, via GitHub)
Le dossier contient déjà `.github/workflows/build-apk.yml`, qui compile un
APK debug dans le cloud (comme pour ton app de minuterie).

1. Va sur github.com, crée un nouveau dépôt (public ou privé, peu importe),
   par exemple `ouca-app`.
2. Sur la page du dépôt vide, clique **"uploading an existing file"**, glisse-
   déposes **tout le contenu** du dossier `ouca-app` (sauf `node_modules`,
   qui n'est de toute façon pas inclus dans le zip que je t'ai donné), puis
   clique **Commit changes**.
   - Assure-toi que le dossier `.github/workflows/build-apk.yml` est bien
     monté (GitHub le place automatiquement dans l'onglet Actions).
3. Va dans l'onglet **Actions** du dépôt → clique sur le workflow
   **"Build APK"** dans la liste à gauche → bouton **"Run workflow"** → **Run workflow**.
4. Attends 3 à 6 minutes que le build se termine (rond vert ✅).
5. Clique sur le run terminé → descends jusqu'à **Artifacts** → télécharge
   **ouca-app-debug-apk** (c'est un .zip contenant le .apk).
6. Sur ton téléphone Android : active "Sources inconnues" pour ton
   navigateur/gestionnaire de fichiers, puis ouvre le `.apk` téléchargé pour
   l'installer.

Ce workflow ne nécessite **aucun compte Expo/EAS** : il génère le projet
Android natif avec `expo prebuild`, puis compile directement avec Gradle sur
le serveur GitHub.

## Limites connues / à ajuster
- **Police Archivo** : le prototype web chargeait "Archivo" via Google Fonts.
  En React Native il faut la charger avec `expo-font` (fichier `.ttf` local).
  Pour l'instant l'app utilise la police système en `fontWeight: "800"`, ce qui
  est visuellement proche mais pas identique.
- **`filter: grayscale()`** (utilisé sur l'image dans la fiche objet) n'existe
  pas en React Native ; l'effet a été retiré. Pour du vrai grayscale sur une
  photo, il faudrait `expo-image-manipulator` ou un shader.
- **Effet de pulsation du micro** : recréé avec `Animated` (cercle qui grossit
  et s'estompe) au lieu du `box-shadow` CSS animé — visuellement proche mais
  pas identique pixel pour pixel.
- **`<select>` HTML** → remplacé par `@react-native-picker/picker`, dont le
  rendu diffère un peu entre iOS et Android (c'est le composant standard).
- La transcription vocale remplit uniquement le champ **Position** : il n'y a pas
  de modèle IA local pour extraire "objet" + "position" d'une phrase libre comme
  dans le prototype simulé d'origine. Le champ Objet doit être complété à la main.
- Build natif requis pour tester la **voix** uniquement (voir la section APK) —
  `expo-speech-recognition` est un module natif tiers absent d'Expo Go.
