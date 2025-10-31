// Plugin AutoSubs RO pentru Lampa (webOS/browser): buton în meniu + panou setări
(function () {
    'use strict';

    const PLUGIN_NAME = 'AutoSubs RO';
    const PLUGIN_ID = 'autosubs_ro_safe';
    const SETTINGS_KEY = 'autosubs_safe_settings';

    // === Utility ===
    function notify(msg) {
        if (window.Noty) Noty.show(msg);
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

    // === Meniu plugin ===
    function tryAddMenuEntry(retries = 0) {
        const menuList = document.querySelector('.menu__list');
        if (!menuList) {
            if (retries < 20) setTimeout(() => tryAddMenuEntry(retries + 1), 700);
            return;
        }
        if (document.getElementById('autosubs-menu-btn')) return;

        const li = document.createElement('li');
        li.className = 'menu__item';
        li.innerHTML = `<a id="autosubs-menu-btn" class="menu__link" href="#" style="color:#e50914;">${PLUGIN_NAME}</a>`;
        menuList.appendChild(li);

        li.addEventListener('click', e => {
            e.preventDefault();
            showSettings();
        });
    }

    // === Panou setări ===
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

    // === Modal simplu (compatibil browser TV) ===
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

    // === Inițializare ===
    document.addEventListener('DOMContentLoaded', () => {
        tryAddMenuEntry();
        notify(`${PLUGIN_NAME} activat!`);
    });
})();
