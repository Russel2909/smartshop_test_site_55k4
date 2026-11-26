(function () {
    var TYPE_LABELS = {
        "Телефон": "Смартфоны",
        "Планшет": "Планшеты",
        "Ноутбук": "Ноутбуки",
        "Компьютер": "Компьютеры",
        "Часы": "Часы",
        "Наушники": "Наушники",
        "Колонка": "Колонки",
        "Игровая консоль": "Консоли"
    };

    function initNav() {
        var toggle = document.querySelector(".nav-toggle");
        var links = document.querySelector(".nav-links");
        if (!toggle || !links) return;
        toggle.addEventListener("click", function () {
            var open = links.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
        links.addEventListener("click", function (event) {
            if (event.target.closest("a")) {
                links.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    function money(value) {
        return new Intl.NumberFormat("ru-RU").format(value) + " \u20bd";
    }

    function clear(node) {
        if (node) node.replaceChildren();
    }

    function makeButton(className, action, fields, title, subtitle) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.dataset.action = action;
        Object.keys(fields).forEach(function (key) {
            button.dataset[key] = fields[key];
        });
        var heading = document.createElement("span");
        heading.className = "choice-title";
        heading.textContent = title;
        button.appendChild(heading);
        if (subtitle) {
            var note = document.createElement("span");
            note.className = "choice-sub";
            note.textContent = subtitle;
            button.appendChild(note);
        }
        return button;
    }

    function status(parent, text) {
        clear(parent);
        var line = document.createElement("p");
        line.className = "status-line";
        line.textContent = text;
        parent.appendChild(line);
    }

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/ё/g, "е")
            .replace(/[^a-z0-9а-я]+/gi, " ")
            .trim();
    }

    function initCatalog(root) {
        var brandList = root.querySelector("#brand-list");
        var seriesStep = root.querySelector("#series-step");
        var seriesList = root.querySelector("#series-list");
        var modelStep = root.querySelector("#model-step");
        var modelList = root.querySelector("#model-list");
        var priceStep = root.querySelector("#price-step");
        var serviceList = root.querySelector("#service-list");
        var modelCaption = root.querySelector("#model-caption");
        var priceResult = root.querySelector("#price-result");
        var priceTitle = root.querySelector("#price-result-title");
        var priceSum = root.querySelector("#price-result-sum");
        var priceNote = root.querySelector("#price-result-note");
        var searchInput = document.querySelector("#model-search");
        var searchResults = document.querySelector("#search-results");

        var catalog = null;
        var requestedType = null;
        var current = { type: null, brand: null, series: null, model: null };
        var searchHits = [];

        function mark(selector, active) {
            root.querySelectorAll(selector).forEach(function (item) {
                item.classList.remove("is-active");
            });
            if (active) active.classList.add("is-active");
        }

        function hidePrices() {
            priceStep.hidden = true;
            priceResult.hidden = true;
            clear(serviceList);
            current.model = null;
        }

        function hideModels() {
            modelStep.hidden = true;
            clear(modelList);
            current.series = null;
            hidePrices();
        }

        function hideSeries() {
            seriesStep.hidden = true;
            clear(seriesList);
            current.brand = null;
            hideModels();
        }

        function renderBrands(typeId) {
            var typeData = catalog.types[typeId];
            current.type = typeId;
            hideSeries();
            if (!typeData || !typeData.brands.length) {
                status(brandList, "В каталоге нет брендов для этого типа.");
                return;
            }
            clear(brandList);
            typeData.brands.forEach(function (brand) {
                var count = typeData.items[brand].series.reduce(function (sum, series) {
                    return sum + typeData.items[brand].groups[series].length;
                }, 0);
                brandList.appendChild(makeButton(
                    "choice-btn",
                    "brand",
                    { brand: brand },
                    brand,
                    count + " " + plural(count, "модель", "модели", "моделей")
                ));
            });
        }

        function selectType(typeId, button) {
            requestedType = typeId;
            mark(".device-type-btn", button || root.querySelector('[data-type="' + CSS.escape(typeId) + '"]'));
            if (!catalog) {
                status(brandList, "Загружаем каталог…");
                hideSeries();
                return;
            }
            renderBrands(typeId);
        }

        function buttonBy(list, attr, value) {
            return Array.prototype.find.call(list.querySelectorAll("[data-action]"), function (item) {
                return item.dataset[attr] === value;
            }) || null;
        }

        function selectBrand(brand, button) {
            var typeData = catalog.types[current.type];
            var item = typeData && typeData.items[brand];
            if (!item) return;
            current.brand = brand;
            mark("#brand-list .choice-btn", button || buttonBy(brandList, "brand", brand));
            hideModels();
            if (item.series.length <= 1) {
                seriesStep.hidden = true;
                showModels(item.series[0], item.groups[item.series[0]]);
                return;
            }
            clear(seriesList);
            item.series.forEach(function (series) {
                var count = item.groups[series].length;
                seriesList.appendChild(makeButton(
                    "choice-btn",
                    "series",
                    { series: series },
                    series,
                    count + " " + plural(count, "модель", "модели", "моделей")
                ));
            });
            seriesStep.hidden = false;
        }

        function selectSeries(series, button) {
            var groups = catalog.types[current.type].items[current.brand].groups;
            mark("#series-list .choice-btn", button || buttonBy(seriesList, "series", series));
            showModels(series, groups[series] || []);
        }

        function showModels(series, models) {
            current.series = series;
            hidePrices();
            clear(modelList);
            if (!models.length) {
                status(modelList, "Модели не найдены.");
                modelStep.hidden = false;
                return;
            }
            models.forEach(function (model, index) {
                modelList.appendChild(makeButton(
                    "choice-btn",
                    "model",
                    { series: series, index: String(index) },
                    model.name,
                    "Год: " + model.year
                ));
            });
            modelStep.hidden = false;
        }

        function selectModel(series, index, button) {
            var models = catalog.types[current.type].items[current.brand].groups[series] || [];
            var model = models[index];
            if (!model) return;
            current.series = series;
            current.model = model;
            mark("#model-list .choice-btn", button || buttonBy(modelList, "index", String(index)));
            modelCaption.textContent = model.name + " · " + model.year;
            clear(serviceList);
            catalog.services.forEach(function (service, serviceIndex) {
                serviceList.appendChild(makeButton(
                    "service-btn",
                    "service",
                    { index: String(serviceIndex) },
                    service.name,
                    money(model.prices[serviceIndex])
                ));
            });
            priceResult.hidden = true;
            priceStep.hidden = false;
        }

        function selectService(index, button) {
            var service = catalog.services[index];
            var model = current.model;
            if (!service || !model) return;
            mark("#service-list .service-btn", button);
            priceTitle.textContent = service.name + " — " + model.name;
            priceSum.textContent = service.part
                ? "Стоимость работы: " + money(model.prices[index])
                : "Стоимость: " + money(model.prices[index]);
            priceNote.textContent = service.hint;
            priceResult.hidden = false;
        }

        function openHit(hit) {
            selectType(hit.type);
            selectBrand(hit.brand);
            if (catalog.types[hit.type].items[hit.brand].series.length > 1) {
                selectSeries(hit.series);
            }
            selectModel(hit.series, hit.index);
            var target = root.querySelector("#price-step");
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        function runSearch() {
            if (!searchInput || !searchResults) return;
            var query = normalize(searchInput.value);
            clear(searchResults);
            searchHits = [];
            if (!query) {
                status(searchResults, "Начните вводить модель, например iPhone 12 или Galaxy A.");
                return;
            }
            if (!catalog) {
                status(searchResults, "Каталог ещё загружается.");
                return;
            }
            var tokens = query.split(/\s+/).filter(Boolean);
            Object.keys(catalog.types).forEach(function (typeId) {
                var typeData = catalog.types[typeId];
                typeData.brands.forEach(function (brand) {
                    var item = typeData.items[brand];
                    item.series.forEach(function (series) {
                        item.groups[series].forEach(function (model, index) {
                            var haystack = normalize([model.name, brand, TYPE_LABELS[typeId] || typeId, series, model.year].join(" "));
                            var matched = tokens.every(function (token) { return haystack.indexOf(token) !== -1; });
                            if (matched) searchHits.push({ type: typeId, brand: brand, series: series, index: index, model: model });
                        });
                    });
                });
            });
            if (!searchHits.length) {
                status(searchResults, "Ничего не найдено. Проверьте название или выберите бренд выше.");
                return;
            }
            searchHits.slice(0, 24).forEach(function (hit, index) {
                searchResults.appendChild(makeButton(
                    "choice-btn",
                    "search-hit",
                    { index: String(index) },
                    hit.model.name,
                    [hit.brand, TYPE_LABELS[hit.type] || hit.type, hit.model.year].join(" · ")
                ));
            });
        }

        document.addEventListener("click", function (event) {
            var button = event.target.closest("[data-action]");
            if (!button) return;
            var inSearch = searchResults && searchResults.contains(button);
            if (!root.contains(button) && !inSearch) return;
            var action = button.dataset.action;
            if (action === "type") selectType(button.dataset.type, button);
            else if (action === "toggle-other") {
                var panel = root.querySelector("#other-types");
                if (panel) panel.hidden = !panel.hidden;
            } else if (!catalog) {
                status(brandList, "Загружаем каталог…");
            } else if (action === "brand") selectBrand(button.dataset.brand, button);
            else if (action === "series") selectSeries(button.dataset.series, button);
            else if (action === "model") selectModel(button.dataset.series, Number(button.dataset.index), button);
            else if (action === "service") selectService(Number(button.dataset.index), button);
            else if (action === "search-hit") openHit(searchHits[Number(button.dataset.index)]);
        });

        if (searchInput) {
            searchInput.addEventListener("input", runSearch);
            searchInput.addEventListener("keydown", function (event) {
                if (event.key === "Enter" && searchHits.length) {
                    event.preventDefault();
                    openHit(searchHits[0]);
                }
            });
            runSearch();
        }

        fetch(new URL("Data/devices.json", document.baseURI).href)
            .then(function (response) {
                if (!response.ok) throw new Error("Каталог не открылся: " + response.status);
                return response.json();
            })
            .then(function (data) {
                if (!data || !data.types || !data.services) throw new Error("В каталоге нет устройств или услуг");
                catalog = data;
                selectType(requestedType || "Телефон");
                runSearch();
            })
            .catch(function (error) {
                status(brandList, "Не удалось загрузить каталог. Откройте сайт через локальный сервер, не как файл с диска.");
                console.error(error);
            });
    }

    function plural(count, one, few, many) {
        var n = Math.abs(count) % 100;
        var n1 = n % 10;
        if (n > 10 && n < 20) return many;
        if (n1 > 1 && n1 < 5) return few;
        if (n1 === 1) return one;
        return many;
    }

    document.addEventListener("DOMContentLoaded", function () {
        initNav();
        var root = document.getElementById("repair-root");
        if (root) initCatalog(root);
    });
})();
