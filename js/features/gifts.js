/* =========================================================
 * 礼物模块 · 高级功能
 * 礼物像字卡一样出现在聊天框（随机送出），可在「高级」设置里管理
 * ========================================================= */
(function () {
    var STORAGE_KEY = 'lilidreamlove_customGifts';
    var customGifts = [];

    function load() {
        if (typeof localforage === 'undefined') return;
        localforage.getItem(STORAGE_KEY).then(function (v) {
            if (Array.isArray(v)) customGifts = v;
        }).catch(function () {});
    }

    function save() {
        if (typeof localforage !== 'undefined') {
            localforage.setItem(STORAGE_KEY, customGifts).catch(function () {});
        }
    }

    function renderList() {
        var list = document.getElementById('gift-list');
        if (!list) return;
        if (!customGifts.length) {
            list.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);opacity:0.7;padding:6px 0;">还没有礼物，先添加一个吧～</div>';
            return;
        }
        list.innerHTML = customGifts.map(function (g, i) {
            var note = g.note ? ' <span style="color:var(--text-secondary);">· ' + g.note + '</span>' : '';
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:6px;background:var(--primary-bg);">'
                + '<span>🎁</span>'
                + '<span style="flex:1;font-size:13px;">' + String(g.name || '礼物').replace(/[<>&]/g, '') + note + '</span>'
                + '<button onclick="removeGift(' + i + ')" style="border:none;background:transparent;color:var(--text-secondary);font-size:13px;cursor:pointer;">✕</button>'
                + '</div>';
        }).join('');
    }

    window.addGift = function () {
        var nameEl = document.getElementById('gift-name-input');
        var noteEl = document.getElementById('gift-note-input');
        var name = nameEl ? nameEl.value.trim() : '';
        if (!name) {
            if (typeof showNotification === 'function') showNotification('先给礼物起个名字', 'warning');
            return;
        }
        var note = noteEl ? noteEl.value.trim() : '';
        customGifts.push({ name: name, note: note });
        if (nameEl) nameEl.value = '';
        if (noteEl) noteEl.value = '';
        save();
        renderList();
        if (typeof showNotification === 'function') showNotification('🎁 礼物已加入礼物箱', 'success');
    };

    window.removeGift = function (idx) {
        if (idx >= 0 && idx < customGifts.length) {
            customGifts.splice(idx, 1);
            save();
            renderList();
        }
    };

    // 自动回复时的送礼口：约 12% 概率送出一件礼物
    window.__maybeSendGift = function () {
        if (Math.random() > 0.12 || !customGifts.length) return null;
        var g = customGifts[Math.floor(Math.random() * customGifts.length)];
        if (!g || !g.name) return null;
        return '🎁 送给你：' + g.name + (g.note ? '（' + g.note + '）' : '');
    };

    window.__giftCount = function () { return customGifts.length; };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { load(); renderList(); });
    } else {
        load(); renderList();
    }
})();