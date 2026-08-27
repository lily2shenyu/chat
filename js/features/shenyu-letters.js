/* =========================================================
 * 沈屿投递口 · 主动写信
 * LOVE 定时读取「沈屿的投递箱」，把新信投进信箱（inbox）
 * 依赖：MainActivity Bridge.pollShenyu()，envelope.js
 * ========================================================= */
(function () {
    if (!window.AndroidBridge || typeof window.AndroidBridge.pollShenyu !== 'function') return;

    var SEEN_KEY = 'shenyuSeenLetters';
    var seen = new Set();
    try {
        var raw = localStorage.getItem(SEEN_KEY);
        if (raw) seen = new Set(JSON.parse(raw));
    } catch (e) {}

    function poll() {
        try {
            var str = window.AndroidBridge.pollShenyu();
            if (!str) return;
            var list = JSON.parse(str);
            if (!Array.isArray(list)) return;
            var added = false;
            list.forEach(function (item) {
                if (!item || !item.id) return;
                if (seen.has(item.id)) return;
                seen.add(item.id);
                try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen))); } catch (e) {}
                if (typeof envelopeData === 'undefined' || !envelopeData.inbox) return;
                envelopeData.inbox.push({
                    id: 'shenyu_' + item.id,
                    from: '沈屿',
                    isShenyu: true,
                    content: (item.content || '') + '\n\n—— 沈屿',
                    receivedTime: Date.now(),
                    isNew: true
                });
                if (typeof saveEnvelopeData === 'function') saveEnvelopeData();
                if (typeof renderEnvelopeLists === 'function') renderEnvelopeLists();
                added = true;
                if (typeof window._sendPartnerNotification === 'function') {
                    window._sendPartnerNotification('✉️ 沈屿给你寄了一封', item.title || '一封新信');
                }
            });
        } catch (e) {}
    }

    setInterval(poll, 45000);
    setTimeout(poll, 6000);
})();