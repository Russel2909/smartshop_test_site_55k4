(function () {
    if (!document.documentElement.classList.contains("intro")) return;
    var overlay = document.getElementById("intro");
    var big = overlay && overlay.querySelector("img");
    var small = document.querySelector(".logo img");
    if (!overlay || !big || !small) return;
    small.classList.add("is-intro-hidden");

    function finish() {
        small.classList.remove("is-intro-hidden");
        document.documentElement.classList.remove("intro");
        if (overlay.parentNode) overlay.remove();
        try { sessionStorage.setItem("ss_intro", "1"); } catch (e) {}
    }

    window.setTimeout(function () {
        var from = big.getBoundingClientRect();
        var to = small.getBoundingClientRect();
        if (!from.width || !to.width) {
            finish();
            return;
        }
        var scale = to.width / from.width;
        big.style.transformOrigin = "0 0";
        var motion = big.animate([
            { transform: "translate(0px, 0px) scale(1)" },
            { transform: "translate(" + (to.left - from.left) + "px, " + (to.top - from.top) + "px) scale(" + scale + ")" }
        ], { duration: 900, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
        motion.onfinish = finish;
    }, 1200);
})();
