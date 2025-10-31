// AutoSubs RO - Plugin universal pentru Lampa (webOS, PC Browser, Android)
// Adaugă meniu, panou setări, detectare video, căutare, traducere și încărcare subtitle fără niciun API Lampa.
// Inspirat de pluginurile care funcționează pe orice Lampa.

// =============== CONFIG & UTILS ===============
const PLUGIN_NAME = 'AutoSubs RO';
const PLUGIN_ID = 'autosubs_ro_safe';
const SETTINGS_KEY = 'autosubs_safe_settings';

function notify(msg) {
    // Cross-platform notification
    if (window.Noty && typeof Noty.show === "function") Noty.show(msg);
    else {
        let n = document.createElement('div');
        n.style = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 30px;z-index:10000;font-size:18px;border-radius:8px;box-shadow:0 8px 32px #0008;';
        n.innerHTML = msg;
        document.body.appendChild(n);
        setTimeout(() => { try { n.remove(); } catch {} }, 3000);
    }
    console.log(`[AutoSubs RO]`, msg);
}

function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}
function loadSettings() {
    try {
        const s = localStorage.getItem(SETTINGS_KEY);
        return s ? JSON.parse(s) : { enabled: true, translate: true };
    } catch {
        return { enabled: true, translate: true };
    }
}

// =============== MENIU & MODAL ===============
function tryAddMenuEntry(retries = 0) {
    const menuList = document.querySelector('.menu__list');
    if (!menuList) {
        if (retries < 30) setTimeout(() => tryAddMenuEntry(retries + 1), 700);
        return;
    }
    if (document.getElementById('autosubs-menu-btn')) return;

    const li = document.createElement('li');
    li.className = 'menu__item';
    li.innerHTML = `<a id="autosubs-menu-btn" class="menu__link" href="#" style="color:#e50914;user-select:none;">${PLUGIN_NAME}</a>`;
    menuList.appendChild(li);

    li.querySelector('a').onclick = e => {
        e.preventDefault();
        showSettings();
    };
}

function showSettings() {
    const s = loadSettings();
    const html = `
        <div style="padding:20px 10px 10px 10px;color:#fff;">
            <h3>${PLUGIN_NAME} - Setări</h3>
            <label><input type="checkbox" id="en" ${s.enabled ? 'checked' : ''}> Activare plugin</label><br><br>
            <label><input type="checkbox" id="tr" ${s.translate ? 'checked' : ''}> Traducere EN→RO</label><br><br>
            <button id="save_autosubs" style="background:#e50914;color:#fff;padding:10px 20px;border:none;border-radius:4px;">Salvează</button>
            <button id="close_autosubs" style="background:#666;color:#fff;padding:10px 20px;border:none;border-radius:4px;margin-left:10px;">Închide</button>
        </div>
    `;
    showModal(html, () => {
        document.getElementById('save_autosubs').onclick = () => {
            saveSettings({
                enabled: document.getElementById('en').checked,
                translate: document.getElementById('tr').checked
            });
            notify('Setări salvate!');
            closeModal();
        };
        document.getElementById('close_autosubs').onclick = () => closeModal();
    });
}

function showModal(content, after) {
    let modal = document.getElementById('autosubs-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'autosubs-modal';
        modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `<div id="autosubs-modal-content" style="background:#222;padding:20px;border-radius:8px;min-width:300px;max-width:90vw;max-height:80vh;overflow:auto;"></div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('autosubs-modal-content').innerHTML = content;
    modal.style.display = 'flex';
    if (typeof after === 'function') setTimeout(after, 80);
}
function closeModal() {
    const modal = document.getElementById('autosubs-modal');
    if (modal) modal.style.display = 'none';
}

// =============== DETECTARE PLAYER (universal) ===============
function listenPlayer() {
    let lastUrl = '';
    setInterval(() => {
        const video = document.querySelector('video');
        if (video && video.currentSrc && video.currentSrc !== lastUrl) {
            lastUrl = video.currentSrc;
            if (loadSettings().enabled) {
                setTimeout(() => onPlayerStart(video), 1500);
            }
        }
    }, 2000);
}

function onPlayerStart(video) {
    // Extragere titlu și an din DOM (adaptează pentru cât mai multe teme Lampa)
    let title = '';
    let year = '';
    let season = '';
    let episode = '';

    const tNode = document.querySelector('.player-panel__title') || document.querySelector('.card__title');
    if (tNode) title = tNode.textContent.trim();

    // Exemplu: încearcă să extragi și anul (dacă există)
    const yNode = document.querySelector('.player-panel__quality');
    if (yNode && /^\d{4}$/.test(yNode.textContent.trim())) year = yNode.textContent.trim();

    // Sezon/episod (pentru seriale, caută și alte variante dacă ai nevoie)
    const seNode = document.querySelector('.player-panel__episode');
    if (seNode) {
        const seText = seNode.textContent.trim();
        const match = seText.match(/(\d+)\s*sezon.*?(\d+)\s*episod/i);
        if (match) {
            season = match[1] || '';
            episode = match[2] || '';
        }
    }

    if (!title) {
        notify('[AutoSubs RO] Titlu lipsă! Nu caut subtitrare.');
        return;
    }
    searchSubtitles({ title, year, season_number: season, episode_number: episode });
}

// =============== CĂUTARE & DESCĂRCARE & ÎNCĂRCARE SUBTITRARE ===============

function searchSubtitles(movieInfo = {}) {
    const s = loadSettings();
    if (!s.enabled) return;

    const title = (movieInfo.title || '').trim();
    const year = movieInfo.year || '';
    const season = movieInfo.season_number;
    const episode = movieInfo.episode_number;
    const isSeries = Boolean(season && episode);

    if (!title) return notify('[AutoSubs RO] Titlu lipsă pentru căutare.');

    notify(`[AutoSubs RO] Caut subtitrare ENG: ${title}`);

    const query = encodeURIComponent(title + (year ? ` ${year}` : ''));
    const url = `https://yifysubtitles.ch/search?q=${query}`;

    fetch(url)
        .then(r => r.text())
        .then(html => parseYify(html, { title, year, isSeries, season, episode }))
        .catch(() => {
            notify('[AutoSubs RO] YIFY eșuat, încerc Subscene...');
            searchSubscene(title);
        });
}

function parseYify(html, { title, year, isSeries, season, episode }) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a.subtitle-download');
    let found = false;

    for (const link of links) {
        const row = link.closest('tr');
        const text = row ? row.innerText.toLowerCase() : '';

        if (text.includes('english') &&
            (isSeries ? text.includes(`s0${season}`) : text.includes(year)) &&
            link.href.includes('.srt')) {
            found = true;
            downloadSrt(link.href);
            break;
        }
    }

    if (!found) {
        notify('[AutoSubs RO] Nu am găsit pe YIFY, încerc Subscene...');
        searchSubscene(title);
    }
}

function searchSubscene(title) {
    const query = encodeURIComponent(title);
    const url = `https://subscene.com/subtitles/searchbytitle?query=${query}`;

    fetch(url)
        .then(r => r.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const rows = doc.querySelectorAll('table tbody tr');
            let found = false;

            for (const row of rows) {
                const lang = row.querySelector('.a1 span:first-child');
                const link = row.querySelector('a');
                if (lang && lang.innerText.trim() === 'English' && link) {
                    found = true;
                    const subUrl = 'https://subscene.com' + link.href;
                    fetch(subUrl)
                        .then(r => r.text())
                        .then(page => {
                            const subDoc = parser.parseFromString(page, 'text/html');
                            const dl = subDoc.querySelector('.download a');
                            if (dl) downloadSrt('https://subscene.com' + dl.href);
                        });
                    break;
                }
            }
            if (!found) notify('[AutoSubs RO] Nu am găsit subtitrare ENG pe Subscene.');
        });
}

function downloadSrt(srtUrl) {
    notify('[AutoSubs RO] Descarc .srt...');
    fetch(srtUrl)
        .then(r => r.text())
        .then(text => {
            if (loadSettings().translate) {
                translateSrt(text, translated => loadInPlayer(translated));
            } else {
                loadInPlayer(text);
            }
        })
        .catch(() => notify('[AutoSubs RO] Eroare descărcare .srt'));
}

// Traducere pe blocuri simple (limitat! Google poate bloca multe cereri)
function translateSrt(srt, callback) {
    const lines = srt.split('\n');
    let result = '', block = '', inText = false, count = 0;

    const next = () => {
        if (count >= lines.length) {
            if (block) result += block + '\n';
            callback(result);
            return;
        }
        const line = lines[count++].trim();

        if (/^\d+$/.test(line)) {
            if (block) {
                translateBlock(block.trim(), translated => {
                    result += translated + '\n';
                    block = '';
                    next();
                });
            } else {
                result += line + '\n';
                next();
            }
        } else if (/^\d{2}:\d{2}:\d{2},\d{3} -->/.test(line)) {
            result += line + '\n';
            inText = true;
        } else if (line && inText) {
            block += line + ' ';
        } else {
            result += line + '\n';
            inText = false;
            next();
        }
    };
    next();
}

function translateBlock(text, callback) {
    if (!text.trim()) return callback(text);
    const url = `https://translate.google.com/m?sl=en&tl=ro&hl=ro&q=${encodeURIComponent(text)}`;
    fetch(url)
        .then(r => r.text())
        .then(html => {
            const match = html.match(/class="result-container">([^<]+)</);
            callback(match ? match[1] : text);
        })
        .catch(() => callback(text));
}

function loadInPlayer(srtText) {
    const blob = new Blob([srtText], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);

    setTimeout(() => {
        const video = document.querySelector('video');
        if (!video) return;

        video.querySelectorAll('track').forEach(t => t.remove());

        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = 'RO (Auto)';
        track.srclang = 'ro';
        track.src = url;
        track.default = true;
        video.appendChild(track);

        if (video.textTracks[0]) video.textTracks[0].mode = 'showing';

        notify('[AutoSubs RO] Subtitrare RO încărcată!');
    }, 1500);
}

// =============== INIȚIALIZARE ===============
document.addEventListener('DOMContentLoaded', () => {
    tryAddMenuEntry();
    listenPlayer();
    notify(`${PLUGIN_NAME} activat!`);
});
