// =========================================================================
//   MARITIME REPORT AUTOPILOT — v6.0.4 (ROB Validation Rule Correction)
//   Change from v6.0.3:
//   - Within-report ROB check Case B removed: rows where both Last ROB and
//     ROB Start are empty/null are now always skipped silently, regardless
//     of whether input elements exist in the DOM. Only rows with at least
//     one value populated are validated.
//   - Case D arithmetic rule replaced: the old "Last ROB + ADJ = ROB Start"
//     formula is removed. Two independent rules are now enforced instead:
//       Rule 1 — Last ROB must equal ROB Start (exact match, within tolerance).
//       Rule 2 — ADJ must always be 0.
//     Both rules are checked independently so both errors surface if both
//     conditions fail simultaneously.
// =========================================================================

(function () {

const CONFIG = {
    REQUIRE_BUNKER_DATA: true,
    STEAMING_HOURS_MIN: 16,
    STEAMING_HOURS_MAX: 26,
    STEAMING_HOURS_IN_PORT_MIN: 0,
    STEAMING_HOURS_IN_PORT_MAX: 24,
    ADJ_TOLERANCE: 0.01,
    STEAMING_HOURS_ELAPSED_TOLERANCE: 0.1,
    SLEEP_POLL_MS: 500,
    SLEEP_POST_CLICK_MS: 1200,
    DOM_STABLE_HEADSTART_MS: 400,
    SLEEP_POST_NAVIGATE_MS: 3500,
    SLEEP_INIT_MS: 500,
    DOM_STABLE_TIMEOUT_MS: 3000,
    DOM_STABLE_DEBOUNCE_MS: 200,

    APPROVED_PORT_EVENTS: [
        'IDLE IN PORT',
        'SHIFT TO ANCHOR',
        'SHIFTING TO ANCHORAGE',
        'SHIFT TO BERTH',
        'SHIFTING TO BERTH',
        'LOAD - DISCH - IDLE',
        'SHIFT FROM LAST BERTH TO SEA',
        'SHIFTING FROM LAST BERTH TO SEA',
        'DRIFTING OR REDUCTION FOR SAFETY REASON',
        'CANAL/STRAIT TRANSIT',
        'DRY DOCK / SHIPYARD PERIOD',
        'SEA TRIALS',
        'DISCHARGING',
        'IDLE'
    ]
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

window.autopilotRunning = false;

// ---------------------------------------------------------------------------
//   DOM UTILITIES & INTERFACES
// ---------------------------------------------------------------------------

function getAllContexts() {
    const contexts = [document];
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc) contexts.push(doc);
        } catch (_) {}
    }
    return contexts;
}

function queryAllContexts(selector) {
    let elements = [];
    for (const ctx of getAllContexts()) {
        try {
            if (ctx) elements = elements.concat(Array.from(ctx.querySelectorAll(selector)));
        } catch (_) {}
    }
    return elements;
}

function waitForDOMStable(
    timeoutMs = CONFIG.DOM_STABLE_TIMEOUT_MS,
    debounceMs = CONFIG.DOM_STABLE_DEBOUNCE_MS
) {
    return new Promise((resolve) => {
        let debounceTimer = null;
        const hardTimeout = setTimeout(() => resolve(), timeoutMs);

        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                observer.disconnect();
                clearTimeout(hardTimeout);
                resolve();
            }, debounceMs);
        });

        getAllContexts().forEach(ctx => {
            try {
                if (ctx && ctx.body) {
                    observer.observe(ctx.body, {
                        childList: true,
                        subtree: true,
                        attributes: true
                    });
                }
            } catch (_) {}
        });

        debounceTimer = setTimeout(() => {
            observer.disconnect();
            clearTimeout(hardTimeout);
            resolve();
        }, debounceMs);
    });
}

// ---------------------------------------------------------------------------
//   FIELD FINDERS & CONTEXT SCRAPERS
// ---------------------------------------------------------------------------

function findSteamingHoursInput() {
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        let input = ctx.querySelector('#steaminghours')
            || ctx.querySelector('[name*="steaming" i]')
            || ctx.querySelector('[id*="steaming" i]');
        if (input) return input;

        const elements = Array.from(ctx.querySelectorAll('label, span, div, th'));
        for (const el of elements) {
            const txt = (el.innerText || '').toLowerCase();
            if (
                txt === 'steaming hours' ||
                txt === 'steaming hrs' ||
                txt.includes('steaming hours')
            ) {
                const parent = el.parentElement;
                if (parent) {
                    const adjInput = parent.querySelector('input');
                    if (adjInput) return adjInput;
                }
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
//   COLOUR HEURISTICS
// ---------------------------------------------------------------------------

function parseRgb(colorStr) {
    if (!colorStr) return null;
    const m = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return null;
    return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
}

function isBlueish(colorStr) {
    const rgb = parseRgb(colorStr);
    if (!rgb) return false;
    const { r, g, b } = rgb;
    return b > 100 && (b - r) > 45 && (b - g) > 15;
}

function isStatusColor(colorStr) {
    const rgb = parseRgb(colorStr);
    if (!rgb) return false;
    const { r, g, b } = rgb;
    const isGreenish = (g - r) > 10 && (g - b) > 10;
    const isReddish  = (r - g) > 10 && (r - b) > 10;
    return isGreenish || isReddish;
}

function isGreenish(colorStr) {
    const rgb = parseRgb(colorStr);
    if (!rgb) return false;
    const { r, g, b } = rgb;
    return (g - r) > 10 && (g - b) > 10;
}

function isCardChecked(card) {
    const style = window.getComputedStyle(card);
    return isGreenish(style.borderColor) || isGreenish(style.backgroundColor);
}

// ---------------------------------------------------------------------------
//   DUPLICATE TIMELINE SCANNER
// ---------------------------------------------------------------------------

function extractCardSignature(card) {
    const raw = (card.innerText || '').trim();
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

    const reportType = lines[0] ? lines[0].replace(/[,.]$/, '').trim() : '';
    const vesselName = lines[1] ? lines[1].replace(/[,.]$/, '').trim().toUpperCase() : '';

    let date = '';
    let time = '';
    let utcOffset = '';
    let dateLineIndex = -1;
    const dtPattern = /(\d{4}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]\d{4})\s+(\d{2}:\d{2})(?:[:\d]*)?\s*([+-]\d{2}:?\d{2})?/;
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(dtPattern);
        if (m) {
            date = m[1].replace(/[./]/g, '-');
            time = m[2];
            if (m[3]) {
                utcOffset = m[3].length === 5 ? `${m[3].slice(0, 3)}:${m[3].slice(3)}` : m[3];
            }
            dateLineIndex = i;
            break;
        }
    }

    let routeInfo = '';
    if (dateLineIndex > 1) {
        routeInfo = lines.slice(2, dateLineIndex)
            .join(' ')
            .replace(/[,.]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    }

    return { reportType, vesselName, date, time, utcOffset, routeInfo, rawText: raw };
}

function signaturesMatch(a, b) {
    const coreMatch = (
        a.reportType  !== '' && b.reportType  !== '' && a.reportType  === b.reportType  &&
        a.vesselName  !== '' && b.vesselName  !== '' && a.vesselName  === b.vesselName  &&
        a.date        !== '' && b.date        !== '' && a.date        === b.date        &&
        a.time        !== '' && b.time        !== '' && a.time        === b.time
    );

    if (!coreMatch) return false;

    if (a.routeInfo || b.routeInfo) {
        return a.routeInfo === b.routeInfo;
    }

    return true;
}

function describeSignature(sig) {
    return `[${sig.reportType || 'Unknown type'}] ${sig.vesselName || 'Unknown vessel'}`
        + (sig.routeInfo ? ` — ${sig.routeInfo}` : '')
        + ` — ${sig.date || '????-??-??'} ${sig.time || '??:??'}`;
}

function checkIsDuplicateReport() {
    const sidebarCards = Array.from(
        document.querySelectorAll('.card, div[class*="card"], .report-item, li[class*="report"]')
    ).filter(card => {
        const text = card.innerText || '';
        return (
            text.includes('Report')  ||
            text.includes('Notice')  ||
            text.includes('Noon')    ||
            text.includes('Arrival') ||
            text.includes('Departure')
        );
    });

    if (sidebarCards.length < 2) return null;

    const ACTIVE_CLASSES = ['active', 'p-highlight', 'selected', 'is-selected',
                            'current', 'focused', 'open', 'p-listbox-item-selected'];

    let currentCard = null;

    for (const card of sidebarCards) {
        if (ACTIVE_CLASSES.some(cls => card.classList.contains(cls))) {
            currentCard = card;
            break;
        }
    }

    if (!currentCard) {
        for (const card of sidebarCards) {
            if (card.getAttribute('aria-selected') === 'true') {
                currentCard = card;
                break;
            }
        }
    }

    if (!currentCard) {
        for (const card of sidebarCards) {
            const style = window.getComputedStyle(card);
            if (
                isBlueish(style.borderColor) ||
                isBlueish(style.outlineColor) ||
                isBlueish(style.boxShadow)
            ) {
                currentCard = card;
                break;
            }
        }
    }

    if (!currentCard) {
        for (const card of sidebarCards) {
            const bg = window.getComputedStyle(card).backgroundColor;
            if (
                bg && bg !== 'rgb(255, 255, 255)' && bg !== 'rgba(0, 0, 0, 0)' &&
                bg !== 'transparent' && !isStatusColor(bg)
            ) {
                currentCard = card;
                break;
            }
        }
    }

    if (!currentCard) {
        currentCard = sidebarCards[0];
    }

    const currentSig = extractCardSignature(currentCard);

    if (!currentSig.vesselName || !currentSig.date || !currentSig.time) {
        return null;
    }

    for (const card of sidebarCards) {
        if (card === currentCard) continue;
        const sig = extractCardSignature(card);
        if (signaturesMatch(currentSig, sig)) {
            return { currentSig, matchedSig: sig };
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
//   REPORT CONTEXT EXTRACTION
// ---------------------------------------------------------------------------

function extractReportContext() {
    let reportType = "In Port Report";

    let locationValue = '';
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        const locSelect = ctx.querySelector(
            'select[id*="location" i], select[name*="location" i]'
        );
        if (locSelect && locSelect.options[locSelect.selectedIndex]) {
            locationValue = locSelect.options[locSelect.selectedIndex].text.trim().toLowerCase();
            break;
        }
        const locInput = ctx.querySelector(
            'input[id*="location" i], input[name*="location" i]'
        );
        if (locInput && locInput.value.trim()) {
            locationValue = locInput.value.trim().toLowerCase();
            break;
        }
    }

    if (locationValue.includes('in port') || locationValue === 'port') {
        reportType = "In Port Report";
    } else if (locationValue.includes('at sea') || locationValue.includes('sea')) {
        reportType = "At Sea NOON Report";
    } else {
        const subHeaders = queryAllContexts('.p-panel-header, h1, h2, h3, .report-title');
        for (const sh of subHeaders) {
            const txt = (sh.innerText || '').toUpperCase();
            if (txt.includes('NOON') || txt.includes('AT SEA')) {
                reportType = "At Sea NOON Report";
                break;
            }
        }
    }

    let isDepartureReport = false;
    if (reportType === 'At Sea NOON Report') {
        outerLoop:
        for (const ctx of getAllContexts()) {
            if (!ctx) continue;

            const allInputs = Array.from(ctx.querySelectorAll('input'));
            for (const inp of allInputs) {
                const id   = (inp.id   || '').toLowerCase();
                const name = (inp.name || '').toLowerCase();
                if (
                    id.includes('startsea')   || id.includes('sosp')   || id.includes('sea_passage') ||
                    name.includes('startsea') || name.includes('sosp') || name.includes('sea_passage')
                ) {
                    if (inp.value && inp.value.trim() !== '') {
                        isDepartureReport = true;
                        break outerLoop;
                    }
                }
            }

            const labelEls = Array.from(ctx.querySelectorAll(
                'label, span, div, legend, .p-column-title, .field-label, th'
            ));
            for (const lbl of labelEls) {
                const txt = (lbl.innerText || '').toLowerCase();
                if (txt.includes('start of sea passage') || txt.includes('sosp')) {
                    const container =
                        lbl.closest('.p-field, .field-group, tr, .form-row, fieldset') ||
                        lbl.parentElement;
                    if (container) {
                        const nearbyInp = container.querySelector('input');
                        if (nearbyInp && nearbyInp.value && nearbyInp.value.trim() !== '') {
                            isDepartureReport = true;
                            break outerLoop;
                        }
                    }
                }
            }
        }
    }

    const steamingInput = findSteamingHoursInput();
    const seaSteamingHours = steamingInput ? (parseFloat(steamingInput.value) || 0) : 24;

    let cargoBefore = 0, cargoAfter = 0, isSTS = false, stsToggle = 'No';
    
    const inputs = queryAllContexts('input, select, text');
    inputs.forEach(inp => {
        const id = (inp.id || '').toLowerCase();
        const name = (inp.name || '').toLowerCase();
        
        if (id.includes('cargobefore') || name.includes('cargo_before')) cargoBefore = parseFloat(inp.value) || 0;
        if (id.includes('cargoafter') || name.includes('cargo_after')) cargoAfter = parseFloat(inp.value) || 0;
        if (id.includes('stszone') || name.includes('sts_zone')) isSTS = true;
        if (id.includes('ststoggle') || id.includes('sts_op')) stsToggle = inp.value || 'No';
    });

    return {
        reportType: reportType,
        isDepartureReport: isDepartureReport,
        seaSteamingHours: seaSteamingHours,
        cargoQuantityBeforeTransit: cargoBefore,
        cargoQuantityAfterTransit: cargoAfter,
        isSTSOperationZone: isSTS,
        stsOperationsToggle: stsToggle
    };
}

function scrapeTimelineEventRows() {
    const scrapedRows = [];
    
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;

        const eventContainers = Array.from(ctx.querySelectorAll('fieldset'));
        let targetEventsBlock = null;

        for (const fc of eventContainers) {
            const legend = fc.querySelector('legend');
            if (legend && legend.innerText.toUpperCase().includes('EVENTS')) {
                targetEventsBlock = fc;
                break;
            }
        }

        if (!targetEventsBlock) continue;

        const rows = Array.from(targetEventsBlock.querySelectorAll('tbody tr, tr, .event-row'));
        rows.forEach(row => {
            const selectEl = row.querySelector('select[id*="eventtypes" i], select#gsinporteventtypes, select');
            if (!selectEl) return;

            const selectedText = selectEl.options[selectEl.selectedIndex] ? selectEl.options[selectEl.selectedIndex].text.trim() : '';
            if (!selectedText) return;

            const inputs = Array.from(row.querySelectorAll('input'));
            let distance = 0, duration = 0, fuel = 0;

            inputs.forEach(inp => {
                const titleText = (inp.getAttribute('placeholder') || inp.id || inp.name || '').toLowerCase();
                const val = parseFloat(inp.value) || 0;

                if (titleText.includes('dist')) distance = val;
                if (titleText.includes('dur') || titleText.includes('min')) duration = val;
                if (titleText.includes('me') || titleText.includes('cons') || titleText.includes('fuel')) fuel = val;
            });

            const isIntermediate = duration === 1 && distance === 0 && fuel === 0;

            scrapedRows.push({
                eventType: selectedText,
                durationMinutes: duration,
                distance: distance,
                meConsumption: fuel,
                isIntermediateTransitionRow: isIntermediate
            });
        });
    }
    return scrapedRows;
}

// ---------------------------------------------------------------------------
//   EVENTS BLOCK VALIDATOR
// ---------------------------------------------------------------------------

function validatePortEvents() {
    let portLayoutDetected = false;
    let containsInvalidEvent = false;
    let invalidEventName = '';

    for (const ctx of getAllContexts()) {
        if (!ctx) continue;

        const eventContainers = Array.from(ctx.querySelectorAll('fieldset[data-section-index], fieldset'));
        let targetEventsBlock = null;

        for (const fs of eventContainers) {
            const legend = fs.querySelector('legend');
            if (legend && legend.innerText.toUpperCase().includes('EVENTS')) {
                targetEventsBlock = fs;
                break;
            }
        }

        if (!targetEventsBlock) continue;

        const portWrapper = targetEventsBlock.querySelector('[data-field-name="inporteventrobdetails"]');
        if (portWrapper) {
            const style = window.getComputedStyle(portWrapper);
            if (style.display !== 'none') portLayoutDetected = true;
        }

        const totalDropdowns = Array.from(
            targetEventsBlock.querySelectorAll('select[id*="eventtypes" i], select#gsinporteventtypes')
        );
        if (totalDropdowns.length > 0) portLayoutDetected = true;

        if (!portLayoutDetected) continue;

        for (const selectEl of totalDropdowns) {
            const selectedText = selectEl.options[selectEl.selectedIndex]
                ? selectEl.options[selectEl.selectedIndex].text.trim()
                : '';
            const upperText = selectedText.toUpperCase();

            if (!upperText) continue;

            const isApproved = CONFIG.APPROVED_PORT_EVENTS.some(approvedEvent =>
                upperText.includes(approvedEvent.toUpperCase())
            );

            if (!isApproved) {
                containsInvalidEvent = true;
                invalidEventName = selectedText;
                selectEl.style.cssText =
                    'border: 3px solid #f44336 !important; background-color: #ffebee !important;';
            } else {
                selectEl.style.cssText = 'border: 1px solid green !important;';
            }
        }
    }

    if (!portLayoutDetected) return { status: 'SEA' };
    if (containsInvalidEvent) return { status: 'INVALID', event: invalidEventName };
    return { status: 'VALID_PORT' };
}

// ---------------------------------------------------------------------------
//   BUNKER ROB LOCATORS
// ---------------------------------------------------------------------------

function locateTrueBunkerContainer() {
    function isBunkerRobHeader(text) {
        const t = text.trim().toUpperCase().replace(/[.\s]+/g, ' ');
        return (t.includes('BUNKER') && t.includes('ROB')) || t === 'BUNKER';
    }

    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        const fieldsets = ctx.querySelectorAll('fieldset');
        for (const fs of fieldsets) {
            const legend = fs.querySelector('legend');
            if (legend && isBunkerRobHeader(legend.innerText)) return fs;
        }
    }

    const badges = queryAllContexts(
        '.p-panel-header, .p-component-header, legend, .bunker-header, ' +
        '[class*="panel-header"], [class*="section-header"], [class*="card-header"]'
    );
    for (const badge of badges) {
        const text = (badge.innerText || badge.textContent || '');
        if (!isBunkerRobHeader(text)) continue;
        let current = badge.parentElement;
        while (current && current !== current.ownerDocument.body) {
            if (
                current.tagName === 'FIELDSET' ||
                current.classList.contains('p-component') ||
                current.classList.contains('card') ||
                current.tagName === 'TABLE' ||
                current.tagName === 'SECTION' ||
                current.tagName === 'DIV'
            ) {
                return current;
            }
            current = current.parentElement;
        }
    }
    return null;
}

function locateBunkerRows() {
    const bunkerContainer = locateTrueBunkerContainer();
    if (!bunkerContainer) return [];

    let rows = Array.from(
        bunkerContainer.querySelectorAll('tbody tr, .p-datatable-tbody tr')
    );
    if (rows.length === 0) rows = Array.from(bunkerContainer.querySelectorAll('tr'));

    if (rows.length === 0) {
        rows = Array.from(bunkerContainer.querySelectorAll('tr')).filter(tr =>
            tr.querySelector('td[data-td-name]')
        );
    }

    return rows.filter(row => {
        if (
            row.closest('thead') ||
            row.classList.contains('p-datatable-thead') ||
            row.querySelector('th')
        ) {
            return false;
        }
        const inputs = Array.from(row.querySelectorAll('input')).filter(inp => {
            if (inp.type === 'hidden' || inp.disabled) return false;
            const style = window.getComputedStyle(inp);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
        const dataCells = Array.from(row.querySelectorAll('td[data-td-name]'));
        return inputs.length >= 1 || dataCells.length >= 2;
    });
}

// ---------------------------------------------------------------------------
//   VESSEL TIMELINE & CROSS-REPORT ADJ HELPERS
// ---------------------------------------------------------------------------

function getAllReportCards() {
    return Array.from(
        document.querySelectorAll('.card, div[class*="card"], .report-item, li[class*="report"]')
    ).filter(card => {
        const text = card.innerText || '';
        return (
            text.includes('Report')  ||
            text.includes('Notice')  ||
            text.includes('Noon')    ||
            text.includes('Arrival') ||
            text.includes('Departure')
        );
    });
}

function identifyCurrentCard(sidebarCards) {
    const ACTIVE_CLASSES = ['active', 'p-highlight', 'selected', 'is-selected',
                            'current', 'focused', 'open', 'p-listbox-item-selected'];

    for (const card of sidebarCards) {
        if (ACTIVE_CLASSES.some(cls => card.classList.contains(cls))) return card;
    }
    for (const card of sidebarCards) {
        if (card.getAttribute('aria-selected') === 'true') return card;
    }

    const widths = sidebarCards.map(card => {
        const w = parseFloat(window.getComputedStyle(card).borderWidth) || 0;
        return { card, w };
    });
    const maxW = Math.max(...widths.map(x => x.w));
    const cardsAtMax = widths.filter(x => x.w === maxW);
    if (maxW > 0 && cardsAtMax.length === 1) {
        const othersWidth = widths.filter(x => x.card !== cardsAtMax[0].card).map(x => x.w);
        const allOthersThinner = othersWidth.every(w => w < maxW);
        if (allOthersThinner && othersWidth.length > 0) {
            return cardsAtMax[0].card;
        }
    }

    for (const card of sidebarCards) {
        const style = window.getComputedStyle(card);
        if (isBlueish(style.borderColor) || isBlueish(style.outlineColor) || isBlueish(style.boxShadow)) {
            return card;
        }
    }
    for (const card of sidebarCards) {
        const bg = window.getComputedStyle(card).backgroundColor;
        if (bg && bg !== 'rgb(255, 255, 255)' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !isStatusColor(bg)) {
            return card;
        }
    }
    return sidebarCards[0] || null;
}

function reportTimestamp(sig) {
    if (!sig || !sig.date || !sig.time) return NaN;
    const offset = sig.utcOffset || '+00:00';
    return new Date(`${sig.date}T${sig.time}:00${offset}`).getTime();
}

function findAdjacentVesselReports(currentSig, sidebarCards, currentCard) {
    const currentTs = reportTimestamp(currentSig);

    let previousCard = null, previousTs = -Infinity;
    let futureCard = null, futureTs = Infinity;

    if (isNaN(currentTs)) return { previousCard, futureCard };

    for (const card of sidebarCards) {
        if (card === currentCard) continue;
        const sig = extractCardSignature(card);
        if (!sig.vesselName || sig.vesselName !== currentSig.vesselName) continue;

        const ts = reportTimestamp(sig);
        if (isNaN(ts) || ts === currentTs) continue;

        if (ts < currentTs && ts > previousTs) {
            previousTs = ts;
            previousCard = card;
        } else if (ts > currentTs && ts < futureTs) {
            futureTs = ts;
            futureCard = card;
        }
    }

    return { previousCard, futureCard };
}

function findNearestCheckedCard(currentSig, sidebarCards, currentCard) {
    const currentTs = reportTimestamp(currentSig);
    if (isNaN(currentTs)) return null;

    let best = null;
    let bestDelta = Infinity;

    for (const card of sidebarCards) {
        if (card === currentCard) continue;
        if (!isCardChecked(card)) continue;

        const sig = extractCardSignature(card);
        if (!sig.vesselName || sig.vesselName !== currentSig.vesselName) continue;

        const ts = reportTimestamp(sig);
        if (isNaN(ts)) continue;

        const delta = Math.abs(ts - currentTs);
        if (delta < bestDelta) {
            bestDelta = delta;
            best = { card, sig, direction: ts < currentTs ? 'previous' : 'next' };
        }
    }

    return best;
}

// ---------------------------------------------------------------------------
//   BUNKER SNAPSHOT SCRAPER
// ---------------------------------------------------------------------------

function scrapeBunkerSnapshot() {
    const bunkerContainer = locateTrueBunkerContainer();
    const bunkerRows = locateBunkerRows();
    const snapshot = [];

    const LAST_ROB_KEYS  = ['last rob', 'prev rob', 'previous rob', 'rob (previous)', 'rob prev'];
    const ROB_START_KEYS = ['rob start', 'start rob', 'opening rob', 'rob (start)', 'rob(start)'];
    const ADJ_KEYS       = ['adj', 'adjustment'];

    let lastRobCol  = -1;
    let robStartCol = -1;
    let adjCol      = -1;

    if (bunkerContainer) {
        const thCells = Array.from(bunkerContainer.querySelectorAll('th'));
        if (thCells.length >= 2) {
            thCells.forEach((th, colIdx) => {
                const txt = (th.innerText || '').toLowerCase().replace(/\s+/g, ' ').trim();
                if (lastRobCol  < 0 && LAST_ROB_KEYS.some(k  => txt.includes(k)))  lastRobCol  = colIdx;
                if (robStartCol < 0 && ROB_START_KEYS.some(k => txt.includes(k))) robStartCol = colIdx;
                if (adjCol      < 0 && ADJ_KEYS.some(k      => txt.includes(k)))      adjCol  = colIdx;
            });
        }
    }

    function numVal(el) {
        if (!el) return null;
        const raw = el.tagName === 'INPUT' ? el.value : el.innerText;
        const cleaned = (raw || '').replace(/,/g, '').trim();
        if (cleaned === '' || cleaned === '-' || cleaned === 'N/A') return null;
        const n = parseFloat(cleaned);
        return isNaN(n) ? null : n;
    }

    bunkerRows.forEach((row, index) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length === 0) return;

        const rawLabel = (cells[0].innerText || '').trim().split('\n')[0];
        const normalisedLabel = rawLabel.replace(/[*†‡\d]+$/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
        const fuelTypeLabel = normalisedLabel || `__ROW_${index}`;
        const displayLabel  = rawLabel || `Line ${index + 1}`;

        const allInputs = cells.flatMap(c =>
            Array.from(c.querySelectorAll('input')).filter(inp => {
                if (inp.type === 'hidden' || inp.disabled) return false;
                const s = window.getComputedStyle(inp);
                return s.display !== 'none' && s.visibility !== 'hidden';
            })
        );

        let lastRobInput  = null;
        let robStartInput = null;
        let adjInput      = null;
        let adjStaticVal  = 0;
        let hasAdjColumn  = false;
        let adjElementToHighlight = null;

        // PASS 2a: data-td-name attributes
        cells.forEach(cell => {
            const tdName = (cell.getAttribute('data-td-name') || '').toLowerCase().replace(/[_\-\s]/g, '');
            const inp    = cell.querySelector('input');

            const isLastRobByAttr  = ['lastremaining', 'lastrob', 'previousrob', 'prevrob'].includes(tdName);
            const isRobStartByAttr = ['robstart', 'startingrob', 'openrob', 'robopeningbalance'].includes(tdName);
            const isAdjByAttr      = ['adj', 'adjustment'].includes(tdName);

            if (!lastRobInput  && isLastRobByAttr  && inp) lastRobInput  = inp;
            if (!robStartInput && isRobStartByAttr && inp) robStartInput = inp;
            if (!hasAdjColumn  && isAdjByAttr) {
                hasAdjColumn = true;
                if (inp) { adjInput = inp; adjElementToHighlight = inp; }
                else { adjStaticVal = numVal(cell) || 0; adjElementToHighlight = cell; }
            }
        });

        // PASS 2b: header-index map
        if (!lastRobInput  && lastRobCol  >= 0 && cells[lastRobCol])  lastRobInput  = cells[lastRobCol].querySelector('input')  || null;
        if (!robStartInput && robStartCol >= 0 && cells[robStartCol]) robStartInput = cells[robStartCol].querySelector('input') || null;
        if (!hasAdjColumn  && adjCol >= 0 && cells[adjCol]) {
            hasAdjColumn = true;
            const adjCell = cells[adjCol];
            const adjInp  = adjCell.querySelector('input');
            if (adjInp) {
                adjInput = adjInp;
                adjElementToHighlight = adjInp;
            } else {
                adjStaticVal = numVal(adjCell) || 0;
                adjElementToHighlight = adjCell;
            }
        }

        // PASS 2c: per-cell text / id / name scan
        if (!lastRobInput || !robStartInput) {
            cells.forEach(cell => {
                const titleEl  = cell.querySelector('.p-column-title');
                const cellTxt  = (titleEl ? titleEl.innerText : cell.getAttribute('data-label') || '').toLowerCase().trim();
                const inp      = cell.querySelector('input');
                const inpId    = inp ? (inp.id   || '').toLowerCase() : '';
                const inpName  = inp ? (inp.name || '').toLowerCase() : '';

                const isLastRob  = LAST_ROB_KEYS.some(k  => cellTxt.includes(k) || inpId.includes(k.replace(/ /g,'')) || inpName.includes(k.replace(/ /g,'')))
                                || inpId.includes('lastrob') || inpName.includes('last_rob');
                const isRobStart = ROB_START_KEYS.some(k => cellTxt.includes(k) || inpId.includes(k.replace(/ /g,'')) || inpName.includes(k.replace(/ /g,'')))
                                || inpId.includes('robstart') || inpName.includes('rob_start');
                const isAdj      = ADJ_KEYS.some(k => cellTxt.includes(k) || inpId.includes(k) || inpName.includes(k));

                if (!lastRobInput  && isLastRob  && inp) lastRobInput  = inp;
                if (!robStartInput && isRobStart && inp) robStartInput = inp;
                if (!hasAdjColumn  && isAdj) {
                    hasAdjColumn = true;
                    if (inp) { adjInput = inp; adjElementToHighlight = inp; }
                    else { adjStaticVal = numVal(cell) || 0; adjElementToHighlight = cell; }
                }
            });
        }

        // PASS 2d: positional fallback
        if ((!lastRobInput || !robStartInput) && allInputs.length >= 2) {
            if (!lastRobInput)  lastRobInput  = allInputs[0];
            if (!robStartInput) robStartInput = allInputs[1];
            if (!hasAdjColumn && allInputs[2]) {
                hasAdjColumn = true;
                adjInput = allInputs[2];
                adjElementToHighlight = allInputs[2];
            }
        }

        let finalAdjValue = 0;
        if (adjInput) {
            finalAdjValue = parseFloat((adjInput.value || '').replace(/,/g, '').trim()) || 0;
        } else if (hasAdjColumn) {
            finalAdjValue = adjStaticVal;
        }

        const lastRobVal  = numVal(lastRobInput);
        const robStartVal = numVal(robStartInput);

        snapshot.push({
            fuelTypeLabel,
            displayLabel,
            rowIndex: index,
            lastRobInput,
            robStartInput,
            adjInput,
            adjElementToHighlight,
            hasAdjColumn,
            lastRob:  lastRobVal,
            robStart: robStartVal,
            adj:      finalAdjValue
        });
    });

    return snapshot;
}

// ---------------------------------------------------------------------------
//   DIALOG / MODAL HELPERS
// ---------------------------------------------------------------------------

function findOpenDialog() {
    const candidates = queryAllContexts(
        '.p-dialog, [role="dialog"], .modal, .p-confirm-dialog, .p-overlaypanel'
    );
    for (const el of candidates) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null) {
            return el;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
//   CORE VALIDATION RUNNER
// ---------------------------------------------------------------------------

async function validateCurrentReport() {
    clearStatus();
    setStatus('Initiating Smart Sandbox Scan (v6.0.3)...', 'info');
    await sleep(CONFIG.SLEEP_INIT_MS);

    let isValid = true;
    const errors = [];

    // 1. DUPLICATE TIMESTAMP SCAN
    setStatus('Scanning timeline matrix for concurrent duplicates...', 'info');
    const duplicateMatch = checkIsDuplicateReport();
    if (duplicateMatch) {
        const { currentSig, matchedSig } = duplicateMatch;

        setStatus('🛑 LOCKOUT: Duplicate report detected.', 'error');
        setStatus(`   Current report:  ${describeSignature(currentSig)}`, 'error');
        setStatus(`   Matches existing report:  ${describeSignature(matchedSig)}`, 'error');

        const rejectionMessage =
            `Duplicate Report Detected: this report (${describeSignature(currentSig)}) ` +
            `matches an existing report already on file (${describeSignature(matchedSig)}).`;

        const rejected = await rejectReportAsDuplicate(rejectionMessage);
        if (rejected) {
            setStatus('✅ Report rejected automatically with duplicate explanation. Halted for review.', 'warning');
        } else {
            setStatus('⚠️ Could not complete automatic rejection — manual review required. Halted.', 'error');
        }
        return false;
    } else {
        setStatus('✅ Duplicate Scan: No matching duplicate found in the report list.', 'success');
    }

    // 2. PORT EVENTS BLOCK CHECK
    setStatus('Analyzing active operational event parameters...', 'info');
    const eventCheck = validatePortEvents();

    if (eventCheck.status === 'INVALID') {
        isValid = false;
        setStatus(`🛑 LOCKOUT: Unapproved event scenario detected [${eventCheck.event}]. Halted.`, 'error');
        return false;
    } else if (eventCheck.status === 'VALID_PORT') {
        setStatus('✅ Operational Scenario: Approved Port Event layout and sequence rules confirmed.', 'success');
    } else {
        setStatus("✅ Operational Scenario: Approved At Sea state profile confirmed.", 'success');
    }

    // 3. STEAMING HOURS VALIDATION
    const earlyContext = extractReportContext();
    const steamMin = earlyContext.reportType === 'In Port Report'
        ? CONFIG.STEAMING_HOURS_IN_PORT_MIN
        : CONFIG.STEAMING_HOURS_MIN;
    const steamMax = earlyContext.reportType === 'In Port Report'
        ? CONFIG.STEAMING_HOURS_IN_PORT_MAX
        : CONFIG.STEAMING_HOURS_MAX;
    const steamLabel = earlyContext.reportType === 'In Port Report'
        ? `${CONFIG.STEAMING_HOURS_IN_PORT_MIN}–${CONFIG.STEAMING_HOURS_IN_PORT_MAX}`
        : `${CONFIG.STEAMING_HOURS_MIN}–${CONFIG.STEAMING_HOURS_MAX}`;

    const steamingHoursInput = findSteamingHoursInput();
    if (steamingHoursInput && steamingHoursInput.value.trim() !== '') {
        const hours = parseFloat(steamingHoursInput.value);
        if (isNaN(hours) || hours < steamMin || hours > steamMax) {
            errors.push(`Steaming hours (${hours}) outside bounds [${steamLabel}].`);
            steamingHoursInput.style.border = '3px solid #f44336';
            isValid = false;
            setStatus(`❌ Steaming hrs failed bounds check: ${hours} (allowed: ${steamLabel} for ${earlyContext.reportType})`, 'error');
        } else {
            steamingHoursInput.style.border = '1px solid green';
            setStatus(`✅ Steaming Hours Matrix: Value (${hours} hrs) within safe parameters [${steamLabel}] for ${earlyContext.reportType}.`, 'success');
        }

        if (earlyContext.reportType === 'At Sea NOON Report') {
            const sidebarCardsForSteaming = getAllReportCards();
            const currentCardForSteaming = identifyCurrentCard(sidebarCardsForSteaming);
            const currentSigForSteaming = currentCardForSteaming ? extractCardSignature(currentCardForSteaming) : null;

            if (!currentCardForSteaming || !currentSigForSteaming || isNaN(reportTimestamp(currentSigForSteaming))) {
                setStatus('⚠️ Unable to determine this report\'s own timestamp — elapsed-time steaming hours check skipped.', 'warning');
            } else {
                const nearestChecked = findNearestCheckedCard(currentSigForSteaming, sidebarCardsForSteaming, currentCardForSteaming);

                if (!nearestChecked) {
                    setStatus('ℹ️ No already-checked report found for this vessel yet — elapsed-time steaming hours check skipped.', 'info');
                } else if (isNaN(reportTimestamp(nearestChecked.sig))) {
                    setStatus('⚠️ Nearest checked report has no usable timestamp — elapsed-time steaming hours check skipped.', 'warning');
                } else {
                    const currentTs = reportTimestamp(currentSigForSteaming);
                    const checkedTs = reportTimestamp(nearestChecked.sig);
                    const actualElapsedHours = Math.abs(currentTs - checkedTs) / (1000 * 60 * 60);
                    const diff = Math.abs(actualElapsedHours - hours);

                    const refLabel = `${nearestChecked.sig.date} ${nearestChecked.sig.time} ${nearestChecked.sig.utcOffset || '+00:00'}`;
                    const currLabel = `${currentSigForSteaming.date} ${currentSigForSteaming.time} ${currentSigForSteaming.utcOffset || '+00:00'}`;

                    if (Math.abs(actualElapsedHours - hours) > CONFIG.STEAMING_HOURS_ELAPSED_TOLERANCE) {
                        setStatus(`🔍 DEBUG — current card rawText: "${currentSigForSteaming.rawText.replace(/\n/g, ' | ')}"`, 'warning');
                        setStatus(`🔍 DEBUG — current parsed: date=${currentSigForSteaming.date} time=${currentSigForSteaming.time} offset=${currentSigForSteaming.utcOffset || '(none)'} epoch=${currentTs}`, 'warning');
                        setStatus(`🔍 DEBUG — checked card rawText: "${nearestChecked.sig.rawText.replace(/\n/g, ' | ')}"`, 'warning');
                        setStatus(`🔍 DEBUG — checked parsed: date=${nearestChecked.sig.date} time=${nearestChecked.sig.time} offset=${nearestChecked.sig.utcOffset || '(none)'} epoch=${checkedTs}`, 'warning');
                    }

                    if (diff > CONFIG.STEAMING_HOURS_ELAPSED_TOLERANCE) {
                        errors.push(`Steaming hours (${hours}) does not match actual elapsed time (${actualElapsedHours.toFixed(2)} hrs) between this report (${currLabel}) and the nearest checked report (${refLabel}, ${nearestChecked.direction}).`);
                        steamingHoursInput.style.cssText = 'border: 3px solid #f44336 !important; background-color: #ffebee !important;';
                        isValid = false;
                        setStatus(`❌ Steaming Hours Elapsed-Time Check: Reported ${hours} hrs ≠ actual elapsed ${actualElapsedHours.toFixed(2)} hrs vs ${nearestChecked.direction} checked report (${refLabel}).`, 'error');
                    } else {
                        steamingHoursInput.style.cssText = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
                        setStatus(`✅ Steaming Hours Elapsed-Time Check: Reported ${hours} hrs matches actual elapsed ${actualElapsedHours.toFixed(2)} hrs vs ${nearestChecked.direction} checked report (${refLabel}).`, 'success');
                    }
                }
            }
        }
    } else {
        setStatus('ℹ️ Steaming Hours: Field unpopulated or not applicable to this report layout index.', 'info');
    }

    // 4. ADJ CROSS-REPORT RECONCILIATION (BUNKER ROB GRID)
    setStatus('Targeting isolated Bunker ROB grid for values and ADJ fields...', 'info');
    const currentBunkerCheck = scrapeBunkerSnapshot();

    // Diagnostic dump
    if (currentBunkerCheck.length === 0) {
        setStatus('🔍 DEBUG Bunker Scrape: 0 rows found — locateBunkerRows() returned empty.', 'warning');
    } else {
        currentBunkerCheck.forEach((r, i) => {
            setStatus(
                `🔍 DEBUG Row[${i}] "${r.displayLabel}": ` +
                `lastRob=${r.lastRob === null ? 'NULL' : r.lastRob}  ` +
                `robStart=${r.robStart === null ? 'NULL' : r.robStart}  ` +
                `adj=${r.adj}  ` +
                `lastRobInput=${r.lastRobInput ? 'FOUND' : 'MISSING'}  ` +
                `robStartInput=${r.robStartInput ? 'FOUND' : 'MISSING'}`,
                'info'
            );
        });
    }

    if (currentBunkerCheck.length === 0) {
        if (CONFIG.REQUIRE_BUNKER_DATA) {
            setStatus('🛑 LOCKOUT: Bunker ROB grid not found on this report page. REQUIRE_BUNKER_DATA = true — cannot approve without verifying ROB values.', 'error');
            isValid = false;
        } else {
            setStatus('ℹ️ Bunker ROB section absent — REQUIRE_BUNKER_DATA is false, skipping.', 'info');
        }
    }

    if (currentBunkerCheck.length > 0) {

        // ===================================================================
        // WITHIN-REPORT ROB INTEGRITY CHECK  [v6.0.4]
        //
        // Three distinct cases for a (lastRob, robStart) pair:
        //
        //   A+B) Both null (regardless of whether DOM inputs exist)
        //        → No values entered for this fuel grade — skip silently.
        //
        //   C) Exactly one side is null (partial data)
        //      → Column detection failed for one column. Block approval.
        //
        //   D) Both values present — enforce two independent rules:
        //      Rule 1: Last ROB must equal ROB Start exactly.
        //      Rule 2: ADJ must always be 0.
        // ===================================================================
        let withinReportFailed = false;
        setStatus('Verifying within-report ROB integrity (Last ROB = ROB Start, ADJ = 0)...', 'info');

        currentBunkerCheck.forEach(curr => {
            // Determine whether the row has any visible inputs at all.
            // If neither lastRobInput nor robStartInput was found, this fuel
            // grade simply has no editable cells — the vessel doesn't carry it.
            const noInputsFound = !curr.lastRobInput && !curr.robStartInput;

            // ---- CASE A & B: both values null ----
            // Whether or not input elements are present in the DOM, if both
            // Last ROB and ROB Start are empty/unpopulated the fuel grade has
            // no data entered — treat as not applicable and skip silently.
            if (curr.lastRob === null && curr.robStart === null) {
                setStatus(`ℹ️ ROB Check [${curr.displayLabel}]: No values entered — skipping.`, 'info');
                return; // handled — move to next row
            }

            // ---- CASE C: partial null (exactly one side missing) ----
            if (curr.lastRob === null || curr.robStart === null) {
                const nullMsg =
                    `[${curr.displayLabel}] Could not extract ` +
                    `${curr.lastRob  === null ? 'Last ROB (NULL)' : `Last ROB (${curr.lastRob})`} / ` +
                    `${curr.robStart === null ? 'ROB Start (NULL)' : `ROB Start (${curr.robStart})`} ` +
                    `— column detection failed. Cannot validate ROB continuity for this row.`;
                errors.push(nullMsg);
                setStatus(`❌ Scrape Failure [${curr.displayLabel}]: Partial data — Last ROB=${curr.lastRob} ROB Start=${curr.robStart}. Blocking approval.`, 'error');
                isValid = false;
                withinReportFailed = true;
                return;
            }

            // ---- CASE D: both values present — run the two required checks ----
            //   Rule 1: Last ROB must equal ROB Start exactly (within tolerance).
            //   Rule 2: ADJ must always be 0.
            let rowFailed = false;

            // Rule 1 — Last ROB == ROB Start
            const robMismatch = Math.abs(curr.lastRob - curr.robStart) > CONFIG.ADJ_TOLERANCE;
            if (robMismatch) {
                const errMsg = `[${curr.displayLabel}] Last ROB (${curr.lastRob}) ≠ ROB Start (${curr.robStart}). They must be identical.`;
                errors.push(errMsg);
                if (curr.lastRobInput)  curr.lastRobInput.style.cssText  = 'border: 3px solid red !important; background-color: #ffebee !important;';
                if (curr.robStartInput) curr.robStartInput.style.cssText = 'border: 3px solid red !important; background-color: #ffebee !important;';
                setStatus(`❌ ROB Mismatch [${curr.displayLabel}]: Last ROB (${curr.lastRob}) ≠ ROB Start (${curr.robStart}) — values must be identical.`, 'error');
                isValid = false;
                withinReportFailed = true;
                rowFailed = true;
            }

            // Rule 2 — ADJ must be 0
            if (Math.abs(curr.adj) > CONFIG.ADJ_TOLERANCE) {
                const errMsg = `[${curr.displayLabel}] ADJ is ${curr.adj} — ADJ must always be 0.`;
                errors.push(errMsg);
                if (curr.adjElementToHighlight) {
                    curr.adjElementToHighlight.style.cssText = 'border: 3px solid red !important; background-color: #ffebee !important;';
                }
                setStatus(`❌ ADJ Non-Zero [${curr.displayLabel}]: ADJ = ${curr.adj} — ADJ must always be 0.`, 'error');
                isValid = false;
                withinReportFailed = true;
                rowFailed = true;
            }

            if (!rowFailed) {
                if (curr.lastRobInput)  curr.lastRobInput.style.cssText  = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
                if (curr.robStartInput) curr.robStartInput.style.cssText = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
                setStatus(`✅ ROB Match [${curr.displayLabel}]: Last ROB = ROB Start = ${curr.lastRob}, ADJ = 0 ✓`, 'success');
            }
        });

        if (withinReportFailed) {
            setStatus('🛑 Within-Report ROB Integrity FAILED — halting. Cross-report ADJ check skipped until ROB values are corrected.', 'error');
        } else {
            setStatus('✅ Within-Report ROB Integrity: All rows pass (Last ROB = ROB Start, ADJ = 0).', 'success');

        // === CROSS-REPORT ADJ RECONCILIATION ===
        const sidebarCardsForAdj = getAllReportCards();
        const currentCardForAdj = identifyCurrentCard(sidebarCardsForAdj);
        const currentSigForAdj = currentCardForAdj ? extractCardSignature(currentCardForAdj) : null;

        if (!currentCardForAdj || !currentSigForAdj || isNaN(reportTimestamp(currentSigForAdj))) {
            setStatus('⚠️ Unable to determine this report\'s position in the vessel timeline — ADJ cross-report validation skipped.', 'warning');
        } else {
            const { previousCard, futureCard } = findAdjacentVesselReports(currentSigForAdj, sidebarCardsForAdj, currentCardForAdj);

            if (!futureCard) {
                setStatus('🛑 No future report is available for validation. Reporting appears to be complete for this vessel.', 'warning');
                setStatus('⏸️ ADJ validation could not be completed for this reason — halting without approving the report.', 'warning');
                return false;
            }

            setStatus('Cross-referencing ADJ figures against the next report in the timeline...', 'info');
            futureCard.click();
            await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);
            await waitForDOMStable();
            const futureBunkerSnapshot = scrapeBunkerSnapshot();

            let previousBunkerSnapshot = [];
            if (previousCard) {
                setStatus('Cross-referencing ADJ figures against the preceding report in the timeline...', 'info');
                previousCard.click();
                await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);
                await waitForDOMStable();
                previousBunkerSnapshot = scrapeBunkerSnapshot();
            }

            currentCardForAdj.click();
            await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);
            await waitForDOMStable();

            // Re-scrape after navigation — earlier element references are stale.
            const freshCurrentSnapshot = scrapeBunkerSnapshot();

            let validationFailTriggered = false;

            freshCurrentSnapshot.forEach(curr => {
                // [FIX v6.0.3] Guard against uncarried fuel rows in the
                // cross-report loop too. If the current row had no inputs and
                // no values, it's not carried — skip without touching the ADJ
                // non-zero check below (which would otherwise falsely fire
                // if adj defaults to 0 but the row has stale state).
                const noInputsCross = !curr.lastRobInput && !curr.robStartInput;
                if (curr.lastRob === null && curr.robStart === null && noInputsCross) {
                    setStatus(`ℹ️ Cross-Report ADJ [${curr.displayLabel}]: No inputs — fuel not carried, skipping.`, 'info');
                    return;
                }

                const future = futureBunkerSnapshot.find(f => f.fuelTypeLabel === curr.fuelTypeLabel)
                            || futureBunkerSnapshot[curr.rowIndex];
                const prev = previousBunkerSnapshot.find(p => p.fuelTypeLabel === curr.fuelTypeLabel)
                            || previousBunkerSnapshot[curr.rowIndex];

                // Check A — Opening balance continuity
                if (prev && prev.robStart !== null && curr.lastRob !== null) {
                    if (Math.abs(curr.lastRob - prev.robStart) > CONFIG.ADJ_TOLERANCE) {
                        errors.push(`[${curr.displayLabel}] Last ROB (${curr.lastRob}) does not continue from the previous report's ROB Start (${prev.robStart}).`);
                        if (curr.lastRobInput) {
                            curr.lastRobInput.style.cssText = 'border: 3px solid red !important; background-color: #ffebee !important;';
                        }
                        isValid = false;
                        validationFailTriggered = true;
                        setStatus(`❌ ROB Continuity [${curr.displayLabel}]: Last ROB (${curr.lastRob}) ≠ previous report's ROB Start (${prev.robStart}).`, 'error');
                    } else if (curr.lastRobInput) {
                        curr.lastRobInput.style.cssText = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
                    }
                }

                // Check B — ADJ reconciliation against next report's Last ROB
                if (future && future.lastRob !== null && curr.robStart !== null) {
                    const expectedFutureLastRob = curr.robStart + curr.adj;
                    if (Math.abs(future.lastRob - expectedFutureLastRob) > CONFIG.ADJ_TOLERANCE) {
                        errors.push(`[${curr.displayLabel}] ADJ value (${curr.adj}) does not reconcile — ROB Start + ADJ (${expectedFutureLastRob}) does not match the next report's Last ROB (${future.lastRob}).`);
                        if (curr.adjElementToHighlight) {
                            curr.adjElementToHighlight.style.cssText = 'border: 3px solid red !important; background-color: #ffebee !important;';
                        }
                        isValid = false;
                        validationFailTriggered = true;
                        setStatus(`❌ ADJ Reconciliation [${curr.displayLabel}]: ROB Start + ADJ (${expectedFutureLastRob}) ≠ next report's Last ROB (${future.lastRob}).`, 'error');
                    } else if (curr.adjElementToHighlight) {
                        curr.adjElementToHighlight.style.cssText = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
                    }
                } else if (curr.adj !== 0) {
                    // ADJ is non-zero but no matching future row to verify against —
                    // [FIX v6.0.3] Only block if this row actually has data (not the
                    // "no inputs, fuel not carried" case which is already guarded above).
                    errors.push(`[${curr.displayLabel}] ADJ is non-zero (${curr.adj}) but could not be reconciled against the next report — no matching fuel-type row or Last ROB value was found there.`);
                    if (curr.adjElementToHighlight) {
                        curr.adjElementToHighlight.style.cssText = 'border: 3px solid red !important; background-color: #ffebee !important;';
                    }
                    isValid = false;
                    validationFailTriggered = true;
                    setStatus(`❌ ADJ Reconciliation [${curr.displayLabel}]: ADJ is non-zero (${curr.adj}) and could not be verified against the next report. Treating as failed.`, 'error');
                }

                if (curr.robStartInput && !validationFailTriggered) {
                    curr.robStartInput.style.cssText = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
                }
            });

            if (!validationFailTriggered) {
                setStatus('✅ Bunker ROB Grid: ADJ values reconcile correctly against the previous and next reports.', 'success');
            }
        }
        } // end else (!withinReportFailed)
    } // end if (currentBunkerCheck.length > 0)

    // 5. GEOFORMS TIMELINE & COMPLIANCE SCENARIOS BRIDGE
    setStatus('Linking state parameters with Timeline Engine Matrix...', 'info');
    const reportContext = extractReportContext();
    const eventRows = scrapeTimelineEventRows();

    if (eventRows.length > 0) {
        const timelineValidator = new GeoformsTimelineValidator();
        const timelineResult = timelineValidator.validateTimeline(reportContext, eventRows);

        if (!timelineResult.isValid) {
            isValid = false;
            timelineResult.errors.forEach(err => {
                errors.push(`[Timeline Matrix] ${err}`);
                setStatus(`🛑 Regulation Lockout: ${err}`, 'error');
            });
        } else {
            setStatus('✅ Timeline Compliance Matrix: All carbon footprint scenarios and event sequencing rules are fully compliant.', 'success');
        }
        timelineResult.warnings.forEach(warn => {
            setStatus(`⚠️ Timeline Notice: ${warn}`, 'warning');
        });
    } else {
        setStatus('ℹ️ No active event grid objects extracted to check scenario state cascades.', 'info');
    }

    await sleep(CONFIG.SLEEP_POLL_MS);

    if (!isValid) {
        setStatus('🛑 LOCKOUT: Validation errors caught. Autopilot halted.', 'error');
    } else {
        setStatus('🎉 All system safety checks cleared successfully.', 'success');
    }

    return isValid;
}

// ---------------------------------------------------------------------------
//   REPORT APPROVAL WITH WARNING INTERCEPTOR
// ---------------------------------------------------------------------------

async function approveReport() {
    setStatus('Scanning interface for submission buttons...', 'info');
    let approveBtn = queryAllContexts(
        'button[label="Approve"], [appconfirmation][label="Approve"], .p-button[label="Approve"]'
    )[0];

    if (!approveBtn) {
        approveBtn = queryAllContexts('button, .p-button, [role="button"]').find(el => {
            const label = (el.getAttribute('label') || '').toLowerCase();
            return label === 'approve' || label.includes('approve');
        });
    }

    if (!approveBtn) {
        let textCheck = '';
        getAllContexts().forEach(ctx => {
            if (ctx && ctx.body) textCheck += ctx.body.innerText || '';
        });

        if (
            textCheck.includes('Approved') &&
            (textCheck.includes('Re Ingest') || textCheck.includes('Resubmit'))
        ) {
            setStatus('⚠️ File is already approved. Proceeding to skip forward...', 'warning');
            return 'skipped';
        }
        setStatus('❌ Submission button context link unreadable.', 'error');
        return false;
    }

    approveBtn.click();
    await sleep(CONFIG.SLEEP_POST_CLICK_MS);

    setStatus('Confirming report verification dialogue...', 'info');
    let yesBtn = queryAllContexts('.p-confirm-dialog-accept, button[label="Yes"]')[0];
    if (!yesBtn) {
        yesBtn = queryAllContexts('button, span, div, .p-button').find(el => {
            const text  = (el.innerText || el.textContent || '').trim().toLowerCase();
            const label = (el.getAttribute('label') || '').toLowerCase();
            return (
                text === 'yes' ||
                label === 'yes' ||
                text === 'confirm' ||
                text === 'ok'
            );
        });
    }

    if (!yesBtn) {
        setStatus('❌ Modal submission dialogue confirmation button missing.', 'error');
        return false;
    }

    yesBtn.click();
    
    setStatus('Evaluating modal chain for trailing warnings...', 'info');
    await sleep(800);

    const proceedAnyway = queryAllContexts('button, .p-button, [role="button"]').find(el => {
        const innerT = (el.innerText || el.textContent || '').trim().toLowerCase();
        const labelT = (el.getAttribute('label') || '').toLowerCase();
        return innerT.includes('proceed anyway') || labelT.includes('proceed anyway');
    });

    if (proceedAnyway) {
        const contextData = extractReportContext();
        if (contextData.reportType === 'In Port Report') {
            setStatus('⚠️ Distance 0 warning caught in Port Context. Bypassing safely...', 'warning');
            proceedAnyway.click();
            setStatus('✅ "Proceed Anyway" bypassed warning successfully.', 'success');
            await sleep(CONFIG.SLEEP_POST_CLICK_MS);
        } else {
            setStatus('🛑 LOCKOUT: Observed Distance is 0 warning in AT SEA context! Halted.', 'error');
            return false;
        }
    }

    setStatus('✅ Report successfully validated, signed off, and approved in system.', 'success');
    await sleep(CONFIG.DOM_STABLE_HEADSTART_MS);
    await waitForDOMStable();
    return true;
}

// ---------------------------------------------------------------------------
//   REPORT REJECTION (DUPLICATE HANDLING)
// ---------------------------------------------------------------------------

async function rejectReportAsDuplicate(rejectionMessage) {
    setStatus('Locating Reject control...', 'info');

    let rejectBtn = queryAllContexts(
        'button[label="Reject"], [appconfirmation][label="Reject"], .p-button[label="Reject"]'
    )[0];

    if (!rejectBtn) {
        rejectBtn = queryAllContexts('button, .p-button, [role="button"]').find(el => {
            const label = (el.getAttribute('label') || '').toLowerCase();
            const text  = (el.innerText || el.textContent || '').trim().toLowerCase();
            return label === 'reject' || label.includes('reject') || text === 'reject';
        });
    }

    if (!rejectBtn) {
        setStatus('❌ Reject control not found on screen — cannot auto-reject duplicate.', 'error');
        return false;
    }

    rejectBtn.click();
    await sleep(CONFIG.SLEEP_POST_CLICK_MS);

    const dialog = findOpenDialog();

    if (dialog) {
        const commentField = Array.from(dialog.querySelectorAll('textarea, input[type="text"]')).find(el => {
            const id = (el.id || '').toLowerCase();
            const name = (el.name || '').toLowerCase();
            const ph = (el.getAttribute('placeholder') || '').toLowerCase();
            return id.includes('comment') || id.includes('remark') || id.includes('reason') ||
                   name.includes('comment') || name.includes('remark') || name.includes('reason') ||
                   ph.includes('comment') || ph.includes('remark') || ph.includes('reason');
        });

        if (commentField) {
            commentField.value = rejectionMessage;
            commentField.dispatchEvent(new Event('input', { bubbles: true }));
            commentField.dispatchEvent(new Event('change', { bubbles: true }));
            setStatus(`📝 Rejection reason entered in confirmation dialog: "${rejectionMessage}"`, 'warning');
        } else {
            setStatus('⚠️ No reason/comment field found inside the Reject confirmation dialog — proceeding without one.', 'warning');
        }
    } else {
        setStatus('⚠️ No confirmation dialog detected after clicking Reject — proceeding without a reason field. (Remarks field intentionally left untouched.)', 'warning');
    }

    let confirmBtn = null;
    if (dialog) {
        confirmBtn = Array.from(dialog.querySelectorAll('button, .p-button, [role="button"]')).find(el => {
            const text  = (el.innerText || el.textContent || '').trim().toLowerCase();
            const label = (el.getAttribute('label') || '').toLowerCase();
            return (
                text === 'yes' || label === 'yes' ||
                text === 'confirm' || text === 'ok' ||
                text === 'reject' || label === 'reject' ||
                text === 'submit'
            );
        });
    }
    if (!confirmBtn) {
        confirmBtn = queryAllContexts('.p-confirm-dialog-accept, button[label="Yes"]')[0];
    }

    if (!confirmBtn) {
        setStatus('❌ Rejection confirmation button not found. Reject dialog may require manual completion.', 'error');
        return false;
    }

    confirmBtn.click();
    await sleep(CONFIG.SLEEP_POST_CLICK_MS);
    await waitForDOMStable();

    setStatus('✅ Report rejected due to duplicate detection.', 'warning');
    return true;
}

// ---------------------------------------------------------------------------
//   NAVIGATION
// ---------------------------------------------------------------------------

async function goToNextPendingReport() {
    setStatus('Analyzing sidebar tracker matrix...', 'info');

    const sidebarCards = queryAllContexts('.card, div[class*="card"]').filter(card => {
        const text = card.innerText || '';
        return text.includes('Report') || text.includes('Notice');
    });

    if (sidebarCards.length === 0) {
        setStatus('🎉 Queue cleared successfully with clean data locks!', 'success');
        return false;
    }

    const isPending = card => {
        const bgColor = window.getComputedStyle(card).backgroundColor;
        return (
            bgColor === 'rgb(255, 255, 255)' ||
            bgColor === 'rgba(0, 0, 0, 0)' ||
            bgColor === 'transparent'
        );
    };

    const isActive = card =>
        card.classList.contains('active') ||
        card.classList.contains('p-highlight') ||
        card.classList.contains('selected') ||
        !isPending(card);

    const currentIndex = sidebarCards.findIndex(isActive);

    const searchFrom = currentIndex >= 0 ? currentIndex - 1 : sidebarCards.length - 1;
    let nextPendingCard = null;

    for (let i = searchFrom; i >= 0; i--) {
        if (isPending(sidebarCards[i])) {
            nextPendingCard = sidebarCards[i];
            break;
        }
    }

    if (!nextPendingCard) {
        for (let i = sidebarCards.length - 1; i > searchFrom; i--) {
            if (isPending(sidebarCards[i])) {
                nextPendingCard = sidebarCards[i];
                setStatus('ℹ️ No pending reports ahead — wrapping to oldest unapproved entry.', 'info');
                break;
            }
        }
    }

    if (nextPendingCard) {
        setStatus('➡️ Transitioning interface context to next data index line...', 'success');
        nextPendingCard.click();
        await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);
        return true;
    } else {
        setStatus('🎉 Queue cleared successfully with clean data locks!', 'success');
        return false;
    }
}

// ---------------------------------------------------------------------------
//   AUTOPILOT LOOP
// ---------------------------------------------------------------------------

function isCurrentReportAlreadyApproved() {
    let screenText = '';
    getAllContexts().forEach(ctx => {
        if (ctx && ctx.body) screenText += ctx.body.innerText || '';
    });
    const hasApprovedBadge = queryAllContexts(
        '.p-tag, .p-badge, [class*="approved"], [class*="status"]'
    ).some(el => (el.innerText || '').trim().toLowerCase() === 'approved');

    return hasApprovedBadge || (
        screenText.includes('Re Ingest') || screenText.includes('Open for Resubmit')
    );
}

async function runAutopilot() {
    try {
        if (isCurrentReportAlreadyApproved()) {
            setStatus('⚠️ Current report already approved. Jumping to next unapproved...', 'warning');
            const hasNext = await goToNextPendingReport();
            if (!hasNext) {
                window.autopilotRunning = false;
                updateUIButton();
                return;
            }
        }

        while (window.autopilotRunning) {
            const isValid = await validateCurrentReport();
            if (!isValid) {
                window.autopilotRunning = false;
                updateUIButton();
                break;
            }

            const approved = await approveReport();
            if (approved === false) {
                window.autopilotRunning = false;
                updateUIButton();
                break;
            }

            const hasMoreReports = await goToNextPendingReport();
            if (!hasMoreReports) {
                window.autopilotRunning = false;
                updateUIButton();
                break;
            }
        }
    } catch (err) {
        window.autopilotRunning = false;
        updateUIButton();
        setStatus(`💥 Operational Exception: ${err.message}`, 'error');
    }
}

// ---------------------------------------------------------------------------
//   UI CONTROL INTERFACE
// ---------------------------------------------------------------------------

function injectControlPanel() {
    document.getElementById('autopilot-btn')?.remove();
    document.getElementById('autopilot-status')?.remove();

    const statusBox = document.createElement('div');
    statusBox.id = 'autopilot-status';
    statusBox.style.cssText = `
        position: fixed; bottom: 85px; left: 20px; z-index: 99999;
        padding: 12px; font-size: 13px; font-family: monospace;
        background-color: rgba(10, 11, 15, 0.98); color: #fff;
        border: 1px solid #444; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.7);
        display: none; min-width: 400px; max-height: 250px; overflow-y: auto;
    `;
    document.body.appendChild(statusBox);

    const btn = document.createElement('button');
    btn.id = 'autopilot-btn';
    btn.innerText = '▶ Start Autopilot (v6.0.3)';
    btn.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; z-index: 99999;
        padding: 15px 25px; font-size: 16px; font-weight: bold;
        background-color: #2e7d32; color: white; border: none;
        border-radius: 5px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    `;

    btn.addEventListener('click', () => {
        window.autopilotRunning = !window.autopilotRunning;
        updateUIButton();
        if (window.autopilotRunning) {
            document.getElementById('autopilot-status').style.display = 'block';
            runAutopilot();
        } else {
            setStatus('⏹ Interrupted execution chain manually.', 'warning');
        }
    });

    document.body.appendChild(btn);
}

function setStatus(message, type = 'info') {
    const box = document.getElementById('autopilot-status');
    if (!box) return;

    const colorMap = { success: '#81c784', error: '#e57373', warning: '#fff176' };
    const color = colorMap[type] || '#ffffff';

    const line = document.createElement('div');
    line.style.cssText = `color: ${color}; margin-bottom: 4px; border-bottom: 1px solid #222; padding-bottom: 2px;`;
    line.innerText = message;

    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
}

function clearStatus() {
    const box = document.getElementById('autopilot-status');
    if (box) {
        box.innerHTML = "<div style='color:#888; margin-bottom:8px; font-weight:bold;'>🤖 SYSTEM ACTIVE LOG (v6.0.3):</div>";
    }
}

function updateUIButton() {
    const btn = document.getElementById('autopilot-btn');
    if (!btn) return;
    if (window.autopilotRunning) {
        btn.innerText = '⏹ STOP Autopilot';
        btn.style.backgroundColor = '#c62828';
    } else {
        btn.innerText = '▶ Start Autopilot (v6.0.3)';
        btn.style.backgroundColor = '#2e7d32';
    }
}

injectControlPanel();

// ===========================================================================
//   Geoforms Timeline & Events Validation Engine
// ===========================================================================

class GeoformsTimelineValidator {
    constructor() {
        this.PORT_EVENTS_WHITELIST = [
            'Idle in Port',
            'Shift to Anchor',
            'Shifting to Anchorage',
            'Shift to Berth',
            'Shifting to Berth',
            'Load - Disch - Idle',
            'Shift from Last Berth to Sea',
            'Shifting from Last Berth to Sea',
            'Drifting or Reduction for safety reason',
            'Canal/Strait Transit',
            'Dry Dock / Shipyard Period',
            'Sea Trials',
            'Discharging',
            'Idle'
        ];

        this.SEA_EVENTS_WHITELIST = [
            'Stoppage for safety reasons',
            'Reduction for safety reasons',
            'Speed UP',
            'Drifting',
            'Navigating in Ice',
            'Navigating to Refuge Port',
            'SAR/Piracy'
        ];

        this._inDryDockState         = false;
        this._prevRowForScenario09   = null;
    }

    validateTimeline(reportContext, eventRows) {
        const result = { isValid: true, errors: [], warnings: [] };

        this._inDryDockState       = false;
        this._prevRowForScenario09 = null;

        if (!eventRows || eventRows.length === 0) {
            result.errors.push('Events table cannot be empty.');
            result.isValid = false;
            return result;
        }

        this.applyAutomations(reportContext, eventRows);

        for (let i = 0; i < eventRows.length; i++) {
            const row     = eventRows[i];
            const prevRow = i > 0 ? eventRows[i - 1] : null;

            this.validateWhitelists(reportContext, row, result);
            this.checkScenario01_TypicalPortCall(row, prevRow, result);
            this.checkScenario02_BerthToAnchor(row, prevRow, result);
            this.checkScenario03_04_10_11_IntermediateRows(row, result);
            this.checkScenario07_CanalTransit(reportContext, row, result);
            this.checkScenario08_AtSeaNoon(reportContext, row, result);
            this.checkScenario09_DriftingOnArrival(row, i, result);
            this.checkScenario10_STS(reportContext, row, result);
            this.checkScenario11_DryDock(row, result);
            this.validateBaseMinitiaeRules(row, result);
        }

        if (result.errors.length > 0) result.isValid = false;
        return result;
    }

    applyAutomations(reportContext, eventRows) {
        if (reportContext.reportType === 'At Sea NOON Report' && !reportContext.isDepartureReport) {
            const hasDriftingOrStoppage = eventRows.some(
                row =>
                    row.eventType === 'Drifting' ||
                    row.eventType === 'Stoppage for safety reasons' ||
                    row.eventType === 'Reduction for safety reasons'
            );
            if (hasDriftingOrStoppage) {
                reportContext.seaSteamingHours = 0;
            }
        }
    }

    validateWhitelists(reportContext, row, result) {
        if (reportContext.reportType === 'At Sea NOON Report') {
            if (reportContext.isDepartureReport) {
                const matchSea  = this.SEA_EVENTS_WHITELIST.some(
                    e => e.toLowerCase() === row.eventType.toLowerCase()
                );
                const matchPort = this.PORT_EVENTS_WHITELIST.some(
                    e => e.toLowerCase() === row.eventType.toLowerCase()
                );
                if (!matchSea && !matchPort) {
                    result.errors.push(
                        `Row [${row.eventType}] is unauthorized in this Departure (mixed port/sea) report context.`
                    );
                }
            } else {
                const match = this.SEA_EVENTS_WHITELIST.some(
                    e => e.toLowerCase() === row.eventType.toLowerCase()
                );
                if (!match) {
                    result.errors.push(
                        `Row [${row.eventType}] is unauthorized inside an 'At Sea' report context.`
                    );
                }
            }
        } else {
            const match = this.PORT_EVENTS_WHITELIST.some(
                e => e.toLowerCase() === row.eventType.toLowerCase()
            );
            if (!match) {
                result.errors.push(
                    `Row [${row.eventType}] is unauthorized inside an 'In Port' or 'Arrival/Departure' context.`
                );
            }
        }
    }

    checkScenario01_TypicalPortCall(row, prevRow, result) {
        if (row.eventType.toLowerCase() === 'load - disch - idle') {
            if (
                !prevRow ||
                (prevRow.eventType.toLowerCase() !== 'shift to berth' &&
                    prevRow.eventType.toLowerCase() !== 'load - disch - idle')
            ) {
                result.errors.push("Cargo operations ('Load - Disch - Idle') must be preceded by a physical 'Shift to Berth' event.");
            }
        }

        if (prevRow && prevRow.eventType.toLowerCase() === 'shift from last berth to sea') {
            if (row.eventType.toLowerCase() === 'load - disch - idle') {
                result.errors.push("Terminal State Violation: Cargo handling is strictly barred following a 'Shift from Last Berth to Sea' event.");
            }
        }
    }

    checkScenario02_BerthToAnchor(row, prevRow, result) {
        if (row.eventType.toLowerCase() === 'shifting to anchorage') {
            if (!prevRow || prevRow.eventType.toLowerCase() !== 'shift from last berth to sea') {
                result.errors.push("A 'Shifting to Anchorage' entry must directly succeed a 'Shift from Last Berth to Sea' entry.");
            }
            if (row.distance !== 0) {
                result.errors.push("Operational Rule #02: 'Shifting to Anchorage' intermediate token row must feature Distance = 0.");
            }
            if (row.meConsumption > 0.01) {
                result.errors.push('Operational Rule #02: ME consumption for anchorage arrival row cannot exceed 0.01 MT.');
            }
        }
    }

    checkScenario03_04_10_11_IntermediateRows(row, result) {
        if (!row.isIntermediateTransitionRow) return;

        if (row.durationMinutes !== 1) {
            result.errors.push('Boundary Error: Intermediate transition row must span exactly 1 minute.');
        }
        if (row.distance !== 0) {
            result.errors.push('Boundary Error: Distance on virtual transition row must be exactly 0.');
        }
        if (row.meConsumption !== 0) {
            result.errors.push('Boundary Error: ME Fuel consumption on boundary row must be exactly 0.00 MT.');
        }
    }

    checkScenario07_CanalTransit(reportContext, row, result) {
        if (row.eventType.toLowerCase() === 'canal/strait transit') {
            row.isExitTerminalState = true;

            if (reportContext.cargoQuantityBeforeTransit !== reportContext.cargoQuantityAfterTransit) {
                result.errors.push('Scenario #07 Integrity Failure: Cargo Figures must match identically before and after execution of Canal/Strait Transit.');
            }
        }
    }

    checkScenario08_AtSeaNoon(reportContext, row, result) {
        if (reportContext.reportType === 'At Sea NOON Report' && !reportContext.isDepartureReport) {
            if (
                row.eventType.toLowerCase() === 'drifting' ||
                row.eventType.toLowerCase() === 'stoppage for safety reasons'
            ) {
                if (reportContext.seaSteamingHours !== 0) {
                    result.errors.push('Scenario #08 Contradiction: Sea Steaming Hours must drop to 0 when active event is Drifting or Stoppage for Safety Reasons.');
                }
            }
        }
    }

    checkScenario09_DriftingOnArrival(row, index, result) {
        if (index === 0 && row.eventType.toLowerCase() === 'drifting') {
            row.requiresImmediateLocationShiftNext = true;
        }

        if (index === 1) {
            const previousRow = this._prevRowForScenario09;
            if (previousRow && previousRow.requiresImmediateLocationShiftNext) {
                const lowEvent = row.eventType.toLowerCase();
                if (
                    lowEvent !== 'shift to anchor' &&
                    lowEvent !== 'shifting to anchorage' &&
                    lowEvent !== 'shift to berth'
                ) {
                    result.errors.push("Scenario #09 Violation: Post-arrival drifting must terminate directly into a 'Shift to Anchor' or 'Shift to Berth' event.");
                }
            }
        }

        this._prevRowForScenario09 = row;
    }

    checkScenario10_STS(reportContext, row, result) {
        if (row.eventType.toLowerCase() === 'load - disch - idle' && reportContext.isSTSOperationZone) {
            if (reportContext.stsOperationsToggle !== 'Yes') {
                result.errors.push("Scenario #10 Cross-Field Error: Global 'STS Operations' field must be toggled to 'Yes' when STS Cargo Ops are registered.");
            }
        }
    }

    checkScenario11_DryDock(row, result) {
        const lowEvent = row.eventType.toLowerCase();
        if (
            lowEvent === 'dry dock / shipyard period' ||
            lowEvent === 'sea trials'
        ) {
            this._inDryDockState = true;
        }

        if (lowEvent === 'shift to berth') {
            this._inDryDockState = false;
        }

        if (this._inDryDockState && lowEvent === 'load - disch - idle') {
            result.errors.push('Scenario #11 Security Block: Cargo operations are barred while vessel status reflects Dry Dock or Sea Trials.');
        }
    }

    validateBaseMinitiaeRules(row, result) {
        if (row.durationMinutes > 6) {
            if (row.meConsumption <= 0) {
                result.warnings.push(`Row [${row.eventType}] exceeds 6 mins duration. Verifier profile requires minimum consumption declaration (e.g. 0.01 MT).`);
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeoformsTimelineValidator;
}

})();
