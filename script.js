// ── Zustands-Variablen ──────────────────────────────────────────────────────
let alleGespeichertenKombis = [];
let aktuelleKombi = [];
let aktuellerFilter = 'Alle';
let aktuellerTrainingFilter = 'Alle';
let gewaehlteErstellungsKategorie = 'Alle';
let vollerKategorieNameMitEmoji = '';
let aktiveKategorien = new Set();

// ── Haptic Feedback ───────────────────────────────────────────────────────────
const haptic = {
    light:   () => navigator.vibrate && navigator.vibrate(12),
    medium:  () => navigator.vibrate && navigator.vibrate(22),
    heavy:   () => navigator.vibrate && navigator.vibrate(38),
    double:  () => {},
    error:   () => navigator.vibrate && navigator.vibrate([30, 25, 30]),
    success: () => navigator.vibrate && navigator.vibrate([12, 25, 30]),
    bell:    () => navigator.vibrate && navigator.vibrate([25, 40, 25, 40, 50]),
};

// Timer
let timerInterval = null;
let timerSekunden = 180;
let istArbeitszeit = true;
let timerLaeuft = false;
let aktuelleRunde = 1;
let maxRundenVorgabe = 3;
let timerWurdeAutoPausiert = false;

// Zeitvorgaben: [Arbeitszeit in Sek, Pause in Sek]
const zeitStufen = [
    [60,  20],   // 1 Min / 20 Sek
    [120, 40],   // 2 Min / 40 Sek
    [180, 60],   // 3 Min / 1 Min
];
let aktuelleZeitStufe = 2; // Standard: 3 Min

function aendereArbeitszeit(richtung) {
    aktuelleZeitStufe = Math.max(0, Math.min(zeitStufen.length - 1, aktuelleZeitStufe + richtung));
    aktualisiereZeitAnzeige();
    resetTimer();
    haptic.light();
}

function aktualisiereZeitAnzeige() {
    let [arbeit, pause] = zeitStufen[aktuelleZeitStufe];
    let arbeitMin = Math.floor(arbeit / 60);
    let arbeitSek = arbeit % 60;
    let pauseMin  = Math.floor(pause / 60);
    let pauseSek  = pause % 60;

    let arbeitEl = document.getElementById("arbeitszeitAnzeige");
    let pauseEl  = document.getElementById("pauseAnzeige");
    if (arbeitEl) arbeitEl.innerText = `${arbeitMin}:${String(arbeitSek).padStart(2,'0')}`;
    if (pauseEl)  pauseEl.innerText  = pauseSek === 0
        ? `${pauseMin}:00`
        : `0:${String(pauseSek).padStart(2,'0')}`;

    // Plus/Minus Button deaktivieren an den Grenzen
    let btns = document.querySelectorAll('.time-picker-btn');
    if (btns.length >= 2) {
        btns[0].disabled = aktuelleZeitStufe === 0;
        btns[1].disabled = aktuelleZeitStufe === zeitStufen.length - 1;
    }
}

// Audio / Chaos
let aktuellerAudioKombiText = "";
let audioLoopInterval = null;
let chaosTrainerInterval = null;
let audioLoopLaeuft = false;
let chaosTrainerLaeuft = false;
let istGeradeAmSprechen = false;
let audioQueueTimeout = null;
let aktuelleSprechGeschwindigkeit = 0.85; // Standard: 1x (entspricht 0.85 rate)

// Long-Press / Favoriten
let touchTimer = null;
let isLongPressTriggered = false;

// ── Datenbank ────────────────────────────────────────────────────────────────
const technikenDatenbank = [
    // ── Boxen ─────────────────────────────────────────────────────
    { name: "Jab",                    kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"], audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["linke gerade", "führhand", "linker stoß"] },
    { name: "Cross",                  kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"], audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["rechte gerade", "schlaghand", "rechter stoß"] },
    { name: "Linker Haken",           kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"], audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["linker schwinger", "haken links"] },
    { name: "Rechter Haken",          kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"], audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["rechter schwinger", "haken rechts"] },
    { name: "Linker Uppercut",        kat: ["Boxen", "Kick-/Thaiboxen", "MMA"],                audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["linker aufwärtshaken", "aufwärts links"] },
    { name: "Rechter Uppercut",       kat: ["Boxen", "Kick-/Thaiboxen", "MMA"],                audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["rechter aufwärtshaken", "aufwärts rechts"] },
    { name: "Linker Körperhaken",     kat: ["Boxen", "Kick-/Thaiboxen", "MMA"],                audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["haken auf den körper links", "leberhaken"] },
    { name: "Rechter Körperhaken",    kat: ["Boxen", "Kick-/Thaiboxen", "MMA"],                audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["haken auf den körper rechts", "körper rechts"] },
    { name: "Overhand",               kat: ["Boxen", "Kick-/Thaiboxen", "MMA"],                audioOk: false, chaosOk: false, typ: "schlag",    aliases: ["bogenrechte", "überkopfschlag"] },
    { name: "Slip Links",             kat: ["Boxen", "Kick-/Thaiboxen", "MMA"],                audioOk: false, chaosOk: false, typ: "defense",   aliases: ["ausweichen links", "kopf links"] },
    { name: "Slip Rechts",            kat: ["Boxen", "Kick-/Thaiboxen", "MMA"],                audioOk: false, chaosOk: false, typ: "defense",   aliases: ["ausweichen rechts", "kopf rechts"] },
    { name: "Rollbewegung",           kat: ["Boxen", "Kick-/Thaiboxen", "MMA"],                audioOk: false, chaosOk: false, typ: "defense",   aliases: ["ducken", "rollen", "bob"] },
    { name: "Meiden",                 kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"], audioOk: true,  chaosOk: true,  typ: "defense",   aliases: ["zurückweichen", "zurück", "step back"] },
    { name: "Block",                  kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"], audioOk: true,  chaosOk: true,  typ: "defense",   aliases: ["decken", "abblock", "abwehr"] },
    // ── Kick-/Thaiboxen ──────────────────────────────────────────
    { name: "Linker Ellbogen",        kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["ellbogen links"] },
    { name: "Rechter Ellbogen",       kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "schlag",    aliases: ["ellbogen rechts"] },
    { name: "Linkes Knie",            kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "knie",      aliases: ["knie links"] },
    { name: "Rechtes Knie",           kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "knie",      aliases: ["knie rechts"] },
    { name: "Aufwärtsknie",           kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "knie",      aliases: ["knie nach oben", "knie hoch"] },
    { name: "Fliegendes Knie",        kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: false, typ: "knie",      aliases: ["springendes knie", "jump knie"] },
    { name: "Linker Lowkick",         kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["tritt aufs bein links", "beintritt links"] },
    { name: "Linker Midkick",         kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"],           audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["tritt auf den körper links", "körperkick links"] },
    { name: "Linker Highkick",        kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"],           audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["kopfkick links", "tritt auf den kopf links"] },
    { name: "Linker Bodykick",        kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["körpertritt links", "rippenkick links"] },
    { name: "Rechter Lowkick",        kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["tritt aufs bein rechts", "beintritt rechts"] },
    { name: "Rechter Midkick",        kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"],           audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["tritt auf den körper rechts", "körperkick rechts"] },
    { name: "Rechter Highkick",       kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"],           audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["kopfkick rechts", "tritt auf den kopf rechts"] },
    { name: "Rechter Bodykick",       kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["körpertritt rechts", "rippenkick rechts"] },
    { name: "Frontkick",              kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"],           audioOk: true,  chaosOk: true,  typ: "kick",      aliases: ["vorwärtskick", "gerader tritt", "stampftritt"] },
    { name: "Teep",                   kat: ["Kick-/Thaiboxen", "MMA"],                         audioOk: false, chaosOk: false, typ: "kick",      aliases: ["schubkick", "push kick", "abstandskick"] },
    { name: "Clinch",                 kat: ["Kick-/Thaiboxen", "MMA", "Ringen/Grappling"],     audioOk: true,  chaosOk: false, typ: "clinch",    aliases: ["umklammern", "festhalten", "nahkampf greifen"] },
    // ── MMA ──────────────────────────────────────────────────────
    { name: "Sprawl",                 kat: ["MMA", "Ringen/Grappling"],                        audioOk: false, chaosOk: false, typ: "defense",   aliases: ["takedown abwehr", "beine wegziehen"] },
    { name: "Takedown",               kat: ["MMA", "Ringen/Grappling"],                        audioOk: false, chaosOk: false, typ: "wurf",      aliases: ["zu boden bringen", "wurf"] },
    { name: "Shoot",                  kat: ["MMA"],                                            audioOk: false, chaosOk: false, typ: "wurf",      aliases: ["anlauf zum takedown", "einschießen"] },
    { name: "Dirty Boxing",           kat: ["MMA"],                                            audioOk: false, chaosOk: false, typ: "schlag",    aliases: ["schläge im clinch"] },
    { name: "Wandarbeit",             kat: ["MMA"],                                            audioOk: false, chaosOk: false, typ: "clinch",    aliases: ["gegen die wand drücken"] },
    { name: "Kimura-Griff",           kat: ["MMA", "Ringen/Grappling"],                        audioOk: false, chaosOk: false, typ: "griff",     aliases: ["schultergriff", "armhebel hinten"] },
    { name: "Guillotine",             kat: ["MMA", "Ringen/Grappling"],                        audioOk: false, chaosOk: false, typ: "griff",     aliases: ["würgegriff vorne", "kopfgriff"] },
    // ── Ringen/Grappling ─────────────────────────────────────────
    { name: "Hüftwurf",              kat: ["Ringen/Grappling"],                               audioOk: false, chaosOk: false, typ: "wurf",      aliases: ["über die hüfte werfen", "judowurf"] },
    { name: "Doppelbeinsatz",         kat: ["MMA", "Ringen/Grappling"],                        audioOk: false, chaosOk: false, typ: "wurf",      aliases: ["beide beine greifen", "double leg"] },
    { name: "Einseinangriff",         kat: ["MMA", "Ringen/Grappling"],                        audioOk: false, chaosOk: false, typ: "wurf",      aliases: ["ein bein greifen", "single leg"] },
    { name: "Butterfly Guard",        kat: ["Ringen/Grappling"],                               audioOk: false, chaosOk: false, typ: "defense",   aliases: ["schmetterling guard", "bodenlage abwehr"] },
    { name: "Armhebel",               kat: ["MMA", "Ringen/Grappling"],                        audioOk: false, chaosOk: false, typ: "griff",     aliases: ["arm strecken", "arm sperren", "armbar"] },
    { name: "Beinhebel-Ansatz",       kat: ["Ringen/Grappling"],                               audioOk: false, chaosOk: false, typ: "griff",     aliases: ["bein sperren", "fußhebel vorbereitung"] },
    // ── Karate/TKD ───────────────────────────────────────────────
    { name: "Rückfaustschlag",        kat: ["Karate/TKD"],                                     audioOk: false, chaosOk: false, typ: "schlag",    aliases: ["faust rückseite", "backfist"] },
    { name: "Handkantenschlag",       kat: ["Karate/TKD"],                                     audioOk: false, chaosOk: false, typ: "schlag",    aliases: ["karateschlag", "shuto", "handkante"] },
    { name: "Spinning Hook Kick",     kat: ["Karate/TKD"],                                     audioOk: false, chaosOk: false, typ: "kick",      aliases: ["drehkick", "haken kick drehung"] },
    { name: "Axtkick",                kat: ["Karate/TKD"],                                     audioOk: false, chaosOk: false, typ: "kick",      aliases: ["fallender kick", "kick von oben"] },
    { name: "Gedan Barai",            kat: ["Karate/TKD"],                                     audioOk: false, chaosOk: false, typ: "defense",   aliases: ["tiefblock", "abwehr unten", "low block"] },
    { name: "Oi Zuki",                kat: ["Karate/TKD"],                                     audioOk: false, chaosOk: false, typ: "schlag",    aliases: ["laufpunch", "schrittschlag"] },
];

const proSinnvolleKombis = {
    "Boxen": [
        ["Jab", "Cross", "Linker Haken", "Meiden"],
        ["Jab", "Meiden", "Rechter Uppercut", "Rechter Haken"],
        ["Cross", "Linker Haken", "Cross"],
        ["Jab", "Jab", "Cross", "Block"],
        ["Linker Haken", "Rechter Uppercut", "Linker Haken", "Cross"],
        ["Jab", "Slip Rechts", "Linker Körperhaken", "Cross"],
        ["Cross", "Rollbewegung", "Linker Uppercut", "Rechter Haken"],
        ["Jab", "Cross", "Slip Links", "Rechter Körperhaken", "Cross"]
    ],
    "Kick-/Thaiboxen": [
        ["Jab", "Cross", "Linker Midkick"],
        ["Rechter Lowkick", "Linker Haken", "Rechter Midkick"],
        ["Jab", "Linker Haken", "Clinch", "Rechtes Knie"],
        ["Block", "Cross", "Rechter Lowkick"],
        ["Frontkick", "Cross", "Rechter Lowkick"],
        ["Teep", "Jab", "Cross", "Linker Bodykick"],
        ["Rechter Lowkick", "Jab", "Clinch", "Aufwärtsknie"],
        ["Slip Links", "Linker Ellbogen", "Rechtes Knie"],
        ["Jab", "Cross", "Linker Haken", "Rechter Lowkick"],
        ["Fliegendes Knie", "Cross", "Linker Highkick"]
    ],
    "MMA": [
        ["Jab", "Cross", "Takedown"],
        ["Linker Haken", "Rechter Lowkick", "Sprawl"],
        ["Cross", "Clinch", "Linker Ellbogen", "Takedown"],
        ["Sprawl", "Rechtes Knie", "Linker Uppercut"],
        ["Jab", "Overhand", "Clinch"],
        ["Shoot", "Takedown", "Wandarbeit"],
        ["Dirty Boxing", "Clinch", "Kimura-Griff"],
        ["Jab", "Cross", "Doppelbeinsatz"]
    ],
    "Ringen/Grappling": [
        ["Takedown", "Sprawl", "Clinch"],
        ["Clinch", "Takedown"],
        ["Sprawl", "Clinch", "Takedown"],
        ["Doppelbeinsatz", "Hüftwurf"],
        ["Einseinangriff", "Armhebel"],
        ["Butterfly Guard", "Beinhebel-Ansatz"]
    ],
    "Karate/TKD": [
        ["Jab", "Frontkick", "Cross"],
        ["Meiden", "Linker Highkick", "Linker Haken"],
        ["Rechter Midkick", "Cross", "Frontkick"],
        ["Oi Zuki", "Gedan Barai", "Rückfaustschlag"],
        ["Axtkick", "Cross", "Handkantenschlag"],
        ["Spinning Hook Kick", "Jab", "Cross"]
    ]
};

const erlaubteTechniken = technikenDatenbank.map(t => t.name);

// ── Dropdown ─────────────────────────────────────────────────────────────────
function toggleDropdown(event) {
    event.stopPropagation();
    let dd = document.getElementById("categoryDropdown");
    dd.classList.toggle("show");
}

function toggleTrainingFilterDropdown(event) {
    event.stopPropagation();
    let dd = document.getElementById("trainingFilterDropdown");
    dd.classList.toggle("show");
}

function selectFromDropdown(kategorie, emoji) {
    document.querySelectorAll('.btn-create-filter').forEach(b => b.classList.remove('active'));
    let toggleBtn = document.querySelector('.btn-dropdown-toggle');
    toggleBtn.innerText = emoji + " " + kategorie;
    toggleBtn.style.backgroundColor = "#ff5500";
    toggleBtn.style.color = "white";

    filterEingabeTechniken(kategorie, null, emoji + " " + kategorie);
    document.getElementById("categoryDropdown").classList.remove("show");
}

window.addEventListener('click', function (event) {
    // Custom Autocomplete schließen
    if (!event.target.closest('.custom-autocomplete') && 
        !event.target.closest('#vorschlagsListe')) {
        let vl = document.getElementById("vorschlagsListe");
        if (vl) vl.classList.remove("open");
    }

    // Kategorie-Dropdown schließen
    if (!event.target.closest('.category-dropdown-container')) {
        let dd = document.getElementById("categoryDropdown");
        if (dd) dd.classList.remove('show');
    }

    // Training-Filter-Dropdown schließen
    if (!event.target.closest('#trainingFilterWrapper')) {
        let trDropdown = document.getElementById("trainingFilterDropdown");
        if (trDropdown) trDropdown.classList.remove('show');
    }
});

// ── Tab / Mode Navigation ────────────────────────────────────────────────────
function switchTab(tabId, button) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    button.classList.add('active');

    const trainingFilter = document.getElementById('trainingFilterWrapper');
    const navGroup = document.getElementById('navTabsGroup');

    if (tabId === 'training-tab') {
        trainingFilter.classList.add('aktiv');
        trainingFilter.querySelector('.nav-filter-btn').classList.add('visible');
        navGroup.classList.add('with-filter');
        // Timer fortsetzen wenn er pausiert war durch Tab-Wechsel
        if (timerWurdeAutoPausiert && !timerLaeuft) {
            toggleTimer();
            timerWurdeAutoPausiert = false;
        }
    } else {
        trainingFilter.classList.remove('aktiv');
        trainingFilter.querySelector('.nav-filter-btn').classList.remove('visible');
        navGroup.classList.remove('with-filter');
        document.getElementById("trainingFilterDropdown").classList.remove("show");
        // Timer pausieren wenn er läuft
        if (timerLaeuft) {
            timerWurdeAutoPausiert = true;
            stoppeTimer();
        }
        stoppeSämtlicheTrainingsAktionen();
    }

    aktualisiereTrainingMetaStatusTexte();
    window.scrollTo({ top: 0, behavior: 'instant' });
    haptic.double();
}

function switchTrainingMode(modeId, button) {
    document.querySelectorAll('.mode-content').forEach(mode => mode.classList.remove('active'));
    document.querySelectorAll('.sub-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(modeId).classList.add('active');
    button.classList.add('active');

    // Punkte aktualisieren
    let idx = trainingModeReihenfolge.indexOf(modeId);
    document.querySelectorAll('.sub-nav-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === idx);
    });

    stoppeSämtlicheTrainingsAktionen();
    window.scrollTo({ top: 0, behavior: 'instant' });
    haptic.light();
}

// ── Technik-Eingabe ───────────────────────────────────────────────────────────
let aktuelleTechnikListe = [];

function filterEingabeTechniken(kategorie, button, vollerNameMitEmoji = 'Alle') {
    gewaehlteErstellungsKategorie = kategorie;
    vollerKategorieNameMitEmoji = vollerNameMitEmoji;
    let diceBtn = document.getElementById("diceBtn");

    if (button) {
        document.querySelectorAll('.btn-create-filter').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        let toggleBtn = document.querySelector('.btn-dropdown-toggle');
        toggleBtn.innerText = "📂 Kategorie wählen";
        toggleBtn.style.backgroundColor = "#1c1c21";
        toggleBtn.style.color = "#ff5500";
    }

    diceBtn.style.display = (kategorie === 'Alle' || !kategorie) ? "none" : "flex";

    let inputFeld = document.getElementById("kombiInput");

    if (kategorie === 'Alle' || !kategorie) {
        inputFeld.placeholder = "Technik wählen, tippen oder Kombi einfügen...";
        aktuelleTechnikListe = technikenDatenbank.map(t => t.name);
    } else {
        inputFeld.placeholder = `Technik für ${kategorie} wählen...`;
        aktuelleTechnikListe = technikenDatenbank.filter(t => t.kat.includes(kategorie)).map(t => t.name);
    }
}

let tastaturOffen = false;
let inputTouchStartY = 0;
let inputTouchStartX = 0;
let letzterTapZeit = 0;
let ersterTapGemacht = false;
let ersterTapTimeout = null;

function initInputTouchHandler() {
    let input = document.getElementById("kombiInput");
    if (!input) return;

    // ── Handy: Touch ──────────────────────────────────────────
    input.addEventListener("touchstart", (e) => {
        inputTouchStartY = e.touches[0].clientY;
        inputTouchStartX = e.touches[0].clientX;
    }, { passive: true });

    input.addEventListener("touchend", (e) => {
        let dy = Math.abs(e.changedTouches[0].clientY - inputTouchStartY);
        let dx = Math.abs(e.changedTouches[0].clientX - inputTouchStartX);
        if (dy > 8 || dx > 8) return; // war ein Scroll

        let jetzt = Date.now();
        if (jetzt - letzterTapZeit < 300) return; // Doppel-Trigger verhindern
        letzterTapZeit = jetzt;

        e.preventDefault();
        handleInputTap();
    });

    // ── PC: Maus-Klick ────────────────────────────────────────
    input.addEventListener("click", (e) => {
        if ('ontouchstart' in window) return;
        handleInputTap();
    });

    // Tastatur erscheint → Input + Dropdown ins Sichtfeld scrollen
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            if (!tastaturOffen) return;
            let inputEl  = document.getElementById("kombiInput");
            let dropdown = document.getElementById("vorschlagsListe");
            if (!inputEl) return;

            setTimeout(() => {
                let viewH    = window.visualViewport.height;
                let offsetY  = window.visualViewport.offsetTop;

                // Absolute Position auf der Seite
                let inputRect   = inputEl.getBoundingClientRect();
                let dropdownH   = dropdown && dropdown.classList.contains("open")
                    ? dropdown.offsetHeight
                    : 0;

                // Unterkante = Input-Unterkante + Dropdown-Höhe, absolut auf der Seite
                let unterKanteAbsolut = inputRect.bottom + window.scrollY + dropdownH;
                let sichtbaresEnde    = offsetY + viewH - 16;

                if (unterKanteAbsolut > sichtbaresEnde) {
                    window.scrollTo({
                        top: unterKanteAbsolut - viewH + 16,
                        behavior: 'smooth'
                    });
                }
            }, 200);
        });
    }

    // Paste Event – direkt abfangen für Multi-Kombi Import
    input.addEventListener("paste", (e) => {
        // readonly kurz entfernen damit Paste funktioniert
        input.removeAttribute("readonly");

        let eingefuegt = (e.clipboardData || window.clipboardData).getData("text");
        if (!eingefuegt) return;
        eingefuegt = eingefuegt.trim();

        if (eingefuegt.startsWith("[") && eingefuegt.includes("➔")) {
            e.preventDefault();
            input.setAttribute("readonly", true);
            verarbeiteKombiBlock(eingefuegt);
        }
    }, { passive: false });

    // Fallback: nach kurzer Verzögerung Input-Wert prüfen (für manche Mobile Browser)
    input.addEventListener("input", () => {
        let wert = input.value.trim();
        if (wert.startsWith("[") && wert.includes("➔")) {
            input.value = "";
            input.setAttribute("readonly", true);
            verarbeiteKombiBlock(wert);
        }
    });
}

function verarbeiteKombiBlock(text) {
    let zeilen = text.split("\n").map(z => z.trim()).filter(Boolean);
    let kat    = zeilen[0].replace(/[\[\]]/g, '').trim();

    let neueKombis = zeilen.slice(1).map(z => {
        let bereinigt = z.replace(/^\d+\.\s*/, '').trim();
        return (bereinigt.includes("➔") || bereinigt.includes("->")) ? bereinigt : null;
    }).filter(Boolean);

    if (neueKombis.length === 0) return;

    let hinzugefuegt = 0;
    neueKombis.forEach(text => {
        if (!alleGespeichertenKombis.some(k => k.text === text)) {
            alleGespeichertenKombis.push({
                id: String(Date.now()) + Math.floor(Math.random()*1000),
                text,
                kategorie: kat,
                isFav: false
            });
            hinzugefuegt++;
        }
    });

    document.getElementById("kombiInput").value = "";
    document.getElementById("vorschlagsListe").classList.remove("open");
    saveSafeToLocalStorage();
    baueTresorUndFilterAuf();
    zeigeToast(`✅ ${hinzugefuegt} Kombis importiert`);
    haptic.success();
}

function handleInputTap() {
    let input = document.getElementById("kombiInput");

    if (!ersterTapGemacht && !tastaturOffen) {
        // 1. Tap – nur Dropdown öffnen, kein Scrollen
        ersterTapGemacht = true;
        input.setAttribute("readonly", true);
        zeigeVorschlaege();

        clearTimeout(ersterTapTimeout);
        ersterTapTimeout = setTimeout(() => {
            ersterTapGemacht = false;
        }, 20000);

    } else if (ersterTapGemacht && !tastaturOffen) {
        // 2. Tap – Tastatur öffnen
        clearTimeout(ersterTapTimeout);
        ersterTapGemacht = false;
        tastaturOffen = true;
        input.removeAttribute("readonly");
        input.focus();
        zeigeVorschlaege();

    } else if (tastaturOffen) {
        // 3. Tap – Tastatur schließen, Dropdown bleibt
        tastaturOffen = false;
        ersterTapGemacht = false;
        input.setAttribute("readonly", true);
        input.blur();
        zeigeVorschlaege();
    }
}

function toggleTastatur() {
    handleInputTap();
}

function zeigeVorschlaege() {
    aktualisiereVorschlagsListe(document.getElementById("kombiInput").value.trim());
}

function aktualisiereVorschlagsListe(wert) {
    let liste = document.getElementById("vorschlagsListe");
    liste.innerHTML = "";

    let gefiltert;
    if (wert.length === 0) {
        gefiltert = aktuelleTechnikListe;
    } else {
        let wertLower = wert.toLowerCase();
        gefiltert = technikenDatenbank
            .filter(t => {
                if (!aktuelleTechnikListe.includes(t.name)) return false;
                if (t.name.toLowerCase().includes(wertLower)) return true;
                if (t.aliases && t.aliases.some(a => a.toLowerCase().includes(wertLower))) return true;
                return false;
            })
            .map(t => t.name);
    }

    if (gefiltert.length === 0) { liste.classList.remove("open"); return; }

    gefiltert.forEach(technik => {
        let item = document.createElement("div");
        item.className = "vorschlags-item";

        if (wert.length > 0) {
            let regex = new RegExp(`(${wert})`, 'gi');
            item.innerHTML = technik.replace(regex, '<mark>$1</mark>');
        } else {
            item.innerText = technik;
        }

        // Touch-Start Position merken
        let touchStartY = 0;
        let touchStartX = 0;

        item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            waehleVorschlag(technik);
        });

        item.addEventListener("touchstart", (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        item.addEventListener("touchend", (e) => {
            let deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
            let deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
            // Nur auswählen wenn Finger sich kaum bewegt hat (kein Scroll)
            if (deltaY < 8 && deltaX < 8) {
                e.preventDefault();
                waehleVorschlag(technik);
            }
        });

        liste.appendChild(item);
    });

    liste.classList.add("open");
}

function waehleVorschlag(technik) {
    fuegeTechnikHinzu(technik);
    let input = document.getElementById("kombiInput");
    input.value = "";
    input.setAttribute("readonly", true);
    tastaturOffen = false;
    ersterTapGemacht = false;
    clearTimeout(ersterTapTimeout);
    document.getElementById("vorschlagsListe").classList.remove("open");
    input.blur();
}

function checkInput() {
    let input = document.getElementById("kombiInput");
    let wert = input.value.trim();

    if (wert.includes("➔") || wert.includes("->") || wert.includes("|")) {
        // Nummerierung entfernen: "1. Jab ➔ Cross" → "Jab ➔ Cross"
        let bereinigt = wert.replace(/^\d+\.\s*/, '');
        let teile = bereinigt.split(/\s*➔\s*|\s*->\s*|\s*\|\s*/);
        aktuelleKombi = [];
        teile.forEach(t => {
            let sauber = t.trim();
            let treffer = erlaubteTechniken.find(dbT => dbT.toLowerCase() === sauber.toLowerCase());
            if (treffer) {
                aktuelleKombi.push(treffer);
            } else if (sauber.length > 0) {
                aktuelleKombi.push(sauber.charAt(0).toUpperCase() + sauber.slice(1));
            }
        });
        input.value = "";
        renderVorschau();
        document.getElementById("vorschlagsListe").classList.remove("open");
        return;
    }

    aktualisiereVorschlagsListe(wert);
}

function checkEnter(event) {
    if (event.key === 'Enter') {
        let input = document.getElementById("kombiInput");
        let wert = input.value.trim();
        if (wert.length > 0) {
            fuegeTechnikHinzu(saubereEingabeFormatierung(wert));
            input.value = "";
            document.getElementById("vorschlagsListe").classList.remove("open");
        }
    }
}

function saubereEingabeFormatierung(str) {
    let treffer = erlaubteTechniken.find(dbT => dbT.toLowerCase() === str.toLowerCase());
    if (treffer) return treffer;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function fuegeTechnikHinzu(technikName) {
    aktuelleKombi.push(technikName);
    haptic.medium();
    renderVorschau();
}

function loescheLetzteTechnik() {
    if (aktuelleKombi.length > 0) {
        aktuelleKombi.pop();
        haptic.light();
        renderVorschau();
    }
}

document.addEventListener('keydown', function (event) {
    if (event.key === 'Backspace' && document.activeElement !== document.getElementById('kombiInput')) {
        loescheLetzteTechnik();
    }
});

function renderVorschau() {
    let vorschau = document.getElementById("kombiVorschau");
    let info = document.getElementById("infoText");
    let saveBtn = document.getElementById("saveBtn");

    if (aktuelleKombi.length === 0) {
        vorschau.innerHTML = `<i>Noch keine Technik hinzugefügt...</i>`;
        vorschau.classList.remove("aktiviert");
        saveBtn.disabled  = true;
        info.innerText    = "Füge mindestens 2 Techniken hinzu oder füge eine Kopie ein";

        // Bearbeitungsmodus abbrechen falls aktiv
        if (bearbeiteteKombiId) {
            bearbeiteteKombiId  = null;
            saveBtn.innerText   = "Im Safe ablegen";
            saveBtn.onclick     = () => oeffneSpeicherDialog();
        }
    } else {
        vorschau.innerText = historischeKombiFormatierung(aktuelleKombi);
        vorschau.classList.add("aktiviert");

        if (aktuelleKombi.length >= 2) {
            saveBtn.disabled = false;
            info.innerText = "Bereit zum Sichern im Safe!";
        } else {
            saveBtn.disabled = true;
            info.innerText = "Füge mindestens 2 Techniken hinzu";
        }
    }
}

function historischeKombiFormatierung(arr) {
    return arr.join(" ➔ ");
}

function generiereZufaelligeKombi() {
    if (gewaehlteErstellungsKategorie === 'Alle') return;
    let optionen = proSinnvolleKombis[gewaehlteErstellungsKategorie];
    if (optionen && optionen.length > 0) {
        aktuelleKombi = [...optionen[Math.floor(Math.random() * optionen.length)]];
        renderVorschau();
    }
}

// ── Speicher-Dialog ───────────────────────────────────────────────────────────
function oeffneSpeicherDialog() {
    if (aktuelleKombi.length < 2) return;
    document.getElementById("modalKombiText").innerText = historischeKombiFormatierung(aktuelleKombi);

    let directArea = document.getElementById("modalDirectSaveArea");
    let multiArea  = document.getElementById("modalMultiOptionsArea");

    if (gewaehlteErstellungsKategorie !== 'Alle') {
        document.getElementById("modalHeaderTitle").innerText = "Im Safe sichern?";
        document.getElementById("modalSubstitleText").innerText = `Wird unter der Kategorie "${vollerKategorieNameMitEmoji}" abgelegt.`;
        directArea.style.display = "flex";
        multiArea.style.display  = "none";
    } else {
        document.getElementById("modalHeaderTitle").innerText = "Kategorie wählen";
        document.getElementById("modalSubstitleText").innerText = "Für welche Sportart gilt diese Kombination?";
        directArea.style.display = "none";
        multiArea.style.display  = "flex";
    }
    document.getElementById("saveModal").classList.add("open");
}

function schliesseSpeicherDialog() {
    document.getElementById("saveModal").classList.remove("open");
}

function speichereMitAktuellerKategorie() {
    finaleSpeicherung(vollerKategorieNameMitEmoji);
}

function finaleSpeicherung(kategorieName) {
    let neuerKombiText = historischeKombiFormatierung(aktuelleKombi);
    let existiertBereits = alleGespeichertenKombis.some(k => k.text === neuerKombiText);

    if (existiertBereits) {
        haptic.error();
        zeigeToast("⚠️ Diese Kombi liegt schon im Tresor!");
        aktuelleKombi = [];
        renderVorschau();
        schliesseSpeicherDialog();
        return;
    }

    alleGespeichertenKombis.push({
        id: Date.now(),
        text: neuerKombiText,
        kategorie: kategorieName,
        isFav: false
    });

    haptic.success();
    saveSafeToLocalStorage();
    aktuelleKombi = [];
    renderVorschau();
    schliesseSpeicherDialog();
    baueTresorUndFilterAuf();
}

// ── LocalStorage ──────────────────────────────────────────────────────────────
function saveSafeToLocalStorage() {
    localStorage.setItem('fightvault_tresor_data', JSON.stringify(alleGespeichertenKombis));
}

function loadSafeFromLocalStorage() {
    let daten = localStorage.getItem('fightvault_tresor_data');

    if (daten !== null) {
        alleGespeichertenKombis = JSON.parse(daten);
    } else {
        alleGespeichertenKombis = [];
        saveSafeToLocalStorage();
    }
    baueTresorUndFilterAuf();
}

// ── Tresor ────────────────────────────────────────────────────────────────────
let zuLoeschendId = null;

function loescheKombi(id) {
    let kombi = alleGespeichertenKombis.find(k => k.id === id);
    if (!kombi) return;
    zuLoeschendId = id;
    document.getElementById("loeschModalText").innerText = kombi.text;
    document.getElementById("loeschModal").classList.add("open");
}

function loeschBestaetigen() {
    if (!zuLoeschendId) return;
    haptic.error();
    alleGespeichertenKombis = alleGespeichertenKombis.filter(k => k.id !== zuLoeschendId);
    zuLoeschendId = null;
    saveSafeToLocalStorage();
    baueTresorUndFilterAuf();
    document.getElementById("loeschModal").classList.remove("open");
}

function loeschAbbrechen() {
    zuLoeschendId = null;
    document.getElementById("loeschModal").classList.remove("open");
}

let bearbeiteteKombiId = null;

function bearbeiteKombi(id) {
    let kombi = alleGespeichertenKombis.find(k => k.id === id);
    if (!kombi) return;

    bearbeiteteKombiId = id;

    // Kombi in den Eingabebereich laden
    aktuelleKombi = kombi.text.split(" ➔ ");

    // Kategorie setzen
    gewaehlteErstellungsKategorie = kombi.kategorie.replace(/[🥊🔥🤼🥋\s]/gu, '').trim();
    vollerKategorieNameMitEmoji   = kombi.kategorie;

    // Zum Safe-Tab wechseln
    switchTab('safe-tab', document.getElementById('navBtnSafe'));

    // Vorschau rendern
    renderVorschau();

    // Save-Button auf "Speichern" umstellen
    let saveBtn = document.getElementById("saveBtn");
    saveBtn.innerText = "✏️ Änderungen speichern";
    saveBtn.onclick   = () => speichereBearbeitung();

    // Scroll nach oben
    window.scrollTo({ top: 0, behavior: 'smooth' });
    zeigeToast("✏️ Kombi wird bearbeitet – ändere und speichere!");
}

function speichereBearbeitung() {
    if (!bearbeiteteKombiId || aktuelleKombi.length < 2) return;

    let kombi = alleGespeichertenKombis.find(k => k.id === bearbeiteteKombiId);
    if (!kombi) return;

    kombi.text = historischeKombiFormatierung(aktuelleKombi);
    saveSafeToLocalStorage();
    baueTresorUndFilterAuf();

    // Zurücksetzen
    bearbeiteteKombiId = null;
    aktuelleKombi = [];
    renderVorschau();

    // Save-Button zurücksetzen
    let saveBtn = document.getElementById("saveBtn");
    saveBtn.innerText = "Im Safe ablegen";
    saveBtn.onclick   = () => oeffneSpeicherDialog();

    zeigeToast("✅ Kombination gespeichert!");
}

function kopiereKombi(event, text, button) {
    if (event) { event.preventDefault(); event.stopPropagation(); }

    let tempTextArea = document.createElement("textarea");
    tempTextArea.value = text;
    tempTextArea.style.cssText = "position:fixed;top:0;left:0;";
    document.body.appendChild(tempTextArea);
    tempTextArea.focus();
    tempTextArea.select();
    tempTextArea.setSelectionRange(0, 99999);

    try {
        document.execCommand("copy");
        ausfuehrenKopiertEffekt(button);
    } catch (err) {
        navigator.clipboard.writeText(text).then(() => ausfuehrenKopiertEffekt(button));
    }
    document.body.removeChild(tempTextArea);
}

function ausfuehrenKopiertEffekt(button) {
    let alterInhalt = button.innerHTML;
    button.innerHTML = "📋 Kopiert!";
    button.classList.add("copied-status");
    haptic.light();
    setTimeout(() => {
        button.innerHTML = alterInhalt;
        button.classList.remove("copied-status");
    }, 1500);
}

function sendeKombiZuAudioCoach(text) {
    switchTab('training-tab', document.getElementById('navBtnTraining'));
    switchTrainingMode('audio-mode', document.getElementById('subBtnAudio'));
    baueAudioSatzStruktur(text);
    sprichText(text);
}

// Long-Press / Favoriten
function handleTouchStart(id) {
    isLongPressTriggered = false;
    touchTimer = setTimeout(() => {
        toggleFavorit(id);
        isLongPressTriggered = true;
    }, 800);
}

function handleTouchEnd(event, element) {
    if (touchTimer) clearTimeout(touchTimer);
    if (isLongPressTriggered) { event.preventDefault(); return; }
}

function toggleFavorit(id) {
    let kombi = alleGespeichertenKombis.find(k => k.id === id);
    if (kombi) {
        kombi.isFav = !kombi.isFav;
        haptic.medium();
        saveSafeToLocalStorage();
        baueTresorUndFilterAuf();
    }
}

function toggleKombiHighlight(event, element) {
    if (event.target.closest('.action-btns')) return;
    if (isLongPressTriggered) return;

    let id = parseInt(element.dataset.kombiId);
    let kombi = alleGespeichertenKombis.find(k => k.id === id);
    if (!kombi) return;

    // Prüfen ob bereits markierte Kombis eine andere Kategorie haben
    let bereitsMarkierte = document.querySelectorAll('.highlighted-vault-item');
    if (bereitsMarkierte.length > 0 && !element.classList.contains('highlighted-vault-item')) {
        let ersteId = parseInt(bereitsMarkierte[0].dataset.kombiId);
        let ersteKombi = alleGespeichertenKombis.find(k => k.id === ersteId);
        if (ersteKombi && ersteKombi.kategorie !== kombi.kategorie) {
            zeigeToast("⚠️ Nur gleiche Kategorien können zusammen markiert werden");
            haptic.error();
            return;
        }
    }

    element.classList.toggle('highlighted-vault-item');
    aktualisiereMultiAktionsButton();
}

function aktualisiereMultiAktionsButton() {
    let markierte = document.querySelectorAll('.highlighted-vault-item').length;
    let btn = document.getElementById("multiAktionsBtn");
    if (!btn) return;
    if (markierte >= 2) {
        btn.style.display = "flex";
        btn.innerText = `${markierte} ausgewählt ›`;
        haptic.light();
    } else {
        btn.style.display = "none";
    }
}

function holeMarkierteIds() {
    let ids = [];
    document.querySelectorAll('.highlighted-vault-item').forEach(el => {
        let id = el.dataset.kombiId;
        if (id) ids.push(id);
    });
    return ids;
}

function oeffneMultiSheet() {
    let ids = holeMarkierteIds();
    if (ids.length < 2) return;
    document.getElementById("multiSheetAnzahl").innerText = `${ids.length} Kombis ausgewählt`;
    document.getElementById("multiAktionsSheet").classList.add("open");
}

function schliesseMultiSheet() {
    document.getElementById("multiAktionsSheet").classList.remove("open");
}

function multiAlleLoeschen() {
    let ids = holeMarkierteIds();
    schliesseMultiSheet();
    alleGespeichertenKombis = alleGespeichertenKombis.filter(k => !ids.includes(String(k.id)));
    saveSafeToLocalStorage();
    baueTresorUndFilterAuf();
    aktualisiereMultiAktionsButton();
    haptic.error();
    zeigeToast(`🗑️ ${ids.length} Kombis gelöscht`);
}

function multiAlleFavorit() {
    let ids = holeMarkierteIds();
    let alleFav = ids.every(id => {
        let k = alleGespeichertenKombis.find(k => String(k.id) === String(id));
        return k && k.isFav;
    });
    ids.forEach(id => {
        let k = alleGespeichertenKombis.find(k => String(k.id) === String(id));
        if (k) k.isFav = !alleFav;
    });
    saveSafeToLocalStorage();
    baueTresorUndFilterAuf();
    schliesseMultiSheet();
    aktualisiereMultiAktionsButton();
    haptic.medium();
    zeigeToast(alleFav ? "⭐ Favoriten entfernt" : "⭐ Als Favoriten markiert");
}

function toggleKombiHighlight(event, element) {
    if (event.target.closest('.action-btns')) return;
    if (isLongPressTriggered) return;
    element.classList.toggle('highlighted-vault-item');
    aktualisiereMultiAktionsButton();
}

function multiAlleKopieren() {
    let ids = holeMarkierteIds();

    // Kategorien prüfen
    let kategorien = new Set(ids.map(id => {
        let k = alleGespeichertenKombis.find(k => String(k.id) === String(id));
        return k ? k.kategorie : null;
    }).filter(Boolean));

    if (kategorien.size > 1) {
        zeigeToast("⚠️ Nur Kombis der gleichen Kategorie können zusammen kopiert werden");
        haptic.error();
        return;
    }

    let kategorie = [...kategorien][0];
    let texte = ids.map((id, idx) => {
        let k = alleGespeichertenKombis.find(k => String(k.id) === String(id));
        return k ? `${idx + 1}. ${k.text}` : null;
    }).filter(Boolean);

    let kopierText = `[${kategorie}]\n` + texte.join("\n");

    let temp = document.createElement("textarea");
    temp.value = kopierText;
    temp.style.cssText = "position:fixed;top:0;left:0;";
    document.body.appendChild(temp);
    temp.focus(); temp.select();
    try { document.execCommand("copy"); }
    catch { navigator.clipboard.writeText(kopierText); }
    document.body.removeChild(temp);

    schliesseMultiSheet();
    haptic.medium();
    zeigeToast(`📋 ${ids.length} Kombis kopiert`);
}

function multiAuswahlAufheben() {
    document.querySelectorAll('.highlighted-vault-item').forEach(el => {
        el.classList.remove('highlighted-vault-item');
    });
    aktualisiereMultiAktionsButton();
    schliesseMultiSheet();
}

function baueTresorUndFilterAuf() {
    let liste = document.getElementById("tresorListe");
    let filterContainer = document.getElementById("filterLeisteContainer");

    liste.innerHTML = "";
    aktiveKategorien.clear();
    alleGespeichertenKombis.forEach(k => { if (k.kategorie) aktiveKategorien.add(k.kategorie); });

    filterContainer.innerHTML = `<button id="filter-Alle" class="btn-filter ${aktuellerFilter === 'Alle' ? 'active' : ''}" onclick="filterTresor('Alle')">Alle</button>`;
    aktiveKategorien.forEach(kat => {
        filterContainer.innerHTML += `<button id="filter-${kat}" class="btn-filter ${aktuellerFilter === kat ? 'active' : ''}" onclick="filterTresor('${kat}')">${kat}</button>`;
    });

    let sortierteKombis  = [...alleGespeichertenKombis].sort((a, b) => (b.isFav ? 1 : 0) - (a.isFav ? 1 : 0));
    let gefilterteKombis = sortierteKombis.filter(k => aktuellerFilter === 'Alle' || k.kategorie === aktuellerFilter);

    if (gefilterteKombis.length === 0) {
        liste.innerHTML = `
            <li class="empty-state">
                <div class="empty-state-icon">🔐</div>
                <div class="empty-state-title">Tresor leer</div>
                <div class="empty-state-text">Erstelle deine erste Kombination<br>und leg sie im Safe ab.</div>
            </li>`;
        return;
    }

    gefilterteKombis.forEach(k => {
        // Sonderzeichen für inline-onclick escapen
        let safeText = k.text.replace(/'/g, "\\'");
        let favKlasse = k.isFav ? "is-favorite" : "";
        let sternIcon = k.isFav ? `<span class="fav-star">⭐</span>` : "";

        liste.innerHTML += `
            <li class="kombi-item ${favKlasse}"
                data-kombi-id="${String(k.id)}"
                onmousedown="handleTouchStart(${k.id})"
                onmouseup="handleTouchEnd(event, this)"
                ontouchstart="handleTouchStart(${k.id})"
                ontouchend="handleTouchEnd(event, this)"
                onclick="toggleKombiHighlight(event, this)">
                <div class="item-links">
                    <div class="sportart-badge">${sternIcon}${k.kategorie}</div>
                    <div class="kombi-text">${k.text}</div>
                </div>
                <div class="action-btns">
                    <button class="icon-btn" onclick="oeffneKombiSheet(${k.id})" title="Aktionen">⚙️</button>
                </div>
            </li>`;
    });
}

let aktuelleSheetKombiId = null;

function oeffneKombiSheet(id) {
    let kombi = alleGespeichertenKombis.find(k => k.id === id);
    if (!kombi) return;
    aktuelleSheetKombiId = id;

    let sheet = document.getElementById("kombiActionSheet");
    let title = document.getElementById("kombiSheetTitle");
    let favBtn = document.getElementById("kombiSheetFavBtn");

    title.innerText = kombi.text;
    favBtn.innerText = kombi.isFav ? "⭐ Favorit entfernen" : "⭐ Als Favorit markieren";
    sheet.classList.add("open");
}

function schliesseKombiSheet() {
    document.getElementById("kombiActionSheet").classList.remove("open");
    aktuelleSheetKombiId = null;
}

function sheetBearbeiten() {
    let id = aktuelleSheetKombiId;
    schliesseKombiSheet();
    bearbeiteKombi(id);
}

function sheetAudioCoach() {
    let kombi = alleGespeichertenKombis.find(k => k.id === aktuelleSheetKombiId);
    if (!kombi) return;
    let text = kombi.text;
    schliesseKombiSheet();
    sendeKombiZuAudioCoach(text);
}

function sheetKopieren() {
    let kombi = alleGespeichertenKombis.find(k => k.id === aktuelleSheetKombiId);
    if (!kombi) return;
    let text = kombi.text;
    schliesseKombiSheet();
    kopiereKombi(null, text, { innerHTML: "" });
    zeigeToast("📋 Kombi kopiert!");
}

function sheetFavorit() {
    let id = aktuelleSheetKombiId;
    schliesseKombiSheet();
    toggleFavorit(id);
}

function sheetLoeschen() {
    let id = aktuelleSheetKombiId;
    schliesseKombiSheet();
    loescheKombi(id);
}

function filterTresor(kat) {
    aktuellerFilter = kat;
    baueTresorUndFilterAuf();
}

// ── Training-Filter ───────────────────────────────────────────────────────────
function waehleTrainingFilter(kat) {
    aktuellerTrainingFilter = kat;
    let toggleBtn   = document.getElementById("trainingFilterToggle");
    let filterLabel = document.getElementById("filterBtnLabel");

    if (kat === 'Alle') {
        if (filterLabel) filterLabel.innerText = "Alle";
        toggleBtn.classList.remove("filter-active");
    } else {
        if (filterLabel) filterLabel.innerText = kat.split(" ")[0];
        toggleBtn.classList.add("filter-active");
    }

    document.getElementById("trainingFilterDropdown").classList.remove("show");
    localStorage.setItem('fightvault_training_filter', kat);
    aktualisiereTrainingMetaStatusTexte();
}

function ladeTrainingFilter() {
    let gespeicherter = localStorage.getItem('fightvault_training_filter');
    if (gespeicherter) waehleTrainingFilter(gespeicherter);
}

function aktualisiereTrainingMetaStatusTexte() {
    let anzeigeText = aktuellerTrainingFilter === 'Alle' ? 'Alle Kombinationen' : `${aktuellerTrainingFilter}-Kombis`;

    let el = (id) => document.getElementById(id);
    if (el("rouletteFilterStatus")) el("rouletteFilterStatus").innerText = `Aktueller Modus: ${anzeigeText}`;
    if (el("audioFilterStatus"))   el("audioFilterStatus").innerText   = `Filter aktiv: ${anzeigeText} – Bereit fürs Vorlesen`;
    if (el("chaosFilterStatus"))   el("chaosFilterStatus").innerText   = `Chaos-Kategorie: ${aktuellerTrainingFilter === 'Alle' ? 'Alle Sportarten' : aktuellerTrainingFilter}`;
}

function holeGefilterteKombisFuerWorkout() {
    return alleGespeichertenKombis.filter(k => aktuellerTrainingFilter === 'Alle' || k.kategorie === aktuellerTrainingFilter);
}

// ── Roulette ──────────────────────────────────────────────────────────────────
function startGambleRoulette(mitAudio = false) {
    if (istGeradeAmSprechen) return;

    let pool      = holeGefilterteKombisFuerWorkout();
    let display   = mitAudio ? document.getElementById("audioRouletteDisplay") : document.getElementById("rouletteDisplay");
    let container = mitAudio ? document.getElementById("audioRouletteContainer") : document.getElementById("rouletteContainer");

    if (pool.length === 0) { display.innerText = "Tresor leer für diesen Workout-Filter!"; return; }

    container.classList.add("gambling-active");
    display.classList.add("blur-run");

    let durchgaenge = 0;
    let intervall = setInterval(() => {
        display.innerText = pool[Math.floor(Math.random() * pool.length)].text;
        durchgaenge++;

        if (durchgaenge >= 15) {
            clearInterval(intervall);
            container.classList.remove("gambling-active");
            display.classList.remove("blur-run");

            let finaleKombi = pool[Math.floor(Math.random() * pool.length)];
            display.innerText = finaleKombi.text;
            haptic.heavy();

            if (mitAudio) {
                baueAudioSatzStruktur(finaleKombi.text);
                sprichText(finaleKombi.text);
            }
        }
    }, 60);
}

// ── Audio-Coach ───────────────────────────────────────────────────────────────
function toggleAudioSettings() {
    let panel  = document.getElementById("audioSettingsPanel");
    let toggle = document.getElementById("audioSettingsToggle");
    let arrow  = document.getElementById("audioSettingsArrow");
    let offen  = panel.classList.toggle("open");
    toggle.classList.toggle("open", offen);
    arrow.style.transform = offen ? "rotate(180deg)" : "rotate(0deg)";
}

function liveUpdateAudioSlider(val) {
    let sekunden = parseInt(val) / 2;
    let anzeige = sekunden % 1 === 0 ? sekunden + "s" : sekunden + "s";
    document.getElementById("intervallWert").innerText = anzeige;
    if (audioLoopLaeuft) restartAudioLoop();
}

function baueAudioSatzStruktur(kombiText) {
    aktuellerAudioKombiText = kombiText;
    let parts   = kombiText.split(" ➔ ");
    let display = document.getElementById("audioRouletteDisplay");
    display.innerHTML = "";

    parts.forEach((p, idx) => {
        display.innerHTML += `<span class="audio-word" id="word-${idx}">${p}</span>`;
        if (idx < parts.length - 1) display.innerHTML += `<span class="audio-sep">|</span>`;
    });
}

function optimiereTextFuerSprachausgabe(text) {
    return text
        .replace(/\bJab\b/gi,       "Dschäb")
        .replace(/\bCross\b/gi,     "Kross")
        .replace(/\bLowkick\b/gi,   "Loukik")
        .replace(/\bMidkick\b/gi,   "Midkik")
        .replace(/\bHighkick\b/gi,  "Heikik")
        .replace(/\bFrontkick\b/gi, "Frontkik")
        .replace(/\bUppercut\b/gi,  "Appakat")
        .replace(/\bOverhand\b/gi,  "Owerhänd")
        .replace(/\bSprawl\b/gi,    "Sprohl")
        .replace(/\bTakedown\b/gi,  "Teikdaun")
        .replace(/\bClinch\b/gi,    "Klintsch");
}

function sprichText(kombiText) {
    if (!('speechSynthesis' in window)) return;

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        audioQueueTimeout = setTimeout(() => sprichText(kombiText), 100);
        return;
    }
    if (audioQueueTimeout) clearTimeout(audioQueueTimeout);

    istGeradeAmSprechen = true;
    let parts = kombiText.split(" ➔ ");
    document.querySelectorAll('.audio-word').forEach(w => w.classList.remove('highlight-word'));

    function sprichSchritt(index) {
        if (index >= parts.length) {
            istGeradeAmSprechen = false;
            audioQueueTimeout = setTimeout(() => {
                document.querySelectorAll('.audio-word').forEach(w => w.classList.remove('highlight-word'));
            }, 400);
            return;
        }

        let utterance = new SpeechSynthesisUtterance(optimiereTextFuerSprachausgabe(parts[index]));
        utterance.lang  = 'de-DE';
        utterance.rate  = aktuelleSprechGeschwindigkeit;
        utterance.pitch = 1.0;

        utterance.onstart = function () {
            document.querySelectorAll('.audio-word').forEach(w => w.classList.remove('highlight-word'));
            let el = document.getElementById(`word-${index}`);
            if (el) el.classList.add('highlight-word');
        };
        utterance.onend   = function () { audioQueueTimeout = setTimeout(() => sprichSchritt(index + 1), 350); };
        utterance.onerror = function () { audioQueueTimeout = setTimeout(() => sprichSchritt(index + 1), 350); };

        window.speechSynthesis.speak(utterance);
    }

    sprichSchritt(0);
}

const geschwindigkeitsStufen = [
    { label: '🐢 0.8x', rate: 0.68 },
    { label: '▶️ 1x',   rate: 0.85 },
    { label: '⚡ 1.2x', rate: 1.02 }
];
let aktuelleGeschwindigkeitsStufe = 1; // startet bei 1x

function wechsleGeschwindigkeit() {
    aktuelleGeschwindigkeitsStufe = (aktuelleGeschwindigkeitsStufe + 1) % geschwindigkeitsStufen.length;
    let stufe = geschwindigkeitsStufen[aktuelleGeschwindigkeitsStufe];
    aktuelleSprechGeschwindigkeit = stufe.rate;
    document.getElementById("speedToggleBtn").innerText = stufe.label;
}

function setSprechGeschwindigkeit(stufe, button) {
    const stufen = { '0.8x': 0.68, '1x': 0.85, '1.2x': 1.02 };
    aktuelleSprechGeschwindigkeit = stufen[stufe];

    document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
}

function toggleAudioLoop() {
    if (audioLoopLaeuft) {
        stoppeAudioLoop();
    } else {
        let pool = holeGefilterteKombisFuerWorkout();
        let mixerAktiv = document.getElementById("audioMixerCheckbox").checked;

        if (pool.length === 0 && !mixerAktiv) {
            zeigeToast("⚠️ Kein Kombi im Tresor für diesen Filter!");
            return;
        }

        if (pool.length === 0 && mixerAktiv) {
            zeigeToast("🎲 Tresor leer – generiere Zufalls-Kombis!");
        }

        audioLoopLaeuft = true;
        let btn = document.getElementById("audioLoopBtn");
        btn.innerText       = "Loop Stopp";
        btn.style.color       = "#ff5500";
        btn.style.borderColor = "#ff5500";

        runAudioLoopSchritt();
        let sekunden = parseInt(document.getElementById("audioIntervallSlider").value) / 2;
        audioLoopInterval = setInterval(runAudioLoopSchritt, sekunden * 1000);
    }
}

function generiereZufallsKombiAusDB() {
    let katName = '';
    if (aktuellerTrainingFilter !== 'Alle') {
        katName = aktuellerTrainingFilter.replace(/[🥊🔥🤼🥋\s]/gu, '');
    }

    let alle = katName
        ? technikenDatenbank.filter(t => t.kat.includes(katName) && t.chaosOk)
        : technikenDatenbank.filter(t => t.chaosOk);

    if (alle.length === 0) alle = technikenDatenbank.filter(t => t.chaosOk);

    let schlaege = alle.filter(t => t.typ === 'schlag');
    let kicks    = alle.filter(t => t.typ === 'kick');
    let knie     = alle.filter(t => t.typ === 'knie');
    let defense  = alle.filter(t => t.typ === 'defense');

    function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // Sinnvolle Muster: 2-4 Techniken, Kicks nicht direkt aufeinander
    let muster = [
        // 2er Kombis
        () => [rand(schlaege), rand(kicks)],
        () => [rand(schlaege), rand(schlaege)],
        () => [rand(kicks),    rand(schlaege)],
        // 3er Kombis
        () => [rand(schlaege), rand(schlaege), rand(kicks)],
        () => [rand(schlaege), rand(kicks),    rand(schlaege)],
        () => [rand(kicks),    rand(schlaege), rand(schlaege)],
        () => [rand(schlaege), rand(schlaege), rand(schlaege)],
        // 4er Kombis
        () => [rand(schlaege), rand(schlaege), rand(kicks),    rand(schlaege)],
        () => [rand(schlaege), rand(kicks),    rand(schlaege), rand(schlaege)],
    ];

    // Knie nur wenn verfügbar
    if (knie.length > 0) {
        muster.push(() => [rand(schlaege), rand(schlaege), rand(knie)]);
        muster.push(() => [rand(kicks),    rand(schlaege), rand(knie)]);
    }

    let gewähltMuster = muster[Math.floor(Math.random() * muster.length)];
    let kombi = gewähltMuster().filter(Boolean);

    return kombi.map(t => t.name).join(" ➔ ");
}

function runAudioLoopSchritt() {
    if (istGeradeAmSprechen) return;
    let pool = holeGefilterteKombisFuerWorkout();
    let mixerAktiv = document.getElementById("audioMixerCheckbox").checked;

    if (mixerAktiv) {
        let kombiText;
        if (pool.length === 0) {
            // Tresor leer → zufällige Kombi aus Datenbank generieren
            kombiText = generiereZufallsKombiAusDB();
        } else {
            // Tresor hat Kombis → gespeicherte nutzen
            kombiText = pool[Math.floor(Math.random() * pool.length)].text;
        }
        baueAudioSatzStruktur(kombiText);
        sprichText(kombiText);
    } else if (aktuellerAudioKombiText) {
        baueAudioSatzStruktur(aktuellerAudioKombiText);
        sprichText(aktuellerAudioKombiText);
    }
}

function stoppeAudioLoop() {
    audioLoopLaeuft = false;
    if (audioLoopInterval) clearInterval(audioLoopInterval);
    if (audioQueueTimeout) clearTimeout(audioQueueTimeout);

    let btn = document.getElementById("audioLoopBtn");
    if (btn) { btn.innerText = "Loop Start"; btn.style.color = "#666"; btn.style.borderColor = "#222"; btn.style.background = ""; }

    window.speechSynthesis.cancel();
    istGeradeAmSprechen = false;
    document.querySelectorAll('.audio-word').forEach(w => w.classList.remove('highlight-word'));
}

function restartAudioLoop() {
    if (audioLoopInterval) clearInterval(audioLoopInterval);
    let sekunden = parseInt(document.getElementById("audioIntervallSlider").value) / 2;
    audioLoopInterval = setInterval(runAudioLoopSchritt, sekunden * 1000);
}

// ── Chaos-Trainer ─────────────────────────────────────────────────────────────
function liveUpdateChaosSlider(val) {
    document.getElementById("chaosWert").innerText = (val / 10).toFixed(1) + "s";
    if (chaosTrainerLaeuft) restartChaosTrainer();
}

function toggleChaosTrainer() {
    if (chaosTrainerLaeuft) {
        stoppeChaosTrainer();
    } else {
        chaosTrainerLaeuft = true;
        let btn = document.getElementById("chaosStartBtn");
        btn.innerText        = "Trainer ausschalten";
        btn.style.background = "linear-gradient(90deg, #555 0%, #222 100%)";

        runChaosSchritt();
        let tempoWert = parseInt(document.getElementById("chaosSpeedSlider").value);
        chaosTrainerInterval = setInterval(runChaosSchritt, tempoWert * 100);
    }
}

function runChaosSchritt() {
    let verfuegbareTechniken = technikenDatenbank;
    if (aktuellerTrainingFilter !== 'Alle') {
        let reinerKatName = aktuellerTrainingFilter.replace(/[🥊🔥🤼🥋\s]/gu, '');
        verfuegbareTechniken = technikenDatenbank.filter(t =>
            t.kat.includes(reinerKatName) && t.chaosOk
        );
    } else {
        verfuegbareTechniken = technikenDatenbank.filter(t => t.chaosOk);
    }
    if (verfuegbareTechniken.length === 0) verfuegbareTechniken = technikenDatenbank.filter(t => t.chaosOk);

    let randomTech = verfuegbareTechniken[Math.floor(Math.random() * verfuegbareTechniken.length)];
    document.getElementById("chaosDisplay").innerText = randomTech.name;

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(optimiereTextFuerSprachausgabe(randomTech.name));
        utterance.lang = 'de-DE';
        utterance.rate = 1.2;
        window.speechSynthesis.speak(utterance);
    }
}

function stoppeChaosTrainer() {
    chaosTrainerLaeuft = false;
    if (chaosTrainerInterval) clearInterval(chaosTrainerInterval);

    let display = document.getElementById("chaosDisplay");
    if (display) display.innerText = "OFFLINE";

    let btn = document.getElementById("chaosStartBtn");
    if (btn) { btn.innerText = "Trainer einschalten"; btn.style.background = "linear-gradient(90deg, #ff3333 0%, #b30000 100%)"; }

    window.speechSynthesis.cancel();
}

function restartChaosTrainer() {
    if (chaosTrainerInterval) clearInterval(chaosTrainerInterval);
    let tempoWert = parseInt(document.getElementById("chaosSpeedSlider").value);
    chaosTrainerInterval = setInterval(runChaosSchritt, tempoWert * 100);
}

function stoppeSämtlicheTrainingsAktionen() {
    stoppeAudioLoop();
    stoppeChaosTrainer();
}

// ── Timer ─────────────────────────────────────────────────────────────────────
let audioCtx = null;

function spieleBoxglocke(anzahlSchlaege = 1) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function einzelnerSchlag(zeitversatz) {
            let oscillator = audioCtx.createOscillator();
            let gainNode   = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + zeitversatz);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + zeitversatz + 1.2);

            gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime + zeitversatz);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + zeitversatz + 1.5);

            oscillator.start(audioCtx.currentTime + zeitversatz);
            oscillator.stop(audioCtx.currentTime + zeitversatz + 1.5);
        }

        for (let i = 0; i < anzahlSchlaege; i++) {
            einzelnerSchlag(i * 0.4);
        }
    } catch(e) {
        console.log("Audio nicht verfügbar:", e);
    }
}

// ── Toast Benachrichtigung ────────────────────────────────────────────────────
let toastTimeout = null;

function zeigeToast(nachricht) {
    let toast = document.getElementById("toastBanner");
    toast.innerText = nachricht;
    toast.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
    haptic.error();
}

// ── Drum Roller ───────────────────────────────────────────────────────────────
const rundenWerte = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12];
let drumIndex = 3;
const DRUM_ITEM_WIDTH = 60;

// Touch-Tracking
let drumTouchStartX   = 0;
let drumTouchStartY   = 0;
let drumTouchStartIdx = 0;
let drumTouchDir      = null; // 'h' | 'v' | null

function drumRollerInit() {
    let roller = document.getElementById("drumRoller");
    if (!roller) return;

    roller.style.paddingLeft  = `calc(50% - ${DRUM_ITEM_WIDTH / 2}px)`;
    roller.style.paddingRight = `calc(50% - ${DRUM_ITEM_WIDTH / 2}px)`;
    drumRender(false);

    // ── Touch ──────────────────────────────────────────────────
    roller.addEventListener("touchstart", (e) => {
        drumTouchStartX   = e.touches[0].clientX;
        drumTouchStartY   = e.touches[0].clientY;
        drumTouchStartIdx = drumIndex;
        drumTouchDir      = null;
        roller.style.transition = "none";
    }, { passive: true });

    roller.addEventListener("touchmove", (e) => {
        let dx = e.touches[0].clientX - drumTouchStartX;
        let dy = e.touches[0].clientY - drumTouchStartY;

        if (!drumTouchDir) {
            if (Math.abs(dx) > Math.abs(dy)) drumTouchDir = 'h';
            else drumTouchDir = 'v';
        }

        if (drumTouchDir === 'v') return; // Seite scrollen

        e.preventDefault();
        let neuIdx = Math.round(drumTouchStartIdx - dx / DRUM_ITEM_WIDTH);
        neuIdx = Math.max(0, Math.min(rundenWerte.length - 1, neuIdx));
        drumIndex = neuIdx;
        drumRender(false);
    }, { passive: false });

    roller.addEventListener("touchend", (e) => {
        if (drumTouchDir === 'h') {
            let dx = e.changedTouches[0].clientX - drumTouchStartX;

            // Kurzer Tap auf Item → direkt springen
            if (Math.abs(dx) < 8) {
                let touch = e.changedTouches[0];
                let el = document.elementFromPoint(touch.clientX, touch.clientY);
                let item = el && el.closest(".drum-item");
                if (item) {
                    let idx = parseInt(item.dataset.index);
                    if (!isNaN(idx)) { drumIndex = idx; }
                }
            } else {
                let neuIdx = Math.round(drumTouchStartIdx - dx / DRUM_ITEM_WIDTH);
                drumIndex = Math.max(0, Math.min(rundenWerte.length - 1, neuIdx));
            }
        } else if (drumTouchDir === null || Math.abs(e.changedTouches[0].clientX - drumTouchStartX) < 8) {
            // Tap ohne Bewegung → Item antippen
            let touch = e.changedTouches[0];
            let el = document.elementFromPoint(touch.clientX, touch.clientY);
            let item = el && el.closest(".drum-item");
            if (item) {
                let idx = parseInt(item.dataset.index);
                if (!isNaN(idx)) drumIndex = idx;
            }
        }

        drumApply();
    });

    // ── Mouse (PC) ─────────────────────────────────────────────
    let mouseDown = false;
    let mouseStartX = 0;
    let mouseStartIdx = 0;
    let mouseMoved = false;

    roller.addEventListener("mousedown", (e) => {
        mouseDown    = true;
        mouseStartX  = e.clientX;
        mouseStartIdx = drumIndex;
        mouseMoved   = false;
        roller.style.transition = "none";
        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
        if (!mouseDown) return;
        let dx = e.clientX - mouseStartX;
        if (Math.abs(dx) > 3) mouseMoved = true;
        let neuIdx = Math.round(mouseStartIdx - dx / DRUM_ITEM_WIDTH);
        drumIndex = Math.max(0, Math.min(rundenWerte.length - 1, neuIdx));
        drumRender(false);
    });

    window.addEventListener("mouseup", (e) => {
        if (!mouseDown) return;
        mouseDown = false;

        if (!mouseMoved) {
            // Klick auf Item
            let el = document.elementFromPoint(e.clientX, e.clientY);
            let item = el && el.closest(".drum-item");
            if (item) {
                let idx = parseInt(item.dataset.index);
                if (!isNaN(idx)) drumIndex = idx;
            }
        }
        drumApply();
    });

    // Klick auf Nachbarzahlen → eine Stufe vor/zurück
    roller.addEventListener("click", (e) => {
        let item = e.target.closest(".drum-item");
        if (!item) return;
        let idx = parseInt(item.dataset.index);
        if (isNaN(idx) || idx === drumIndex) return;
        drumIndex = idx > drumIndex
            ? Math.min(drumIndex + 1, rundenWerte.length - 1)
            : Math.max(drumIndex - 1, 0);
        drumApply();
        haptic.light();
    });

    // ── Mausrad ────────────────────────────────────────────────
    roller.parentElement.addEventListener("wheel", (e) => {
        e.preventDefault();
        drumIndex = Math.max(0, Math.min(rundenWerte.length - 1, drumIndex + (e.deltaY > 0 ? 1 : -1)));
        drumApply();
    }, { passive: false });
}

function drumRender(mitAnimation) {
    let roller = document.getElementById("drumRoller");
    if (!roller) return;
    roller.style.transition = mitAnimation
        ? "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        : "none";
    roller.style.transform = `translateX(${-drumIndex * DRUM_ITEM_WIDTH}px)`;
    document.querySelectorAll(".drum-item").forEach((item, i) => {
        item.classList.toggle("active", i === drumIndex);
    });
}

function drumApply() {
    drumRender(true);
    maxRundenVorgabe = rundenWerte[drumIndex];
    resetTimer();
}

function setzeRunden(anzahl) { }
function updateRundenVorgabe() { }

function toggleTimer() {
    let btn = document.getElementById("timerStartBtn");
    if (timerLaeuft) {
        stoppeTimer();
    } else {
        spieleBoxglocke(1); // 1x Glocke beim Start
        haptic.bell();
        timerLaeuft = true;
        btn.innerText        = "Pause";
        btn.style.background = "linear-gradient(90deg, #ffcc00 0%, #d4aa00 100%)";
        document.getElementById("timerStatus").classList.add("pulse-active");
        document.getElementById("timerStatus").innerText   = "🥊 Work";
        document.getElementById("timerStatus").style.color = "#ff5500";

        timerInterval = setInterval(() => {
            timerSekunden--;
            if (timerSekunden <= 0) handleTimerWechsel();
            renderTimerDisplay();
        }, 1000);
    }
}

function stoppeTimer() {
    timerLaeuft = false;
    if (timerInterval) clearInterval(timerInterval);
    let btn = document.getElementById("timerStartBtn");
    if (btn) { btn.innerText = "Start"; btn.style.background = "linear-gradient(90deg, #ff5500 0%, #d44600 100%)"; }
    document.getElementById("timerStatus").classList.remove("pulse-active");
}

function resetTimer() {
    stoppeTimer();
    istArbeitszeit = true;
    timerSekunden  = zeitStufen[aktuelleZeitStufe][0];
    aktuelleRunde  = 1;
    document.getElementById("timerStatus").innerText   = "BEREIT";
    document.getElementById("timerStatus").style.color = "var(--text-dim)";
    let kreis = document.getElementById("timerCircleProgress");
    if (kreis) { 
        kreis.style.strokeDashoffset = 0; 
        kreis.style.stroke = "";
        kreis.className = "timer-circle-progress"; 
    }
    let kreisHg = document.querySelector(".timer-circle-bg");
    if (kreisHg) kreisHg.className = "timer-circle-bg";
    renderTimerDisplay();
}

function handleTimerWechsel() {
    let kreisHg = document.querySelector(".timer-circle-bg");
    let kreis   = document.getElementById("timerCircleProgress");

    if (istArbeitszeit) {
        istArbeitszeit = false;
        spieleBoxglocke(3);
        haptic.bell();

        if (maxRundenVorgabe > 0 && aktuelleRunde >= maxRundenVorgabe) {
            stoppeTimer();
            document.getElementById("timerStatus").innerText   = "FERTIG 🏆";
            document.getElementById("timerStatus").style.color = "var(--green)";
            if (kreis)   kreis.className   = "timer-circle-progress done-mode";
            if (kreisHg) kreisHg.className = "timer-circle-bg";
            stoppeSämtlicheTrainingsAktionen();
            return;
        }

        timerSekunden = zeitStufen[aktuelleZeitStufe][1];
        document.getElementById("timerStatus").innerText   = "PAUSE";
        document.getElementById("timerStatus").style.color = "#00c853";
        if (kreis)   kreis.className   = "timer-circle-progress pause-mode";
        if (kreisHg) kreisHg.className = "timer-circle-bg pause-mode";
        // Trainer-Status merken und stoppen
        let audioWarAktiv = audioLoopLaeuft;
        let chaosWarAktiv = chaosTrainerLaeuft;
        stoppeSämtlicheTrainingsAktionen();
        // Für Resume merken
        window._audioWarAktiv = audioWarAktiv;
        window._chaosWarAktiv = chaosWarAktiv;

    } else {
        istArbeitszeit = true;
        aktuelleRunde++;
        spieleBoxglocke(1);
        haptic.double();
        timerSekunden = zeitStufen[aktuelleZeitStufe][0];
        document.getElementById("timerStatus").innerText   = "WORK 🥊";
        document.getElementById("timerStatus").style.color = "var(--orange)";
        if (kreis)   kreis.className   = "timer-circle-progress";
        if (kreisHg) kreisHg.className = "timer-circle-bg";
        if (window._audioWarAktiv) toggleAudioLoop();
        if (window._chaosWarAktiv) toggleChaosTrainer();
        window._audioWarAktiv = false;
        window._chaosWarAktiv = false;
    }
}

function renderTimerDisplay() {
    let mins = Math.floor(timerSekunden / 60);
    let secs = timerSekunden % 60;
    document.getElementById("timerDisplay").innerText =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    let rundenAnzeige = document.getElementById("roundCounterDisplay");
    rundenAnzeige.innerText = maxRundenVorgabe === 0
        ? "Endlos-Training"
        : `Runde ${aktuelleRunde} von ${maxRundenVorgabe}`;

    // Kreis-Progress updaten
    let kreis = document.getElementById("timerCircleProgress");
    if (kreis && !kreis.classList.contains("done-mode")) {
        let maxSek = istArbeitszeit
            ? zeitStufen[aktuelleZeitStufe][0]
            : zeitStufen[aktuelleZeitStufe][1];
        let progress = timerSekunden / maxSek;
        let umfang = 2 * Math.PI * 72;
        kreis.style.strokeDashoffset = umfang * (1 - progress);
        kreis.className = "timer-circle-progress" + (!istArbeitszeit ? " pause-mode" : "");
        kreis.style.stroke = istArbeitszeit ? "var(--orange)" : "#00c853";
        let kreisHg = document.querySelector(".timer-circle-bg");
        if (kreisHg) kreisHg.className = "timer-circle-bg" + (!istArbeitszeit ? " pause-mode" : "");
    }
}

// ── Swipe Navigation ──────────────────────────────────────────────────────────
const tabReihenfolge      = ['safe-tab', 'training-tab'];
const trainingModeReihenfolge = ['standard-mode', 'audio-mode', 'chaos-mode'];
const trainingModeBtns    = ['subBtnStandard', 'subBtnAudio', 'subBtnChaos'];

let swipeTouchStartX = 0;
let swipeTouchStartY = 0;
let swipeRichtung    = null;

function initSwipeNavigation() {
    document.addEventListener("touchstart", (e) => {
        if (e.target.closest("#drumRoller") ||
            e.target.closest(".custom-autocomplete") ||
            e.target.type === "range" ||
            e.target.closest(".option-row")) return;
        swipeTouchStartX = e.touches[0].clientX;
        swipeTouchStartY = e.touches[0].clientY;
        swipeRichtung    = null;
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
        if (e.target.closest("#drumRoller") ||
            e.target.closest(".custom-autocomplete") ||
            e.target.type === "range" ||
            e.target.closest(".option-row")) return;

        let dx = e.changedTouches[0].clientX - swipeTouchStartX;
        let dy = e.changedTouches[0].clientY - swipeTouchStartY;

        // Nur horizontale Swipes (mindestens 60px, mehr horizontal als vertikal)
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

        let richtung = dx < 0 ? 'links' : 'rechts';
        let aktiverTab = document.querySelector('.tab-content.active');

        if (aktiverTab.id === 'safe-tab') {
            // Safe → Training (nur Swipe links)
            if (richtung === 'links') {
                switchTab('training-tab', document.getElementById('navBtnTraining'));
            }
        } else if (aktiverTab.id === 'training-tab') {
            let aktiverModus = document.querySelector('.mode-content.active');
            let aktuellerIdx = trainingModeReihenfolge.indexOf(aktiverModus.id);

            if (richtung === 'rechts') {
                if (aktuellerIdx > 0) {
                    // Zurück zwischen Modi
                    switchTrainingMode(
                        trainingModeReihenfolge[aktuellerIdx - 1],
                        document.getElementById(trainingModeBtns[aktuellerIdx - 1])
                    );
                } else {
                    // Beim ersten Modus → zurück zu Safe
                    switchTab('safe-tab', document.getElementById('navBtnSafe'));
                }
            } else {
                if (aktuellerIdx < trainingModeReihenfolge.length - 1) {
                    // Vorwärts zwischen Modi
                    switchTrainingMode(
                        trainingModeReihenfolge[aktuellerIdx + 1],
                        document.getElementById(trainingModeBtns[aktuellerIdx + 1])
                    );
                }
            }
        }
    }, { passive: true });
}

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    loadSafeFromLocalStorage();
    filterEingabeTechniken('Alle');
    drumRollerInit();
    initInputTouchHandler();
    initSwipeNavigation();
    aktualisiereZeitAnzeige();
    ladeTrainingFilter();
});
