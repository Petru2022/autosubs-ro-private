// Plugin demo AutoSubs RO pentru Lampa 3.x - adăugare meniu manuală
(function () {
    'use strict';

    // Așteaptă ca meniul să existe în DOM
    function addMenuEntry() {
        const menuList = document.querySelector('.menu__list');
        if (!menuList) {
            // Încearcă din nou după 1 secundă
            setTimeout(addMenuEntry, 1000);
            return;
        }
        // Evită să adaugi de două ori
        if (document.getElementById('autosubs-menu-btn')) return;

        const li = document.createElement('li');
        li.className = 'menu__item';
        li.innerHTML = `<a id="autosubs-menu-btn" class="menu__link" href="#" style="color:#e50914;">AutoSubs RO</a>`;
        menuList.appendChild(li);

        li.addEventListener('click', e => {
            e.preventDefault();
            showSettings();
        });
    }

    function showSettings() {
        const html = `
            <div style="padding:20px;color:#fff;">
                <h3>AutoSubs RO - Setări</h3>
                <label><input type="checkbox" id="en" checked> Activare</label><br><br>
                <label><input type="checkbox" id="tr" checked> Traducere EN→RO</label><br><br>
                <button id="save_autosubs" style="background:#e50914;color:#fff;padding:10px 20px;border:none;border-radius:4px;">Salvează</button>
                <button id="close_autosubs" style="background:#666;color:#fff;padding:10px 20px;border:none;border-radius:4px;margin-left:10px;">Închide</button>
            </div>
        `;
        showModal(html);
        setTimeout(() => {
            document.getElementById('save_autosubs').onclick = () => {
                alert('Setări salvate!');
                closeModal();
            };
            document.getElementById('close_autosubs').onclick = () => closeModal();
        }, 100);
    }

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

    // Inițializare când DOM-ul este gata
    document.addEventListener('DOMContentLoaded', addMenuEntry);
})();
