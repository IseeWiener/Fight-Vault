// ── Zustands-Variablen ──────────────────────────────────────────────────────
let alleGespeichertenKombis = [];
let aktuelleKombi = [];
let aktuellerFilter = 'Alle';
let aktuellerTrainingFilter = 'Alle';
let gewaehlteErstellungsKategorie = 'Alle';
let vollerKategorieNameMitEmoji = '';
let aktiveKategorien = new Set();

// Timer
let timerInterval = null;
let timerSekunden = 180;
let istArbeitszeit = true;
let timerLaeuft = false;
let aktuelleRunde = 1;
let maxRundenVorgabe = 3;

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
    { name: "Jab",               kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Cross",             kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Linker Haken",      kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Rechter Haken",     kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Linker Uppercut",   kat: ["Boxen", "Kick-/Thaiboxen", "MMA"] },
    { name: "Rechter Uppercut",  kat: ["Boxen", "Kick-/Thaiboxen", "MMA"] },
    { name: "Overhand",          kat: ["Boxen", "Kick-/Thaiboxen", "MMA"] },
    { name: "Meiden",            kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Block",             kat: ["Boxen", "Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Linker Ellbogen",   kat: ["Kick-/Thaiboxen", "MMA"] },
    { name: "Rechter Ellbogen",  kat: ["Kick-/Thaiboxen", "MMA"] },
    { name: "Linkes Knie",       kat: ["Kick-/Thaiboxen", "MMA"] },
    { name: "Rechtes Knie",      kat: ["Kick-/Thaiboxen", "MMA"] },
    { name: "Linker Lowkick",    kat: ["Kick-/Thaiboxen", "MMA"] },
    { name: "Linker Midkick",    kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Linker Highkick",   kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Frontkick",         kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Rechter Lowkick",   kat: ["Kick-/Thaiboxen", "MMA"] },
    { name: "Rechter Midkick",   kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Rechter Highkick",  kat: ["Kick-/Thaiboxen", "MMA", "Karate/TKD"] },
    { name: "Sprawl",            kat: ["MMA", "Ringen/Grappling"] },
    { name: "Takedown",          kat: ["MMA", "Ringen/Grappling"] },
    { name: "Clinch",            kat: ["Kick-/Thaiboxen", "MMA", "Ringen/Grappling"] }
];

const proSinnvolleKombis = {
    "Boxen": [
        ["Jab", "Cross", "Linker Haken", "Meiden"],
        ["Jab", "Meiden", "Rechter Uppercut", "Rechter Haken"],
        ["Cross", "Linker Haken", "Cross"],
        ["Jab", "Jab", "Cross", "Block"],
        ["Linker Haken", "Rechter Uppercut", "Linker Haken", "Cross"]
    ],
    "Kick-/Thaiboxen": [
        ["Jab", "Cross", "Linker Midkick"],
        ["Rechter Lowkick", "Linker Haken", "Rechter Midkick"],
        ["Jab", "Linker Haken", "Clinch", "Rechtes Knie"],
        ["Block", "Cross", "Rechter Lowkick"],
        ["Frontkick", "Cross", "Rechter Lowkick"]
    ],
    "MMA": [
        ["Jab", "Cross", "Takedown"],
        ["Linker Haken", "Rechter Lowkick", "Sprawl"],
        ["Cross", "Clinch", "Linker Ellbogen", "Takedown"],
        ["Sprawl", "Rechtes Knie", "Linker Uppercut"],
        ["Jab", "Overhand", "Clinch"]
    ],
    "Ringen/Grappling": [
        ["Takedown", "Sprawl", "Clinch"],
        ["Clinch", "Takedown"],
        ["Sprawl", "Clinch", "Takedown"]
    ],
    "Karate/TKD": [
        ["Jab", "Frontkick", "Cross"],
        ["Meiden", "Linker Highkick", "Linker Haken"],
        ["Rechter Midkick", "Cross", "Frontkick"]
    ]
};

const erlaubteTechniken = technikenDatenbank.map(t => t.name);

// ── Dropdown ─────────────────────────────────────────────────────────────────
function toggleDropdown(event) {
    event.stopPropagation();
    document.getElementById("categoryDropdown").classList.toggle("show");
}

function toggleTrainingFilterDropdown(event) {
    event.stopPropagation();
    document.getElementById("trainingFilterDropdown").classList.toggle("show");
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

window.onclick = function (event) {
    if (!event.target.matches('.btn-dropdown-toggle')) {
        document.querySelectorAll(".dropdown-menu").forEach(dd => {
            if (dd.classList.contains('show') && dd.id !== 'trainingFilterDropdown') {
                dd.classList.remove('show');
            }
        });
    }
    if (!event.target.matches('.btn-training-filter-toggle')) {
        let trDropdown = document.getElementById("trainingFilterDropdown");
        if (trDropdown && trDropdown.classList.contains('show')) {
            trDropdown.classList.remove('show');
        }
    }
};

// ── Tab / Mode Navigation ────────────────────────────────────────────────────
function switchTab(tabId, button) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    button.classList.add('active');

    const subNav = document.getElementById('trainingSubNav');
    const trainingFilter = document.getElementById('trainingFilterWrapper');

    if (tabId === 'training-tab') {
        subNav.style.display = 'flex';
        trainingFilter.style.display = 'block';
    } else {
        subNav.style.display = 'none';
        trainingFilter.style.display = 'none';
    }
    stoppeSämtlicheTrainingsAktionen();
    aktualisiereTrainingMetaStatusTexte();
}

function switchTrainingMode(modeId, button) {
    document.querySelectorAll('.mode-content').forEach(mode => mode.classList.remove('active'));
    document.querySelectorAll('.sub-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(modeId).classList.add('active');
    button.classList.add('active');
    stoppeSämtlicheTrainingsAktionen();
}

// ── Technik-Eingabe ───────────────────────────────────────────────────────────
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

    let datalist = document.getElementById("techniken");
    let inputFeld = document.getElementById("kombiInput");
    datalist.innerHTML = "";

    if (kategorie === 'Alle' || !kategorie) {
        inputFeld.placeholder = "Technik wählen, tippen oder Kombi einfügen...";
        technikenDatenbank.forEach(t => {
            datalist.innerHTML += `<option value="${t.name}">`;
        });
    } else {
        inputFeld.placeholder = `Technik für ${kategorie} wählen...`;
        technikenDatenbank.forEach(t => {
            if (t.kat.includes(kategorie)) {
                datalist.innerHTML += `<option value="${t.name}">`;
            }
        });
    }
}

function checkInput() {
    let input = document.getElementById("kombiInput");
    let wert = input.value.trim();

    // Paste-Erkennung: Trennzeichen ➔ / -> / |
    if (wert.includes("➔") || wert.includes("->") || wert.includes("|")) {
        let teile = wert.split(/\s*➔\s*|\s*->\s*|\s*\|\s*/);
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
        return;
    }

    // Autovervollständigung
    if (erlaubteTechniken.some(t => t.toLowerCase() === wert.toLowerCase())) {
        let echteTechnik = erlaubteTechniken.find(t => t.toLowerCase() === wert.toLowerCase());
        fuegeTechnikHinzu(echteTechnik);
        input.value = "";
    }
}

function checkEnter(event) {
    if (event.key === 'Enter') {
        let input = document.getElementById("kombiInput");
        let wert = input.value.trim();
        if (wert.length > 0) {
            fuegeTechnikHinzu(saubereEingabeFormatierung(wert));
            input.value = "";
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
    renderVorschau();
}

function loescheLetzteTechnik() {
    if (aktuelleKombi.length > 0) {
        aktuelleKombi.pop();
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
        saveBtn.disabled = true;
        info.innerText = "Füge mindestens 2 Techniken hinzu oder füge eine Kopie ein";
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
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        alert(`❌ Kombi abgelehnt:\n"${neuerKombiText}" liegt schon in deinem Tresor!`);
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
    if ('vibrate' in navigator) navigator.vibrate(40);
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
        saveSafeToLocalStorage();
        baueTresorUndFilterAuf();
        if ('vibrate' in navigator) navigator.vibrate(50);
    }
}

function toggleKombiHighlight(event, element) {
    if (event.target.closest('.action-btns')) return;
    if (isLongPressTriggered) return;
    element.classList.toggle('highlighted-vault-item');
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
        liste.innerHTML = `<li class="info-text" style="margin-top:15px;">Keine Kombinationen in dieser Kategorie vorhanden.</li>`;
        return;
    }

    gefilterteKombis.forEach(k => {
        // Sonderzeichen für inline-onclick escapen
        let safeText = k.text.replace(/'/g, "\\'");
        let favKlasse = k.isFav ? "is-favorite" : "";
        let sternIcon = k.isFav ? `<span class="fav-star">⭐</span>` : "";

        liste.innerHTML += `
            <li class="kombi-item ${favKlasse}"
                onmousedown="handleTouchStart(${k.id})"
                onmouseup="handleTouchEnd(event, this)"
                ontouchstart="handleTouchStart(${k.id})"
                ontouchend="handleTouchEnd(event, this)"
                onclick="toggleKombiHighlight(event, this)">
                <div class="item-links">
                    <span class="sportart-badge">${sternIcon}${k.kategorie}</span>
                    <div style="font-weight:bold; font-size:0.95rem; color:#fff;">${k.text}</div>
                </div>
                <div class="action-btns">
                    <button class="icon-btn" onclick="sendeKombiZuAudioCoach('${safeText}')" title="An Audio-Coach senden" style="opacity:0.85;">⚡</button>
                    <button class="icon-btn" ontouchstart="kopiereKombi(event, '${safeText}', this)" onclick="kopiereKombi(event, '${safeText}', this)" title="Kopieren">📋</button>
                    <button class="icon-btn" onclick="loescheKombi(${k.id})" style="color:#ff3333;" title="Löschen">🗑️</button>
                </div>
            </li>`;
    });
}

function filterTresor(kat) {
    aktuellerFilter = kat;
    baueTresorUndFilterAuf();
}

// ── Training-Filter ───────────────────────────────────────────────────────────
function waehleTrainingFilter(kat) {
    aktuellerTrainingFilter = kat;
    let toggleBtn = document.getElementById("trainingFilterToggle");

    if (kat === 'Alle') {
        toggleBtn.innerText = "🔍 Alle";
        toggleBtn.classList.remove("filter-active");
    } else {
        toggleBtn.innerText = "🔍 " + kat.split(" ")[0];
        toggleBtn.classList.add("filter-active");
    }

    document.getElementById("trainingFilterDropdown").classList.remove("show");
    aktualisiereTrainingMetaStatusTexte();
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

            if (mitAudio) {
                baueAudioSatzStruktur(finaleKombi.text);
                sprichText(finaleKombi.text);
            }
        }
    }, 60);
}

// ── Audio-Coach ───────────────────────────────────────────────────────────────
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
        if (pool.length === 0) { alert("Keine Kombinationen zum Loopen in dieser Kategorie vorhanden!"); return; }

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

function runAudioLoopSchritt() {
    if (istGeradeAmSprechen) return;
    let pool = holeGefilterteKombisFuerWorkout();
    if (pool.length === 0) return;

    let mixerAktiv = document.getElementById("audioMixerCheckbox").checked;

    if (mixerAktiv || !aktuellerAudioKombiText) {
        let kombi = pool[Math.floor(Math.random() * pool.length)];
        baueAudioSatzStruktur(kombi.text);
        sprichText(kombi.text);
    } else {
        baueAudioSatzStruktur(aktuellerAudioKombiText);
        sprichText(aktuellerAudioKombiText);
    }
}

function stoppeAudioLoop() {
    audioLoopLaeuft = false;
    if (audioLoopInterval) clearInterval(audioLoopInterval);
    if (audioQueueTimeout) clearTimeout(audioQueueTimeout);

    let btn = document.getElementById("audioLoopBtn");
    if (btn) { btn.innerText = "Loop Start"; btn.style.color = "#666"; btn.style.borderColor = "#222"; }

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
        verfuegbareTechniken = technikenDatenbank.filter(t => t.kat.includes(reinerKatName));
    }
    if (verfuegbareTechniken.length === 0) verfuegbareTechniken = technikenDatenbank;

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
function updateRundenVorgabe() {
    maxRundenVorgabe = parseInt(document.getElementById("timerRundenSelect").value);
    resetTimer();
}

function toggleTimer() {
    let btn = document.getElementById("timerStartBtn");
    if (timerLaeuft) {
        stoppeTimer();
    } else {
        timerLaeuft = true;
        btn.innerText        = "Pause";
        btn.style.background = "linear-gradient(90deg, #ffcc00 0%, #d4aa00 100%)";
        document.getElementById("timerStatus").classList.add("pulse-active");

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
    istArbeitszeit  = true;
    timerSekunden   = 180;
    aktuelleRunde   = 1;
    document.getElementById("timerStatus").innerText = "Bereit";
    document.getElementById("timerStatus").style.color = "#444";
    renderTimerDisplay();
}

function handleTimerWechsel() {
    if (istArbeitszeit) {
        istArbeitszeit = false;

        if (maxRundenVorgabe > 0 && aktuelleRunde >= maxRundenVorgabe) {
            stoppeTimer();
            document.getElementById("timerStatus").innerText   = "🏆 Workout Beendet!";
            document.getElementById("timerStatus").style.color = "#00e676";
            stoppeSämtlicheTrainingsAktionen();
            return;
        }

        timerSekunden = 60;
        document.getElementById("timerStatus").innerText   = "⏸️ Pause";
        document.getElementById("timerStatus").style.color = "#ffcc00";
    } else {
        istArbeitszeit = true;
        aktuelleRunde++;
        timerSekunden = 180;
        document.getElementById("timerStatus").innerText   = "🥊 Work";
        document.getElementById("timerStatus").style.color = "#ff5500";
    }
}

function renderTimerDisplay() {
    let mins = Math.floor(timerSekunden / 60);
    let secs = timerSekunden % 60;
    document.getElementById("timerDisplay").innerText =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    let rundenAnzeige = document.getElementById("roundCounterDisplay");
    rundenAnzeige.innerText = maxRundenVorgabe === 0
        ? "Modus: Endlos-Training"
        : `Runde ${aktuelleRunde} von ${maxRundenVorgabe}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    loadSafeFromLocalStorage();
    filterEingabeTechniken('Alle');
    updateRundenVorgabe();
});
