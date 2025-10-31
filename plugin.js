/* AutoSubs RO - Plugin Lampa TV (Versiune SIGURĂ - FĂRĂ EROARE) */
(function() {
    'use strict';
    
    const PLUGIN_ID = 'autosubs_ro_safe';
    const PLUGIN_NAME = 'AutoSubs RO';

    // Storage
    function getStorage() {
        return window.Lampa && Lampa.Storage ? Lampa.Storage : {
            set: function(k, v) { localStorage.setItem(k, v); },
            get: function(k) { return localStorage.getItem(k); }
        };
    }

    function saveSettings(s) {
        getStorage().set('autosubs_safe_settings', JSON.stringify(s));
    }

    function loadSettings() {
        try {
            var saved = getStorage().get('autosubs_safe_settings');
            return saved ? JSON.parse(saved) : { enabled: true, translate: true };
        } catch(e) {
            return { enabled: true, translate: true };
        }
    }

    function showNotification(msg) {
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(msg);
        console.log('AutoSubs RO:', msg);
    }

    // === CĂUTARE SIMPLĂ (FĂRĂ ASYNC) ===
    function searchSubtitles(movieInfo) {
        var s = loadSettings();
        if (!s.enabled) return;

        var title = (movieInfo.title || movieInfo.name || '').trim();
        var year = movieInfo.release_year || movieInfo.year || '';
        var season = movieInfo.season_number;
        var episode = movieInfo.episode_number;
        var isSeries = !!season && !!episode;

        if (!title) return showNotification('Titlu lipsă');

        showNotification('Căut subtitrare ENG: ' + title);

        var query = encodeURIComponent(title + (year ? ' ' + year : ''));
        var url = 'https://yifysubtitles.ch/search?q=' + query;

        fetch(url)
            .then(function(r) { return r.text(); })
            .then(function(html) {
                parseYify(html, title, year, isSeries, season, episode);
            })
            .catch(function() {
                showNotification('YIFY eșuat');
                searchSubscene(title);
            });
    }

    function parseYify(html, title, year, isSeries, season, episode) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var links = doc.querySelectorAll('a.subtitle-download');

        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var row = link.closest('tr');
            var text = row.innerText.toLowerCase();

            if (text.includes('english') && 
                (isSeries ? text.includes('s0' + season) : text.includes(year)) &&
                link.href.includes('.srt')) {
                downloadSrt(link.href);
                return;
            }
        }
        showNotification('Nu am găsit pe YIFY');
        searchSubscene(title);
    }

    function searchSubscene(title) {
        var query = encodeURIComponent(title);
        var url = 'https://subscene.com/subtitles/searchbytitle?query=' + query;

        fetch(url)
            .then(function(r) { return r.text(); })
            .then(function(html) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(html, 'text/html');
                var rows = doc.querySelectorAll('table tbody tr');

                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    var lang = row.querySelector('.a1 span:first-child');
                    var link = row.querySelector('a');

                    if (lang && lang.innerText.trim() === 'English' && link) {
                        var subUrl = 'https://subscene.com' + link.href;
                        fetch(subUrl)
                            .then(function(r) { return r.text(); })
                            .then(function(page) {
                                var subDoc = parser.parseFromString(page, 'text/html');
                                var dl = subDoc.querySelector('.download a');
                                if (dl) downloadSrt('https://subscene.com' + dl.href);
                            });
                        return;
                    }
                }
                showNotification('Nu am găsit subtitrare ENG');
            });
    }

    // === DESCĂRCARE SRT + TRADUCERE SIMPLĂ ===
    function downloadSrt(srtUrl) {
        showNotification('Descarc .srt...');
        fetch(srtUrl)
            .then(function(r) { return r.text(); })
            .then(function(text) {
                if (loadSettings().translate) {
                    translateSrtSimple(text, function(translated) {
                        loadInPlayer(translated);
                    });
                } else {
                    loadInPlayer(text);
                }
            })
            .catch(function() {
                showNotification('Eroare descărcare');
            });
    }

    // Traducere simplă (fără async)
    function translateSrtSimple(srt, callback) {
        var lines = srt.split('\n');
        var result = '';
        var block = '';
        var inText = false;
        var count = 0;
        var totalBlocks = 0;

        // Numără blocurile
        for (var i = 0; i < lines.length; i++) {
            if (/^\d+$/.test(lines[i].trim()) && inText) totalBlocks++;
            if (/^\d{2}:\d{2}:\d{2},\d{3} -->/.test(lines[i])) inText = true;
            if (lines[i].trim() === '') inText = false;
        }

        if (totalBlocks === 0) {
            callback(srt);
            return;
        }

        function translateNext() {
            if (count >= lines.length) {
                if (block) result += block + '\n';
                callback(result);
                return;
            }

            var line = lines[count].trim();
            count++;

            if (/^\d+$/.test(line)) {
                if (block) {
                    translateGoogle(block.trim(), function(translated) {
                        result += translated + '\n';
                        translateNext();
                    });
                } else {
                    result += line + '\n';
                    translateNext();
                }
                block = '';
                inText = false;
            } else if (/^\d{2}:\d{2}:\d{2},\d{3} -->/.test(line)) {
                result += line + '\n';
                inText = true;
            } else if (line && inText) {
                block += line + ' ';
            } else {
                result += line + '\n';
                translateNext();
            }
        }

        translateNext();
    }

    function translateGoogle(text, callback) {
        if (!text.trim()) { callback(text); return; }
        var url = 'https://translate.google.com/m?sl=en&tl=ro&hl=ro&q=' + encodeURIComponent(text);
        fetch(url)
            .then(function(r) { return r.text(); })
            .then(function(html) {
                var match = html.match(/class="result-container">([^<]+)</);
                callback(match ? match[1] : text);
            })
            .catch(function() { callback(text); });
    }

    // === PLAYER ===
    function loadInPlayer(srtText) {
        var blob = new Blob([srtText], { type: 'text/srt' });
        var url = URL.createObjectURL(blob);

        setTimeout(function() {
            var video = document.querySelector('video');
            if (!video) return;

            video.querySelectorAll('track').forEach(function(t) { t.remove(); });

            var track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = 'RO (Auto)';
            track.srclang = 'ro';
            track.src = url;
            track.default = true;
            video.appendChild(track);

            if (video.textTracks[0]) video.textTracks[0].mode = 'showing';

            showNotification('Subtitrare RO încărcată!');
        }, 1500);
    }

    // === SETĂRI ===
    function showSettingsMenu() {
        var s = loadSettings();
        var html = '<div style="padding:20px;color:#fff;">' +
            '<h3>' + PLUGIN_NAME + ' - Setări</h3>' +
            '<label><input type="checkbox" id="en" ' + (s.enabled ? 'checked' : '') + '> Activare</label><br><br>' +
            '<label><input type="checkbox" id="tr" ' + (s.translate ? 'checked' : '') + '> Traducere EN→RO</label><br><br>' +
            '<button id="save" style="background:#e50914;color:#fff;padding:10px 20px;border:none;border-radius:4px;">Salvează</button>' +
            '<button onclick="Lampa.Modal.close()" style="background:#666;color:#fff;padding:10px 20px;border:none;border-radius:4px;margin-left:10px;">Închide</button>' +
            '</div>';

        Lampa.Modal.open({ title: PLUGIN_NAME, html: html, size: 'medium' });

        setTimeout(function() {
            document.getElementById('save').onclick = function() {
                saveSettings({
                    enabled: document.getElementById('en').checked,
                    translate: document.getElementById('tr').checked
                });
                showNotification('Setări salvate!');
                Lampa.Modal.close();
            };
        }, 100);
    }

    // === INIȚIALIZARE ===
    function init() {
        // Meniu principal
        if (Lampa.Menu && Lampa.Menu.add) {
            Lampa.Menu.add('AutoSubs RO', showSettingsMenu);
        }

        // Player listener
        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('player', function(e) {
                if ((e.type === 'start' || e.type === 'play') && loadSettings().enabled) {
                    setTimeout(function() {
                        searchSubtitles(e.data || {});
                    }, 3000);
                }
            });
        }

        showNotification('AutoSubs RO activat!');
    }

    // Pornire
    if (window.Lampa) {
        setTimeout(init, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 2000);
        });
    }

    // Înregistrare
    if (Lampa.Plugin && Lampa.Plugin.add) {
        Lampa.Plugin.add({
            id: PLUGIN_ID,
            name: PLUGIN_NAME,
            version: '6.0',
            author: 'Tu',
            description: 'Subtitrări RO gratuite',
            init: init
        });
    }

})();
