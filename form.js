// Telegram-bot webhook/Formspree etc.
var FORM_ENDPOINT = "PLACEHOLDER_FORM_ENDPOINT";

var MAP_SRC = "https://yandex.ru/map-widget/v1/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C%20%D0%9A%D0%B0%D1%88%D0%B8%D1%80%D1%81%D0%BA%D0%BE%D0%B5%20%D1%88%D0%BE%D1%81%D1%81%D0%B5%2C%2055%D0%BA4&z=16";

function phoneDigits(value) {
    var digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 11 && (digits.charAt(0) === "7" || digits.charAt(0) === "8")) return digits;
    if (digits.length === 10) return "7" + digits;
    return "";
}

function loadMap(slot) {
    if (!slot || slot.querySelector("iframe")) return;
    var frame = document.createElement("iframe");
    frame.className = "map-frame";
    frame.title = "Карта: Москва, Каширское шоссе, 55к4";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer-when-downgrade";
    frame.src = slot.getAttribute("data-map-src") || MAP_SRC;
    slot.replaceChildren(frame);
}

function bindMaps() {
    document.querySelectorAll("[data-load-map]").forEach(function (button) {
        button.addEventListener("click", function () {
            loadMap(button.closest(".map-slot"));
        });
    });
}

function setStatus(node, text, kind) {
    node.hidden = false;
    node.className = "form-status " + (kind || "");
    node.textContent = text;
}

function bindForms() {
    document.querySelectorAll(".request-form").forEach(function (form) {
        var status = form.querySelector(".form-status");
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            var data = new FormData(form);
            if (String(data.get("company") || "").trim()) {
                setStatus(status, "Заявка отправлена. Мы перезвоним.", "is-ok");
                form.reset();
                return;
            }
            var name = String(data.get("name") || "").trim();
            var phone = phoneDigits(data.get("phone"));
            var model = String(data.get("model") || "").trim();
            var problem = String(data.get("problem") || "").trim();
            var consent = data.get("consent") === "yes";
            if (!name || !model || !problem) {
                setStatus(status, "Заполните имя, модель и описание поломки.", "is-error");
                return;
            }
            if (!phone) {
                setStatus(status, "Укажите телефон: 10 или 11 цифр, например +7 916 726-68-17.", "is-error");
                return;
            }
            if (!consent) {
                setStatus(status, "Нужно согласие на обработку персональных данных.", "is-error");
                return;
            }
            if (!FORM_ENDPOINT || FORM_ENDPOINT.indexOf("PLACEHOLDER") !== -1) {
                setStatus(status, "Форма пока в тестовом режиме, позвоните: +7 916 726-68-17", "is-error");
                return;
            }
            var submit = form.querySelector("[type=submit]");
            if (submit) submit.disabled = true;
            fetch(FORM_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                    name: name,
                    phone: phone,
                    model: model,
                    problem: problem,
                    consent: true
                })
            }).then(function (response) {
                if (!response.ok) throw new Error("status " + response.status);
                setStatus(status, "Заявка отправлена. Мы перезвоним.", "is-ok");
                form.reset();
            }).catch(function () {
                setStatus(status, "Не удалось отправить заявку. Позвоните: +7 916 726-68-17", "is-error");
            }).then(function () {
                if (submit) submit.disabled = false;
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    bindMaps();
    bindForms();
});
