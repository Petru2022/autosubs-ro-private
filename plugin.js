// AutoSubs RO - Versiune modernizată & robustă pentru Lampa TV
(() => {
    'use strict';

    // === CONSTANTE PLUGIN ===
    const PLUGIN_ID = 'autosubs_ro_safe';
    const PLUGIN_NAME = 'AutoSubs RO';
    const PLUGIN_VERSION = '6.2';
    const PLUGIN_AUTHOR = 'Petru';

    // === STORAGE HANDLER ===
    const getStorage = () =>
        (window.Lampa && Lampa.Storage) ? Lampa.Storage : {
            set: (k, v) => localStorage.setItem(k, v),
            get: (k) => localStorage.getItem(k)
        };

    const saveSettings = s => getStorage().set('autosubs_safe_settings', JSON.stringify(s));
    const loadSettings = () => {
        try {
            const saved = getStorage().get('autosubs_safe_settings');
            return saved ? JSON.parse(saved) : { enabled: true, translate: true };
        } catch {
            return { enabled: true, translate: true };
        }
    };

    const notify = msg => {
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(msg);
        console.log(`[${PLUGIN_NAME}]`, msg);
    };

    // === SUBTITLE SEARCH & PARSE ===
    const searchSubtitles = (movieInfo = {}) => {
        const s = loadSettings();
        if (!s.enabled) return;

        const title = (movieInfo.title || movieInfo.name || '').trim();
        const year = movieInfo.release_year || movieInfo.year || '';
        const season = movieInfo.season_number;
        const episode = movieInfo.episode_number;
        const isSeries = Boolean(season && episode);

        if (!title) return notify('Titlu lipsă');

        notify(`Caut subtitrare ENG: ${title}`);

        const query = encodeURIComponent(title + (year ? ` ${year}` : ''));
        const url = `https://yifysubtitles.ch/search?q=${query}`;

        fetch(url)
            .then(r => r.text())
            .then(html => parseYify(html, { title, year, isSeries, season, episode }))
            .catch(() => {
                notify('YIFY eșuat');
                searchSubscene(title);
            });
    };

    const parseYify = (html, { title, year, isSeries, season, episode }) => {
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
            notify('Nu am găsit pe YIFY');
            searchSubscene(title);
        }
    };

    const searchSubscene = title => {
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
                if (!found) notify('Nu am găsit subtitrare ENG');
            });
    };

    // === DESCĂRCARE ȘI ÎNCĂRCARE SUBTITRARE ===
    const downloadSrt = srtUrl => {
        notify('Descarc .srt...');
        fetch(srtUrl)
            .then(r => r.text())
            .then(text => {
                if (loadSettings().translate) {
                    translateSrt(text, translated => loadInPlayer(translated));
                } else {
                    loadInPlayer(text);
                }
            })
            .catch(() => notify('Eroare descărcare'));
    };

    // === TRADUCERE SIMPLĂ ===
    const translateSrt = (srt, callback) => {
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
    };

    const translateBlock = (text, callback) => {
        if (!text.trim()) return callback(text);
        const url = `https://translate.google.com/m?sl=en&tl=ro&hl=ro&q=${encodeURIComponent(text)}`;
        fetch(url)
            .then(r => r.text())
            .then(html => {
                const match = html.match(/class="result-container">([^<]+)</);
                callback(match ? match[1] : text);
            })
            .catch(() => callback(text));
    };

    // === ÎNCĂRCARE SUBTITRARE ÎN PLAYER ===
    const loadInPlayer = srtText => {
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

            notify('Subtitrare RO încărcată!');
        }, 1500);
    };

    // === SETĂRI PLUGIN ===
    const showSettings = () => {
        const s = loadSettings();
        const html = `
            <div style="padding:20px;color:#fff;">
                <h3>${PLUGIN_NAME} - Setări</h3>
                <label><input type="checkbox" id="en" ${s.enabled ? 'checked' : ''}> Activare</label><br><br>
                <label><input type="checkbox" id="tr" ${s.translate ? 'checked' : ''}> Traducere EN→RO</label><br><br>
                <button id="save" style="background:#e50914;color:#fff;padding:10px 20px;border:none;border-radius:4px;">Salvează</button>
                <button onclick="Lampa.Modal.close()" style="background:#666;color:#fff;padding:10px 20px;border:none;border-radius:4px;margin-left:10px;">Închide</button>
            </div>`;

        Lampa.Modal.open({ title: PLUGIN_NAME, html, size: 'medium' });

        setTimeout(() => {
            document.getElementById('save').onclick = () => {
                saveSettings({
                    enabled: document.getElementById('en').checked,
                    translate: document.getElementById('tr').checked
                });
                notify('Setări salvate!');
                Lampa.Modal.close();
            };
        }, 100);
    };

    // === INIȚIALIZARE PLUGIN ===
    const init = () => {
        if (Lampa.Menu && Lampa.Menu.add) {
            Lampa.Menu.add(PLUGIN_NAME, showSettings);
        }
        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('player', e => {
                if ((e.type === 'start' || e.type === 'play') && loadSettings().enabled) {
                    setTimeout(() => searchSubtitles(e.data || {}), 3000);
                }
            });
        }
        notify(`${PLUGIN_NAME} activat!`);
    };

    // === WAIT FOR LAMPA & REGISTER PLUGIN ===
    const waitForLampa = (cb, tries = 0) => {
        if (typeof Lampa !== 'undefined' && Lampa.Plugin && Lampa.Plugin.add) {
            cb();
        } else if (tries < 30) {
            setTimeout(() => waitForLampa(cb, tries + 1), 100);
        } else {
            console.log(`[${PLUGIN_NAME}] Lampa nu a fost detectată.`);
        }
    };

    waitForLampa(() => {
        Lampa.Plugin.add({
            id: PLUGIN_ID,
            name: PLUGIN_NAME,
            version: PLUGIN_VERSION,
            author: PLUGIN_AUTHOR,
            description: 'Subtitrări automate RO pentru filme și seriale',
            init
        });
    });
})();
