// =========================================================================
//   MARITIME REPORT AUTOPILOT — P.v.1.0.0  (Performance Team Edition)
//   Base: v6.1.8 (Emissions Team)
//
//   NEW IN P.v.1.0.0 — At Sea Performance Validations (apply only when
//   vessel status is "At Sea"; all four checks are skipped for In Port
//   and Arrival/Departure records):
//
//   PERF-1 — CP / Ordered Speed vs Reported Speed tolerance check.
//     Reported Speed must be within ±0.5 knots of CP / Ordered Speed.
//     Records outside the allowed range are flagged and blocked.
//
//   PERF-2 — Average KW minimum digit check.
//     Average KW must be ≥ 1000 (at least 4 digits).
//     Records with a value below 1000 are flagged.
//
//   PERF-3 — Main Engine KWhrs digit check.
//     Main Engine KWhrs must be ≥ 10000 (5 or 6 digits).
//     Records with a value below 10000 are flagged.
//
//   PERF-4 — Engine Distance non-zero check.
//     Engine Distance (nm) must not be 0.
//     Any record where Engine Distance equals 0 is flagged and blocked.
//
//   All PERF validations use the same error highlighting as v6.1.8
//   (red border + red background on the offending input field).
//
//   Inherited from v6.1.8:
//   CHANGE I — Smarter duplicate handling.
//   CHANGE J — Strict sequential navigation; no more skipping.
//   CHANGE H — Approved DRIFTING for In Port / Arrival / Departure contexts.
//   CHANGE G — Removed cross-report ROB continuity/reconciliation checks.
//   FIX F — ROB End capture in scrapeBunkerSnapshot().
//   FIX C — Validation no longer navigates while running.
//   FIX D — Approve-popup Yes button retry/waitForDOMStable resilience.
//   FIX E — ensureOnCurrentReport() guard before approval.
//   FIX A — Approve button never clicks.
//   FIX B — ROB End kept distinct from ROB Start.
//
//   Inherited from v6.1.6:
//   CHANGE H — Approved DRIFTING for In Port / Arrival / Departure contexts.
//   CHANGE G — Removed cross-report ROB continuity/reconciliation checks.
//   FIX F — ROB End capture in scrapeBunkerSnapshot().
//   FIX C — Validation no longer navigates while running.
//   FIX D — Approve-popup Yes button retry/waitForDOMStable resilience.
//   FIX E — ensureOnCurrentReport() guard before approval.
//   FIX A — Approve button never clicks (p-confirm-popup-accept /
//            aria-label="Yes" selectors).
//   FIX B — ROB End is kept distinct from ROB Start in scrapeBunkerSnapshot.
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
    SLEEP_POST_DIALOG_MS: 800,
    DOM_STABLE_HEADSTART_MS: 400,
    SLEEP_POST_NAVIGATE_MS: 3500,
    SLEEP_INIT_MS: 500,
    DOM_STABLE_TIMEOUT_MS: 3000,
    DOM_STABLE_DEBOUNCE_MS: 200,
    YES_BTN_RETRY_COUNT: 3,
    YES_BTN_RETRY_DELAY_MS: 300,

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
        'LOADING',
        'DRIFTING',
        'IDLE'
    ]
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FIELD_STYLES = {
    ERROR_HEX_FULL:     'border: 3px solid #f44336 !important; background-color: #ffebee !important;',
    ERROR_KEYWORD_FULL:  'border: 3px solid red !important; background-color: #ffebee !important;',
    SUCCESS_FULL:        'border: 1px solid green !important; background-color: #e8f5e9 !important;',
    SUCCESS_NOBG:        'border: 1px solid green !important;',
    ERROR_BORDER_ONLY:   '3px solid #f44336',
    SUCCESS_BORDER_ONLY: '1px solid green'
};

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
        } catch { /* cross-origin */ }
    }
    return contexts;
}

function queryAllContexts(selector) {
    let elements = [];
    for (const ctx of getAllContexts()) {
        try {
            if (ctx) elements = elements.concat(Array.from(ctx.querySelectorAll(selector)));
        } catch { /* skip */ }
    }
    return elements;
}

function getAllVisibleText() {
    let text = '';
    for (const ctx of getAllContexts()) {
        if (ctx && ctx.body) text += ctx.body.innerText || '';
    }
    return text;
}

function getMainContentText() {
    const mainSelectors = [
        '.form-viewer', '.report-form', '.p-panel-content',
        'main', '[role="main"]', '.content-area', '#main-content',
        '.p-component:not([class*="sidebar"]):not([class*="card-list"])'
    ];
    for (const sel of mainSelectors) {
        const el = document.querySelector(sel);
        if (el) return el.innerText || '';
    }
    return getAllVisibleText();
}

function scrollToIssueElement(el, message = 'Scrolled to the field that needs review.') {
    if (!el || typeof el.scrollIntoView !== 'function') return false;

    try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

        const originalOutline = el.style.outline;
        const originalBoxShadow = el.style.boxShadow;
        el.style.outline = '4px solid #ff9800';
        el.style.boxShadow = '0 0 0 4px rgba(255, 152, 0, 0.25)';

        setTimeout(() => {
            el.style.outline = originalOutline;
            el.style.boxShadow = originalBoxShadow;
        }, 3500);

        setStatus(`📍 ${message}`, 'warning');
        return true;
    } catch {
        return false;
    }
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
            } catch { /* skip */ }
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

function isRejectedCard(card) {
    if (!card) return false;
    const style = window.getComputedStyle(card);

    // ── Layer 1: background colour
    //    Threshold lowered to 20 — light-pink rejected cards
    //    (e.g. Bootstrap danger-subtle rgb(248,215,218), PrimeNG rose-tint)
    //    have r−g as low as 25–33, well below the old threshold of 40.
    const bgRgb = parseRgb(style.backgroundColor);
    if (bgRgb) {
        const { r, g, b } = bgRgb;
        if ((r - g) > 20 && (r - b) > 20 && r > 160) return true;
    }

    // ── Layer 2: border colour (some designs only apply a red border)
    const brRgb = parseRgb(style.borderColor) || parseRgb(style.borderLeftColor);
    if (brRgb) {
        const { r, g, b } = brRgb;
        if ((r - g) > 40 && (r - b) > 40 && r > 150) return true;
    }

    // ── Layer 3: text badge — look for a "Rejected" status label inside card
    const hasRejectedBadge = Array.from(
        card.querySelectorAll('.p-tag, .p-badge, [class*="status"], [class*="badge"], span, div')
    ).some(el => (el.innerText || '').trim().toLowerCase() === 'rejected');
    if (hasRejectedBadge) return true;

    return false;
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
            return { currentSig, matchedSig: sig, matchedCard: card };
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
        reportType,
        isDepartureReport,
        seaSteamingHours,
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
                distance,
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
                selectEl.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
            } else {
                selectEl.style.cssText = FIELD_STYLES.SUCCESS_NOBG;
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
        return (t.includes('BUNKER') && t.includes('ROB')) || t.includes('BUNKERS ROB') || t === 'BUNKER';
    }

    function isVisibleElement(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function hasBunkerRobColumns(el) {
        const text = (el.innerText || el.textContent || '').toUpperCase().replace(/\s+/g, ' ');
        return text.includes('LAST ROB') && text.includes('ROB START');
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

    for (const ctx of getAllContexts()) {
        if (!ctx) continue;

        const tables = Array.from(ctx.querySelectorAll('table, .p-datatable-table, [role="table"], [role="grid"]'));
        for (const table of tables) {
            if (isVisibleElement(table) && hasBunkerRobColumns(table)) {
                return table;
            }
        }

        const inputs = Array.from(ctx.querySelectorAll('input')).filter(inp => {
            if (inp.type === 'hidden' || !isVisibleElement(inp)) return false;
            const row = inp.closest('tr, [role="row"], .p-datatable-row');
            return row && (row.innerText || '').trim();
        });

        for (const inp of inputs) {
            const container = inp.closest('table, .p-datatable, [role="table"], [role="grid"], fieldset, section, .card, .p-panel, div');
            if (container && isVisibleElement(container) && hasBunkerRobColumns(container)) {
                return container;
            }
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
            if (inp.type === 'hidden') return false;
            const style = window.getComputedStyle(inp);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
        const dataCells = Array.from(row.querySelectorAll('td[data-td-name]'));
        return inputs.length >= 1 || dataCells.length >= 2;
    });
}

// ---------------------------------------------------------------------------
//   VESSEL TIMELINE HELPERS
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

function findOneReportBackCard(currentSig, sidebarCards, currentCard) {
    const { previousCard } = findAdjacentVesselReports(currentSig, sidebarCards, currentCard);
    if (previousCard) return previousCard;

    const currentIndex = sidebarCards.indexOf(currentCard);
    if (currentIndex >= 0 && currentIndex + 1 < sidebarCards.length) {
        return sidebarCards[currentIndex + 1];
    }

    return null;
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
//   BUNKER SNAPSHOT SCRAPER  (captures ROB End in addition to
//   Last ROB / ROB Start / ADJ. PASS 2d positional fix retained from v6.1.2.)
// ---------------------------------------------------------------------------

function scrapeBunkerSnapshot() {
    const bunkerContainer = locateTrueBunkerContainer();
    const bunkerRows = locateBunkerRows();
    const snapshot = [];

    const LAST_ROB_KEYS  = ['last rob', 'prev rob', 'previous rob', 'rob (previous)', 'rob prev'];
    const ROB_START_KEYS = ['rob start', 'start rob', 'opening rob', 'rob (start)', 'rob(start)'];
    const ROB_END_KEYS   = ['rob end', 'end rob', 'closing rob', 'rob (end)', 'rob(end)', 'rob end balance'];
    const ADJ_KEYS       = ['adj', 'adjustment'];

    let lastRobCol  = -1;
    let robStartCol = -1;
    let robEndCol   = -1;
    let adjCol      = -1;

    if (bunkerContainer) {
        const thCells = Array.from(bunkerContainer.querySelectorAll('th'));
        if (thCells.length >= 2) {
            thCells.forEach((th, colIdx) => {
                const txt = (th.innerText || '').toLowerCase().replace(/\s+/g, ' ').trim();
                if (lastRobCol  < 0 && LAST_ROB_KEYS.some(k  => txt.includes(k)))  lastRobCol  = colIdx;
                if (robStartCol < 0 && ROB_START_KEYS.some(k => txt.includes(k))) robStartCol = colIdx;
                if (robEndCol   < 0 && ROB_END_KEYS.some(k   => txt.includes(k)))   robEndCol  = colIdx;
                if (adjCol      < 0 && ADJ_KEYS.some(k        => txt.includes(k)))      adjCol  = colIdx;
            });
        }
    }

    function numVal(el) {
        if (!el) return null;
        let raw;
        if (el.tagName === 'INPUT') {
            raw = el.value;
        } else {
            raw = (el.innerText || el.textContent || '').replace(/,/g, '');
            const match = raw.match(/-?\d+(?:\.\d+)?/);
            return match ? parseFloat(match[0]) : null;
        }
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

        let lastRobInput  = null;
        let robStartInput = null;
        let robEndInput   = null;
        let adjInput      = null;
        let adjStaticVal  = 0;
        let hasAdjColumn  = false;
        let adjElementToHighlight = null;

        // ---- PASS 2a: data-td-name attributes ----
        cells.forEach(cell => {
            const tdName = (cell.getAttribute('data-td-name') || '').toLowerCase().replace(/[_\-\s]/g, '');
            const inp    = cell.querySelector('input');

            const isLastRobByAttr  = ['lastremaining', 'lastrob', 'previousrob', 'prevrob'].includes(tdName);
            const isRobStartByAttr = ['robstart', 'startingrob', 'openrob', 'robopeningbalance'].includes(tdName);
            const isRobEndByAttr   = ['robend', 'endrob', 'closingrob', 'closingbalance'].includes(tdName);
            const isAdjByAttr      = ['adj', 'adjustment'].includes(tdName);

            if (isRobEndByAttr) {
                // Capture ROB End instead of discarding it. It must
                // never be mistaken FOR Last ROB / ROB Start (that's still
                // enforced below), but keeping it distinct avoids column mixups.
                if (!robEndInput) robEndInput = inp || cell;
                return;
            }

            if (!lastRobInput  && isLastRobByAttr)  lastRobInput  = inp || cell;
            if (!robStartInput && isRobStartByAttr) robStartInput = inp || cell;
            if (!hasAdjColumn  && isAdjByAttr) {
                hasAdjColumn = true;
                if (inp) { adjInput = inp; adjElementToHighlight = inp; }
                else { adjStaticVal = numVal(cell) || 0; adjElementToHighlight = cell; }
            }
        });

        // ---- PASS 2b: header-index map ----
        if (!lastRobInput && lastRobCol >= 0 && cells[lastRobCol]) {
            lastRobInput = cells[lastRobCol].querySelector('input') || cells[lastRobCol];
        }
        if (!robStartInput && robStartCol >= 0 && cells[robStartCol] && robStartCol !== robEndCol) {
            robStartInput = cells[robStartCol].querySelector('input') || cells[robStartCol];
        }
        if (!robEndInput && robEndCol >= 0 && cells[robEndCol]) {
            robEndInput = cells[robEndCol].querySelector('input') || cells[robEndCol];
        }
        if (!hasAdjColumn && adjCol >= 0 && cells[adjCol]) {
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

        // ---- PASS 2c: per-cell text / id / name scan ----
        if (!lastRobInput || !robStartInput || !robEndInput) {
            cells.forEach((cell, ci) => {
                const tdName = (cell.getAttribute('data-td-name') || '').toLowerCase().replace(/[_\-\s]/g, '');
                const isRobEndAttr = ['robend', 'endrob', 'closingrob', 'closingbalance'].includes(tdName);

                const titleEl  = cell.querySelector('.p-column-title');
                const cellTxt  = (titleEl ? titleEl.innerText : cell.getAttribute('data-label') || '').toLowerCase().trim();
                const isRobEndTxt = ROB_END_KEYS.some(k => cellTxt.includes(k));

                if ((robEndCol >= 0 && ci === robEndCol) || isRobEndAttr || isRobEndTxt) {
                    if (!robEndInput) robEndInput = cell.querySelector('input') || cell;
                    return;
                }

                const inp      = cell.querySelector('input');
                const inpId    = inp ? (inp.id   || '').toLowerCase() : '';
                const inpName  = inp ? (inp.name || '').toLowerCase() : '';

                const isLastRob  = LAST_ROB_KEYS.some(k  => cellTxt.includes(k) || inpId.includes(k.replace(/ /g,'')) || inpName.includes(k.replace(/ /g,'')))
                                || inpId.includes('lastrob') || inpName.includes('last_rob');
                const isRobStart = ROB_START_KEYS.some(k => cellTxt.includes(k) || inpId.includes(k.replace(/ /g,'')) || inpName.includes(k.replace(/ /g,'')))
                                || inpId.includes('robstart') || inpName.includes('rob_start');
                const isAdj      = ADJ_KEYS.some(k => cellTxt.includes(k) || inpId.includes(k) || inpName.includes(k));

                if (!lastRobInput  && isLastRob)  lastRobInput  = inp || cell;
                if (!robStartInput && isRobStart) robStartInput = inp || cell;
                if (!hasAdjColumn  && isAdj) {
                    hasAdjColumn = true;
                    if (inp) { adjInput = inp; adjElementToHighlight = inp; }
                    else { adjStaticVal = numVal(cell) || 0; adjElementToHighlight = cell; }
                }
            });
        }

        // ---- PASS 2d: positional fallback (v6.1.2 column-order-preserving fix) ----
        if (!lastRobInput || !robStartInput) {
            const ROB_END_ATTR_SET = new Set(['robend', 'endrob', 'closingrob', 'closingbalance']);
            const candidateInputs = [];

            cells.forEach((cell, ci) => {
                if (ci === 0) return;

                const tdAttr = (cell.getAttribute('data-td-name') || '').toLowerCase().replace(/[_\-\s]/g, '');
                const titleEl   = cell.querySelector('.p-column-title');
                const cellLabel = (titleEl ? titleEl.innerText : cell.getAttribute('data-label') || '').toLowerCase().trim();
                const isRobEndCell = (robEndCol >= 0 && ci === robEndCol)
                                   || ROB_END_ATTR_SET.has(tdAttr)
                                   || ROB_END_KEYS.some(k => cellLabel.includes(k));

                if (isRobEndCell) {
                    // Capture as ROB End fallback rather than just skipping.
                    if (!robEndInput) {
                        const robEndInp = cell.querySelector('input');
                        robEndInput = robEndInp || cell;
                    }
                    return;
                }

                const inp = Array.from(cell.querySelectorAll('input')).find(i => {
                    if (i.type === 'hidden') return false;
                    const s = window.getComputedStyle(i);
                    return s.display !== 'none' && s.visibility !== 'hidden';
                });

                if (inp) {
                    candidateInputs.push(inp);
                } else {
                    const titleEl2  = cell.querySelector('.p-column-title');
                    const rawText   = (cell.innerText || '').replace(/,/g, '').trim();
                    const valueText = titleEl2
                        ? rawText.replace((titleEl2.innerText || '').trim(), '').trim()
                        : rawText;
                    if (/^-?\d+(?:\.\d+)?$/.test(valueText)) {
                        candidateInputs.push(cell);
                    }
                }
            });

            if (!lastRobInput  && candidateInputs[0]) lastRobInput  = candidateInputs[0];
            if (!robStartInput && candidateInputs[1]) robStartInput = candidateInputs[1];
            if (!hasAdjColumn  && candidateInputs[2]) {
                hasAdjColumn = true;
                const candidate = candidateInputs[2];
                if (candidate.tagName === 'INPUT') {
                    adjInput = candidate;
                    adjElementToHighlight = candidate;
                } else {
                    adjStaticVal = numVal(candidate) || 0;
                    adjElementToHighlight = candidate;
                }
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
        const robEndVal   = numVal(robEndInput);

        snapshot.push({
            fuelTypeLabel,
            displayLabel,
            rowIndex: index,
            lastRobInput,
            robStartInput,
            robEndInput,
            adjInput,
            adjElementToHighlight,
            hasAdjColumn,
            lastRob:  lastRobVal,
            robStart: robStartVal,
            robEnd:   robEndVal,
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

function findActionButton(label, { matchVisibleText = false } = {}) {
    const lowerLabel = label.toLowerCase();

    const exact = queryAllContexts(
        `button[label="${label}"], [appconfirmation][label="${label}"], .p-button[label="${label}"]`
    )[0];
    if (exact) return exact;

    return queryAllContexts('button, .p-button, [role="button"]').find(el => {
        const elLabel = (el.getAttribute('label') || '').toLowerCase();
        const elText  = matchVisibleText ? (el.innerText || el.textContent || '').trim().toLowerCase() : '';
        return elLabel === lowerLabel || elLabel.includes(lowerLabel) || (matchVisibleText && elText === lowerLabel);
    }) || null;
}

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
            'Loading',
            'Drifting',
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

    normalizeEventName(eventName) {
        return (eventName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    eventMatches(list, eventName) {
        const normalized = this.normalizeEventName(eventName);
        return list.some(e => this.normalizeEventName(e) === normalized);
    }

    validateWhitelists(reportContext, row, result) {
        const normalizedEvent = this.normalizeEventName(row.eventType);

        if (reportContext.reportType === 'At Sea NOON Report') {
            if (reportContext.isDepartureReport) {
                const matchSea  = this.eventMatches(this.SEA_EVENTS_WHITELIST, row.eventType);
                const matchPort = this.eventMatches(this.PORT_EVENTS_WHITELIST, row.eventType);
                if (!matchSea && !matchPort) {
                    result.errors.push(`Row [${row.eventType}] is unauthorized in this Departure (mixed port/sea) report context.`);
                }
            } else {
                const match = this.eventMatches(this.SEA_EVENTS_WHITELIST, row.eventType);
                if (!match) {
                    result.errors.push(`Row [${row.eventType}] is unauthorized inside an 'At Sea' report context.`);
                }
            }
        } else {
            const match = this.eventMatches(this.PORT_EVENTS_WHITELIST, row.eventType)
                || normalizedEvent === 'drifting';
            if (!match) {
                result.errors.push(`Row [${row.eventType}] is unauthorized inside an 'In Port' or 'Arrival/Departure' context.`);
            }
        }
    }

    checkScenario01_TypicalPortCall(row, prevRow, result) {
        if (row.eventType.toLowerCase() === 'load - disch - idle') {
            if (!prevRow || (prevRow.eventType.toLowerCase() !== 'shift to berth' && prevRow.eventType.toLowerCase() !== 'load - disch - idle')) {
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
            if (row.meConsumption > 0.01) {
                result.errors.push('Operational Rule #02: ME consumption for anchorage arrival row cannot exceed 0.01 MT.');
            }
        }
    }

    checkScenario03_04_10_11_IntermediateRows(row, result) {
        if (!row.isIntermediateTransitionRow) return;
        if (row.durationMinutes !== 1)  result.errors.push('Boundary Error: Intermediate transition row must span exactly 1 minute.');
        if (row.distance !== 0)         result.errors.push('Boundary Error: Distance on virtual transition row must be exactly 0.');
        if (row.meConsumption !== 0)    result.errors.push('Boundary Error: ME Fuel consumption on boundary row must be exactly 0.00 MT.');
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
            if (row.eventType.toLowerCase() === 'drifting' || row.eventType.toLowerCase() === 'stoppage for safety reasons') {
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
                if (lowEvent !== 'shift to anchor' && lowEvent !== 'shifting to anchorage' && lowEvent !== 'shift to berth') {
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
        if (lowEvent === 'dry dock / shipyard period' || lowEvent === 'sea trials') {
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
        if (row.durationMinutes > 6 && row.meConsumption <= 0) {
            result.warnings.push(`Row [${row.eventType}] exceeds 6 mins duration. Verifier profile requires minimum consumption declaration (e.g. 0.01 MT).`);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeoformsTimelineValidator;
}

// ---------------------------------------------------------------------------
//   CAPTURE CURRENT REPORT CONTEXT
//
//   All navigation to adjacent report cards happens HERE, before any
//   validation logic runs.  validateCurrentReport() receives the already-
//   scraped snapshots as parameters and never navigates itself.
//
//   Returns: { futureBunkerSnapshot, previousBunkerSnapshot,
//              hasFutureCard, hasPreviousCard,
//              currentSig, sidebarCards, currentCard }
// ---------------------------------------------------------------------------

async function gatherCrossReportBunkerData() {
    const sidebarCards = getAllReportCards();
    const currentCard  = identifyCurrentCard(sidebarCards);
    const currentSig   = currentCard ? extractCardSignature(currentCard) : null;

    const base = {
        futureBunkerSnapshot:   [],
        previousBunkerSnapshot: [],
        hasFutureCard:  false,
        hasPreviousCard: false,
        currentSig,
        sidebarCards,
        currentCard
    };

    setStatus('Current report context captured. Skipping adjacent-report bunker checks.', 'info');
    return base;
}

// ---------------------------------------------------------------------------
//   NAVIGATE BACK TO A KNOWN REPORT  (robust, multi-strategy)
// ---------------------------------------------------------------------------

async function navigateBackToReport(targetSig, fallbackCard) {
    // Strategy 1: find card by signature match in a freshly queried list
    const freshCards = getAllReportCards();
    const matchedCard = freshCards.find(c => signaturesMatch(extractCardSignature(c), targetSig));

    const clickTarget = matchedCard || fallbackCard;
    if (clickTarget) {
        clickTarget.click();
        await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);
        await waitForDOMStable();
    }

    // Verification pass — confirm we are now on the expected report
    const verifyCards   = getAllReportCards();
    const activeCard    = identifyCurrentCard(verifyCards);
    const activeSig     = activeCard ? extractCardSignature(activeCard) : null;

    if (activeSig && signaturesMatch(activeSig, targetSig)) {
        return true; // confirmed
    }

    // Strategy 2: second attempt with a broader search
    const retryCard = verifyCards.find(c => signaturesMatch(extractCardSignature(c), targetSig));
    if (retryCard) {
        setStatus('⚠️ Return-navigation: signature mismatch on first attempt — retrying...', 'warning');
        retryCard.click();
        await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);
        await waitForDOMStable();
        return true;
    }

    setStatus('⚠️ Return-navigation: could not confirm current report by signature — proceeding on best-effort.', 'warning');
    return false;
}

// ---------------------------------------------------------------------------
//   ENSURE ON CURRENT REPORT (guard called before approval)
// ---------------------------------------------------------------------------

async function ensureOnCurrentReport(currentSig, fallbackCard) {
    const freshCards = getAllReportCards();
    const activeCard = identifyCurrentCard(freshCards);
    const activeSig  = activeCard ? extractCardSignature(activeCard) : null;

    if (activeSig && signaturesMatch(activeSig, currentSig)) {
        return true; // already on the right report
    }

    setStatus('⚠️ Pre-approval guard: UI is not on the expected report — navigating back...', 'warning');
    return navigateBackToReport(currentSig, fallbackCard);
}

// ---------------------------------------------------------------------------
//   PERFORMANCE TEAM — AT SEA VALIDATIONS  (P.v.1.0.0)
//
//   All four checks run ONLY when the vessel status is "At Sea".
//   For In Port and Arrival/Departure records this function returns
//   { isValid: true } immediately without reading any fields.
//
//   Returns { isValid: boolean, errors: string[] }
// ---------------------------------------------------------------------------

function validatePerformanceAtSea() {
    const result = { isValid: true, errors: [] };

    // ── Guard: only run for At Sea reports ─────────────────────────────────
    const ctx = extractReportContext();
    if (ctx.reportType !== 'At Sea NOON Report') {
        setStatus('ℹ️ Performance checks: skipped (not an At Sea record).', 'info');
        return result;
    }

    setStatus('⚙️ Running Performance Team At-Sea Validations (PERF-1 → PERF-4)...', 'info');

    // Helper: find an input by matching label text in any context
    function findInputByLabel(labelFragments) {
        for (const docCtx of getAllContexts()) {
            if (!docCtx) continue;
            const labels = Array.from(docCtx.querySelectorAll('label, span, div, th, td'));
            for (const lbl of labels) {
                const txt = (lbl.innerText || '').trim().toLowerCase();
                if (labelFragments.some(frag => txt.includes(frag))) {
                    // Try sibling/parent/nearby input
                    const parent = lbl.parentElement;
                    if (parent) {
                        const inp = parent.querySelector('input');
                        if (inp) return inp;
                        // Try next sibling element
                        const sib = lbl.nextElementSibling;
                        if (sib) {
                            const sibInp = sib.tagName === 'INPUT' ? sib : sib.querySelector('input');
                            if (sibInp) return sibInp;
                        }
                    }
                    // Try the closest container
                    const container = lbl.closest('.p-field, .field-group, tr, .form-row, fieldset, .form-container');
                    if (container) {
                        const inp = container.querySelector('input');
                        if (inp) return inp;
                    }
                }
            }
            // data-field-name attribute approach
            for (const frag of labelFragments) {
                const byAttr = docCtx.querySelector(
                    `[data-field-name*="${frag.replace(/ /g, '')}" i] input, ` +
                    `[data-field-label*="${frag}" i] input`
                );
                if (byAttr) return byAttr;
            }
        }
        return null;
    }

    // Helper: find input by data-field-name or id/name attribute fragments
    function findInputByAttr(attrFragments) {
        for (const docCtx of getAllContexts()) {
            if (!docCtx) continue;
            for (const frag of attrFragments) {
                const el = docCtx.querySelector(
                    `input[id*="${frag}" i], input[name*="${frag}" i], ` +
                    `[data-field-name*="${frag}" i] input`
                );
                if (el) return el;
            }
        }
        return null;
    }

    // ── PERF-1: CP / Ordered Speed vs Reported Speed (±0.5 knot tolerance) ──
    setStatus('PERF-1: Checking CP / Ordered Speed vs Reported Speed...', 'info');
    const cpSpeedInput = findInputByAttr(['cpspeed', 'orderedspeed', 'cp_speed', 'cp/speed'])
        || findInputByLabel(['cp / ordered speed', 'cp/ordered speed', 'ordered speed (knots)', 'cp speed']);
    const reportedSpeedInput = findInputByAttr(['reportedspeed', 'repspeed', 'reported_speed'])
        || findInputByLabel(['reported speed', 'repspeed']);

    if (cpSpeedInput && reportedSpeedInput) {
        const cpSpeed       = parseFloat(cpSpeedInput.value);
        const reportedSpeed = parseFloat(reportedSpeedInput.value);

        if (!isNaN(cpSpeed) && !isNaN(reportedSpeed)) {
            const diff = Math.abs(reportedSpeed - cpSpeed);
            const minAllowed = cpSpeed;
            const maxAllowed = cpSpeed + 0.5;

            if (reportedSpeed < minAllowed || reportedSpeed > maxAllowed) {
                const msg = `PERF-1 Speed Deviation: CP / Ordered Speed = ${cpSpeed} kn, Reported Speed = ${reportedSpeed} kn — allowed range is ${minAllowed.toFixed(2)}–${maxAllowed.toFixed(2)} kn (±0.5).`;
                result.errors.push(msg);
                result.isValid = false;
                cpSpeedInput.style.cssText       = FIELD_STYLES.ERROR_HEX_FULL;
                reportedSpeedInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                scrollToIssueElement(reportedSpeedInput, 'Reported Speed is outside the ±0.5 tolerance of CP / Ordered Speed.');
                setStatus(`❌ PERF-1 FAIL: Reported Speed (${reportedSpeed}) is outside [${minAllowed.toFixed(2)}–${maxAllowed.toFixed(2)}] for CP Speed ${cpSpeed}.`, 'error');
            } else {
                cpSpeedInput.style.cssText       = FIELD_STYLES.SUCCESS_FULL;
                reportedSpeedInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                setStatus(`✅ PERF-1 PASS: Reported Speed (${reportedSpeed}) within tolerance of CP Speed (${cpSpeed}).`, 'success');
            }
        } else {
            setStatus('⚠️ PERF-1: Could not parse CP Speed or Reported Speed — skipping tolerance check.', 'warning');
        }
    } else {
        setStatus('⚠️ PERF-1: CP / Ordered Speed or Reported Speed field not found on this form layout.', 'warning');
    }

    // ── PERF-2: Average KW — must have at least 4 digits (≥ 1000) ────────────
    setStatus('PERF-2: Checking Average KW digit count (must be ≥ 1000)...', 'info');
    const avgKwInput = findInputByAttr(['averagekw', 'avg_kw', 'avgkw', 'averagekwh'])
        || findInputByLabel(['average kw', 'avg kw', 'avg. kw']);

    if (avgKwInput) {
        const avgKw = parseFloat(avgKwInput.value);
        if (!isNaN(avgKw)) {
            if (avgKw < 1000) {
                const msg = `PERF-2 Average KW: Value ${avgKw} has fewer than 4 digits — minimum required is 1000.`;
                result.errors.push(msg);
                result.isValid = false;
                avgKwInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                scrollToIssueElement(avgKwInput, 'Average KW must be at least 4 digits (≥ 1000).');
                setStatus(`❌ PERF-2 FAIL: Average KW = ${avgKw} — must be ≥ 1000 (4+ digits).`, 'error');
            } else {
                avgKwInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                setStatus(`✅ PERF-2 PASS: Average KW = ${avgKw} (4+ digits).`, 'success');
            }
        } else {
            setStatus('⚠️ PERF-2: Average KW field is empty or non-numeric — skipping.', 'warning');
        }
    } else {
        setStatus('⚠️ PERF-2: Average KW field not found on this form layout.', 'warning');
    }

    // ── PERF-3: Main Engine KWhrs — must be ≥ 10000 (5 or 6 digits) ─────────
    setStatus('PERF-3: Checking Main Engine KWhrs digit count (must be ≥ 10000)...', 'info');
    const meKwhrsInput = findInputByAttr(['mekwhrs', 'me_kwhrs', 'mekwh', 'enginekwhrs', 'mainengine_kwh'])
        || findInputByLabel(['main engine kwhrs', 'me kwhrs', 'main engine kwh', 'me kwh']);

    if (meKwhrsInput) {
        const meKwhrs = parseFloat(meKwhrsInput.value);
        if (!isNaN(meKwhrs)) {
            if (meKwhrs < 10000) {
                const msg = `PERF-3 Main Engine KWhrs: Value ${meKwhrs} has 4 or fewer digits — must be ≥ 10000 (5–6 digits).`;
                result.errors.push(msg);
                result.isValid = false;
                meKwhrsInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                scrollToIssueElement(meKwhrsInput, 'Main Engine KWhrs must be at least 5 digits (≥ 10000).');
                setStatus(`❌ PERF-3 FAIL: ME KWhrs = ${meKwhrs} — must be ≥ 10000 (5+ digits).`, 'error');
            } else {
                meKwhrsInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                setStatus(`✅ PERF-3 PASS: ME KWhrs = ${meKwhrs} (5+ digits).`, 'success');
            }
        } else {
            setStatus('⚠️ PERF-3: Main Engine KWhrs field is empty or non-numeric — skipping.', 'warning');
        }
    } else {
        setStatus('⚠️ PERF-3: Main Engine KWhrs field not found on this form layout.', 'warning');
    }

    // ── PERF-4: Engine Distance (nm) must not be 0 ───────────────────────────
    setStatus('PERF-4: Checking Engine Distance (nm) is non-zero...', 'info');
    const engineDistInput = findInputByAttr(['enginedistance', 'engine_dist', 'engdist', 'enginedist'])
        || findInputByLabel(['engine distance (nm)', 'engine distance', 'eng. distance']);

    if (engineDistInput) {
        const engineDist = parseFloat(engineDistInput.value);
        if (!isNaN(engineDist)) {
            if (engineDist === 0) {
                const msg = `PERF-4 Engine Distance: Value is 0 — Engine Distance (nm) cannot be zero for an At Sea record.`;
                result.errors.push(msg);
                result.isValid = false;
                engineDistInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                scrollToIssueElement(engineDistInput, 'Engine Distance (nm) cannot be 0 for an At Sea record.');
                setStatus(`❌ PERF-4 FAIL: Engine Distance = 0 — must be non-zero for At Sea reports.`, 'error');
            } else {
                engineDistInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                setStatus(`✅ PERF-4 PASS: Engine Distance = ${engineDist} nm (non-zero).`, 'success');
            }
        } else {
            setStatus('⚠️ PERF-4: Engine Distance field is empty or non-numeric — skipping.', 'warning');
        }
    } else {
        setStatus('⚠️ PERF-4: Engine Distance field not found on this form layout.', 'warning');
    }

    return result;
}

// ---------------------------------------------------------------------------
//   CORE VALIDATION RUNNER  (no navigation inside this function)
//
//   Current report card context is supplied via the `crossReportData`
//   parameter captured by gatherCrossReportBunkerData().
//   This function NEVER clicks a sidebar card or navigates.
// ---------------------------------------------------------------------------

async function validateCurrentReport(crossReportData) {
    clearStatus();
    setStatus('Initiating Smart Sandbox Scan (P.v.1.0.0)...', 'info');
    await sleep(CONFIG.SLEEP_INIT_MS);

    if (isCurrentReportAlreadyApproved()) {
        setStatus('⚠️ Current report is already approved. Skipping validation and moving ahead.', 'warning');
        return true;
    }

    let isValid = true;
    const errors = [];

    // ── 1. DUPLICATE TIMESTAMP SCAN ─────────────────────────────────────────
    setStatus('Scanning timeline matrix for concurrent duplicates...', 'info');
    const duplicateMatch = checkIsDuplicateReport();
    if (duplicateMatch) {
        const { currentSig, matchedSig, matchedCard } = duplicateMatch;

        if (isRejectedCard(matchedCard)) {
            // The matched report is already rejected (red) — safe to approve this one
            setStatus('ℹ️ Duplicate detected but matched report is already REJECTED — ignoring duplicate flag and continuing validation.', 'info');
            setStatus(`   Current report: ${describeSignature(currentSig)}`, 'info');
            setStatus(`   Matched (already rejected): ${describeSignature(matchedSig)}`, 'info');
        } else {
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
        }
    } else {
        setStatus('✅ Duplicate Scan: No matching duplicate found in the report list.', 'success');
    }

    // ── 2. PORT EVENTS BLOCK CHECK ───────────────────────────────────────────
    setStatus('Analyzing active operational event parameters...', 'info');
    const eventCheck = validatePortEvents();

    if (eventCheck.status === 'INVALID') {
        isValid = false;
        setStatus(`🛑 LOCKOUT: Unapproved event scenario detected [${eventCheck.event}]. Halted.`, 'error');
        return false;
    } else if (eventCheck.status === 'VALID_PORT') {
        setStatus('✅ Operational Scenario: Approved Port Event layout and sequence rules confirmed.', 'success');
    } else {
        setStatus('✅ Operational Scenario: Approved At Sea state profile confirmed.', 'success');
    }

    // ── 3. STEAMING HOURS VALIDATION ─────────────────────────────────────────
    const earlyContext = extractReportContext();
    const steamingHoursInput = findSteamingHoursInput();
    if (steamingHoursInput && steamingHoursInput.value.trim() !== '') {
        const hours = parseFloat(steamingHoursInput.value);

        if (isNaN(hours)) {
            errors.push(`Steaming hours (${hours}) is not a valid number.`);
            steamingHoursInput.style.border = FIELD_STYLES.ERROR_BORDER_ONLY;
            scrollToIssueElement(steamingHoursInput, 'Steaming Hours value is not a valid number.');
            isValid = false;
            setStatus(`❌ Steaming hrs failed numeric check: ${hours}`, 'error');
        } else if (earlyContext.reportType === 'In Port Report') {
            if (hours < 0 || hours > 25) {
                errors.push(`Steaming hours (${hours}) outside allowed in-port range [0–25].`);
                steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                scrollToIssueElement(steamingHoursInput, 'In-port Steaming Hours must be between 0 and 25.');
                isValid = false;
                setStatus(`❌ Steaming Hours In-Port Check: ${hours} hrs is outside allowed range [0–25].`, 'error');
            } else {
                steamingHoursInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                setStatus(`✅ Steaming Hours In-Port Check: ${hours} hrs is within allowed range [0–25].`, 'success');
            }
        } else {
            // At Sea reports must match the calculated elapsed time from the one-back report.
            const { sidebarCards, currentCard, currentSig: preSig } = crossReportData || {};

            const resolvedCards = sidebarCards || getAllReportCards();
            const resolvedCard  = currentCard  || identifyCurrentCard(resolvedCards);
            const resolvedSig   = preSig       || (resolvedCard ? extractCardSignature(resolvedCard) : null);

            if (!resolvedCard || !resolvedSig || isNaN(reportTimestamp(resolvedSig))) {
                errors.push('Unable to calculate steaming hours because this report date/time could not be read from the report list.');
                steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                scrollToIssueElement(steamingHoursInput, 'This report date/time could not be read for Steaming Hours calculation.');
                isValid = false;
                setStatus('❌ Steaming Hours Elapsed-Time Check: Current report date/time could not be read from the report list.', 'error');
            } else {
                const prevCardForSteaming = findOneReportBackCard(resolvedSig, resolvedCards, resolvedCard);

                if (!prevCardForSteaming) {
                    errors.push('Unable to calculate steaming hours because the one-back report was not found.');
                    steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                    scrollToIssueElement(steamingHoursInput, 'One-back report was not found for Steaming Hours calculation.');
                    isValid = false;
                    setStatus('❌ Steaming Hours Elapsed-Time Check: One-back report was not found.', 'error');
                } else {
                    const prevSig = extractCardSignature(prevCardForSteaming);
                    const currentTs = reportTimestamp(resolvedSig);
                    const prevTs = reportTimestamp(prevSig);

                    if (isNaN(prevTs)) {
                        errors.push('Unable to calculate steaming hours because the one-back report date/time could not be read.');
                        steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                        scrollToIssueElement(steamingHoursInput, 'One-back report date/time could not be read for Steaming Hours calculation.');
                        isValid = false;
                        setStatus('❌ Steaming Hours Elapsed-Time Check: One-back report date/time could not be read.', 'error');
                    } else {
                        const actualElapsedHours = (currentTs - prevTs) / (1000 * 60 * 60);
                        const diff = Math.abs(actualElapsedHours - hours);

                        const refLabel  = `${prevSig.date} ${prevSig.time} ${prevSig.utcOffset || '+00:00'}`;
                        const currLabel = `${resolvedSig.date} ${resolvedSig.time} ${resolvedSig.utcOffset || '+00:00'}`;

                        if (actualElapsedHours < 0) {
                            errors.push(`Steaming hours could not be calculated because the one-back report (${refLabel}) is later than this report (${currLabel}).`);
                            steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                            scrollToIssueElement(steamingHoursInput, 'One-back report timestamp is later than current report timestamp.');
                            isValid = false;
                            setStatus(`❌ Steaming Hours Elapsed-Time Check: One-back report (${refLabel}) is later than current report (${currLabel}).`, 'error');
                        } else if (diff > CONFIG.STEAMING_HOURS_ELAPSED_TOLERANCE) {
                            setStatus(`🔍 DEBUG — current card: ${currLabel}`, 'warning');
                            setStatus(`🔍 DEBUG — one-back card: ${refLabel} | calculated=${actualElapsedHours.toFixed(2)} hrs | reported=${hours} hrs`, 'warning');
                            errors.push(`Steaming hours (${hours}) does not match calculated elapsed time (${actualElapsedHours.toFixed(2)} hrs) between this report (${currLabel}) and the one-back report (${refLabel}).`);
                            steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                            scrollToIssueElement(steamingHoursInput, 'Steaming Hours does not match the calculated elapsed time.');
                            isValid = false;
                            setStatus(`❌ Steaming Hours Elapsed-Time Check: Reported ${hours} hrs ≠ calculated ${actualElapsedHours.toFixed(2)} hrs from one-back report (${refLabel}).`, 'error');
                        } else {
                            steamingHoursInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                            setStatus(`✅ Steaming Hours Elapsed-Time Check: Reported ${hours} hrs matches calculated ${actualElapsedHours.toFixed(2)} hrs from one-back report (${refLabel}).`, 'success');
                        }
                    }
                }
            }
        }
    } else {
        setStatus('ℹ️ Steaming Hours: Field unpopulated or not applicable to this report layout index.', 'info');
    }

    // ── 4. ROB VALIDATION — current report only ─────────────────────────────
    //   No navigation happens here.
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
                `robEnd=${r.robEnd === null ? 'NULL' : r.robEnd}  ` +
                `adj=${r.adj}  ` +
                `lastRobInput=${r.lastRobInput ? (r.lastRobInput.tagName === 'INPUT' ? 'INPUT' : 'CELL') : 'MISSING'}  ` +
                `robStartInput=${r.robStartInput ? (r.robStartInput.tagName === 'INPUT' ? 'INPUT' : 'CELL') : 'MISSING'}  ` +
                `robEndInput=${r.robEndInput ? (r.robEndInput.tagName === 'INPUT' ? 'INPUT' : 'CELL') : 'MISSING'}`,
                'info'
            );
        });
    }

    if (currentBunkerCheck.length === 0) {
        if (CONFIG.REQUIRE_BUNKER_DATA) {
            scrollToIssueElement(
                locateTrueBunkerContainer(),
                'Bunker ROB grid could not be read. Review the BUNKERS ROB block.'
            );
            setStatus('🛑 LOCKOUT: Bunker ROB grid not found on this report page. REQUIRE_BUNKER_DATA = true — cannot approve without verifying ROB values.', 'error');
            isValid = false;
        } else {
            setStatus('ℹ️ Bunker ROB section absent — REQUIRE_BUNKER_DATA is false, skipping.', 'info');
        }
    }

    if (currentBunkerCheck.length > 0) {

        // ── WITHIN-REPORT ROB INTEGRITY CHECK ───────────────────────────────
        let withinReportFailed = false;
        setStatus('Verifying within-report ROB integrity (Last ROB = ROB Start)...', 'info');

        currentBunkerCheck.forEach(curr => {
            if (curr.lastRob === null && curr.robStart === null) {
                setStatus(`ℹ️ ROB Check [${curr.displayLabel}]: No values entered — skipping.`, 'info');
                return;
            }

            if (curr.lastRob === null || curr.robStart === null) {
                const presentValue = curr.lastRob === null ? curr.robStart : curr.lastRob;
                if (presentValue !== null && Math.abs(presentValue) <= CONFIG.ADJ_TOLERANCE) {
                    setStatus(`ℹ️ ROB Check [${curr.displayLabel}]: Blank value with zero ROB — treating as empty row and skipping.`, 'info');
                    if (curr.lastRobInput) curr.lastRobInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                    if (curr.robStartInput) curr.robStartInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                    return;
                }

                const nullMsg =
                    `[${curr.displayLabel}] Could not extract ` +
                    `${curr.lastRob  === null ? 'Last ROB (NULL)' : `Last ROB (${curr.lastRob})`} / ` +
                    `${curr.robStart === null ? 'ROB Start (NULL)' : `ROB Start (${curr.robStart})`} ` +
                    `— column detection failed. Cannot validate ROB continuity for this row.`;
                errors.push(nullMsg);
                setStatus(`❌ Scrape Failure [${curr.displayLabel}]: Partial data — Last ROB=${curr.lastRob} ROB Start=${curr.robStart}. Blocking approval.`, 'error');
                scrollToIssueElement(
                    curr.lastRobInput || curr.robStartInput || curr.robEndInput,
                    `Bunker row [${curr.displayLabel}] could not be read completely.`
                );
                isValid = false;
                withinReportFailed = true;
                return;
            }

            let rowFailed = false;

            const robMismatch = Math.abs(curr.lastRob - curr.robStart) > CONFIG.ADJ_TOLERANCE;
            if (robMismatch) {
                const errMsg = `[${curr.displayLabel}] Last ROB (${curr.lastRob}) ≠ ROB Start (${curr.robStart}). They must be identical.`;
                errors.push(errMsg);
                if (curr.lastRobInput)  curr.lastRobInput.style.cssText  = FIELD_STYLES.ERROR_KEYWORD_FULL;
                if (curr.robStartInput) curr.robStartInput.style.cssText = FIELD_STYLES.ERROR_KEYWORD_FULL;
                setStatus(`❌ ROB Mismatch [${curr.displayLabel}]: Last ROB (${curr.lastRob}) ≠ ROB Start (${curr.robStart}) — values must be identical.`, 'error');
                scrollToIssueElement(
                    curr.lastRobInput || curr.robStartInput,
                    `Bunker ROB mismatch found in row [${curr.displayLabel}].`
                );
                isValid = false;
                withinReportFailed = true;
                rowFailed = true;
            }

            if (!rowFailed) {
                if (curr.lastRobInput)  curr.lastRobInput.style.cssText  = FIELD_STYLES.SUCCESS_FULL;
                if (curr.robStartInput) curr.robStartInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                setStatus(`✅ ROB Match [${curr.displayLabel}]: Last ROB = ROB Start = ${curr.lastRob}`, 'success');
            }
        });

        if (withinReportFailed) {
            setStatus('🛑 Within-Report ROB Integrity FAILED — halting.', 'error');
        } else {
            setStatus('✅ Within-Report ROB Integrity: All rows pass (Last ROB = ROB Start).', 'success');
        }
    }

    // ── 5. GEOFORMS TIMELINE & COMPLIANCE SCENARIOS BRIDGE ──────────────────
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

    // ── 6. PERFORMANCE TEAM — AT SEA CHECKS (PERF-1 → PERF-4) ─────────────
    setStatus('━━━ Performance Team At-Sea Validation Block ━━━', 'info');
    const perfResult = validatePerformanceAtSea();
    if (!perfResult.isValid) {
        perfResult.errors.forEach(err => {
            errors.push(`[Performance] ${err}`);
            setStatus(`🛑 Performance Lockout: ${err}`, 'error');
        });
        isValid = false;
    } else if (perfResult.errors.length === 0) {
        setStatus('✅ Performance At-Sea Checks (PERF-1 → PERF-4): All checks passed.', 'success');
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
//
//   v6.1.2 FIX A retained: selector covers p-confirm-popup-accept and
//   aria-label="Yes".
//
//   v6.1.3 FIX D: waitForDOMStable() inserted after the initial click delay
//   so the PrimeNG confirm-popup has fully rendered before the Yes-button
//   query runs.  A retry loop (up to YES_BTN_RETRY_COUNT × YES_BTN_RETRY_DELAY_MS)
//   further guards against residual render-timing variance.
// ---------------------------------------------------------------------------

async function approveReport() {
    setStatus('Scanning interface for submission buttons...', 'info');
    const approveBtn = findActionButton('Approve');

    if (!approveBtn) {
        const mainText = getMainContentText();
        if (
            mainText.includes('Approved') &&
            (mainText.includes('Re Ingest') || mainText.includes('Resubmit') || mainText.includes('Open for Resubmit'))
        ) {
            setStatus('⚠️ File is already approved. Proceeding to skip forward...', 'warning');
            return 'skipped';
        }
        setStatus('❌ Submission button context link unreadable.', 'error');
        return false;
    }

    approveBtn.click();
    await sleep(CONFIG.SLEEP_POST_CLICK_MS);
    // FIX D: wait for the PrimeNG popup to finish rendering
    await waitForDOMStable();

    setStatus('Confirming report verification dialogue...', 'info');

    // Primary selector — covers both PrimeNG dialog and popup variants
    const YES_SELECTOR = '.p-confirm-dialog-accept, .p-confirm-popup-accept, button[aria-label="Yes"]';

    let yesBtn = queryAllContexts(YES_SELECTOR)[0];

    // FIX D: retry loop for popup render-timing variance
    if (!yesBtn) {
        for (let attempt = 0; attempt < CONFIG.YES_BTN_RETRY_COUNT; attempt++) {
            await sleep(CONFIG.YES_BTN_RETRY_DELAY_MS);
            await waitForDOMStable();
            yesBtn = queryAllContexts(YES_SELECTOR)[0];
            if (yesBtn) {
                setStatus(`ℹ️ Yes-button found on retry attempt ${attempt + 1}.`, 'info');
                break;
            }
        }
    }

    // Text-based fallback
    if (!yesBtn) {
        yesBtn = queryAllContexts('button, .p-button, [role="button"]').find(el => {
            const text  = (el.innerText || el.textContent || '').trim().toLowerCase();
            const label = (el.getAttribute('label') || '').toLowerCase();
            const aria  = (el.getAttribute('aria-label') || '').toLowerCase();
            return (
                text === 'yes' ||
                label === 'yes' ||
                aria === 'yes' ||
                text === 'confirm' ||
                text === 'ok'
            );
        });
    }

    if (!yesBtn) {
        setStatus('❌ Modal submission dialogue confirmation button missing after all retry attempts.', 'error');
        return false;
    }

    yesBtn.click();

    setStatus('Evaluating modal chain for trailing warnings...', 'info');
    await sleep(CONFIG.SLEEP_POST_DIALOG_MS);

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

    const rejectBtn = findActionButton('Reject', { matchVisibleText: true });

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
        setStatus('⚠️ No confirmation dialog detected after clicking Reject — proceeding without a reason field.', 'warning');
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
        confirmBtn = queryAllContexts('.p-confirm-dialog-accept, .p-confirm-popup-accept, button[aria-label="Yes"]')[0];
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
//   NAVIGATION  (v6.1.8 — strict sequential, never skips, warns on date gaps)
// ---------------------------------------------------------------------------

function extractDateFromSig(sig) {
    // Return a Date object from a card signature, or null if unparseable
    if (!sig || !sig.date) return null;
    const d = new Date(sig.date + 'T' + (sig.time || '00:00') + ':00' + (sig.utcOffset || '+00:00'));
    return isNaN(d.getTime()) ? null : d;
}

async function goToNextPendingReport() {
    setStatus('Analyzing sidebar tracker matrix (sequential mode)...', 'info');

    const sidebarCards = queryAllContexts('.card, div[class*="card"]').filter(card => {
        const text = card.innerText || '';
        return text.includes('Report') || text.includes('Notice');
    });

    if (sidebarCards.length === 0) {
        setStatus('🎉 Queue cleared successfully with clean data locks!', 'success');
        return false;
    }

    // ── Locate the current (active/selected) card ─────────────────────────
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
        // Fall back to the first card that is not white/transparent
        const isPending = card => {
            const bg = window.getComputedStyle(card).backgroundColor;
            return bg === 'rgb(255, 255, 255)' || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
        };
        currentCard = sidebarCards.find(c => !isPending(c)) || sidebarCards[0];
    }

    const currentIndex = sidebarCards.indexOf(currentCard);

    // ── Step exactly one position in sidebar order ─────────────────────────
    // Sidebar is ordered newest → oldest (index 0 = newest).
    // Processing goes newest-first, so the next card is at currentIndex - 1.
    const nextIndex = currentIndex - 1;

    if (nextIndex < 0) {
        setStatus('🎉 No more reports in the queue. Autopilot complete.', 'success');
        return false;
    }

    const nextCard = sidebarCards[nextIndex];

    // ── Missing-date gap warning ───────────────────────────────────────────
    const currentSig = extractCardSignature(currentCard);
    const nextSig    = extractCardSignature(nextCard);
    const currentDt  = extractDateFromSig(currentSig);
    const nextDt     = extractDateFromSig(nextSig);

    if (currentDt && nextDt) {
        const gapMs   = currentDt.getTime() - nextDt.getTime(); // next is older → positive gap
        const gapDays = Math.round(gapMs / (1000 * 60 * 60 * 24));

        if (gapDays > 1) {
            setStatus(
                `⚠️ DATE GAP WARNING: ${gapDays - 1} date(s) missing between ` +
                `${nextSig.date} and ${currentSig.date}. ` +
                `Expected reports may be absent from the queue.`,
                'warning'
            );
        } else if (gapDays < 0) {
            setStatus(
                `⚠️ DATE ORDER WARNING: Next card (${nextSig.date}) appears newer than current (${currentSig.date}). ` +
                `Sidebar order may be unexpected.`,
                'warning'
            );
        }
    } else if (!nextSig.date) {
        setStatus('⚠️ DATE WARNING: Next report card has no readable date — cannot verify sequence continuity.', 'warning');
    }

    setStatus('➡️ Moving to next report in sidebar sequence...', 'success');
    nextCard.click();
    await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);
    return true;
}

// ---------------------------------------------------------------------------
//   AUTOPILOT LOOP  (corrected approval flow)
//
//   Sequence per report:
//     1. gatherCrossReportBunkerData()  — capture current report card context.
//     2. validateCurrentReport()         — pure in-place validation using the
//                                         pre-gathered snapshots.  No nav.
//     3. ensureOnCurrentReport()         — guard: confirm UI is on the correct
//                                         report before clicking Approve.
//     4. approveReport()                 — clicks Approve on the current report,
//                                         handles the confirm popup.
//     5. goToNextPendingReport()         — only called after a successful or
//                                         skipped approval.
// ---------------------------------------------------------------------------

function isCurrentReportAlreadyApproved() {
    const screenText = getMainContentText();
    const hasApprovedBadge = queryAllContexts(
        '.p-tag, .p-badge, [class*="approved"], [class*="status"]'
    ).some(el => {
        if (el.closest('.card, [class*="card"], .report-item, li[class*="report"]')) return false;
        return (el.innerText || '').trim().toLowerCase() === 'approved';
    });

    return hasApprovedBadge || (
        screenText.includes('Re Ingest') || screenText.includes('Open for Resubmit')
    );
}

function isCurrentReportAlreadyRejected() {
    // Checks the main content area (not sidebar cards) for a "Rejected" badge/tag.
    return queryAllContexts(
        '.p-tag, .p-badge, [class*="rejected"], [class*="status"]'
    ).some(el => {
        // Ignore badges that belong to a sidebar card
        if (el.closest('.card, [class*="card"], .report-item, li[class*="report"]')) return false;
        return (el.innerText || '').trim().toLowerCase() === 'rejected';
    });
}

async function runAutopilot() {
    try {
        while (window.autopilotRunning) {
            if (isCurrentReportAlreadyApproved()) {
                setStatus('⚠️ Current report already approved. Looking for next pending report...', 'warning');
                const hasNext = await goToNextPendingReport();
                if (!hasNext) {
                    window.autopilotRunning = false;
                    updateUIButton();
                    break;
                }
                continue;
            }

            if (isCurrentReportAlreadyRejected()) {
                setStatus('⚠️ Current report is already rejected — skipping to next report.', 'warning');
                const hasNext = await goToNextPendingReport();
                if (!hasNext) {
                    window.autopilotRunning = false;
                    updateUIButton();
                    break;
                }
                continue;
            }

            // ── STEP 1: Capture current report context ──────────────────────
            setStatus('━━━ Context phase: capturing current report data ━━━', 'info');
            const crossReportData = await gatherCrossReportBunkerData();

            // ── STEP 2: Validate — no navigation occurs inside here ───────────
            setStatus('━━━ Validation phase: running all checks on current report ━━━', 'info');
            const isValid = await validateCurrentReport(crossReportData);

            if (!isValid) {
                window.autopilotRunning = false;
                updateUIButton();
                break;
            }

            // ── STEP 3: Confirm we are still on the correct report ─────────────
            if (crossReportData.currentSig) {
                const onTarget = await ensureOnCurrentReport(
                    crossReportData.currentSig,
                    crossReportData.currentCard
                );
                if (!onTarget) {
                    setStatus('🛑 Pre-approval guard failed — could not confirm current report. Halting.', 'error');
                    window.autopilotRunning = false;
                    updateUIButton();
                    break;
                }
            }

            // ── STEP 4: Approve the current report ────────────────────────────
            setStatus('━━━ Approval phase: submitting current report ━━━', 'info');
            const approved = await approveReport();

            if (approved === false) {
                window.autopilotRunning = false;
                updateUIButton();
                break;
            }

            // ── STEP 5: Navigate to next pending report ───────────────────────
            setStatus('━━━ Navigation phase: moving to next pending report ━━━', 'info');
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
    btn.innerText = '▶ Start Autopilot (P.v.1.0.0)';
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
        box.innerHTML = "<div style='color:#888; margin-bottom:8px; font-weight:bold;'>🤖 SYSTEM ACTIVE LOG (P.v.1.0.0 — Performance Team):</div>";
    }
}

function updateUIButton() {
    const btn = document.getElementById('autopilot-btn');
    if (!btn) return;
    if (window.autopilotRunning) {
        btn.innerText = '⏹ STOP Autopilot';
        btn.style.backgroundColor = '#c62828';
    } else {
        btn.innerText = '▶ Start Autopilot (P.v.1.0.0)';
    }
}

injectControlPanel();

})();