import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
  Platform,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { File, Directory, Paths } from "expo-file-system";
import { T } from "./theme";
import { Icon } from "./icons";
import { Btn, Tag, Field, StyledInput, RowItem } from "./components";

/* ── Reconnaissance vocale : module natif absent d'Expo Go ──────────────
   `require` (contrairement à `import`) peut être encadré d'un try/catch :
   ça évite de faire planter toute l'app au démarrage quand le module natif
   n'est pas embarqué (Expo Go). Dans ce cas la fonction "Parler" affichera
   un message plutôt que de crasher l'app. ────────────────────────────── */
let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};
try {
  const speechModule = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
} catch (e) {
  // module natif indisponible (ex. Expo Go) — la voix sera désactivée
}

/* ── Storage & helpers ───────────────────────────────────────────────── */
const STORAGE_KEYS = {
  items: "ouca:items",
  members: "ouca:members",
  onboarded: "ouca:onboarded",
};

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
function formatDateFr(d = new Date()) {
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

async function persistPhoto(sourceUri) {
  const dir = new Directory(Paths.document, "photos");
  if (!dir.exists) dir.create();
  const ext = (sourceUri.split(".").pop() || "jpg").split("?")[0];
  const destFile = new File(dir, `item-${Date.now()}.${ext}`);
  const srcFile = new File(sourceUri);
  await srcFile.copy(destFile);
  return destFile.uri;
}

async function captureItemPhoto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Permission requise",
      "Autorise l'accès à la caméra dans les réglages pour prendre une photo."
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.6,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  try {
    return await persistPhoto(result.assets[0].uri);
  } catch (e) {
    Alert.alert("Erreur", "Impossible d'enregistrer la photo.");
    return null;
  }
}

/* ── Data ─────────────────────────────────────────────────────────────── */
const CATEGORIES = ["Documents", "Outils", "Vêtements", "Câbles", "Cuisine", "Saisonnier"];
const PREMIUM_FEATURES = [
  "Objets illimités",
  "Reconnaissance automatique des objets sur photo",
  "Recherche en langage naturel",
  "Synchronisation familiale",
  "Historique des déplacements",
  "Rappels pour objets prêtés",
  "Sauvegarde infonuagique",
];
const INITIAL_ITEMS = [
  { id: 1, name: "Perceuse", position: "Étagère du garage, à côté des vis.", date: "22 juillet 2026", category: "Outils", addedBy: "Toi" },
  { id: 2, name: "Piles AA", position: "Deuxième tiroir de la cuisine.", date: "19 juillet 2026", category: "Cuisine", addedBy: "Léa" },
  { id: 3, name: "Câble HDMI", position: "Tiroir du meuble TV, salon.", date: "14 juillet 2026", category: "Câbles", addedBy: "Sam" },
  { id: 4, name: "Décorations de Noël", position: "Grande boîte grise, sous-sol, étagère du haut.", date: "2 janvier 2026", category: "Saisonnier", addedBy: "Toi" },
];
const INITIAL_MEMBERS = [
  { id: 1, name: "Toi", initials: "T", role: "Propriétaire", pending: false },
  { id: 2, name: "Léa Tremblay", initials: "LT", role: "Membre", pending: false },
  { id: 3, name: "Sam Ouellet", initials: "SO", role: "Membre", pending: false },
];

/* ── Pulse + blinking cursor (Animated, remplace les keyframes CSS) ─────── */
function PulseCircle() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 1400, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.35, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 0, delay: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 0, delay: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.Text style={{ opacity, fontWeight: "800", fontSize: 21 }}>|</Animated.Text>;
}

/* ── Main App ─────────────────────────────────────────────────────────── */
export default function OucaApp() {
  const [loaded, setLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [onbStep, setOnbStep] = useState(1);
  const [tab, setTabState] = useState("record");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState(null);
  const [phase, setPhase] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [formName, setFormName] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formCategory, setFormCategory] = useState("Documents");
  const [photoUri, setPhotoUri] = useState(null);

  const [items, setItems] = useState(INITIAL_ITEMS);
  const [members, setMembers] = useState(INITIAL_MEMBERS);

  const timers = useRef([]);
  const intervals = useRef([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    intervals.current.forEach(clearInterval);
    timers.current = [];
    intervals.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ── Chargement / sauvegarde locale (AsyncStorage) ──────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [itemsRaw, membersRaw, onboardedRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.items),
          AsyncStorage.getItem(STORAGE_KEYS.members),
          AsyncStorage.getItem(STORAGE_KEYS.onboarded),
        ]);
        if (itemsRaw) setItems(JSON.parse(itemsRaw));
        if (membersRaw) setMembers(JSON.parse(membersRaw));
        setIsOnboarding(onboardedRaw !== "1");
      } catch (e) {
        // stockage corrompu ou indisponible : on garde les valeurs par défaut déjà en état
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items)).catch(() => {});
  }, [items, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.members, JSON.stringify(members)).catch(() => {});
  }, [members, loaded]);

  /* ── Reconnaissance vocale réelle ────────────────────────────────────── */
  const voiceActiveRef = useRef(false);
  const transcriptRef = useRef("");

  useSpeechRecognitionEvent("result", (event) => {
    if (!voiceActiveRef.current) return;
    const t = event.results?.[0]?.transcript || "";
    transcriptRef.current = t;
    setTranscript(t);
    setPhase((p) => (p === "listening" ? "transcribing" : p));
  });

  useSpeechRecognitionEvent("end", () => {
    if (!voiceActiveRef.current) return;
    voiceActiveRef.current = false;
    setPhase("confirm");
    setFormPosition(transcriptRef.current.trim());
    setFormName("");
    setFormCategory("Documents");
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (!voiceActiveRef.current) return;
    voiceActiveRef.current = false;
    setRecording(false);
    setPhase(null);
    setMode(null);
    if (event.error !== "no-speech" && event.error !== "aborted") {
      Alert.alert("Reconnaissance vocale", "Une erreur est survenue, réessaie.");
    }
  });

  const setTab = (t) => {
    setTabState(t);
    if (t !== "search") setSearchQuery("");
  };

  const startRecord = async (m) => {
    clearTimers();
    if (m === "voice") {
      if (!ExpoSpeechRecognitionModule) {
        Alert.alert(
          "Fonction indisponible",
          "La commande vocale a besoin d'un vrai build de l'app (elle ne fonctionne pas dans Expo Go). Utilise l'APK généré par le workflow GitHub Actions, ou « Écrire » en attendant."
        );
        return;
      }
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission requise",
          "Autorise le micro et la reconnaissance vocale dans les réglages pour utiliser la commande vocale."
        );
        return;
      }
      transcriptRef.current = "";
      voiceActiveRef.current = true;
      setRecording(true);
      setMode(m);
      setPhase("listening");
      setTranscript("");
      setFormName("");
      setFormPosition("");
      setFormCategory("Documents");
      setPhotoUri(null);
      ExpoSpeechRecognitionModule.start({
        lang: "fr-CA",
        interimResults: true,
        continuous: false,
      });
    } else if (m === "photo") {
      const uri = await captureItemPhoto();
      if (!uri) return;
      setRecording(true);
      setMode(m);
      setPhase("confirm");
      setTranscript("");
      setFormName("");
      setFormPosition("");
      setFormCategory("Outils");
      setPhotoUri(uri);
    } else {
      setRecording(true);
      setMode(m);
      setPhase("confirm");
      setTranscript("");
      setFormName("");
      setFormPosition("");
      setFormCategory("Documents");
      setPhotoUri(null);
    }
  };

  const finishListening = () => {
    ExpoSpeechRecognitionModule?.stop();
  };

  const cancelRecord = () => {
    if (mode === "voice" && voiceActiveRef.current) {
      voiceActiveRef.current = false;
      ExpoSpeechRecognitionModule?.abort();
    }
    clearTimers();
    setRecording(false);
    setPhase(null);
    setMode(null);
  };

  const addPhotoToForm = async () => {
    const uri = await captureItemPhoto();
    if (uri) setPhotoUri(uri);
  };

  const saveRecord = () => {
    clearTimers();
    const name = formName.trim() || "Objet sans nom";
    const position = formPosition.trim() || "Position non précisée";
    setItems((prev) => [
      { id: Date.now(), name, position, date: formatDateFr(), category: formCategory, addedBy: "Toi", photoUri, loaned: false },
      ...prev,
    ]);
    setPhase("saved");
    const t = setTimeout(() => {
      setRecording(false);
      setPhase(null);
      setMode(null);
      setPhotoUri(null);
    }, 1100);
    timers.current.push(t);
  };

  const toggleLoaned = (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, loaned: !it.loaned } : it)));
  };

  const sendInvite = () => {
    if (!inviteValue.trim()) return;
    const nm = inviteValue.trim();
    setMembers((s) => [...s, { id: Date.now(), name: nm, initials: nm.slice(0, 2).toUpperCase(), role: "Membre", pending: true }]);
    setInviteSent(true);
  };
  const openInvite = () => {
    setShowInvite(true);
    setInviteSent(false);
    setInviteValue("");
  };

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? items.filter((it) => (it.name + " " + it.category + " " + it.position).toLowerCase().includes(q))
    : [];
  const selectedItem = selectedItemId ? items.find((it) => it.id === selectedItemId) : null;
  const homePreview = items.slice(0, 3);
  const allRecents = [...items].sort((a, b) => b.id - a.id);

  const tabsList = [
    { id: "record", label: "Enregistrer", icon: Icon.Mic },
    { id: "search", label: "Rechercher", icon: Icon.Search },
    { id: "recents", label: "Récents", icon: Icon.Clock },
    { id: "family", label: "Maison", icon: Icon.Family },
  ];

  /* ── Chargement initial ────────────────────────────────────────────── */
  if (!loaded) {
    return <SafeAreaView style={styles.screen} />;
  }

  /* ── Onboarding ─────────────────────────────────────────────────────── */
  if (isOnboarding) {
    return (
      <SafeAreaView style={styles.screen}>
        {onbStep === 1 && (
          <View style={styles.flexCol}>
            <View style={{ flex: 1, padding: 28, paddingTop: 32 }}>
              <Icon.Logo size={64} />
              <Text style={styles.brandTitle}>Oùça</Text>
              <View style={styles.brandUnderline} />
              <Text style={styles.h3}>Rangez. Enregistrez.{"\n"}Retrouvez.</Text>
              <Text style={styles.paragraph}>
                Une étude sur 2 018 adultes rapporte des oublis pendant environ 40,9 % des journées. Le plus
                fréquent : ne plus savoir où un objet a été rangé — 15 % des journées.
              </Text>
            </View>
            <View style={{ padding: 28, paddingBottom: 40 }}>
              <View style={styles.progressRow}>
                <View style={[styles.progressBar, { backgroundColor: T.accent }]} />
                <View style={[styles.progressBar, { backgroundColor: T.divider }]} />
              </View>
              <Btn variant="primary" block style={styles.bigBtn} textStyle={{ fontSize: 16 }} onPress={() => setOnbStep(2)}>
                Suivant
              </Btn>
            </View>
          </View>
        )}
        {onbStep === 2 && (
          <View style={styles.flexCol}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingTop: 32 }}>
              <Text style={styles.h3}>Dis simplement où tu ranges.</Text>
              <View style={styles.quoteBox}>
                <Text style={styles.quoteText}>
                  « J'ai rangé mon passeport dans la boîte bleue, en haut de l'armoire. »
                </Text>
              </View>
              <View style={styles.checkRow}>
                <Icon.Check size={14} />
                <Text style={styles.checkText}>Objet, position, catégorie et date enregistrés automatiquement</Text>
              </View>
              <View style={[styles.quoteBox, { borderLeftWidth: 0 }]}>
                <Text style={styles.quoteText}>« Où est mon passeport ? »</Text>
                <Text style={[styles.quoteText, { color: T.accent700, fontWeight: "700", marginTop: 4 }]}>
                  Boîte bleue, tablette supérieure de l'armoire de la chambre. Enregistré le 28 juillet.
                </Text>
              </View>
            </ScrollView>
            <View style={{ padding: 28, paddingBottom: 40 }}>
              <View style={styles.progressRow}>
                <View style={[styles.progressBar, { backgroundColor: T.accent }]} />
                <View style={[styles.progressBar, { backgroundColor: T.accent }]} />
              </View>
              <Btn
                variant="primary"
                block
                style={styles.bigBtn}
                textStyle={{ fontSize: 16 }}
                onPress={() => {
                  setIsOnboarding(false);
                  AsyncStorage.setItem(STORAGE_KEYS.onboarded, "1").catch(() => {});
                }}
              >
                Commencer
              </Btn>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  /* ── Main app ───────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.flexCol}>
        {/* header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon.Logo />
            <Text style={styles.headerTitle}>Oùça</Text>
          </View>
          <TouchableOpacity style={styles.premiumBtn} onPress={() => setShowPaywall(true)}>
            <Text style={styles.premiumBtnText}>Premium</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          {tab === "record" && (
            <>
              <Text style={styles.h2}>Où as-tu rangé{"\n"}quelque chose ?</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => startRecord("voice")}>
                  <Icon.Mic color={T.bg} />
                  <Text style={styles.actionBtnPrimaryText}>Parler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => startRecord("photo")}>
                  <Icon.Camera />
                  <Text style={styles.actionBtnSecondaryText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => startRecord("text")}>
                  <Icon.Pencil />
                  <Text style={styles.actionBtnSecondaryText}>Écrire</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.searchTeaser} onPress={() => setTab("search")}>
                <Icon.Search color="rgba(32,30,29,0.55)" />
                <Text style={styles.searchTeaserText}>Que cherches-tu ?</Text>
              </TouchableOpacity>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>OBJETS RÉCENTS</Text>
                <TouchableOpacity onPress={() => setTab("recents")}>
                  <Text style={styles.linkText}>Tout voir</Text>
                </TouchableOpacity>
              </View>
              {homePreview.map((it) => (
                <RowItem key={it.id} it={it} onOpen={() => setSelectedItemId(it.id)} />
              ))}
            </>
          )}

          {tab === "search" && (
            <>
              <Text style={styles.h2sm}>Rechercher</Text>
              <View style={styles.searchBar}>
                <Icon.Search color="rgba(32,30,29,0.5)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Que cherches-tu ?"
                  placeholderTextColor="rgba(32,30,29,0.4)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>
              {q === "" && (
                <View style={styles.chipRow}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity key={c} style={styles.chip} onPress={() => setSearchQuery(c)}>
                      <Text style={styles.chipText}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {q !== "" && (
                <>
                  {searchResults.length === 0 && (
                    <Text style={styles.emptyText}>Aucun objet trouvé pour « {searchQuery} ».</Text>
                  )}
                  {searchResults.map((it) => (
                    <RowItem key={it.id} it={it} onOpen={() => setSelectedItemId(it.id)} />
                  ))}
                </>
              )}
            </>
          )}

          {tab === "recents" && (
            <>
              <Text style={styles.h2sm}>Objets récents</Text>
              {allRecents.map((it) => (
                <RowItem key={it.id} it={it} size={44} showMeta onOpen={() => setSelectedItemId(it.id)} />
              ))}
            </>
          )}

          {tab === "family" && (
            <>
              <Text style={styles.h2sm}>Maison partagée</Text>
              <Text style={styles.subtitle}>Tous les membres retrouvent ce que les autres ont rangé.</Text>
              <Text style={styles.sectionLabel}>MEMBRES</Text>
              <View style={{ marginBottom: 22, marginTop: 8 }}>
                {members.map((m) => (
                  <View key={m.id} style={styles.memberRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{m.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberRole}>{m.role}</Text>
                    </View>
                    {m.pending && (
                      <View style={styles.pendingTag}>
                        <Text style={styles.pendingTagText}>En attente</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <Btn variant="secondary" block style={{ marginBottom: 26 }} onPress={openInvite}>
                + Inviter un membre
              </Btn>
              <Text style={styles.sectionLabel}>OBJETS DU FOYER</Text>
              <View style={{ marginTop: 8 }}>
                {allRecents.map((it) => (
                  <TouchableOpacity key={it.id} style={styles.familyItemRow} onPress={() => setSelectedItemId(it.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.familyItemName}>{it.name}</Text>
                      <Text style={styles.familyItemBy}>Ajouté par {it.addedBy}</Text>
                    </View>
                    <Tag outline>{it.category}</Tag>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* tab bar */}
        <View style={styles.tabBar}>
          {tabsList.map((t) => {
            const Ic = t.icon;
            const active = tab === t.id;
            return (
              <TouchableOpacity key={t.id} style={styles.tabItem} onPress={() => setTab(t.id)}>
                <Ic size={20} color={active ? T.accent : T.text} />
                <Text style={[styles.tabLabel, { color: active ? T.accent : T.text }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* RECORD FLOW OVERLAY */}
      {recording && (
        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <TouchableOpacity onPress={cancelRecord} hitSlop={10}>
              <Icon.Close />
            </TouchableOpacity>
            <Text style={styles.overlayTitle}>NOUVEL OBJET</Text>
            <View style={{ width: 20 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 24, flexGrow: 1 }}>
            {phase === "listening" && (
              <View style={styles.centerFlex}>
                <View style={styles.pulseWrap}>
                  <PulseCircle />
                  <View style={styles.micCircle}>
                    <Icon.Mic size={30} color="#fff" />
                  </View>
                </View>
                <Text style={styles.listeningText}>Je t'écoute…</Text>
                <Btn variant="secondary" onPress={finishListening}>J'ai terminé</Btn>
              </View>
            )}
            {phase === "transcribing" && (
              <View style={{ flex: 1, justifyContent: "center" }}>
                <View style={styles.checkRow}>
                  <Icon.Mic size={14} color="rgba(32,30,29,0.55)" />
                  <Text style={styles.transcribingLabel}>Transcription</Text>
                </View>
                <Text style={styles.transcript}>
                  {transcript}
                  <BlinkingCursor />
                </Text>
                <Btn variant="secondary" style={{ marginTop: 24 }} onPress={finishListening}>
                  J'ai terminé
                </Btn>
              </View>
            )}
            {phase === "confirm" && (
              <>
                <View style={styles.checkRow}>
                  <Icon.Check size={14} color={T.accent700} />
                  <Text style={[styles.transcribingLabel, { color: T.accent700 }]}>Vérifie et enregistre</Text>
                </View>
                <Field label="Objet">
                  <StyledInput value={formName} onChangeText={setFormName} placeholder="Nom de l'objet" />
                </Field>
                <Field label="Position">
                  <StyledInput value={formPosition} onChangeText={setFormPosition} placeholder="Où l'as-tu rangé ?" />
                </Field>
                <Field label="Catégorie">
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={formCategory} onValueChange={setFormCategory} style={styles.picker}>
                      {CATEGORIES.map((c) => (
                        <Picker.Item key={c} label={c} value={c} />
                      ))}
                    </Picker>
                  </View>
                </Field>
                {photoUri ? (
                  <TouchableOpacity onPress={addPhotoToForm} style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <Text style={styles.photoPlaceholderText}>Toucher pour reprendre la photo</Text>
                  </TouchableOpacity>
                ) : (
                  <Btn variant="secondary" block style={{ marginBottom: 14 }} onPress={addPhotoToForm}>
                    + Ajouter une photo (facultatif)
                  </Btn>
                )}
                <Text style={styles.dateNote}>Sera enregistré le {formatDateFr()}</Text>
              </>
            )}
            {phase === "saved" && (
              <View style={styles.centerFlex}>
                <View style={styles.savedCircle}>
                  <Icon.Check size={28} color="#fff" strokeWidth={3} />
                </View>
                <Text style={styles.listeningText}>Enregistré</Text>
              </View>
            )}
          </ScrollView>
          {phase === "confirm" && (
            <View style={styles.overlayFooter}>
              <Btn variant="primary" block style={styles.bigBtn} textStyle={{ fontSize: 15 }} onPress={saveRecord}>
                Enregistrer
              </Btn>
            </View>
          )}
        </View>
      )}

      {/* ITEM DETAIL OVERLAY */}
      {selectedItem && (
        <View style={styles.overlay}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedItemId(null)} hitSlop={10}>
              <Icon.Back />
            </TouchableOpacity>
            <Text style={styles.detailHeaderTitle}>Fiche objet</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {selectedItem.photoUri ? (
              <Image source={{ uri: selectedItem.photoUri }} style={styles.detailImage} />
            ) : (
              <View style={styles.detailImage}>
                <Icon.Box size={30} color="rgba(32,30,29,0.35)" />
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Tag outline>{selectedItem.category}</Tag>
              {selectedItem.loaned && <Tag>Prêté</Tag>}
            </View>
            <Text style={styles.detailName}>{selectedItem.name}</Text>
            <Text style={styles.detailPosition}>{selectedItem.position}</Text>
            <Text style={styles.detailMeta}>
              Enregistré le {selectedItem.date} · par {selectedItem.addedBy}
            </Text>
            <View style={styles.hr} />
            <Btn variant="secondary" block onPress={() => toggleLoaned(selectedItem.id)}>
              {selectedItem.loaned ? "Marquer comme retrouvé" : "Marquer comme prêté"}
            </Btn>
          </ScrollView>
        </View>
      )}

      {/* PAYWALL OVERLAY */}
      {showPaywall && (
        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <Text style={styles.detailHeaderTitle}>Oùça Premium</Text>
            <TouchableOpacity onPress={() => setShowPaywall(false)} hitSlop={10}>
              <Icon.Close />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
            <Text style={styles.h2}>Ne perds plus jamais rien.</Text>
            <Text style={styles.subtitle}>La version gratuite inclut 50 objets et un espace personnel.</Text>
            <View style={{ marginVertical: 22, gap: 12 }}>
              {PREMIUM_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Icon.Check size={16} color={T.accent} strokeWidth={3} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 10, marginBottom: 16 }}>
              <View style={styles.planCard}>
                <View>
                  <Text style={styles.planName}>Mensuel</Text>
                  <Text style={styles.planSub}>Sans engagement</Text>
                </View>
                <Text style={styles.planPrice}>2,99 $/mois</Text>
              </View>
              <View style={[styles.planCard, styles.planCardHighlight]}>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>MEILLEURE VALEUR</Text>
                </View>
                <View>
                  <Text style={styles.planName}>Annuel</Text>
                  <Text style={styles.planSub}>Équivaut à 2,08 $/mois</Text>
                </View>
                <Text style={styles.planPrice}>24,99 $/an</Text>
              </View>
            </View>
          </ScrollView>
          <View style={styles.overlayFooter}>
            <Btn variant="primary" block style={styles.bigBtn} textStyle={{ fontSize: 15 }} onPress={() => setShowPaywall(false)}>
              Commencer l'essai gratuit
            </Btn>
            <Btn variant="ghost" block onPress={() => setShowPaywall(false)}>
              Continuer gratuitement
            </Btn>
          </View>
        </View>
      )}

      {/* INVITE DIALOG */}
      {showInvite && (
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            {!inviteSent ? (
              <>
                <Text style={styles.dialogTitle}>Inviter un membre</Text>
                <Text style={styles.dialogText}>Il pourra voir et ajouter des objets dans le foyer.</Text>
                <Field label="Courriel ou numéro">
                  <StyledInput value={inviteValue} onChangeText={setInviteValue} placeholder="nom@exemple.com" />
                </Field>
                <View style={styles.dialogActions}>
                  <Btn variant="secondary" onPress={() => setShowInvite(false)}>Annuler</Btn>
                  <Btn variant="primary" onPress={sendInvite}>Envoyer</Btn>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.dialogTitle}>Invitation envoyée</Text>
                <Text style={styles.dialogText}>
                  {inviteValue} pourra rejoindre le foyer partagé dès qu'il ou elle acceptera.
                </Text>
                <View style={styles.dialogActions}>
                  <Btn variant="primary" onPress={() => setShowInvite(false)}>Fermer</Btn>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  flexCol: { flex: 1, flexDirection: "column" },
  brandTitle: { fontWeight: "800", fontSize: 38, color: T.text, marginTop: 28, marginBottom: 6, letterSpacing: -0.5 },
  brandUnderline: { height: 2, width: 56, backgroundColor: T.accent, marginBottom: 20 },
  h3: { fontWeight: "800", fontSize: 19, color: T.text, marginBottom: 14 },
  h2: { fontWeight: "800", fontSize: 24, color: T.text, marginBottom: 18, lineHeight: 30 },
  h2sm: { fontWeight: "800", fontSize: 22, color: T.text, marginBottom: 14 },
  paragraph: { fontSize: 14, lineHeight: 22, opacity: 0.75, color: T.text, maxWidth: 300 },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  progressBar: { height: 3, flex: 1 },
  bigBtn: { paddingVertical: 16 },
  quoteBox: { backgroundColor: T.surface, padding: 16, borderLeftWidth: 2, borderLeftColor: T.accent, marginBottom: 16 },
  quoteText: { fontSize: 14, lineHeight: 22, color: T.text },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  checkText: { fontSize: 12, opacity: 0.6, color: T.text, flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: T.divider,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontWeight: "800", fontSize: 17, color: T.text },
  premiumBtn: { borderWidth: 1, borderColor: T.accent, paddingHorizontal: 10, paddingVertical: 3 },
  premiumBtnText: { fontSize: 11, color: T.accent },
  content: { padding: 18, paddingTop: 20, paddingBottom: 12 },
  actionGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: T.accent,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  actionBtnPrimaryText: { fontWeight: "800", fontSize: 12, color: T.bg },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.divider,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  actionBtnSecondaryText: { fontWeight: "800", fontSize: 12, color: T.text },
  searchTeaser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.divider,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 26,
  },
  searchTeaserText: { fontSize: 14, color: "rgba(32,30,29,0.55)" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  sectionLabel: { fontWeight: "800", fontSize: 13, letterSpacing: 1, color: T.text },
  linkText: { fontSize: 12, color: T.accent, fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.text, padding: 0 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#f8f4f4", paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, color: "#444141" },
  emptyText: { opacity: 0.55, fontSize: 14, marginTop: 20 },
  subtitle: { fontSize: 13, opacity: 0.6, color: T.text, marginBottom: 20 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  avatar: { width: 34, height: 34, backgroundColor: T.accent100, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800", fontSize: 13, color: T.accent800 },
  memberName: { fontSize: 14, fontWeight: "600", color: T.text },
  memberRole: { fontSize: 11, opacity: 0.5, color: T.text },
  pendingTag: { paddingHorizontal: 10, paddingVertical: 3, backgroundColor: "#f8f4f4" },
  pendingTagText: { fontSize: 11, color: "#444141" },
  familyItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  familyItemName: { fontSize: 13, fontWeight: "600", color: T.text },
  familyItemBy: { fontSize: 11, opacity: 0.5, color: T.text },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: T.divider,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    paddingHorizontal: 4,
    backgroundColor: T.bg,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 6 },
  tabLabel: { fontWeight: "800", fontSize: 10 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: T.bg, zIndex: 40 },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: T.divider,
  },
  overlayTitle: { fontWeight: "800", fontSize: 13, letterSpacing: 1, color: T.text },
  overlayFooter: { padding: 20, paddingBottom: 34, borderTopWidth: 2, borderTopColor: T.divider },
  centerFlex: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  pulseWrap: { width: 84, height: 84, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", width: 84, height: 84, borderRadius: 42, backgroundColor: T.accent },
  micCircle: { width: 84, height: 84, backgroundColor: T.accent, alignItems: "center", justifyContent: "center" },
  listeningText: { fontWeight: "800", fontSize: 16, color: T.text },
  transcribingLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: "800", opacity: 0.55, color: T.text },
  transcript: { fontSize: 21, lineHeight: 30, fontWeight: "800", color: T.text },
  pickerWrap: { borderWidth: 1, borderColor: T.divider, backgroundColor: T.surface },
  picker: { color: T.text },
  photoPreviewWrap: { width: "100%", marginBottom: 14, gap: 6 },
  photoPreview: { width: "100%", height: 160, backgroundColor: T.neutral200 },
  photoPlaceholderText: { color: "rgba(32,30,29,0.5)", fontSize: 12 },
  dateNote: { fontSize: 12, opacity: 0.5, color: T.text, marginBottom: 20 },
  savedCircle: { width: 64, height: 64, backgroundColor: T.accent, alignItems: "center", justifyContent: "center" },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: T.divider },
  detailHeaderTitle: { fontWeight: "800", fontSize: 14, color: T.text },
  detailImage: { width: "100%", height: 180, backgroundColor: T.neutral200, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  detailName: { fontWeight: "800", fontSize: 26, color: T.text, marginVertical: 10 },
  detailPosition: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: T.text, marginBottom: 6 },
  detailMeta: { fontSize: 13, opacity: 0.55, color: T.text, marginBottom: 24 },
  hr: { height: 2, backgroundColor: T.divider, marginVertical: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 14, color: T.text, flex: 1 },
  planCard: { borderWidth: 1, borderColor: T.divider, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planCardHighlight: { borderWidth: 2, borderColor: T.accent, position: "relative", marginTop: 10 },
  planBadge: { position: "absolute", top: -10, left: 14, backgroundColor: T.accent, paddingHorizontal: 8, paddingVertical: 2 },
  planBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  planName: { fontWeight: "800", fontSize: 15, color: T.text },
  planSub: { fontSize: 12, opacity: 0.55, color: T.text },
  planPrice: { fontWeight: "800", fontSize: 17, color: T.text },
  dialogBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(45,43,43,0.5)", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 },
  dialogCard: { width: "100%", backgroundColor: T.surface, padding: 16, gap: 12 },
  dialogTitle: { fontWeight: "800", fontSize: 20, color: T.text },
  dialogText: { fontSize: 14, opacity: 0.85, color: T.text },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
});
