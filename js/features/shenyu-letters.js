/* =========================================================
 * 沈屿的主动来信 · 纯网页版
 * 随机、主动、用字卡拼接生成信，投进信箱（inbox）
 * 不管理任何文件，全部走网页自己的逻辑。
 * ========================================================= */
(function () {
    var KEY = 'shenyuActiveLetterTs';

    function maybeSendLetter() {
        try {
            var last = 0;
            try { last = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch (e) {}
            var now = Date.now();
            var interval = (1.5 + Math.random() * 1.5) * 3600 * 1000;
            if (last && (now - last) < interval) return;

            var pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                ? customReplies.filter(function (r) { return String(r || '').trim(); })
                : [];
            if (pool.length < 1) return;

            var n = 3 + Math.floor(Math.random() * Math.min(4, pool.length));
            var lines = [];
            for (var i = 0; i < n; i++) {
                lines.push(String(pool[Math.floor(Math.random() * pool.length)]).trim());
            }

            var content = '栗栗：\n\n' + lines.join('\n');
            if (typeof envelopeData !== 'undefined' && envelopeData.inbox) {
                envelopeData.inbox.push({
                    id: 'shenyu_active_' + now,
                    from: '沈屿',
                    isShenyu: true,
                    content: content + '\n\n—— 沈屿',
                    receivedTime: now,
                    isNew: true
                });
                if (typeof saveEnvelopeData === 'function') saveEnvelopeData();
                if (typeof renderEnvelopeLists === 'function') renderEnvelopeLists();
                if (typeof window._sendPartnerNotification === 'function') {
                    window._sendPartnerNotification('✉️ 沈屿给你寄了一封', '想你的时候，写下来的信');
                }
            }
            try { localStorage.setItem(KEY, String(now)); } catch (e) {}
        } catch (e) {}
    }

    setTimeout(maybeSendLetter, 8000);
    setInterval(maybeSendLetter, 45 * 60 * 1000);
})();