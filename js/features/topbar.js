/* =========================================================
 * 顶部栏样式模块 · 微信式紧凑顶部栏
 * 独立文件，不修改其他逻辑。
 * 想换回原版：localStorage 设 loveTopbarMode = 'original'
 * 想用微信式：loveTopbarMode = 'wechat'（默认）
 * ========================================================= */
(function () {
    var MODE_KEY = 'loveTopbarMode';
    var current = localStorage.getItem(MODE_KEY) || 'wechat';

    function apply(mode) {
        var h = document.querySelector('.header');
        if (!h) return;
        h.classList.remove('topbar-original', 'topbar-wechat');
        h.classList.add('topbar-' + mode);
        current = mode;
        try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
    }

    window.applyTopbar = function (mode) { apply(mode); };
    window.getTopbarMode = function () { return current; };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { apply(current); });
    } else {
        apply(current);
    }
})();