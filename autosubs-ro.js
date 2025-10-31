// AutoSubs RO - Plugin compatibil Lampa TV (webOS LG) & browser PC
(function () {
    'use strict';

    const PLUGIN_NAME = 'AutoSubs RO';
    const PLUGIN_ID = 'autosubs_ro_safe';
    const SETTINGS_KEY = 'autosubs_safe_settings';

    // === UTILS ===
    function notify(msg) {
        if (window.Noty && typeof Noty.show === "function") Noty.show(msg);
        else alert(msg);
        console.log('[AutoSubs RO]', msg);
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

    // === MENIU PLUGIN ===
    function tryAddMenuEntry(retries = 0) {
        const menuList = document.querySelector('.menu__list');
        if (!menuList) {
            if (retries < 25) setTimeout(() => tryAddMenuEntry(retries + 1), 600);
            return;
        }
        if (document.getElementById('autosubs-menu-btn')) return;

        const li = document.createElement('li');
        li.className = 'menu__item';
        li.innerHTML = `<a id="autosubs-menu-btn" class="menu__link" href="#" style="color:#e50914;">${PLUGIN_NAME}</a>`;
        menuList.appendChild(li);

        li.querySelector('a').onclick = e => {
            e.preventDefault();
            showSettings();
        };
    }

    // === SETĂRI ===
    function showSettings() {
        const s = loadSettings();
        const html = `
            <div style="padding:20px;color:#fff;">
                <h3>${PLUGIN_NAME} - Setări</h3>
                <label><input type="checkbox" id="en" ${s.enabled ? 'checked' : ''}> Activare</label><br><br>
                <label><input type="checkbox" id="tr" ${s.translate ? 'checked' : ''}> Traducere EN→RO</label><br><br>
                <button id="save_autosubs" style="background:#e50914;color:#fff;padding:10px 20px;border:none;border-radius:4px;">Salvează</button>
                <button id="close_autosubs" style="background:#666;color:#fff;padding:10px 20px;border:none;border-radius:4px;margin-left:10px;">Închide</button>
            </div>
        `;
        showModal(html);
        setTimeout(() => {
            document.getElementById('save_autosubs').onclick = () => {
                saveSettings({
                    enabled: document.getElementById('en').checked,
                    translate: document.getElementById('tr').checked
                });
                notify('Setări salvate!');
                closeModal();
            };
            document.getElementById('close_autosubs').onclick = () => closeModal();
        }, 100);
    }

    // === MODAL GENERIC ===
    function showModal(content) {
        let modal = document.getElementById('autosubs-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'autosubs-modal';
            modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `<div id="autosubs-modal-content" style="background:#222;padding:20px;border-radius:8px;min-width:300px;max-width:90vw;"></div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('autosubs-modal-content').innerHTML = content;
        modal.style.display = 'flex';
    }
    function closeModal() {
        const modal = document.getElementById('autosubs-modal');
        if (modal) modal.style.display = 'none';
    }

    // === DETECTARE PLAYER & PORNIRE SUBTITLARE ===
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

    // === PE PORNIRE FILM/EPISOD ===
    function onPlayerStart(video) {
        // Încearcă să extragă titlul și anul
        let title = '';
        let year = '';
        let season = '';
        let episode = '';

        // Lampa 3.x, titlul filmului apare în .player-panel__title sau .card__title
        const tNode = document.querySelector('.player-panel__title') || document.querySelector('.card__title');
        if (tNode) title = tNode.textContent.trim();

        // Exemplu: încearcă să extragi și anul (dacă există)
        const yNode = document.querySelector('.player-panel__quality');
        if (yNode && /^\d{4}$/.test(yNode.textContent.trim())) year = yNode.textContent.trim();

        // TODO: extrage sezon/episod dacă e serial

        if (!title) {
            notify('[AutoSubs RO] Titlu lipsă, nu caut subtitrare.');
            return;
        }
        searchSubtitles({ title, year, season_number: season, episode_number: episode });
    }

    // === CĂUTARE SUBTITRĂRI (demo – aici poți integra funcția reală) ===
    function searchSubtitles(info) {
        notify(`[AutoSubs RO] Caut subtitrare pentru: ${info.title} ${info.year||''}`.trim());
        // TODO: Integrează aici logica de descărcare și încărcare subtitle (vezi mai jos)
        // Exemplu: downloadSrt(...);
    }

    // === DESCĂRCARE ȘI ÎNCĂRCARE SUBTITRARE (EXEMPLU) ===
    // function downloadSrt(url) { ... }
    // function loadInPlayer(srtText) { ... }
    // function translateSrt(srt, callback) { ... }
    // Adaugă aici funcțiile tale complete de procesare subtitle!

    // === INIȚIALIZARE ===
    document.addEventListener('DOMContentLoaded', () => {
        tryAddMenuEntry();
        listenPlayer();
        notify(`${PLUGIN_NAME} activat!`);
    });

})();
