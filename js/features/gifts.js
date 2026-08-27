/* =========================================================
 * 礼物模块 · 完整版（像 Eternelle 那样的送礼方式）
 * 底部弹出面板：礼物图片 + 寄语，选好送出，聊天框出现礼物卡片
 * 自动回复时也会随机送出礼物
 * ========================================================= */
(function () {
    var STORAGE_KEY = 'lilidreamlove_gifts';
    var gifts = { images: [], texts: [] };
    var selectedImage = null;
    var selectedText = null;
    var modalVisible = false;
    var currentTab = 'images';

    function load() {
        if (typeof localforage === 'undefined') return;
        localforage.getItem(STORAGE_KEY).then(function (v) {
            if (v && typeof v === 'object') {
                if (Array.isArray(v.images)) gifts.images = v.images;
                if (Array.isArray(v.texts)) gifts.texts = v.texts;
            }
        }).catch(function () {});
    }

    function save() {
        if (typeof localforage !== 'undefined') {
            localforage.setItem(STORAGE_KEY, gifts).catch(function () {});
        }
    }

    /* ============ 模态框 ============ */
    window.openGiftModal = function () {
        var overlay = document.getElementById('giftModalOverlay');
        if (!overlay) return;
        selectedImage = null;
        selectedText = null;
        currentTab = 'images';
        updateTabUI();
        overlay.classList.add('active');
        modalVisible = true;
        renderGiftImages();
        renderGiftTexts();
    };

    window.closeGiftModal = function () {
        var overlay = document.getElementById('giftModalOverlay');
        if (overlay) overlay.classList.remove('active');
        modalVisible = false;
    };

    window.switchGiftTab = function (tab) {
        currentTab = tab;
        updateTabUI();
    };

    function updateTabUI() {
        document.querySelectorAll('.gift-modal-tab').forEach(function (t) {
            t.classList.toggle('active', t.dataset.giftTab === currentTab);
        });
        document.querySelectorAll('.gift-tab-content').forEach(function (c) {
            c.classList.toggle('active', c.dataset.giftContent === currentTab);
        });
    }

    /* ============ 礼物图片 ============ */
    function renderGiftImages() {
        var grid = document.getElementById('giftGrid');
        if (!grid) return;
        if (!gifts.images.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px 0;color:var(--text-secondary);font-size:12px;">还没有礼物图片<br>点「添加图片」上传一张吧</div>';
            return;
        }
        grid.innerHTML = gifts.images.map(function (img, i) {
            return '<div class="gift-grid-item' + (selectedImage === i ? ' selected' : '') + '" onclick="selectGiftImage(' + i + ')">'
                + '<img src="' + img + '" alt="礼物">'
                + '<div class="gift-check"><i class="fas fa-check"></i></div>'
                + '<div class="gift-del" onclick="event.stopPropagation();removeGiftImage(' + i + ')">✕</div>'
                + '</div>';
        }).join('');
    }

    window.selectGiftImage = function (i) {
        selectedImage = (selectedImage === i) ? null : i;
        renderGiftImages();
    };

    window.removeGiftImage = function (i) {
        if (i >= 0 && i < gifts.images.length) {
            gifts.images.splice(i, 1);
            if (selectedImage === i) selectedImage = null;
            save();
            renderGiftImages();
            if (typeof showNotification === 'function') showNotification('已删除这张礼物图片', 'success');
        }
    };

    window.triggerGiftImageUpload = function () {
        var input = document.getElementById('giftFileInput');
        if (input) input.click();
    };

    window.onGiftImagePicked = function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            if (typeof showNotification === 'function') showNotification('图片不能超过 2MB', 'warning');
            e.target.value = '';
            return;
        }
        var reader = new FileReader();
        reader.onload = function (ev) {
            gifts.images.push(ev.target.result);
            save();
            renderGiftImages();
            if (typeof showNotification === 'function') showNotification('🎁 图片已加入礼物箱', 'success');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    window.addGiftByUrl = function () {
        var url = prompt('粘贴图片链接：');
        if (!url || !url.trim()) return;
        gifts.images.push(url.trim());
        save();
        renderGiftImages();
        if (typeof showNotification === 'function') showNotification('🎁 图片已加入礼物箱', 'success');
    };

    /* ============ 寄语 ============ */
    function renderGiftTexts() {
        var list = document.getElementById('giftTextList');
        if (!list) return;
        if (!gifts.texts.length) {
            list.innerHTML = '<div style="text-align:center;padding:16px 0;color:var(--text-secondary);font-size:12px;">还没有寄语<br>写一句想说的话吧</div>';
            return;
        }
        list.innerHTML = gifts.texts.map(function (t, i) {
            return '<div class="gift-text-item' + (selectedText === i ? ' selected' : '') + '" onclick="selectGiftText(' + i + ')">'
                + '<div class="gift-check"><i class="fas fa-check"></i></div>'
                + '<div class="gift-text-content">' + String(t).replace(/[<>&]/g, '') + '</div>'
                + '<div class="gift-del" onclick="event.stopPropagation();removeGiftText(' + i + ')">✕</div>'
                + '</div>';
        }).join('');
    }

    window.selectGiftText = function (i) {
        selectedText = (selectedText === i) ? null : i;
        renderGiftTexts();
    };

    window.removeGiftText = function (i) {
        if (i >= 0 && i < gifts.texts.length) {
            gifts.texts.splice(i, 1);
            if (selectedText === i) selectedText = null;
            save();
            renderGiftTexts();
            if (typeof showNotification === 'function') showNotification('已删除这条寄语', 'success');
        }
    };

    window.addGiftText = function () {
        var input = document.getElementById('giftTextInput');
        var text = input ? input.value.trim() : '';
        if (!text) {
            if (typeof showNotification === 'function') showNotification('写一句寄语吧', 'warning');
            return;
        }
        gifts.texts.push(text);
        if (input) input.value = '';
        save();
        renderGiftTexts();
        if (typeof showNotification === 'function') showNotification('💬 寄语已加入', 'success');
    };

    /* ============ 发送礼物 ============ */
    function pushGiftMessage(image, text, sender) {
        addMessage({
            id: Date.now() + Math.floor(Math.random() * 1000),
            sender: sender,
            text: text || '',
            image: image || '',
            giftName: '礼物',
            timestamp: new Date(),
            status: 'received',
            favorited: false,
            note: null,
            type: 'gift'
        });
        playSound('message');
        throttledSaveData();
    }

    window.sendGift = function () {
        if (selectedImage === null) {
            if (typeof showNotification === 'function') showNotification('先选一件礼物图片', 'warning');
            return;
        }
        var image = gifts.images[selectedImage];
        var text = (selectedText !== null && gifts.texts[selectedText]) ? gifts.texts[selectedText] : '';
        if (typeof addMessage !== 'function') return;
        pushGiftMessage(image, text, settings.myName || '我');
        closeGiftModal();
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(settings.partnerName || '对方', '💝 收到一份礼物');
        }
        if (typeof showNotification === 'function') showNotification('💝 礼物已送出', 'success');
    };

    /* ============ 自动送礼（对方随机送出） ============ */
    window.__maybeSendGift = function () {
        if (!gifts.images.length) return null;
        var image = gifts.images[Math.floor(Math.random() * gifts.images.length)];
        var text = gifts.texts.length ? gifts.texts[Math.floor(Math.random() * gifts.texts.length)] : '';
        return { image: image, text: text };
    };

    /* ============ 兼容：高级设置里的礼物面板 ============ */
    window.addGift = function () {
        var nameEl = document.getElementById('gift-name-input');
        var noteEl = document.getElementById('gift-note-input');
        var name = nameEl ? nameEl.value.trim() : '';
        if (!name) {
            if (typeof showNotification === 'function') showNotification('先给礼物起个名字', 'warning');
            return;
        }
        var note = noteEl ? noteEl.value.trim() : '';
        var text = name + (note ? '（' + note + '）' : '');
        gifts.texts.push(text);
        if (nameEl) nameEl.value = '';
        if (noteEl) noteEl.value = '';
        save();
        renderGiftTexts();
        renderGiftList();
        if (typeof showNotification === 'function') showNotification('🎁 礼物已加入礼物箱', 'success');
    };

    window.removeGift = function (idx) {
        if (idx >= 0 && idx < gifts.texts.length) {
            gifts.texts.splice(idx, 1);
            save();
            renderGiftTexts();
            renderGiftList();
        }
    };

    function renderGiftList() {
        var list = document.getElementById('gift-list');
        if (!list) return;
        if (!gifts.texts.length) {
            list.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);opacity:0.7;padding:6px 0;">还没有礼物寄语，先添加一个吧～<br><small>（也可以点聊天框的 🎁 按钮，上传礼物图片）</small></div>';
            return;
        }
        list.innerHTML = gifts.texts.map(function (t, i) {
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:6px;background:var(--primary-bg);">'
                + '<span>🎁</span>'
                + '<span style="flex:1;font-size:13px;word-break:break-word;">' + String(t).replace(/[<>&]/g, '') + '</span>'
                + '<button onclick="removeGift(' + i + ')" style="border:none;background:transparent;color:var(--text-secondary);font-size:13px;cursor:pointer;">✕</button>'
                + '</div>';
        }).join('');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { load(); setTimeout(renderGiftList, 500); });
    } else {
        load(); renderGiftList();
    }
})();