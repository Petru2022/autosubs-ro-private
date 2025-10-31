/* AutoSubs RO - Plugin Lampa TV (Versiune CORECTĂ - FĂRĂ EROARE) */
(function() {
    'use strict';
    
    const PLUGIN_ID = 'autosubs_ro_final';
    const PLUGIN_NAME = 'AutoSubs RO';
    
    // Storage
    function getStorage() {
        return window.Lampa && Lampa.Storage ? Lampa.Storage : {
            set: (k, v) => localStorage.setItem(k, v),
            get: (k) => localStorage.getItem(k)
        };
    }
    
    function saveSettings(s) { 
        getStorage().set('autosubs_settings', JSON.stringify(s)); 
    }
    
    function loadSettings() {
        try {
            const saved = getStorage().get('autosubs_settings');
            return saved ? JSON.parse(saved) : { enabled: true, translate: true };
        } catch { 
            return { enabled: true, translate: true }; 
        }
    }
    
    function showNotification(msg) {
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(msg);
        console.log('AutoSubs RO:', msg);
    }
    
    // === CĂUTARE SUBTITRĂRI ENG ===
    function searchSubtitles(movieInfo) {
        const s = loadSettings();
        if (!s.enabled) return;

        const title = (movieInfo.title || movieInfo.name || '').trim();
        const year = movieInfo.release_year || movieInfo.year || '';
        const season = movieInfo.season_number;
        const episode = movieInfo.episode_number;
        const isSeries = !!season && !!episode;

        if (!title) return showNotification('Titlu lipsă');

        showNotification(`Căut EN → RO: ${title}`);
        
        const q = encodeURIComponent(title + (year ? ` ${year}` : ''));
        fetch(`https://yifysubtitles.ch/search?q=${q}`)
            .then(r => r.text())
            .then(html => parseYify(html, title, year, isSeries, season, episode))
            .catch(() => {
                showNotification('YIFY indisponibil, încerc Subscene...');
                searchSubscene(title, year, isSeries, season, episode);
            });
    }

    function parseYify(html, title, year, isSeries, season, episode) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a.subtitle-download');

        for (let link of links) {
            const row = link.closest('tr');
            const text = row.innerText.toLowerCase();
            if (text.includes('english') && 
                (isSeries ? text.includes(`s0${season}`.padStart(3, '0')) : text.includes(year)) &&
                link.href.includes('.zip')) {
                downloadAndProcess(link.href.replace('.zip', '.srt'));
                return;
            }
        }
        showNotification('Nu am găsit pe YIFY');
        searchSubscene(title, year, isSeries, season, episode);
    }

    function searchSubscene(title, year, isSeries, season, episode) {
        const q = encodeURIComponent(title);
        fetch(`https://subscene.com/subtitles/searchbytitle?query=${q}`)
            .then(r => r.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const rows = doc.querySelectorAll('table tbody tr');
                for (let row of rows) {
                    const lang = row.querySelector('.a1 span:first-child')?.innerText.trim();
                    const link = row.querySelector('a')?.href;
                    if (lang === 'English' && link) {
                        fetch('https://subscene.com' + link)
                            .then(r => r.text())
                            .then(subPage => {
                                const subDoc = new DOMParser().parseFromString(subPage, 'text/html');
                                const dl = subDoc.querySelector('.download a');
                                if (dl) downloadAndProcess('https://subscene.com' + dl.href);
                            });
                        return;
                    }
                }
                showNotification('Nu am găsit subtitrare ENG');
            });
    }

    // === DESCĂRCARE + TRADUCERE ===
    async function downloadAndProcess(srtUrl) {
        showNotification('Descarc .srt...');
        try {
            const res = await fetch(srtUrl);
            const text = await res.text();
            const translated = loadSettings().translate !== false ? await translateSrt(text) : text;
            const blob = new Blob([translated], { type: 'text/srt' });
            const url = URL.createObjectURL(blob);
            loadSubtitleInPlayer(url);
            showNotification('Subtitrare RO încărcată!');
        } catch (e) {
            showNotification('Eroare procesare');
        }
    }

    async function translateSrt(srt) {
        const lines = srt.split('\n');
        let result = '', block = '', inText = false;

        for (let line of lines) {
            line = line.trim();
            if (/^\d+$/.test(line)) {
                if (block) result += await translateBlock(block.trim()) + '\n';
                result += line + '\n';
                block = ''; inText = false;
            } else if (/^\d{2}:\d{2}:\d{2},\d{3} -->/.test(line)) {
                result += line + '\n';
                inText = true;
            } else if (line && inText) {
                block += line + ' ';
            } else {
                result += line + '\n';
            }
        }
        if (block) result += await translateBlock(block.trim());
        return result;
    }

    async function translateBlock(text) {
        if (!text.trim()) return text;
        const url = `https://translate.google.com/m?sl=en&tl=ro&hl=ro&q=${encodeURIComponent(text)}`;
        try {
            const res = await fetch(url);
            const html = await res.text();
            const match = html.match(/class="result-container">([^<]+)</);
            return match ? match[1] : text;
        } catch { return text; }
    }

    // === PLAYER ===
    function loadSubtitleInPlayer(url) {
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
        }, 1500);
    }

    // === SETĂRI ===
    function showSettingsMenu() {
        const s = loadSettings();
        const html = `
            <div style="padding:20px;color:#fff;font-family:Arial;">
                <h3 style="margin-bottom:20px;">${PLUGIN_NAME} - Setări</h3>
                <label style="display:block;margin-bottom:15px;">
                    <input type="checkbox" id="en" ${s.enabled?'checked':''} style="margin-right:8px;">
                    Activare plugin
                </label>
                <label style="display:block;margin-bottom:20px;">
                    <input type="checkbox" id="tr" ${s.translate!==false?'checked':''} style="margin-right:8px;">
                    Traducere automată (EN→RO)
                </label>
                <button id="save" style="background:#e50914;color:#fff;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;">
                    Salvează
                </button>
                <button onclick="Lampa.Modal.close()" style="background:#666;color:#fff;padding:10px 20px;border:none;border-radius:4px;margin-left:10px;cursor:pointer;">
                    Închide
                </button>
            </div>`;
        
        if (Lampa.Modal) {
            Lampa.Modal.open({ title: PLUGIN_NAME, html, size: 'medium' });
            setTimeout(() => {
                document.getElementById('save').onclick = () => {
                    saveSettings({
                        enabled: document.getElementById('en').checked,
                        translate: document.getElementById('tr').checked
                    });
                    showNotification('Setări salvate!');
                    Lampa.Modal.close();
                };
            }, 100);
        }
    }

    // === INIȚIALIZARE CORECTĂ ===
    function initPlugin() {
        console.log('AutoSubs RO: Inițializare...');

        // Meniu principal
        if (window.Lampa && Lampa.Menu && Lampa.Menu.add) {
            Lampa.Menu.add('AutoSubs RO', showSettingsMenu);
        }

        // Fallback în Setări > Pluginuri
        if (window.Lampa && Lampa.Settings && Lampa.Settings.main) {
            Lampa.Settings.main('plugins', (element) => {
                const btn = document.createElement('div');
                btn.className = 'settings-folder selector';
                btn.innerHTML = '<div class="settings-folder__icon">Subtitrări</div><div class="settings-folder__name">AutoSubs RO - Setări</div>';
                btn.onclick = showSettingsMenu;
                element.appendChild(btn);
            });
        }

        // Listener player
        if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('player', e => {
                if ((e.type === 'start' || e.type === 'play') && loadSettings().enabled) {
                    setTimeout(() => searchSubtitles(e.data || {}), 3000);
                }
            });
        }

        showNotification('AutoSubs RO activat! Mergi la Meniu > AutoSubs RO');
    }

    // Pornire sigură
    if (window.Lampa) {
        setTimeout(initPlugin, 1500);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initPlugin, 3000);
        });
    }

    // Înregistrare plugin
    if (window.Lampa && Lampa.Plugin && Lampa.Plugin.add) {
        Lampa.Plugin.add({
            id: PLUGIN_ID,
            name: PLUGIN_NAME,
            version: '5.0',
            author: 'Tu',
            description: 'Subtitrări RO automate + traducere gratuită',
            init: initPlugin
        });
    }

})(); // <--- ACEASTA ERA LIPSĂ! ACUM E CORECT
