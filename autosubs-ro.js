// AutoSubs RO pentru Lampa 3.0.4 - Meniu propriu + detectare player
(function () {
    'use strict';

    const PLUGIN_NAME = 'AutoSubs RO';
    const PLUGIN_ID = 'autosubs_ro_safe';
    const SETTINGS_KEY = 'autosubs_safe_settings';

    // === UTILS ===
    function notify(msg) {
        if (window.Noty) Noty.show(msg);
        else alert(msg);
        console.log('[AutoSubs RO]', msg);
    }

    function saveSettings(s) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
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
    function addMenuEntry() {
        const menuList = document.querySelector('.menu__list');
        if (!menuList || document.getElementById('autosubs-menu-btn')) return;

        const li = document.createElement('li');
        li.className = 'menu__item';
        li.innerHTML = `<a id="autosubs-menu-btn" class="menu__link" href="#" style="color:#e50914;">${PLUGIN_NAME}</a>`;
        menuList.appendChild(li);

        li.addEventListener('click', e => {
            e.preventDefault();
            showSettings();
        });
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

    // === MODAL SIMPLU ===
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

    // === CĂUTARE SUBTITRĂRI (la pornirea playerului) ===
    function onPlayerStart() {
        // Extragere info film din DOM sau window (adaptare după structura Lampa 3.0.4)
        let title = '';
        let year = '';
        let season = '';
        let episode = '';
        // Exemplu: titlu din .player-panel__title, anul din .player-panel__quality
        const tNode = document.querySelector('.player-panel__title');
        if (tNode) title = tNode.textContent.trim();
        // Poți extinde aici cu mai multe extrageri după nevoie

        if (!title) return;
        searchSubtitles({ title, year, season_number: season, episode_number: episode });
    }

    // === DETECTARE EVENT PLAYER ===
    function listenPlayer() {
        let lastUrl = '';
        setInterval(() => {
            const video = document.querySelector('video');
            if (video && video.currentSrc && video.currentSrc !== lastUrl) {
                lastUrl = video.currentSrc;
                if (loadSettings().enabled) {
                    setTimeout(onPlayerStart, 2000);
                }
            }
        }, 1500);
    }

    // === RESTUL FUNCȚIILOR (identic cu soluția precedentă) ===
    // ... (searchSubtitles, downloadSrt, translateSrt, etc. - vezi codul tău anterior)

    function searchSubtitles(movieInfo) {
        // ... aici pui funcția ta completă de căutare, la fel ca până acum
        notify(`(DEMO) Ar trebui să caute subtitrare pentru: ${movieInfo.title}`);
        // Pentru test: notify(`Caut subtitrare pentru: ${movieInfo.title}`);
    }

    // === INIȚIALIZARE ===
    function init() {
        addMenuEntry();
        listenPlayer();
        notify(`${PLUGIN_NAME} activat!`);
    }

    // === START PLUGIN ===
    document.addEventListener('DOMContentLoaded', init);
})();
