

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

    // v7.1.2: reporting period validity window (Validation Check #2)
    // v7.3.0: max interval raised 25 → 26 hrs per updated report-time-gap
    // policy — any gap strictly greater than this halts Autopilot immediately.
    REPORT_INTERVAL_MIN_HOURS: 1,
    REPORT_INTERVAL_MAX_HOURS: 26,

    // v7.3.0: website buffering / loading-screen recovery. These govern
    // waitForPageReady() — buffering is never treated as an error on its
    // own; Autopilot pauses and polls, only halting if the page fails to
    // recover within this budget.
    PAGE_LOAD_POLL_MS: 600,
    PAGE_LOAD_POLL_MAX_MS: 4000,
    PAGE_LOAD_MAX_WAIT_MS: 45000,
    PAGE_LOAD_MAX_RETRIES: 20,
    // v7.4.2: a real buffering condition holds steady for at least this
    // long; a single-frame CSS-transition flicker does not. Requiring the
    // second isPageBuffering() check to still be true after this delay
    // filters that flicker out before Autopilot ever logs/pauses for it.
    BUFFERING_CONFIRM_DELAY_MS: 150,

    // v7.2.5: warning text fragments (lowercase) that Autopilot is allowed
    // to bypass via "Proceed Anyway" regardless of report context.
    ALWAYS_BYPASS_WARNING_PHRASES: [
        'incinerator value is correct',
        'cannot be less than vessel activation date',
        'voyage number needs an increment'
    ],

    // v7.2.5: distance-0 warnings — safe to bypass on any non-At-Sea report.
    // Multiple variants to match the actual text GeoEmissions produces:
    //   "Observed Distance reported is 0 kindly review"
    //   "Observed Distance is 0 ..."
    PORT_CONTEXT_BYPASS_WARNING_PHRASES: [
        'observed distance is 0',
        'observed distance reported is 0',
        'distance reported is 0',
        'distance is 0'
    ],

    // v7.1.2: warning text fragments that indicate a hard data error rather
    // than a bypassable advisory — Autopilot must stop entirely, not just
    // skip this report, when one of these appears.
    FATAL_WARNING_PHRASES: [
        'errors detected in the submitted data'
    ],

    // v7.2.3: AIS distance discrepancy warning thresholds (NM).
    // < WARN_NM  → bypass silently (normal weather/current variation)
    // WARN_NM .. LOCKOUT_NM → log a warning but still proceed
    // > LOCKOUT_NM → hard lockout
    AIS_DIST_WARN_NM:    30,
    AIS_DIST_LOCKOUT_NM: 50,

    // ── v7.4.0 [1] Purpose-column fuel consumption ────────────────────────
    // Canonical purpose name → accepted header-text / data-td-name tokens.
    // Tokens are matched EXACTLY against the normalised column identifier
    // (lowercased, all non-alphanumerics stripped) so that the Consumption
    // group columns (Main / Aux / Total / Adj) can never be mistaken for a
    // "Used For" purpose column.
    PURPOSE_FUEL_COLUMNS: {
        'Propulsion': ['propulsion', 'propulsionconsumption'],
        'Maneuver':   ['maneuver', 'manoeuvre', 'manoeuver', 'manuever',
                       'maneuvering', 'manoeuvring', 'maneuvre'],
        'Generator':  ['generator', 'generators', 'gen', 'dg', 'auxengine',
                       'auxiliaryengine'],
        'L/D':        ['ld', 'loaddisch', 'loaddischarge', 'loaddischidle',
                       'loadingdischarging', 'loaddischarging', 'cargooperations',
                       'cargooperation', 'cargoops', 'loading', 'discharging'],
        'Deballast':  ['deballast', 'deballasting', 'deballastng'],
        'IGS':        ['igs', 'inertgas', 'inertgassystem', 'inertgasplant'],
        'Boiler':     ['boiler', 'boilers', 'auxboiler', 'auxiliaryboiler',
                       'boilerconsumption']
    },

    // ── v7.4.0 [2] Halt / restart behaviour ───────────────────────────────
    // A transient (non-genuine) failure retries the same report instead of
    // stopping the bot. Only after MAX_TRANSIENT_RETRIES consecutive
    // transient failures on the same report is it escalated to a genuine
    // halt, so the bot can never spin forever OR sit stopped for no reason.
    MAX_TRANSIENT_RETRIES: 4,
    TRANSIENT_RETRY_DELAY_MS: 400,
    // Watchdog: how often to check whether the loop stopped without a
    // genuine reason, and how quickly to resume when it did.
    WATCHDOG_INTERVAL_MS: 250,
    WATCHDOG_RESUME_DELAY_MS: 150,

    // ── v7.4.0 [3] No-skip navigation verification ────────────────────────
    NAV_VERIFY_ATTEMPTS: 3,
    NAV_VERIFY_DELAY_MS: 600,

    // ── v7.4.0 [6] Departure report terminal event ────────────────────────
    DEPARTURE_FINAL_EVENT: 'SHIFTING FROM LAST BERTH TO SEA',
    DEPARTURE_FINAL_EVENT_ALIASES: [
        'SHIFTING FROM LAST BERTH TO SEA',
        'SHIFT FROM LAST BERTH TO SEA'
    ],

    // ── v7.4.0 [7] Arrival / At Sea event conflict ────────────────────────
    // Two events are considered "the same event" when the event type matches
    // and either their start timestamps are equal (within this tolerance) or
    // their start→end windows overlap.
    EVENT_MATCH_TOLERANCE_MS: 60 * 1000,

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


const AutopilotState = {
    sessionActive:    false,
    userStopped:      false,
    genuineHalt:      false,
    haltReason:       '',
    loopActive:       false,
    transientRetries: 0,
    watchdogTimer:    null,
    resumeTimer:      null
};
window.__autopilotState = AutopilotState;

// Genuine halt: a real validation problem. Stops the bot and KEEPS it
// stopped (watchdog will not resume) until the user acts.
function haltForUser(reason) {
    AutopilotState.genuineHalt = true;
    AutopilotState.haltReason  = reason || 'Validation issue requires review.';
    window.autopilotRunning    = false;
    stopWatchdog();
    setStatus(`🛑 HALTED — user intervention required: ${AutopilotState.haltReason}`, 'error');
    setStatus('   Autopilot will stay stopped. Fix the issue above, then click Start.', 'error');
    updateUIButton();
}

// User-initiated stop: sticky. Nothing auto-restarts after this.
function stopByUser() {
    AutopilotState.userStopped   = true;
    AutopilotState.sessionActive = false;
    AutopilotState.genuineHalt   = false;
    AutopilotState.haltReason    = '';
    window.autopilotRunning      = false;
    stopWatchdog();
    if (AutopilotState.resumeTimer) {
        clearTimeout(AutopilotState.resumeTimer);
        AutopilotState.resumeTimer = null;
    }
    setStatus('⏹ Stopped by user. Autopilot will remain stopped until Start is clicked.', 'warning');
    updateUIButton();
}

// Normal completion — queue exhausted. Not a halt, not an error.
function finishRun(message) {
    AutopilotState.sessionActive = false;
    AutopilotState.genuineHalt   = false;
    window.autopilotRunning      = false;
    stopWatchdog();
    if (message) setStatus(message, 'success');
    updateUIButton();
}

function startWatchdog() {
    if (AutopilotState.watchdogTimer) return;
    AutopilotState.watchdogTimer = setInterval(() => {
        // Never resume after a user Stop — this is the strict rule.
        if (AutopilotState.userStopped)   return;
        if (!AutopilotState.sessionActive) return;
        if (AutopilotState.genuineHalt)   return;
        if (window.autopilotRunning)      return;
        if (AutopilotState.resumeTimer)   return;

        // Stopped with no genuine reason and no user stop → false positive.
        setStatus('♻️ Autopilot stopped without a genuine validation reason — auto-recovering...', 'warning');
        AutopilotState.resumeTimer = setTimeout(() => {
            AutopilotState.resumeTimer = null;
            if (AutopilotState.userStopped || AutopilotState.genuineHalt) return;
            if (!AutopilotState.sessionActive) return;
            window.autopilotRunning = true;
            updateUIButton();
            setStatus('▶️ Resumed automatically.', 'success');
            runAutopilot();
        }, CONFIG.WATCHDOG_RESUME_DELAY_MS);
    }, CONFIG.WATCHDOG_INTERVAL_MS);
}

function stopWatchdog() {
    if (AutopilotState.watchdogTimer) {
        clearInterval(AutopilotState.watchdogTimer);
        AutopilotState.watchdogTimer = null;
    }
}


const ProcessingLedger = {
    order:   [],          // expected processing order (keys)
    entries: new Map(),   // key → { key, label, status, note, updatedAt }
    initialised: false
};
window.__autopilotLedger = ProcessingLedger;

function sigKey(sig) {
    if (!sig) return '';
    return [
        (sig.vesselName || '').toUpperCase(),
        sig.reportType  || '',
        sig.routeInfo   || '',
        sig.date        || '',
        sig.time        || '',
        sig.utcOffset   || ''
    ].join('|');
}

function resetLedger() {
    ProcessingLedger.order = [];
    ProcessingLedger.entries.clear();
    ProcessingLedger.initialised = false;
}

// Builds the expected processing order from the sidebar. Processing runs
// from the currently-selected card upwards (index → 0), matching the
// existing sequential navigation behaviour.
function initialiseLedger(sidebarCards, currentCard) {
    const cards = sidebarCards && sidebarCards.length ? sidebarCards : getAllReportCards();
    if (!cards.length) return;

    const startIndex = Math.max(0, cards.indexOf(currentCard || identifyCurrentCard(cards)));

    for (let i = startIndex; i >= 0; i--) {
        const sig = extractCardSignature(cards[i]);
        const key = sigKey(sig);
        if (!key.replace(/\|/g, '')) continue;
        if (ProcessingLedger.entries.has(key)) continue;
        ProcessingLedger.order.push(key);
        ProcessingLedger.entries.set(key, {
            key,
            label: describeSignature(sig),
            status: 'pending',
            note: '',
            updatedAt: Date.now()
        });
    }

    ProcessingLedger.initialised = true;
    setStatus(`🧾 Processing ledger initialised — ${ProcessingLedger.order.length} report(s) queued for this run.`, 'info');
}

function ledgerEnsureEntry(sig) {
    const key = sigKey(sig);
    if (!key.replace(/\|/g, '')) return null;
    if (!ProcessingLedger.entries.has(key)) {
        // A report that was not in the original snapshot (queue changed
        // mid-run). Add it rather than letting it fall through unnoticed.
        ProcessingLedger.entries.set(key, {
            key,
            label: describeSignature(sig),
            status: 'pending',
            note: 'added mid-run (not present in the initial queue snapshot)',
            updatedAt: Date.now()
        });
        ProcessingLedger.order.push(key);
        setStatus(`🧾 Ledger: new report appeared mid-run and was added to the queue — ${describeSignature(sig)}`, 'info');
    }
    return ProcessingLedger.entries.get(key);
}

function ledgerMark(key, status, note) {
    const entry = ProcessingLedger.entries.get(key);
    if (!entry) return;
    entry.status    = status;
    entry.note      = note || entry.note;
    entry.updatedAt = Date.now();
}

const LEDGER_COMPLETE_STATUSES = [
    'approved', 'rejected-duplicate', 'already-approved', 'already-rejected'
];

function ledgerIsComplete(key) {
    const entry = ProcessingLedger.entries.get(key);
    return !!entry && LEDGER_COMPLETE_STATUSES.includes(entry.status);
}

// Returns the key that should be processed after `completedKey`.
function ledgerNextExpectedKey(completedKey) {
    const idx = ProcessingLedger.order.indexOf(completedKey);
    if (idx < 0) return null;
    for (let i = idx + 1; i < ProcessingLedger.order.length; i++) {
        const key = ProcessingLedger.order[i];
        if (!ledgerIsComplete(key)) return key;
    }
    return null;
}

// End-of-run accounting — states explicitly whether anything was missed.
function reportLedgerReconciliation() {
    if (!ProcessingLedger.initialised || ProcessingLedger.order.length === 0) return;

    const missed = ProcessingLedger.order.filter(k => !ledgerIsComplete(k));
    const done   = ProcessingLedger.order.length - missed.length;

    setStatus('━━━ Processing reconciliation ━━━', 'info');
    setStatus(`🧾 ${done} of ${ProcessingLedger.order.length} queued report(s) completed.`, done === ProcessingLedger.order.length ? 'success' : 'warning');

    if (missed.length === 0) {
        setStatus('✅ No reports were skipped — every report in the queue was accounted for.', 'success');
        return;
    }

    setStatus(`⚠️ ${missed.length} report(s) were NOT completed and need attention:`, 'warning');
    missed.forEach(k => {
        const e = ProcessingLedger.entries.get(k);
        setStatus(`   • ${e.label} — status: ${e.status}${e.note ? ` (${e.note})` : ''}`, 'warning');
    });
}

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


let _lastBufferingReason = '';

function getLastBufferingReason() {
    return _lastBufferingReason;
}

function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity || '1') === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function isPageBuffering() {
    _lastBufferingReason = '';

    // 1. Document itself still loading (navigation / full reload in progress)
    if (document.readyState !== 'complete') {
        _lastBufferingReason = `document.readyState is "${document.readyState}"`;
        return true;
    }

    const LOADING_SELECTORS = [
        '.p-progress-spinner',
        '.p-progressbar .p-progressbar-indeterminate',
        '.p-blockui', '.p-blockui-container',
        '.p-component-overlay',
        '.cdk-overlay-backdrop',
        '[role="progressbar"]',
        '[aria-busy="true"]'
    ];
    for (const sel of LOADING_SELECTORS) {
        for (const el of queryAllContexts(sel)) {
            if (isElementVisible(el)) {
                _lastBufferingReason = `visible loading indicator matched "${sel}"`;
                return true;
            }
        }
    }

    //    dropped from the list entirely.
    const OVERLAY_CONTAINER_SELECTORS = [
        '.p-toast-message', '.p-dialog', '.p-blockui-content',
        '[role="alert"]', '[role="status"]', '[aria-live]'
    ];
    const LOADING_PHRASES = [
        'loading...', 'loading…', 'buffering',
        'fetching data', 'connecting to server', 'reconnecting'
    ];
    for (const sel of OVERLAY_CONTAINER_SELECTORS) {
        for (const el of queryAllContexts(sel)) {
            if (!isElementVisible(el)) continue;
            const txt = (el.innerText || el.textContent || '').toLowerCase();
            const matched = LOADING_PHRASES.find(p => txt.includes(p));
            if (matched) {
                _lastBufferingReason = `overlay text "${matched}" found inside "${sel}"`;
                return true;
            }
        }
    }

    return false;
}

// Pauses execution while the page is buffering/loading, polling with a
// gentle backoff, then resumes automatically. Returns true once the page
// is ready. Only returns false — signalling Autopilot should halt — if the
// page fails to recover within PAGE_LOAD_MAX_WAIT_MS / MAX_RETRIES.
async function waitForPageReady(stepLabel = 'current step') {
    if (!isPageBuffering()) return true;

    // v7.4.2: confirm with a short second check before logging/pausing —
    // filters out a single-frame CSS-transition flicker that would
    // otherwise be misreported as real buffering.
    await sleep(CONFIG.BUFFERING_CONFIRM_DELAY_MS);
    if (!isPageBuffering()) return true;

    setStatus(
        `⏳ Buffering/loading detected during ${stepLabel} ` +
        `(${getLastBufferingReason() || 'reason unavailable'}) — pausing and waiting for the page to become responsive...`,
        'warning'
    );

    const startTime = Date.now();
    let attempts = 0;
    let delay = CONFIG.PAGE_LOAD_POLL_MS;

    while (isPageBuffering()) {
        attempts++;

        if (
            Date.now() - startTime > CONFIG.PAGE_LOAD_MAX_WAIT_MS ||
            attempts > CONFIG.PAGE_LOAD_MAX_RETRIES
        ) {
            setStatus(
                `🛑 LOCKOUT: Page did not finish loading after ${attempts} retries ` +
                `(${Math.round((Date.now() - startTime) / 1000)}s) during ${stepLabel}. ` +
                `Halted — please check the connection/page and resume manually.`,
                'error'
            );
            return false;
        }

        await sleep(delay);
        delay = Math.min(delay * 1.3, CONFIG.PAGE_LOAD_POLL_MAX_MS);
    }

    if (attempts > 0) {
        setStatus(`✅ Page responsive again after ${attempts} retr${attempts === 1 ? 'y' : 'ies'} — resuming ${stepLabel}.`, 'success');
    }
    return true;
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



function normaliseColumnToken(text) {
    return (text || '')
        .toString()
        .toLowerCase()
        .replace(/\(.*?\)/g, ' ')     // drop parenthetical qualifiers
        .replace(/[^a-z0-9]/g, '');   // strip spaces, slashes, dashes, dots
}

function purposeForToken(token) {
    if (!token) return null;
    for (const [purpose, aliases] of Object.entries(CONFIG.PURPOSE_FUEL_COLUMNS)) {
        if (aliases.includes(token)) return purpose;
    }
    return null;
}

function parseNumericCellValue(cell) {
    if (!cell) return 0;

    const input = cell.querySelector ? cell.querySelector('input') : null;
    let raw;

    if (input) {
        raw = input.value;
    } else {
        raw = (cell.innerText || cell.textContent || '');
        // Strip any responsive column-title label rendered inside the cell
        const titleEl = cell.querySelector ? cell.querySelector('.p-column-title') : null;
        if (titleEl) raw = raw.replace((titleEl.innerText || '').trim(), '');
    }

    const cleaned = (raw || '').replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned.toUpperCase() === 'N/A') return 0;

    const match = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (!match) return 0;

    const n = parseFloat(match[0]);
    return isNaN(n) ? 0 : n;
}

function getPurposeFuelConsumptionTotals() {
    const totals = {};
    Object.keys(CONFIG.PURPOSE_FUEL_COLUMNS).forEach(p => { totals[p] = 0; });

    const columnsFound = new Set();
    let tablesScanned = 0;

    for (const ctx of getAllContexts()) {
        if (!ctx) continue;

        const tables = Array.from(ctx.querySelectorAll('table, .p-datatable-table, [role="table"], [role="grid"]'));

        for (const table of tables) {
            tablesScanned++;

            // ── Build a column-index → purpose map from the header rows ──
            const colMap = {};
            const headerCells = Array.from(table.querySelectorAll('thead th, thead td, tr th'));
            if (headerCells.length) {
                // Group header rows can span columns (e.g. "Used For" over 8
                // sub-columns), so walk each header row separately and index
                // by position within that row.
                const headerRows = new Set(headerCells.map(c => c.parentElement).filter(Boolean));
                for (const hr of headerRows) {
                    const cells = Array.from(hr.children);
                    cells.forEach((cell, idx) => {
                        const byAttr = purposeForToken(normaliseColumnToken(cell.getAttribute('data-td-name')));
                        const byText = purposeForToken(normaliseColumnToken(cell.innerText || cell.textContent));
                        const purpose = byAttr || byText;
                        if (purpose) {
                            colMap[idx] = purpose;
                            columnsFound.add(purpose);
                        }
                    });
                }
            }

            // ── Walk the data rows ───────────────────────────────────────
            const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
            const rows = bodyRows.length ? bodyRows : Array.from(table.querySelectorAll('tr'));

            for (const row of rows) {
                if (row.querySelector('th') && !row.querySelector('td')) continue; // header row
                const cells = Array.from(row.querySelectorAll('td'));
                if (!cells.length) continue;

                cells.forEach((cell, idx) => {
                    const byAttr  = purposeForToken(normaliseColumnToken(cell.getAttribute('data-td-name')));
                    const titleEl = cell.querySelector('.p-column-title');
                    const byLabel = purposeForToken(normaliseColumnToken(
                        titleEl ? titleEl.innerText : cell.getAttribute('data-label')
                    ));
                    const purpose = byAttr || byLabel || colMap[idx] || null;
                    if (!purpose) return;

                    columnsFound.add(purpose);
                    const value = parseNumericCellValue(cell);
                    if (value) totals[purpose] += value;
                });
            }
        }
    }

    const purposesWithConsumption = Object.keys(totals)
        .filter(p => Math.abs(totals[p]) > CONFIG.ADJ_TOLERANCE);

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    return {
        totals,
        purposesWithConsumption,
        grandTotal,
        columnsFound: Array.from(columnsFound),
        tablesScanned
    };
}

// Formats "Propulsion and Generator" / "Propulsion, Generator and Boiler"
function formatPurposeList(purposes) {
    if (!purposes || purposes.length === 0) return '';
    if (purposes.length === 1) return purposes[0];
    return purposes.slice(0, -1).join(', ') + ' and ' + purposes[purposes.length - 1];
}

// ---------------------------------------------------------------------------
//   VESSEL STATUS  (At Sea vs In Port)
//
//   Reads the explicit vessel status / location control when present, and
//   falls back to the report-type inference used elsewhere. The fallback is
//   deliberately conservative: an unreadable status resolves to "not At Sea",
//   which means blank rows are PRESERVED rather than deleted.
// ---------------------------------------------------------------------------

function getVesselStatusText() {
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;

        const selects = Array.from(ctx.querySelectorAll(
            'select[id*="status" i], select[name*="status" i], ' +
            'select[id*="location" i], select[name*="location" i], ' +
            'select[id*="vesselstate" i], select[name*="vesselstate" i]'
        ));
        for (const sel of selects) {
            const opt = sel.options && sel.options[sel.selectedIndex];
            const txt = opt ? (opt.text || '').trim() : '';
            if (txt) return txt;
        }

        const inputs = Array.from(ctx.querySelectorAll(
            'input[id*="status" i], input[name*="status" i], ' +
            'input[id*="location" i], input[name*="location" i]'
        ));
        for (const inp of inputs) {
            if (inp.value && inp.value.trim()) return inp.value.trim();
        }
    }
    return '';
}

function isVesselAtSea() {
    const statusText = getVesselStatusText().toLowerCase();
    if (statusText) {
        if (/\bin\s*port\b/.test(statusText)) return false;
        if (/\bat\s*sea\b/.test(statusText))  return true;
    }
    // Fallback: report-type inference (defaults to In Port when unreadable).
    try {
        return extractReportContext().reportType === 'At Sea NOON Report';
    } catch {
        return false;
    }
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
    // v7.2.6: lowered threshold from 10 to 5 to catch muted/teal greens.
    // Also accept colours where g is dominant and above a minimum brightness.
    return (g - r) > 5 && (g - b) > 5 && g > 80;
}

function isCardChecked(card) {
    if (!card) return false;

    // v7.2.6: check the card itself AND all its descendant elements.
    // GeoEmissions applies the green highlight to an inner div/span, not
    // necessarily the outermost card wrapper that getAllReportCards() returns.
    const elements = [card, ...Array.from(card.querySelectorAll('*'))];
    for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (isGreenish(style.borderColor)       ||
            isGreenish(style.backgroundColor)   ||
            isGreenish(style.borderLeftColor)    ||
            isGreenish(style.outlineColor)) {
            return true;
        }
    }

    // Also check for a green check-mark icon or CSS class as a fallback.
    if (card.querySelector('.fa-check, .pi-check, [class*="approved" i], [class*="green" i], [class*="success" i]')) {
        return true;
    }

    return false;
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
    if (!a || !b) return false;

    const coreMatch = (
        a.reportType  !== '' && b.reportType  !== '' && a.reportType  === b.reportType  &&
        a.vesselName  !== '' && b.vesselName  !== '' && a.vesselName  === b.vesselName  &&
        a.date        !== '' && b.date        !== '' && a.date        === b.date        &&
        a.time        !== '' && b.time        !== '' && a.time        === b.time
    );

    if (!coreMatch) return false;

    // v7.4.0 [5]: two cards showing the same wall-clock time under different
    // UTC offsets are DIFFERENT reports. Compare the offset whenever both
    // cards carry one; if either is unreadable, fall back to the old
    // wall-clock behaviour rather than failing to identify the card.
    if (a.utcOffset && b.utcOffset && a.utcOffset !== b.utcOffset) return false;

    if (a.routeInfo || b.routeInfo) {
        return a.routeInfo === b.routeInfo;
    }

    return true;
}

// ---------------------------------------------------------------------------
//   v7.4.0 [5] — TIMEZONE-AWARE DUPLICATE COMPARISON
//
//   Duplicate detection compares the COMPLETE timestamp — date, time AND the
//   UTC offset — instead of the displayed date/time alone. Two reports at
//   "2026-08-19 12:00 -02:00" and "2026-08-19 12:00 +02:00" are four hours
//   apart and are therefore NOT duplicates.
//
//   Returns { isDuplicate, reason, offsetsCompared }
// ---------------------------------------------------------------------------

function compareSignatureTimestamps(a, b) {
    const bothHaveOffset = !!(a.utcOffset && b.utcOffset);

    if (bothHaveOffset) {
        const tsA = reportTimestamp(a);
        const tsB = reportTimestamp(b);
        if (!isNaN(tsA) && !isNaN(tsB)) {
            return {
                sameInstant: tsA === tsB,
                offsetsCompared: true,
                deltaHours: (tsA - tsB) / (1000 * 60 * 60)
            };
        }
    }

    // Offset missing or unparseable on at least one side — compare the
    // displayed date/time and let the caller report the reduced confidence.
    return {
        sameInstant: a.date === b.date && a.time === b.time,
        offsetsCompared: false,
        deltaHours: null
    };
}

function signaturesAreDuplicate(a, b) {
    if (!a || !b) return { isDuplicate: false, reason: 'missing signature', offsetsCompared: false };

    const identityMatch = (
        a.reportType !== '' && b.reportType !== '' && a.reportType === b.reportType &&
        a.vesselName !== '' && b.vesselName !== '' && a.vesselName === b.vesselName
    );
    if (!identityMatch) {
        return { isDuplicate: false, reason: 'different vessel or report type', offsetsCompared: false };
    }

    if ((a.routeInfo || b.routeInfo) && a.routeInfo !== b.routeInfo) {
        return { isDuplicate: false, reason: 'different voyage/route information', offsetsCompared: false };
    }

    const cmp = compareSignatureTimestamps(a, b);

    if (!cmp.sameInstant) {
        const detail = cmp.offsetsCompared && cmp.deltaHours !== null
            ? `the complete timestamps differ by ${Math.abs(cmp.deltaHours).toFixed(2)} hrs once the UTC offsets are applied ` +
              `(${a.date} ${a.time} ${a.utcOffset} vs ${b.date} ${b.time} ${b.utcOffset})`
            : 'the reported date/time values differ';
        return { isDuplicate: false, reason: detail, offsetsCompared: cmp.offsetsCompared };
    }

    return {
        isDuplicate: true,
        reason: cmp.offsetsCompared
            ? 'identical vessel, report type, voyage and complete timestamp (including UTC offset)'
            : 'identical vessel, report type, voyage and reported date/time (UTC offset not readable on both cards)',
        offsetsCompared: cmp.offsetsCompared
    };
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

    // v7.4.0 [5]: compare the complete timestamp (including UTC offset), not
    // just the displayed date/time. Near-misses — same wall clock, different
    // offset — are logged so the user can see they were considered and
    // deliberately cleared.
    for (const card of sidebarCards) {
        if (card === currentCard) continue;
        const sig = extractCardSignature(card);

        const verdict = signaturesAreDuplicate(currentSig, sig);

        if (verdict.isDuplicate) {
            return { currentSig, matchedSig: sig, matchedCard: card, reason: verdict.reason };
        }

        // Same displayed date/time but a different UTC offset — the exact
        // scenario that used to be misreported as a duplicate.
        if (currentSig.date === sig.date && currentSig.time === sig.time &&
            currentSig.vesselName === sig.vesselName && verdict.offsetsCompared) {
            setStatus(
                `ℹ️ Timezone check: ${describeSignature(sig)} shows the same wall-clock time but a different UTC ` +
                `offset (${sig.utcOffset} vs ${currentSig.utcOffset}) — not a duplicate.`,
                'info'
            );
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
//   v7.4.0 — DETAILED EVENT ROW SCRAPER
//
//   Reads the EVENTS grid in DOM order and returns, per row:
//     eventType, isBlank, the row element, and the Start / End Date-Time
//     cells (date string, time string, UTC offset, parsed timestamp and the
//     element to highlight if it needs flagging).
//
//   Used by requirements [1] blank-row handling, [6] departure terminal
//   event, [7] arrival/at-sea conflict and [9] blank End Date/Time.
// ---------------------------------------------------------------------------

function findEventsBlocks() {
    const blocks = [];
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        for (const fs of Array.from(ctx.querySelectorAll('fieldset'))) {
            const legend = fs.querySelector('legend');
            if (legend && (legend.innerText || '').toUpperCase().includes('EVENTS')) {
                blocks.push(fs);
            }
        }
    }
    return blocks;
}

// Accepts DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD.
// Day-first is assumed for the ambiguous DD/MM vs MM/DD case, matching the
// GeoEmissions form which renders dates as DD.MM.YYYY.
function parseFlexibleDate(dateStr) {
    const s = (dateStr || '').trim();
    if (!s) return null;

    const parts = s.match(/(\d{1,4})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
    if (!parts) return null;

    let a = parseInt(parts[1], 10);
    let b = parseInt(parts[2], 10);
    let c = parseInt(parts[3], 10);
    if ([a, b, c].some(isNaN)) return null;

    let year, month, day;
    if (parts[1].length === 4 || a > 31) {
        year = a; month = b; day = c;              // YYYY-MM-DD
    } else {
        day = a; month = b; year = c;              // DD.MM.YYYY
        if (year < 100) year += 2000;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
}

function normaliseOffsetString(raw) {
    const m = (raw || '').match(/([+-])\s*(\d{1,2}):?(\d{2})?/);
    if (!m) return '';
    const sign = m[1];
    const hh   = m[2].padStart(2, '0');
    const mm   = (m[3] || '00').padStart(2, '0');
    return `${sign}${hh}:${mm}`;
}

function eventDateTimeToTimestamp(dateStr, timeStr, offset) {
    const d = parseFlexibleDate(dateStr);
    if (!d) return NaN;

    const t = (timeStr || '').match(/(\d{1,2}):(\d{2})/);
    if (!t) return NaN;

    const iso = `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-` +
                `${String(d.day).padStart(2, '0')}T${t[1].padStart(2, '0')}:${t[2]}:00` +
                (offset || '+00:00');

    const ms = new Date(iso).getTime();
    return isNaN(ms) ? NaN : ms;
}

// ---------------------------------------------------------------------------
//   v7.4.1 — STRUCTURAL CELL CLASSIFICATION  (fixes Start/End Date-Time
//   being confused with Start/End Latitude)
//
//   A Start/End Date-Time cell always contains a date input, a time input,
//   AND a GMT-offset <select>. A Latitude/Longitude cell is always a single
//   plain input with a "DD MM' SS\" N/S" (or E/W) placeholder and NEVER has
//   a <select>. This structural difference is used as the PRIMARY signal —
//   attribute-name text and header-column index are only used to choose
//   between structurally-valid candidates, never to override this check.
//   That way a stale/renamed attribute or a shifted header index can no
//   longer cause a Lat/Long cell to be mistaken for a Date/Time cell.
// ---------------------------------------------------------------------------

const DMS_PLACEHOLDER_RE = /DD\s*MM.{0,3}SS/i;
const DMS_VALUE_RE = /\d+\s*[°]?\s*\d{1,2}['’]?\s*\d{1,2}(?:\.\d+)?\s*["”]?\s*[NSEW]/i;

function cellLooksLikeLatLon(cell) {
    if (!cell) return false;

    const token = normaliseColumnToken(cell.getAttribute('data-td-name'));
    if (token.includes('latitude') || token.includes('longitude') ||
        /(^|[^a-z])lat([^a-z]|$)/.test(token) || /(^|[^a-z])lon([^a-z]|$)/.test(token)) {
        return true;
    }

    // A cell with a GMT <select> is never a lat/long cell — short-circuit so
    // a stray "lat"/"lon" substring elsewhere never excludes a real
    // Date-Time cell.
    if (cell.querySelector('select')) return false;

    const input = cell.querySelector('input');
    if (!input) return false;

    const placeholder = input.getAttribute('placeholder') || '';
    if (DMS_PLACEHOLDER_RE.test(placeholder)) return true;

    const val = (input.value || '').trim();
    if (val && DMS_VALUE_RE.test(val)) return true;

    return false;
}

function cellLooksLikeDateTime(cell) {
    if (!cell) return false;
    if (cellLooksLikeLatLon(cell)) return false; // lat/lon always disqualified first

    const hasSelect = !!cell.querySelector('select');
    if (!hasSelect) return false;

    const inputs = Array.from(cell.querySelectorAll('input')).filter(i => i.type !== 'hidden');
    return inputs.length >= 1;
}

// Reads a Start/End Date-Time table cell: date input + time input + GMT select.
function scrapeDateTimeCell(cell) {
    const empty = {
        dateStr: '', timeStr: '', offset: '', raw: '',
        ts: NaN, hasDate: false, hasTime: false, filled: false, element: cell || null
    };
    if (!cell) return empty;

    // v7.4.1: defensive re-check — never extract a date/time out of what is
    // structurally a Latitude/Longitude cell, even if one somehow reaches
    // this function.
    if (cellLooksLikeLatLon(cell)) return empty;

    const inputs = Array.from(cell.querySelectorAll('input')).filter(i => i.type !== 'hidden');

    let dateStr = '';
    let timeStr = '';
    let dateEl  = null;
    let timeEl  = null;

    for (const inp of inputs) {
        const val = (inp.value || '').trim();
        if (!val) continue;
        if (!timeStr && /^\d{1,2}:\d{2}/.test(val)) { timeStr = val; timeEl = inp; continue; }
        if (!dateStr && /\d{1,4}[.\-/]\d{1,2}[.\-/]\d{2,4}/.test(val)) { dateStr = val; dateEl = inp; }
    }

    // Positional fallback — first input is the date box, second the time box.
    if (!dateEl && inputs[0]) dateEl = inputs[0];
    if (!timeEl && inputs[1]) timeEl = inputs[1];

    let offset = '';
    const sel = cell.querySelector('select');
    if (sel) {
        const opt = sel.options && sel.options[sel.selectedIndex];
        offset = normaliseOffsetString(opt ? (opt.text || opt.value) : sel.value);
    }

    const hasDate = !!dateStr;
    const hasTime = !!timeStr;

    return {
        dateStr,
        timeStr,
        offset,
        raw: [dateStr, timeStr, offset].filter(Boolean).join(' ').trim(),
        ts: hasDate && hasTime ? eventDateTimeToTimestamp(dateStr, timeStr, offset) : NaN,
        hasDate,
        hasTime,
        filled: hasDate && hasTime,
        element: (!hasDate && dateEl) ? dateEl : (!hasTime && timeEl ? timeEl : (dateEl || timeEl || cell))
    };
}

// v7.4.1: candidates are restricted to cells that structurally look like a
// Date-Time cell (select + input). Attribute-name text and the header-index
// map are used ONLY to choose between those already-qualified candidates —
// neither can promote a Lat/Long cell into being treated as Start/End
// Date-Time, no matter how the site names or orders its columns.
function locateDateTimeCells(row, headerMap) {
    const cells = Array.from(row.querySelectorAll('td'));

    const candidates = [];
    cells.forEach((cell, idx) => {
        if (cellLooksLikeDateTime(cell)) candidates.push({ cell, idx });
    });

    if (candidates.length === 0) return { startCell: null, endCell: null };

    function tokenSaysStart(cell) {
        const token = normaliseColumnToken(cell.getAttribute('data-td-name'));
        return token.includes('start') && (token.includes('time') || token.includes('date'));
    }
    function tokenSaysEnd(cell) {
        const token = normaliseColumnToken(cell.getAttribute('data-td-name'));
        return token.includes('end') && (token.includes('time') || token.includes('date'));
    }

    let startCell = (candidates.find(c => tokenSaysStart(c.cell)) || {}).cell || null;
    let endCell   = (candidates.find(c => tokenSaysEnd(c.cell))   || {}).cell || null;

    // Header-index tiebreak — but only among the structurally-valid
    // candidates. If headerMap.endCol happens to point at a Lat/Long column
    // (e.g. because of a shifted/stale header map), no candidate will have
    // that idx, so this simply finds nothing and falls through safely.
    if (headerMap) {
        if (!startCell) {
            const m = candidates.find(c => c.idx === headerMap.startCol);
            if (m) startCell = m.cell;
        }
        if (!endCell) {
            const m = candidates.find(c => c.idx === headerMap.endCol);
            if (m) endCell = m.cell;
        }
    }

    // DOM-order fallback — Start Date/Time always precedes End Date/Time.
    if ((!startCell || !endCell) && candidates.length >= 2) {
        const sorted = candidates.slice().sort((a, b) => a.idx - b.idx);
        if (!startCell) startCell = sorted[0].cell;
        if (!endCell)   endCell   = sorted[sorted.length - 1].cell;
    } else if (!startCell && candidates.length === 1) {
        // Only one Date-Time-looking cell on the row — treat it as Start
        // rather than guessing; End stays unresolved (reported as missing).
        startCell = candidates[0].cell;
    }

    // Never let the same cell serve as both Start and End.
    if (startCell && startCell === endCell) endCell = null;

    return { startCell, endCell };
}

function buildEventHeaderMap(block) {
    const headerRow = Array.from(block.querySelectorAll('tr')).find(tr => {
        const txt = (tr.innerText || '').toUpperCase().replace(/\s+/g, ' ');
        return txt.includes('START DATE') || txt.includes('END DATE');
    });
    if (!headerRow) return null;

    const cells = Array.from(headerRow.querySelectorAll('th, td'));
    let startCol = -1;
    let endCol   = -1;

    cells.forEach((c, idx) => {
        const txt = (c.innerText || '').toUpperCase().replace(/\s+/g, ' ').trim();
        if (startCol < 0 && txt.includes('START DATE')) startCol = idx;
        if (endCol   < 0 && txt.includes('END DATE'))   endCol   = idx;
    });

    if (startCol < 0 && endCol < 0) return null;
    return { startCol, endCol };
}

function scrapeEventRows() {
    const rows = [];
    const seenRowElements = new Set();

    for (const block of findEventsBlocks()) {
        const headerMap = buildEventHeaderMap(block);

        const candidateRows = Array.from(block.querySelectorAll('tr'));
        for (const tr of candidateRows) {
            if (seenRowElements.has(tr)) continue;

            const selectEl = tr.querySelector(
                'select[id*="eventtypes" i], select[name*="eventtypes" i], ' +
                'select[data-td-name*="eventtypes" i], select#gsinporteventtypes'
            );
            if (!selectEl) continue;

            seenRowElements.add(tr);

            const selectedText = (
                selectEl.options && selectEl.options[selectEl.selectedIndex]
                    ? selectEl.options[selectEl.selectedIndex].text
                    : ''
            ).trim();

            const isBlank =
                !selectedText ||
                selectedText.toLowerCase().includes('select') ||
                selectEl.selectedIndex === 0;

            const { startCell, endCell } = locateDateTimeCells(tr, headerMap);

            rows.push({
                index: rows.length,
                eventType: selectedText,
                normalisedEventType: selectedText.trim().toUpperCase().replace(/\s+/g, ' '),
                isBlank,
                rowEl: tr,
                selectEl,
                block,
                start: scrapeDateTimeCell(startCell),
                end:   scrapeDateTimeCell(endCell)
            });
        }
    }

    return rows;
}

// ---------------------------------------------------------------------------
//   EVENT BLOCK FUEL ROB VALIDATION  (v7.1.2 — Validation Check #5)
//
//   Reads the per-fuel-type ROB Start / ROB End sub-grid that appears
//   beneath an Events row (see EVENTS fieldset). Confirms:
//     - ROB Start = ROB End for any fuel type with no recorded consumption.
//     - At least one fuel type has a non-blank ROB value when an event
//       is present (an event must not be saved with all-blank ROB rows).
// ---------------------------------------------------------------------------

function scrapeEventFuelRows() {
    const fuelRows = [];

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

        const headerRow = Array.from(targetEventsBlock.querySelectorAll('tr')).find(tr => {
            const txt = (tr.innerText || '').toUpperCase();
            return txt.includes('ROB START') && txt.includes('ROB END');
        });
        if (!headerRow) continue;

        const headerCells = Array.from(headerRow.querySelectorAll('th, td')).map(c => (c.innerText || '').trim().toUpperCase());
        const robStartCol = headerCells.findIndex(t => t.includes('ROB START'));
        const robEndCol   = headerCells.findIndex(t => t.includes('ROB END'));
        if (robStartCol < 0 || robEndCol < 0) continue;

        let dataRows = [];
        const table = headerRow.closest('table') || targetEventsBlock;
        const allRows = Array.from(table.querySelectorAll('tr'));
        const headerIdx = allRows.indexOf(headerRow);
        if (headerIdx >= 0) dataRows = allRows.slice(headerIdx + 1);

        dataRows.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td, th'));
            if (cells.length === 0) return;
            const fuelTypeLabel = (cells[0].innerText || '').trim();
            if (!fuelTypeLabel) return;

            const getVal = (colIdx) => {
                const cell = cells[colIdx];
                if (!cell) return null;
                const inp = cell.querySelector('input');
                const raw = inp ? inp.value : (cell.innerText || '');
                const trimmed = (raw || '').trim();
                if (trimmed === '') return null;
                const v = parseFloat(trimmed);
                return isNaN(v) ? null : v;
            };

            const robStart = getVal(robStartCol);
            const robEnd   = getVal(robEndCol);

            const hasConsumption = Array.from(tr.querySelectorAll('input')).some((inp, i) => {
                if (i <= Math.max(robStartCol, robEndCol)) return false;
                const v = parseFloat(inp.value);
                return !isNaN(v) && v > 0;
            });

            fuelRows.push({ fuelType: fuelTypeLabel, robStart, robEnd, hasConsumption });
        });
    }

    return fuelRows;
}

function validateEventFuelBlock(fuelRows) {
    const result = { errors: [], warnings: [] };
    if (!fuelRows || fuelRows.length === 0) return result;

    let anyFilled = false;
    fuelRows.forEach(fr => {
        if (fr.robStart !== null || fr.robEnd !== null) anyFilled = true;

        if (fr.robStart !== null && fr.robEnd !== null &&
            Math.abs(fr.robStart - fr.robEnd) > CONFIG.ADJ_TOLERANCE && !fr.hasConsumption) {
            result.errors.push(
                `Event Fuel ROB Mismatch [${fr.fuelType}]: ROB Start (${fr.robStart}) ≠ ROB End (${fr.robEnd}) ` +
                `with no recorded consumption against this fuel type.`
            );
        }
    });

    if (!anyFilled) {
        result.errors.push(
            'Event Block Validation: an event is present but every fuel type ROB value is blank — ' +
            'at least one fuel type must have a ROB value recorded before the event can be saved.'
        );
    }

    return result;
}

// ---------------------------------------------------------------------------
//   EVENTS BLOCK VALIDATOR
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//   v7.4.0 [1] — CONDITIONAL AUTO-DELETE OF BLANK EVENT ROWS
//
//   A blank event row is deleted automatically ONLY when BOTH hold:
//     1. Vessel status is "At Sea", AND
//     2. No fuel consumption is recorded under ANY of the purpose columns
//        Propulsion · Maneuver · Generator · L/D · Deballast · IGS · Boiler
//
//   Otherwise the row is preserved:
//     • Not At Sea (In Port / Arrival / Departure) → the check does not apply
//       at all; the blank row stays exactly as it is.
//     • At Sea with consumption → real fuel means a real operational event
//       occurred, so the row must be documented, not deleted. Autopilot
//       raises a manual-review warning naming the purpose column(s) involved.
//
//   Returns:
//     { outcome, deleted, purposesWithConsumption, message }
//   outcome ∈ 'no-blank-rows' | 'deleted' | 'preserved-not-at-sea'
//             | 'blocked-consumption' | 'no-delete-control'
// ---------------------------------------------------------------------------

async function evaluateBlankEventRows() {
    const blankRows = scrapeEventRows().filter(r => r.isBlank);

    if (blankRows.length === 0) {
        return { outcome: 'no-blank-rows', deleted: 0, purposesWithConsumption: [], message: '' };
    }

    // ── Condition 1: vessel status must be At Sea ────────────────────────
    const atSea = isVesselAtSea();
    if (!atSea) {
        const statusText = getVesselStatusText() || 'not readable — treated as not At Sea';
        const message =
            `${blankRows.length} blank event row(s) left untouched: vessel status is "${statusText}", ` +
            `not "At Sea". The blank-row auto-delete check only applies to At Sea reports.`;
        return { outcome: 'preserved-not-at-sea', deleted: 0, purposesWithConsumption: [], message };
    }

    // ── Condition 2: no consumption under any purpose column ─────────────
    const fuel = getPurposeFuelConsumptionTotals();

    setStatus(
        `⛽ Purpose fuel scan (${fuel.tablesScanned} table(s), columns found: ` +
        `${fuel.columnsFound.length ? fuel.columnsFound.join(', ') : 'none'}) — ` +
        Object.entries(fuel.totals).map(([p, v]) => `${p}=${v}`).join('  '),
        'info'
    );

    if (fuel.purposesWithConsumption.length > 0) {
        const detail = fuel.purposesWithConsumption
            .map(p => `${p} (${fuel.totals[p]})`)
            .join(', ');
        const message =
            `Blank event row cannot be deleted because fuel consumption was recorded for ` +
            `${formatPurposeList(fuel.purposesWithConsumption)}. ` +
            `Please review and document the operational event. Recorded consumption: ${detail}.`;
        return {
            outcome: 'blocked-consumption',
            deleted: 0,
            purposesWithConsumption: fuel.purposesWithConsumption,
            message
        };
    }

    // ── Both conditions satisfied → safe to delete ───────────────────────
    let deleted = 0;
    let missingControl = 0;

    for (const row of blankRows) {
        const delBtn = row.rowEl.querySelector(
            'button[name="delBtn"], button.tblBtn[onclick*="removeFromCopy"]'
        );

        if (!delBtn) { missingControl++; continue; }

        setStatus('🗑️ At Sea with zero purpose-column consumption — auto-deleting blank event row...', 'warning');
        delBtn.click();
        await sleep(400);
        deleted++;
    }

    if (deleted === 0 && missingControl > 0) {
        return {
            outcome: 'no-delete-control',
            deleted: 0,
            purposesWithConsumption: [],
            message:
                `${missingControl} blank event row(s) found with no delete control available. ` +
                `The row cannot be removed automatically — please review it manually.`
        };
    }

    return {
        outcome: 'deleted',
        deleted,
        purposesWithConsumption: [],
        message: `${deleted} blank event row(s) deleted (At Sea, no purpose-column fuel consumption recorded).`
    };
}

function validatePortEvents() {
    let portLayoutDetected = false;
    let containsInvalidEvent = false;
    let invalidEventName = '';
    // v7.4.0 [1]: blank rows are counted separately from genuinely
    // unapproved events. A blank row is not an "unapproved event scenario" —
    // it is handled by the conditional auto-delete rules instead.
    let blankRowCount = 0;

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

            // v7.4.0 [1]: placeholder / blank selection — not an unapproved
            // event. Counted separately and handled by the blank-row rules.
            if (upperText.includes('SELECT') || selectEl.selectedIndex === 0) {
                blankRowCount++;
                continue;
            }

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

    if (!portLayoutDetected) return { status: 'SEA', blankRowCount };
    if (containsInvalidEvent) return { status: 'INVALID', event: invalidEventName, blankRowCount };
    return { status: 'VALID_PORT', blankRowCount };
}

// ---------------------------------------------------------------------------
//   v7.4.0 [9] — EVENT END DATE/TIME MUST NOT BE BLANK
//
//   Every event row that has an event type selected must carry a complete
//   End Date/Time. A blank (or half-filled) End Date/Time halts Autopilot
//   immediately, highlights the offending field and scrolls it into view.
//
//   Blank rows (no event type selected) are excluded — they are governed by
//   the blank-row rules in requirement [1].
// ---------------------------------------------------------------------------

function validateEventEndDateTimes(eventRows) {
    const result = { errors: [], checked: 0 };
    const rows = eventRows || scrapeEventRows();

    for (const row of rows) {
        if (row.isBlank) continue;
        result.checked++;

        if (row.end.filled) {
            if (row.end.element && row.end.element.style) {
                row.end.element.style.cssText = FIELD_STYLES.SUCCESS_NOBG;
            }
            continue;
        }

        let missingPart;
        if (!row.end.hasDate && !row.end.hasTime) missingPart = 'End Date/Time is missing';
        else if (!row.end.hasDate)                missingPart = 'the End Date part is missing';
        else                                      missingPart = 'the End Time part is missing';

        const target = row.end.element || row.rowEl;
        if (target && target.style) target.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
        if (row.rowEl && row.rowEl.style) row.rowEl.style.outline = '3px solid #f44336';

        scrollToIssueElement(
            target,
            `Event ${row.index + 1} [${row.eventType}] is missing its End Date/Time.`
        );

        result.errors.push(
            `Validation failed: End Date/Time is missing for event ${row.index + 1} ` +
            `[${row.eventType}]${row.start.filled ? ` starting ${row.start.raw}` : ''} — ${missingPart}. ` +
            `Please enter the End Date/Time before continuing.`
        );
    }

    return result;
}

// ---------------------------------------------------------------------------
//   v7.4.0 [6] — DEPARTURE REPORT: FINAL EVENT VALIDATION
//
//   On a Departure report the last event in the sequence must be
//   "SHIFTING FROM LAST BERTH TO SEA". Validates that the event exists, that
//   it is the last one, and that nothing follows it.
// ---------------------------------------------------------------------------

function isDepartureReportContext(reportContext, currentSig) {
    if (reportContext && reportContext.isDepartureReport) return true;
    if (reportContext && /departure/i.test(reportContext.reportType || '')) return true;
    if (currentSig && /departure/i.test(currentSig.reportType || '')) return true;
    return false;
}

function validateDepartureFinalEvent(eventRows) {
    const result = { errors: [], applicable: true };

    const rows = (eventRows || scrapeEventRows()).filter(r => !r.isBlank);

    if (rows.length === 0) {
        result.errors.push(
            `Departure Report validation failed: no events are recorded, so the required final event ` +
            `"${CONFIG.DEPARTURE_FINAL_EVENT}" is missing.`
        );
        return result;
    }

    const aliases = CONFIG.DEPARTURE_FINAL_EVENT_ALIASES.map(a => a.toUpperCase());
    const matchIndexes = rows
        .map((r, i) => (aliases.some(a => r.normalisedEventType.includes(a)) ? i : -1))
        .filter(i => i >= 0);

    if (matchIndexes.length === 0) {
        const listed = rows.map((r, i) => `${i + 1}. ${r.eventType}`).join(' | ');
        if (rows.length) {
            const last = rows[rows.length - 1];
            if (last.selectEl && last.selectEl.style) last.selectEl.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
            scrollToIssueElement(last.selectEl || last.rowEl, 'Departure report is missing its final event.');
        }
        result.errors.push(
            `Departure Report validation failed: the required final event "${CONFIG.DEPARTURE_FINAL_EVENT}" ` +
            `was not found. Events currently recorded: ${listed}.`
        );
        return result;
    }

    const lastMatch  = matchIndexes[matchIndexes.length - 1];
    const trailing   = rows.slice(lastMatch + 1);

    if (trailing.length > 0) {
        const offenders = trailing.map((r, i) => `${lastMatch + 2 + i}. ${r.eventType}`).join(' | ');
        trailing.forEach(r => {
            if (r.selectEl && r.selectEl.style) r.selectEl.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
        });
        scrollToIssueElement(
            trailing[0].selectEl || trailing[0].rowEl,
            'Unexpected event recorded after "Shifting from Last Berth to Sea".'
        );
        result.errors.push(
            `Departure Report validation failed: "${CONFIG.DEPARTURE_FINAL_EVENT}" must be the LAST event, ` +
            `but ${trailing.length} event(s) appear after it — ${offenders}. ` +
            `Remove or re-order the trailing event(s) so the departure ends at the shift to sea.`
        );
        return result;
    }

    if (matchIndexes.length > 1) {
        result.errors.push(
            `Departure Report validation failed: "${CONFIG.DEPARTURE_FINAL_EVENT}" appears ${matchIndexes.length} ` +
            `times in the event sequence (rows ${matchIndexes.map(i => i + 1).join(', ')}). ` +
            `It must appear exactly once, as the final event.`
        );
        return result;
    }

    const finalRow = rows[lastMatch];
    if (finalRow.selectEl && finalRow.selectEl.style) {
        finalRow.selectEl.style.cssText = FIELD_STYLES.SUCCESS_NOBG;
    }
    return result;
}

// ---------------------------------------------------------------------------
//   v7.4.0 [7] — ARRIVAL / AT SEA EVENT CONFLICT
//
//   Events are indexed per report as the run progresses. If the same event
//   turns up in both an Arrival report and an At Sea report for the same
//   vessel, that is a data conflict requiring the user — Autopilot halts and
//   names the event and both reports.
//
//   "Same event" = same event type AND (identical start timestamps within
//   EVENT_MATCH_TOLERANCE_MS, or overlapping start→end windows).
// ---------------------------------------------------------------------------

const ReportEventIndex = {
    entries: []   // { key, label, vessel, category, events: [{type,startTs,endTs,raw}] }
};
window.__autopilotEventIndex = ReportEventIndex;

function resetReportEventIndex() {
    ReportEventIndex.entries = [];
}

function categoriseReportForEventConflict(reportContext, currentSig) {
    const typeText = [
        currentSig ? currentSig.reportType : '',
        reportContext ? reportContext.reportType : ''
    ].join(' ').toLowerCase();

    // Departure reports legitimately mix port and sea events, so they are
    // excluded from this comparison.
    if (/departure/.test(typeText)) return 'departure';
    if (/arrival/.test(typeText))   return 'arrival';
    if (/sea|noon/.test(typeText))  return 'at-sea';
    if (/port/.test(typeText))      return 'in-port';
    return 'other';
}

function eventsAreSameOccurrence(a, b) {
    if (a.type !== b.type) return false;

    const tol = CONFIG.EVENT_MATCH_TOLERANCE_MS;

    if (!isNaN(a.startTs) && !isNaN(b.startTs) && Math.abs(a.startTs - b.startTs) <= tol) {
        return { matchType: 'identical start time' };
    }

    const aEnd = !isNaN(a.endTs) ? a.endTs : a.startTs;
    const bEnd = !isNaN(b.endTs) ? b.endTs : b.startTs;

    if (!isNaN(a.startTs) && !isNaN(b.startTs) && !isNaN(aEnd) && !isNaN(bEnd)) {
        if (a.startTs < bEnd && b.startTs < aEnd) {
            return { matchType: 'overlapping time window' };
        }
    }

    return false;
}

// Records the current report's events and returns any Arrival ↔ At Sea
// conflicts found against reports already seen in this run.
function recordAndCheckArrivalSeaEventConflicts(reportContext, currentSig, eventRows) {
    const result = { errors: [], recorded: 0 };

    const category = categoriseReportForEventConflict(reportContext, currentSig);
    if (category !== 'arrival' && category !== 'at-sea') return result;

    const rows = (eventRows || scrapeEventRows()).filter(r => !r.isBlank);
    const events = rows.map(r => ({
        type:    r.normalisedEventType,
        display: r.eventType,
        startTs: r.start.ts,
        endTs:   r.end.ts,
        raw:     r.start.raw || '(no start time)'
    }));

    const key    = sigKey(currentSig);
    const label  = currentSig ? describeSignature(currentSig) : (reportContext.reportType || 'current report');
    const vessel = currentSig ? currentSig.vesselName : '';

    const counterpart = category === 'arrival' ? 'at-sea' : 'arrival';

    for (const prior of ReportEventIndex.entries) {
        if (prior.key === key) continue;
        if (prior.category !== counterpart) continue;
        if (vessel && prior.vessel && vessel !== prior.vessel) continue;

        for (const ev of events) {
            for (const priorEv of prior.events) {
                const match = eventsAreSameOccurrence(ev, priorEv);
                if (!match) continue;

                const arrivalLabel = category === 'arrival' ? label : prior.label;
                const seaLabel     = category === 'arrival' ? prior.label : label;

                result.errors.push(
                    `Validation stopped: Event "${ev.display}" exists in both the Arrival Report and the ` +
                    `At Sea Report (${match.matchType}). ` +
                    `Arrival Report: ${arrivalLabel}. At Sea Report: ${seaLabel}. ` +
                    `Event window: ${ev.raw}. ` +
                    `Please review the conflicting event before continuing.`
                );
            }
        }
    }

    // Index this report regardless, so the counterpart report can be checked
    // against it when it is processed.
    const existing = ReportEventIndex.entries.find(e => e.key === key);
    if (existing) {
        existing.events = events;
    } else {
        ReportEventIndex.entries.push({ key, label, vessel, category, events });
    }
    result.recorded = events.length;

    return result;
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

// ---------------------------------------------------------------------------
//   VOYAGE / SEQUENCE / DISTANCE VALIDATION  (v7.1.2)
//
//   Validation Checks implemented here:
//     1. Sequential Date Verification  — current report time must be later
//        than the previous report's time.
//     2. Reporting Period Limits        — interval between reports must be
//        within REPORT_INTERVAL_MIN_HOURS .. REPORT_INTERVAL_MAX_HOURS.
//     3. Voyage Continuity (Sidebar)    — voyage numbers must not skip or
//        go backwards between adjacent same-vessel reports.
//     4. Distance Logic                 — observed distance of 0 combined
//        with non-zero fuel consumption is flagged as suspicious.
// ---------------------------------------------------------------------------

function extractVoyageNumber(sig) {
    if (!sig || !sig.routeInfo) return null;
    const m = sig.routeInfo.match(/VOY\.?\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
}

function runSequenceAndContinuityChecks(crossReportData) {
    const result = { errors: [], warnings: [] };
    const { sidebarCards, currentSig, currentCard } = crossReportData || {};
    if (!currentSig || !sidebarCards || sidebarCards.length === 0) return result;

    const { previousCard } = findAdjacentVesselReports(currentSig, sidebarCards, currentCard);
    if (!previousCard) return result;

    const prevSig = extractCardSignature(previousCard);
    const currTs  = reportTimestamp(currentSig);
    const prevTs  = reportTimestamp(prevSig);

    if (!isNaN(currTs) && !isNaN(prevTs)) {
        // 1. Sequential Date Verification
        if (currTs <= prevTs) {
            result.errors.push(
                `Sequential Date Violation: current report (${currentSig.date} ${currentSig.time}) is not ` +
                `later than the previous report (${prevSig.date} ${prevSig.time}).`
            );
        } else {
            // 2. Reporting Period Limits
            const hoursDiff = (currTs - prevTs) / (1000 * 60 * 60);
            if (hoursDiff < CONFIG.REPORT_INTERVAL_MIN_HOURS) {
                result.errors.push(
                    `Reporting Period Violation: interval since previous report is only ${hoursDiff.toFixed(2)} hrs ` +
                    `(minimum ${CONFIG.REPORT_INTERVAL_MIN_HOURS} hr) — possible duplicate or misdated report.`
                );
            } else if (hoursDiff > CONFIG.REPORT_INTERVAL_MAX_HOURS) {
                // v7.3.0: Report Time Gap Validation — gap > 26 hrs between
                // consecutive reports means Autopilot must halt immediately
                // and wait for user intervention rather than skip/bypass.
                result.errors.push(
                    `Report Time Gap Violation: interval since previous report is ${hoursDiff.toFixed(2)} hrs, ` +
                    `exceeding the maximum allowed ${CONFIG.REPORT_INTERVAL_MAX_HOURS} hrs — Autopilot halted ` +
                    `immediately, awaiting user intervention. A report may be missing.`
                );
            }
        }
    }

    // 3. Voyage Continuity (Sidebar)
    const currVoy = extractVoyageNumber(currentSig);
    const prevVoy = extractVoyageNumber(prevSig);
    if (currVoy !== null && prevVoy !== null && currVoy !== prevVoy) {
        const diff = currVoy - prevVoy;
        if (diff > 1) {
            result.warnings.push(
                `Voyage Continuity Gap: sidebar jumps from Voy ${prevVoy} to Voy ${currVoy} — ` +
                `intermediate voyage report(s) may be missing.`
            );
        } else if (diff < 0) {
            result.warnings.push(
                `Voyage Continuity Anomaly: voyage number decreased from ${prevVoy} to ${currVoy}.`
            );
        }
    }

    return result;
}

function checkDistanceVsFuelLogic() {
    const result = { errors: [], warnings: [] };

    let observedDistance = null;
    const labelEls = queryAllContexts('label, span, div, th, .field-label, .p-column-title');
    for (const lbl of labelEls) {
        const txt = (lbl.innerText || '').trim().toLowerCase();
        if (txt === 'observed distance' || txt.startsWith('observed distance')) {
            const container = lbl.closest('.p-field, .field-group, tr, .form-row, fieldset') || lbl.parentElement;
            const inp = container ? container.querySelector('input') : null;
            if (inp && inp.value.trim() !== '') {
                observedDistance = parseFloat(inp.value) || 0;
                break;
            }
        }
    }

    if (observedDistance === null || observedDistance > 0) return result;

    // Distance is 0 — check whether any fuel was consumed in the bunker ROB table.
    const bunkerRows = locateBunkerRows();
    let totalConsumed = 0;
    bunkerRows.forEach(row => {
        const robStartInp = row.querySelector('input');
        const cells = Array.from(row.querySelectorAll('input'));
        cells.forEach(inp => {
            const titleText = (inp.getAttribute('placeholder') || inp.id || inp.name || '').toLowerCase();
            if (titleText.includes('total') || titleText.includes('cons')) {
                totalConsumed += parseFloat(inp.value) || 0;
            }
        });
    });

    if (totalConsumed > 0) {
        result.warnings.push(
            `Distance Logic Anomaly: Observed Distance = 0 nm but ${totalConsumed.toFixed(2)} MT of fuel was ` +
            `reportedly consumed — vessel consumed fuel without recorded movement.`
        );
    }

    return result;
}

// ---------------------------------------------------------------------------
//   GREAT-CIRCLE DISTANCE VALIDATION  (v7.1.0)
//
//   Calculates the expected observed distance between the previous report's
//   position and the current report's position using the Haversine formula,
//   then compares it to the Observed Distance field the officer entered.
//
//   DMS parser handles all common formats seen in GeoEmissions:
//     "23 36' 49\" S"   "23 36 49 S"   "23°36'49\"S"   "23 36.82 S"
//   Works for both latitude (N/S) and longitude (E/W).
// ---------------------------------------------------------------------------

function parseDMStoDecimal(dmsStr) {
    if (!dmsStr || !dmsStr.trim()) return null;
    const s = dmsStr.trim().toUpperCase().replace(/°/g, ' ').replace(/'/g, ' ').replace(/"/g, ' ').replace(/,/g, '.');

    // Match: degrees [minutes [seconds]] hemisphere
    const m = s.match(
        /^(\d{1,3})\s+(\d{1,2})(?:\s+(\d{1,2}(?:\.\d+)?))?\s*([NSEW])$/
    ) || s.match(
        /^(\d{1,3})\s+(\d{1,2}(?:\.\d+)?)\s*([NSEW])$/
    ) || s.match(
        /^(\d{1,3}(?:\.\d+)?)\s*([NSEW])$/
    );

    if (!m) return null;

    let deg, min = 0, sec = 0, hem;
    if (m.length === 5) {
        // D M S H
        deg = parseFloat(m[1]);
        min = parseFloat(m[2]);
        sec = m[3] ? parseFloat(m[3]) : 0;
        hem = m[4];
    } else if (m.length === 4) {
        // D M.mm H
        deg = parseFloat(m[1]);
        min = parseFloat(m[2]);
        hem = m[3];
    } else {
        // D.ddd H
        deg = parseFloat(m[1]);
        hem = m[2];
    }

    const decimal = deg + min / 60 + sec / 3600;
    return (hem === 'S' || hem === 'W') ? -decimal : decimal;
}

function haversineNM(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth radius in nautical miles
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

function scrapeCurrentLatLon() {
    // Try id/name selectors first (confirmed from DOM screenshot)
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        const latInp = ctx.querySelector('input[id="latitude"], input[name="latitude"]');
        const lonInp = ctx.querySelector('input[id="longitude"], input[name="longitude"]');
        if (latInp && lonInp) {
            const lat = parseDMStoDecimal(latInp.value);
            const lon = parseDMStoDecimal(lonInp.value);
            if (lat !== null && lon !== null) return { lat, lon, latRaw: latInp.value, lonRaw: lonInp.value };
        }
    }
    // Fallback: label-adjacent search
    const labelEls = queryAllContexts('label, .field-label, th, span, div');
    let latVal = null, lonVal = null;
    for (const lbl of labelEls) {
        const txt = (lbl.innerText || '').trim().toLowerCase();
        const container = lbl.closest('.p-field, .form-container, .field-group, tr, .form-row') || lbl.parentElement;
        const inp = container ? container.querySelector('input') : null;
        if (!inp || !inp.value.trim()) continue;
        if (txt === 'latitude')  latVal = parseDMStoDecimal(inp.value);
        if (txt === 'longitude') lonVal = parseDMStoDecimal(inp.value);
    }
    if (latVal !== null && lonVal !== null) return { lat: latVal, lon: lonVal, latRaw: '', lonRaw: '' };
    return null;
}

function scrapeObservedDistance() {
    const labelEls = queryAllContexts('label, span, div, th, .field-label, .p-column-title');
    for (const lbl of labelEls) {
        const txt = (lbl.innerText || '').trim().toLowerCase();
        if (txt === 'observed distance' || txt === 'observed distance since last report') {
            const container = lbl.closest('.p-field, .field-group, tr, .form-row, fieldset') || lbl.parentElement;
            const inp = container ? container.querySelector('input') : null;
            if (inp && inp.value.trim() !== '') {
                return { value: parseFloat(inp.value), input: inp };
            }
        }
    }
    return null;
}

function runLatLonDistanceCheck() {
    const result = { errors: [], warnings: [], info: [] };

    const currentPos = scrapeCurrentLatLon();
    if (!currentPos) {
        result.info.push('Lat/Lon fields not found on this report — skipping great-circle distance check.');
        return result;
    }

    const prevPos = window._autopilotLastKnownPosition;

    if (!prevPos) {
        // First report in session — store and inform.
        result.info.push(
            `Current position recorded: Lat ${currentPos.latRaw || currentPos.lat.toFixed(4)}, ` +
            `Lon ${currentPos.lonRaw || currentPos.lon.toFixed(4)}. ` +
            `Great-circle check will run from the next report onwards.`
        );
        window._autopilotLastKnownPosition = currentPos;
        return result;
    }

    const calcDistNM = haversineNM(prevPos.lat, prevPos.lon, currentPos.lat, currentPos.lon);
    const obsDistData = scrapeObservedDistance();
    const obsDistNM   = obsDistData ? obsDistData.value : null;

    result.info.push(
        `📍 Previous position: Lat ${prevPos.latRaw || prevPos.lat.toFixed(4)}, Lon ${prevPos.lonRaw || prevPos.lon.toFixed(4)}`
    );
    result.info.push(
        `📍 Current  position: Lat ${currentPos.latRaw || currentPos.lat.toFixed(4)}, Lon ${currentPos.lonRaw || currentPos.lon.toFixed(4)}`
    );
    result.info.push(
        `🧭 Great-circle distance (Haversine): ${calcDistNM.toFixed(2)} NM`
    );

    if (obsDistNM !== null) {
        const diff = Math.abs(calcDistNM - obsDistNM);
        const pct  = calcDistNM > 0 ? (diff / calcDistNM) * 100 : 0;
        result.info.push(
            `📏 Reported Observed Distance: ${obsDistNM.toFixed(2)} NM  |  Difference: ${diff.toFixed(2)} NM (${pct.toFixed(1)}%)`
        );

        if (pct > 20 && diff > 50) {
            // Large absolute AND relative gap — flag as a warning.
            result.warnings.push(
                `Distance Discrepancy: Reported distance (${obsDistNM.toFixed(2)} NM) differs from ` +
                `the calculated great-circle distance (${calcDistNM.toFixed(2)} NM) by ${diff.toFixed(2)} NM ` +
                `(${pct.toFixed(1)}%). Please verify the lat/lon and observed distance entries.`
            );
        } else if (pct > 10 && diff > 20) {
            result.warnings.push(
                `Distance Notice: Reported distance (${obsDistNM.toFixed(2)} NM) is ${diff.toFixed(2)} NM ` +
                `off the calculated great-circle distance (${calcDistNM.toFixed(2)} NM) — minor discrepancy noted.`
            );
        }
    } else {
        result.info.push('ℹ️ Observed Distance field not found — distance comparison skipped.');
    }

    // Update stored position for the next iteration.
    window._autopilotLastKnownPosition = currentPos;
    return result;
}

// ---------------------------------------------------------------------------
//   DEAD RECKONING POSITION ESTIMATOR  (v7.2.0)
//
//   Uses the PREVIOUS report's confirmed position + the CURRENT report's
//   heading and observed distance to calculate where the vessel SHOULD be.
//   Compares that against the reported lat/lon and flags discrepancies.
//
//   Confirmed field names from vessel master data:
//     heading                        → degrees true (e.g. "145")
//     observeddistancesincelastreport → NM (e.g. "274.00")
//     latitude / longitude           → DMS (e.g. "24 48' 36\" N")
//
//   Formula: spherical Earth direct-reckoning (WGS-84 approximation)
//     lat2 = asin(sin(lat1)·cos(d/R) + cos(lat1)·sin(d/R)·cos(θ))
//     lon2 = lon1 + atan2(sin(θ)·sin(d/R)·cos(lat1), cos(d/R)−sin(lat1)·sin(lat2))
//   where R = 3440.065 NM, θ = heading in radians, d = distance in NM.
// ---------------------------------------------------------------------------

function decimalToDMS(decimal, isLat) {
    const hem = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const minFull = (abs - deg) * 60;
    const min = Math.floor(minFull);
    const sec = Math.round((minFull - min) * 60);
    return `${deg} ${min}' ${sec}" ${hem}`;
}

function deadReckonPosition(lat1, lon1, headingDeg, distanceNM) {
    const R   = 3440.065;
    const toR = d => d * Math.PI / 180;
    const toD = r => r * 180 / Math.PI;

    const φ1 = toR(lat1);
    const λ1 = toR(lon1);
    const θ  = toR(headingDeg);
    const δ  = distanceNM / R;

    const φ2 = Math.asin(
        Math.sin(φ1) * Math.cos(δ) +
        Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
    const λ2 = λ1 + Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

    return { lat: toD(φ2), lon: toD(λ2) };
}

function scrapeHeading() {
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        const inp = ctx.querySelector('input[id="heading"], input[name="heading"]');
        if (inp && inp.value.trim() !== '') {
            const v = parseFloat(inp.value);
            if (!isNaN(v) && v >= 0 && v <= 360) return v;
        }
    }
    return null;
}

function scrapeObservedDistanceValue() {
    // Try exact field name first (confirmed from vessel master)
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        const inp = ctx.querySelector(
            'input[name="observeddistancesincelastreport"], ' +
            'input[id="observeddistancesincelastreport"]'
        );
        if (inp && inp.value.trim() !== '') {
            const v = parseFloat(inp.value);
            if (!isNaN(v)) return v;
        }
    }
    // Fallback: label search
    const labelEls = queryAllContexts('label, span, div, th, .field-label');
    for (const lbl of labelEls) {
        const txt = (lbl.innerText || '').trim().toLowerCase();
        if (txt.includes('observed distance')) {
            const container = lbl.closest('.p-field, .field-group, tr, .form-row, fieldset') || lbl.parentElement;
            const inp = container ? container.querySelector('input') : null;
            if (inp && inp.value.trim() !== '') return parseFloat(inp.value) || null;
        }
    }
    return null;
}

function runDeadReckoningCheck(reportType) {
    const result = { errors: [], warnings: [], info: [] };

    const currentPos = scrapeCurrentLatLon();

    // Always store lat/lon regardless of report type so the DR chain
    // stays intact when port/arrival/departure reports are processed
    // between at-sea reports. (v7.2.2)
    if (!currentPos) {
        result.info.push('⚠️ Lat/Lon fields not found on this report — position not stored.');
        return result;
    }

    // Only run the DR comparison on At Sea reports
    if (!reportType || !reportType.toLowerCase().includes('sea')) {
        const posDMS = `${currentPos.latRaw || decimalToDMS(currentPos.lat, true)}, ${currentPos.lonRaw || decimalToDMS(currentPos.lon, false)}`;
        result.info.push(`📍 Position stored from non-At-Sea report: ${posDMS}`);
        window._autopilotLastKnownPosition = currentPos;
        return result;
    }

    const prevPos = window._autopilotLastKnownPosition;

    // ── STEP 1: Store position on first report, skip DR ─────────────────────
    if (!prevPos) {
        result.info.push(
            `📍 Position recorded: ${currentPos.latRaw || decimalToDMS(currentPos.lat, true)}, ` +
            `${currentPos.lonRaw || decimalToDMS(currentPos.lon, false)}. ` +
            `Dead reckoning will run from the next report onwards.`
        );
        window._autopilotLastKnownPosition = currentPos;
        return result;
    }

    // ── STEP 2: Read heading and observed distance from current form ─────────
    const heading  = scrapeHeading();
    const distNM   = scrapeObservedDistanceValue();

    result.info.push(`📍 Previous report position : ${prevPos.latRaw || decimalToDMS(prevPos.lat, true)},  ${prevPos.lonRaw || decimalToDMS(prevPos.lon, false)}`);
    result.info.push(`📍 Reported current position: ${currentPos.latRaw || decimalToDMS(currentPos.lat, true)},  ${currentPos.lonRaw || decimalToDMS(currentPos.lon, false)}`);

    if (heading === null) {
        result.info.push('ℹ️ Heading field not found — cannot run dead reckoning. Falling back to great-circle distance check only.');
        const gcDist = haversineNM(prevPos.lat, prevPos.lon, currentPos.lat, currentPos.lon);
        result.info.push(`🧭 Great-circle distance between reported positions: ${gcDist.toFixed(2)} NM`);
        if (distNM !== null) {
            const diff = Math.abs(gcDist - distNM);
            const pct  = distNM > 0 ? (diff / distNM) * 100 : 0;
            result.info.push(`📏 Observed Distance reported: ${distNM.toFixed(2)} NM  |  Difference: ${diff.toFixed(2)} NM (${pct.toFixed(1)}%)`);
            if (diff > 30) result.warnings.push(`Distance gap of ${diff.toFixed(1)} NM between reported positions and observed distance — check lat/lon entries.`);
        }
        window._autopilotLastKnownPosition = currentPos;
        return result;
    }

    if (distNM === null) {
        result.info.push('ℹ️ Observed Distance field not found — dead reckoning skipped.');
        window._autopilotLastKnownPosition = currentPos;
        return result;
    }

    // ── STEP 3: Dead reckon expected position ────────────────────────────────
    const expected = deadReckonPosition(prevPos.lat, prevPos.lon, heading, distNM);
    const expectedLatDMS = decimalToDMS(expected.lat, true);
    const expectedLonDMS = decimalToDMS(expected.lon, false);

    result.info.push(`🧭 Heading: ${heading}°  |  Observed Distance: ${distNM.toFixed(2)} NM`);
    result.info.push(`📐 Dead reckoned expected position: ${expectedLatDMS},  ${expectedLonDMS}`);

    // ── STEP 4: Compare expected vs reported ─────────────────────────────────
    const gapNM = haversineNM(expected.lat, expected.lon, currentPos.lat, currentPos.lon);
    result.info.push(`📏 Gap between dead reckoned and reported position: ${gapNM.toFixed(2)} NM`);

    if (gapNM <= 15) {
        result.info.push(`✅ Position check passed — reported coordinates are within ${gapNM.toFixed(1)} NM of dead reckoned position.`);
    } else if (gapNM <= 40) {
        result.warnings.push(
            `Position Discrepancy (${gapNM.toFixed(1)} NM): Reported position differs noticeably from dead reckoned estimate. ` +
            `This may be due to currents or course changes. ` +
            `💡 Suggested position: ${expectedLatDMS},  ${expectedLonDMS}`
        );
    } else {
        // Large gap — likely a Report Master coordinate error
        result.warnings.push(
            `⚠️ SIGNIFICANT Position Discrepancy (${gapNM.toFixed(1)} NM): Reported coordinates are far from where ` +
            `the vessel should be based on heading (${heading}°) and distance sailed (${distNM.toFixed(1)} NM).`
        );
        result.warnings.push(
            `💡 SUGGESTED CORRECTION — Latitude : ${expectedLatDMS}`
        );
        result.warnings.push(
            `💡 SUGGESTED CORRECTION — Longitude: ${expectedLonDMS}`
        );
        result.warnings.push(
            `   Cross-check against MarineTraffic if unsure. Dead reckoning is ±10-20 NM accurate on straight passages.`
        );
    }

    // ── STEP 5: Update stored position ───────────────────────────────────────
    // Store the REPORTED position (not the DR estimate) — the officer may
    // already know the DR is slightly off due to currents. Only switch to
    // the DR estimate if the gap is very large (likely a bad coordinate).
    window._autopilotLastKnownPosition = gapNM > 40 ? { ...expected, latRaw: expectedLatDMS, lonRaw: expectedLonDMS } : currentPos;

    return result;
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

// ---------------------------------------------------------------------------
//   WARNING DIALOG MESSAGE READER  (v7.1.4)
//
//   Two separate readers:
//   - extractWarningMessages()       STRICT — only <ul><li> / .warning-item.
//     Used for the bypass-or-lockout decision so that boilerplate nodes
//     (header, subtitle, "Prev Ref. Report:" line) never pollute the list
//     and cause false lockouts on recognised warning phrases.
//   - extractWarningDialogMessages() BROAD  — also reads headings / titles.
//     Used ONLY for fatal-error detection where the error text IS the title
//     (e.g. "Errors detected in the submitted data").
// ---------------------------------------------------------------------------

// Detects the "Observed distance (X NM) is more than Y% above calculated
// AIS distance (Z NM)" pattern, extracts both NM values and returns:
//   null        → not an AIS distance warning
//   'ok'        → diff ≤ AIS_DIST_WARN_NM (weather/current, bypass silently)
//   'warn'      → diff AIS_DIST_WARN_NM–AIS_DIST_LOCKOUT_NM (log + proceed)
//   'lockout'   → diff > AIS_DIST_LOCKOUT_NM (hard stop)
function classifyAISDistanceWarning(msgLower) {
    if (!msgLower.includes('calculated ais distance') &&
        !msgLower.includes('ais distance')) return null;

    const nums = msgLower.match(/[\d]+(?:\.\d+)?/g);
    if (!nums || nums.length < 2) return 'warn'; // can't parse — treat as advisory

    const observed   = parseFloat(nums[0]);
    const calculated = parseFloat(nums[1]);
    const diffNM     = Math.abs(observed - calculated);

    if (diffNM <= CONFIG.AIS_DIST_WARN_NM)    return { verdict: 'ok',      diffNM };
    if (diffNM <= CONFIG.AIS_DIST_LOCKOUT_NM) return { verdict: 'warn',    diffNM };
    return                                             { verdict: 'lockout', diffNM };
}

function getWarningDialog() {
    const selectors = [
        '#validation-errors-dialog',
        '.warnings-only',
        '[id*="validation-errors" i]',
        '[class*="warnings-only" i]'
    ];
    for (const sel of selectors) {
        const found = queryAllContexts(sel).find(el => {
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden';
        });
        if (found) return found;
    }
    return findOpenDialog();
}

// STRICT reader — only actual warning lines (<ul><li>, .warning-item).
// Nothing else. Used for bypass/lockout decision.
function extractWarningMessages() {
    const dialog = getWarningDialog();
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll('ul li, .warning-item'))
        .map(el => (el.innerText || el.textContent || '').trim())
        .filter(Boolean);
}

// BROAD reader — also reads headings. Used only for fatal-error detection.
function extractWarningDialogMessages() {
    const dialog = getWarningDialog();
    if (!dialog) return [];

    const BOILERPLATE = [
        /^do you want to continue/i,
        /^the system found some warnings/i,
        /^please fix the highlighted errors/i,
        /^prev ref\./i,
        /^previous report/i
    ];

    return Array.from(new Set(
        Array.from(dialog.querySelectorAll(
            'h1, h2, h3, h4, .header, .title, ul li, .warning-item'
        ))
        .map(el => (el.innerText || el.textContent || '').trim())
        .filter(Boolean)
        .filter(txt => !BOILERPLATE.some(re => re.test(txt)))
    ));
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
//   POST-APPROVAL GREEN-CHECK GUARD  (v7.1.2)
//
//   After approveReport() reports success, confirm the sidebar card for
//   that report actually shows the green "approved" state. If it does not
//   (e.g. the approval silently failed or only partially registered),
//   navigate back to the report and re-run the approval flow once before
//   giving up.
// ---------------------------------------------------------------------------

async function verifyApprovalAndRetry(targetSig, fallbackCard, attempt = 0) {
    // v7.2.6: poll up to 5 times with increasing waits before concluding
    // the card isn't green — Angular CSS transitions can take 1-3 seconds
    // to apply after the approval response arrives.
    const POLL_DELAYS = [800, 1200, 1500, 2000, 2500];
    let matchedCard = null;

    for (const delay of POLL_DELAYS) {
        await sleep(delay);
        await waitForDOMStable();

        const cards = getAllReportCards();
        matchedCard = cards.find(c => signaturesMatch(extractCardSignature(c), targetSig)) || fallbackCard;

        if (matchedCard && isCardChecked(matchedCard)) {
            setStatus('✅ Sidebar confirms approved status (card highlighted green).', 'success');
            return true;
        }
    }

    // After polling, if we still don't see green but the report form says
    // "already approved", trust that and treat it as success.
    if (isCurrentReportAlreadyApproved()) {
        setStatus('✅ Report confirmed approved via form state (sidebar colour lag — treating as success).', 'success');
        return true;
    }

    if (attempt >= 1) {
        // On second attempt, log a warning but do NOT halt — move to next report.
        setStatus('⚠️ Sidebar colour not detected as green after retry — approval likely registered. Continuing to next report.', 'warning');
        return true; // v7.2.6: never halt here — green detection is unreliable enough to not block progress
    }

    setStatus('⚠️ Sidebar card not visually green yet — re-checking after brief navigation...', 'warning');
    await navigateBackToReport(targetSig, fallbackCard);

    const reApproved = await approveReport();
    // 'already approved' (true) or success (true) both continue; only explicit false halts.
    // v7.4.0 [2]: a 'retry' sentinel is transient — surface it to the caller
    // so the main loop retries the report instead of stopping the bot.
    if (reApproved === 'retry') return 'retry';
    if (reApproved === false) return false;

    return verifyApprovalAndRetry(targetSig, fallbackCard, attempt + 1);
}

// ---------------------------------------------------------------------------
//   ENSURE ON CURRENT REPORT (guard called before approval)
// ---------------------------------------------------------------------------

async function ensureOnCurrentReport(currentSig, fallbackCard) {
    // ── Fast path: sidebar signature match ───────────────────────────────────
    const freshCards = getAllReportCards();
    const activeCard = identifyCurrentCard(freshCards);
    const activeSig  = activeCard ? extractCardSignature(activeCard) : null;

    if (activeSig && signaturesMatch(activeSig, currentSig)) {
        return true;
    }

    // ── Secondary: check the page header / form title banner ─────────────────
    // Angular re-renders after approval can briefly de-highlight the active
    // sidebar card, making identifyCurrentCard return null even though we
    // are still looking at the correct report. Use the report's date string
    // and vessel name as a lightweight page-content fingerprint.
    const pageText = document.body.innerText || '';
    const sigOk =
        (currentSig.vesselName && pageText.includes(currentSig.vesselName)) &&
        (currentSig.date        && pageText.includes(currentSig.date));

    if (sigOk) {
        // Page content matches — no navigation needed, proceed.
        return true;
    }

    // ── Tertiary: actually navigate back ─────────────────────────────────────
    setStatus('⚠️ Pre-approval guard: UI is not on the expected report — navigating back...', 'warning');
    const navResult = await navigateBackToReport(currentSig, fallbackCard);

    if (!navResult) {
        // Navigation could not be confirmed by signature, but we don't halt
        // outright — if the page still shows this vessel/date we're fine.
        const pageText2 = document.body.innerText || '';
        const stillOk =
            (currentSig.vesselName && pageText2.includes(currentSig.vesselName)) &&
            (currentSig.date        && pageText2.includes(currentSig.date));

        if (stillOk) {
            setStatus('⚠️ Pre-approval guard: navigation unconfirmed by signature but page content matches — proceeding.', 'warning');
            return true;
        }

        // Genuinely on the wrong page. v7.4.0 [2]: this is a navigation
        // problem, not a data problem — signal a retry so the loop can
        // re-navigate rather than leaving the bot stopped.
        setStatus('⚠️ Pre-approval guard: not on the expected report — retrying navigation.', 'warning');
        return 'retry';
    }

    return true;
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
    setStatus('Initiating Smart Sandbox Scan (v7.4.2)...', 'info');
    await sleep(CONFIG.SLEEP_INIT_MS);

    if (isCurrentReportAlreadyApproved()) {
        setStatus('⚠️ Current report is already approved. Skipping validation and moving ahead.', 'warning');
        // v7.2.0: still capture lat/lon so dead reckoning chain is not broken
        const approvedPos = scrapeCurrentLatLon();
        if (approvedPos) {
            window._autopilotLastKnownPosition = approvedPos;
            setStatus(`📍 Position captured from approved report: ${approvedPos.latRaw || decimalToDMS(approvedPos.lat, true)}, ${approvedPos.lonRaw || decimalToDMS(approvedPos.lon, false)}`, 'info');
        }
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
            // v7.3.0: Duplicate Report Rejection — a duplicate is an
            // expected, self-resolving outcome, not a fatal error.
            // Autopilot auto-rejects it with an explanation and then
            // continues straight on to the next report; it must NOT pause
            // or wait for the user to manually restart/resume.
            setStatus('⚠️ Duplicate report detected — auto-rejecting and continuing (recoverable result, not a halt).', 'warning');
            setStatus(`   Current report:  ${describeSignature(currentSig)} ${currentSig.utcOffset || ''}`, 'warning');
            setStatus(`   Matches existing report:  ${describeSignature(matchedSig)} ${matchedSig.utcOffset || ''}`, 'warning');
            setStatus(`   Basis: ${duplicateMatch.reason || 'complete timestamp match'}`, 'warning');

            const rejectionMessage =
                `Duplicate Report Detected: this report (${describeSignature(currentSig)} ${currentSig.utcOffset || ''}) ` +
                `matches an existing report already on file (${describeSignature(matchedSig)} ${matchedSig.utcOffset || ''}). ` +
                `Basis: ${duplicateMatch.reason || 'complete timestamp match'}.`;

            const rejected = await rejectReportAsDuplicate(rejectionMessage);
            if (rejected) {
                setStatus('✅ Report rejected automatically with duplicate explanation. Continuing to next report...', 'success');
            } else {
                setStatus('⚠️ Automatic rejection did not complete cleanly — continuing to next report anyway (no pause).', 'warning');
            }
            // Sentinel value (not boolean) tells the caller: this was not a
            // failure — skip navigation-blocking logic and move straight to
            // the next report without halting Autopilot.
            return 'duplicate-skip';
        }
    } else {
        setStatus('✅ Duplicate Scan: No matching duplicate found in the report list.', 'success');
    }

    // ── 2. PORT EVENTS BLOCK CHECK ───────────────────────────────────────────
    setStatus('Analyzing active operational event parameters...', 'info');
    let eventCheck = validatePortEvents();

    // v7.4.0 [1]: blank rows are no longer treated as an unapproved event.
    // They are resolved by the conditional auto-delete rules below.
    if (eventCheck.blankRowCount > 0) {
        setStatus(`⚠️ ${eventCheck.blankRowCount} blank event row(s) detected — applying conditional auto-delete rules...`, 'warning');

        const blankResult = await evaluateBlankEventRows();

        switch (blankResult.outcome) {
            case 'deleted':
                setStatus(`✅ ${blankResult.message} Re-running event check...`, 'success');
                await sleep(CONFIG.SLEEP_POST_CLICK_MS);
                eventCheck = validatePortEvents();
                break;

            case 'preserved-not-at-sea':
                // In Port / Arrival / Departure — leave the row exactly as-is
                // and do NOT treat it as a lockout.
                setStatus(`ℹ️ ${blankResult.message}`, 'info');
                break;

            case 'blocked-consumption':
                // Real fuel consumption means a real operational event took
                // place. Preserve the row and stop for manual review.
                setStatus(`🛑 ${blankResult.message}`, 'error');
                errors.push(blankResult.message);
                haltForUser(blankResult.message);
                return false;

            case 'no-delete-control':
                setStatus(`🛑 ${blankResult.message}`, 'error');
                errors.push(blankResult.message);
                haltForUser(blankResult.message);
                return false;

            default:
                break;
        }
    }

    if (eventCheck.status === 'INVALID') {
        isValid = false;
        const lockoutMsg = `Unapproved event scenario detected [${eventCheck.event}].`;
        errors.push(lockoutMsg);
        setStatus(`🛑 LOCKOUT: ${lockoutMsg} Halted.`, 'error');
        haltForUser(lockoutMsg);
        return false;
    }

    if (eventCheck.status === 'VALID_PORT') {
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
        let negativeRobDetected = false;
        setStatus('Verifying within-report ROB integrity (Last ROB = ROB Start, no negative values)...', 'info');

        currentBunkerCheck.forEach(curr => {
            // ── v7.4.0 [4] NEGATIVE VALUE CHECK ─────────────────────────────
            // Last ROB, ROB Start and Adjustment must never be negative. This
            // runs BEFORE the blank/zero skip logic so a negative value can
            // never slip through on an otherwise-skipped row.
            const negativeFields = [];
            if (curr.lastRob  !== null && curr.lastRob  < 0) {
                negativeFields.push({ name: 'Last ROB',   value: curr.lastRob,  el: curr.lastRobInput });
            }
            if (curr.robStart !== null && curr.robStart < 0) {
                negativeFields.push({ name: 'ROB Start',  value: curr.robStart, el: curr.robStartInput });
            }
            if (curr.hasAdjColumn && curr.adj !== null && curr.adj < 0) {
                negativeFields.push({ name: 'Adjustment', value: curr.adj,      el: curr.adjElementToHighlight || curr.adjInput });
            }

            if (negativeFields.length > 0) {
                negativeFields.forEach(f => {
                    if (f.el && f.el.style) f.el.style.cssText = FIELD_STYLES.ERROR_KEYWORD_FULL;
                    const msg =
                        `Validation failed: BUNKERS ROB contains a negative value in \`${f.name}\` ` +
                        `(${f.value}) on row [${curr.displayLabel}]. ` +
                        `Last ROB, ROB Start and Adjustment must never be negative.`;
                    errors.push(msg);
                    setStatus(`🛑 ${msg}`, 'error');
                });
                scrollToIssueElement(
                    negativeFields[0].el,
                    `Negative ${negativeFields[0].name} value found in row [${curr.displayLabel}].`
                );
                isValid = false;
                withinReportFailed = true;
                negativeRobDetected = true;
                return;
            }

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

            // ── ADJ MUST ALWAYS BE 0 ─────────────────────────────────────────
            if (curr.adj !== null && Math.abs(curr.adj) > CONFIG.ADJ_TOLERANCE) {
                const adjMsg = `[${curr.displayLabel}] ADJ value (${curr.adj}) is not zero. ADJ must always be 0 — no other value is permitted.`;
                errors.push(adjMsg);
                if (curr.adjInput) curr.adjInput.style.cssText = FIELD_STYLES.ERROR_KEYWORD_FULL;
                setStatus(`❌ ADJ Violation [${curr.displayLabel}]: ADJ = ${curr.adj}, expected 0.`, 'error');
                scrollToIssueElement(
                    curr.adjInput,
                    `Non-zero ADJ value found in row [${curr.displayLabel}].`
                );
                isValid = false;
                withinReportFailed = true;
                rowFailed = true;
            } else if (curr.adjInput) {
                curr.adjInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
            }

            if (!rowFailed) {
                if (curr.lastRobInput)  curr.lastRobInput.style.cssText  = FIELD_STYLES.SUCCESS_FULL;
                if (curr.robStartInput) curr.robStartInput.style.cssText = FIELD_STYLES.SUCCESS_FULL;
                setStatus(`✅ ROB Match [${curr.displayLabel}]: Last ROB = ROB Start = ${curr.lastRob}`, 'success');
            }
        });

        if (withinReportFailed) {
            if (negativeRobDetected) {
                setStatus('🛑 BUNKERS ROB negative-value validation FAILED — the flagged field(s) above must be corrected.', 'error');
            }
            setStatus('🛑 Within-Report ROB Integrity FAILED — halting.', 'error');
        } else {
            setStatus('✅ Within-Report ROB Integrity: All rows pass (Last ROB = ROB Start, no negative values).', 'success');
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

        // v7.2.2 — Event Block Fuel ROB Validation (Check #5)
        // The separate scrapeEventFuelRows() was unreliable (wrong table
        // selectors). We now reuse currentBunkerCheck — which is already
        // correctly scraped above — to verify at least one fuel row has a
        // non-null ROB value when an event is present.
        const anyRobFilled = currentBunkerCheck.some(
            r => r.robStart !== null || r.robEnd !== null || r.lastRob !== null
        );
        if (!anyRobFilled) {
            isValid = false;
            const errMsg = 'Event Block Validation: an event is present but every fuel type ROB value is blank — at least one fuel type must have a ROB value recorded before the event can be saved.';
            errors.push(`[Event Fuel Block] ${errMsg}`);
            setStatus(`🛑 Event Fuel Block Lockout: ${errMsg}`, 'error');
        } else {
            setStatus('✅ Event Fuel ROB Block: ROB integrity and non-blank check passed.', 'success');
        }
    } else {
        setStatus('ℹ️ No active event grid objects extracted to check scenario state cascades.', 'info');
    }

    // ── 5b. v7.4.0 EVENT-LEVEL VALIDATIONS ──────────────────────────────────
    const detailedEventRows = scrapeEventRows();
    const currentSigForEvents = (crossReportData && crossReportData.currentSig) || null;

    // [9] End Date/Time must not be blank — halts immediately.
    setStatus('Verifying every event has an End Date/Time...', 'info');
    const endTimeResult = validateEventEndDateTimes(detailedEventRows);
    if (endTimeResult.errors.length > 0) {
        endTimeResult.errors.forEach(err => {
            errors.push(`[Event End Date/Time] ${err}`);
            setStatus(`🛑 ${err}`, 'error');
        });
        haltForUser(endTimeResult.errors[0]);
        return false;
    }
    setStatus(
        endTimeResult.checked > 0
            ? `✅ End Date/Time present on all ${endTimeResult.checked} event(s).`
            : 'ℹ️ End Date/Time check: no events with a selected event type on this report.',
        endTimeResult.checked > 0 ? 'success' : 'info'
    );

    // [6] Departure report — final event must be SHIFTING FROM LAST BERTH TO SEA.
    if (isDepartureReportContext(reportContext, currentSigForEvents)) {
        setStatus('Departure report detected — verifying the final event in the sequence...', 'info');
        const departureResult = validateDepartureFinalEvent(detailedEventRows);
        if (departureResult.errors.length > 0) {
            departureResult.errors.forEach(err => {
                errors.push(`[Departure Final Event] ${err}`);
                setStatus(`🛑 ${err}`, 'error');
            });
            haltForUser(departureResult.errors[0]);
            return false;
        }
        setStatus(`✅ Departure sequence ends correctly with "${CONFIG.DEPARTURE_FINAL_EVENT}".`, 'success');
    }

    // [7] The same event must not appear in both an Arrival and an At Sea report.
    const conflictResult = recordAndCheckArrivalSeaEventConflicts(
        reportContext, currentSigForEvents, detailedEventRows
    );
    if (conflictResult.errors.length > 0) {
        conflictResult.errors.forEach(err => {
            errors.push(`[Arrival/At Sea Conflict] ${err}`);
            setStatus(`🛑 ${err}`, 'error');
        });
        haltForUser(conflictResult.errors[0]);
        return false;
    }
    if (conflictResult.recorded > 0) {
        setStatus(`✅ Arrival/At Sea cross-check: ${conflictResult.recorded} event(s) indexed, no conflicts found.`, 'success');
    }

    // v7.1.2 — Sequential Date / Reporting Period / Voyage Continuity checks
    setStatus('Running sequence, period, and voyage continuity checks...', 'info');
    const sequenceResult = runSequenceAndContinuityChecks(crossReportData);
    if (sequenceResult.errors.length > 0) {
        isValid = false;
        sequenceResult.errors.forEach(err => {
            errors.push(`[Sequence] ${err}`);
            setStatus(`🛑 Sequence Lockout: ${err}`, 'error');
        });
    } else {
        setStatus('✅ Sequential date and reporting period checks passed.', 'success');
    }
    sequenceResult.warnings.forEach(warn => setStatus(`⚠️ Sequence Notice: ${warn}`, 'warning'));

    // v7.1.2 — Distance vs Fuel Consumption logic (Check #4)
    const distanceResult = checkDistanceVsFuelLogic();
    distanceResult.warnings.forEach(warn => setStatus(`⚠️ Distance Logic Notice: ${warn}`, 'warning'));

    // v7.2.0 — Dead Reckoning Position Check (replaces basic great-circle check)
    setStatus('━━━ Dead Reckoning Position Verification ━━━', 'info');
    const drResult = runDeadReckoningCheck(reportContext.reportType);
    drResult.info.forEach(msg     => setStatus(msg, 'info'));
    drResult.warnings.forEach(msg => setStatus(`⚠️ ${msg}`, 'warning'));
    drResult.errors.forEach(msg   => {
        errors.push(msg);
        setStatus(`🛑 ${msg}`, 'error');
        isValid = false;
    });

    await sleep(CONFIG.SLEEP_POLL_MS);

    if (!isValid) {
        setStatus(`🛑 LOCKOUT: ${errors.length} validation error(s) caught on this report:`, 'error');
        errors.forEach((e, i) => setStatus(`   ${i + 1}. ${e}`, 'error'));
        haltForUser(errors[0] || 'Validation errors detected on this report.');
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
        // v7.4.0 [2]: a missing Approve button is almost always a render/
        // timing artefact, not a data problem. Retry rather than halt.
        setStatus('⚠️ Approve control not readable yet — will retry this report.', 'warning');
        return 'retry';
    }

    approveBtn.click();
    await sleep(CONFIG.SLEEP_POST_CLICK_MS);

    // v7.3.0: buffering/loading screen may appear immediately after Approve
    // is clicked (server round-trip) — pause and wait it out before
    // continuing, rather than treating a not-yet-rendered popup as failure.
    const approveClickReady = await waitForPageReady('post-approve-click load');
    if (!approveClickReady) {
        // v7.4.0 [2]: slow page ≠ validation failure. Retry this report.
        return 'retry';
    }

    // FIX D: wait for the PrimeNG popup to finish rendering
    await waitForDOMStable();

    // v7.1.2: check for the hard-error modal ("Errors detected in the
    // submitted data") immediately after Approve is clicked — this modal
    // has no Yes/Proceed button of its own and must stop Autopilot outright.
    const postClickWarnings = extractWarningDialogMessages();
    const postClickFatal = postClickWarnings.find(msg => {
        const lower = msg.toLowerCase();
        return CONFIG.FATAL_WARNING_PHRASES.some(p => lower.includes(p));
    });
    if (postClickFatal) {
        setStatus(`🛑 FATAL: ${postClickFatal}`, 'error');
        postClickWarnings.forEach(msg => {
            if (msg !== postClickFatal) setStatus(`🛑 ${msg}`, 'error');
        });
        haltForUser(`Errors detected in the submitted data: ${postClickFatal}`);
        return false;
    }

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
        // v7.4.0 [2]: popup render-timing artefact — retry, do not halt.
        setStatus('⚠️ Confirmation dialogue button not present yet — will retry this report.', 'warning');
        return 'retry';
    }

    yesBtn.click();

    setStatus('Evaluating modal chain for trailing warnings...', 'info');
    await sleep(CONFIG.SLEEP_POST_DIALOG_MS);

    // v7.3.0: submission confirm can itself trigger a buffering/loading
    // screen while the server processes the report — wait it out.
    const postYesReady = await waitForPageReady('post-confirmation load');
    if (!postYesReady) {
        return 'retry';
    }

    // v7.1.2: hard-stop check — if the dialog reports actual data errors
    // (not just advisory warnings), halt Autopilot entirely. This check
    // runs regardless of whether a "Proceed Anyway" button is present.
    const earlyWarningMessages = extractWarningDialogMessages();
    const fatalMessage = earlyWarningMessages.find(msg => {
        const lower = msg.toLowerCase();
        return CONFIG.FATAL_WARNING_PHRASES.some(p => lower.includes(p));
    });
    if (fatalMessage) {
        setStatus(`🛑 FATAL: ${fatalMessage}`, 'error');
        haltForUser(`Errors detected in the submitted data: ${fatalMessage}`);
        return false;
    }

    const proceedAnyway = queryAllContexts('button, .p-button, [role="button"]').find(el => {
        const innerT = (el.innerText || el.textContent || '').trim().toLowerCase();
        const labelT = (el.getAttribute('label') || '').toLowerCase();
        return innerT.includes('proceed anyway') || labelT.includes('proceed anyway');
    });

    if (proceedAnyway) {
        const contextData = extractReportContext();
        const warningMessages = extractWarningMessages();

        if (warningMessages.length > 0) {
            // Inspect each warning line individually.
            // Three-tier logic for AIS distance warnings; simple list check for all others.
            const unrecognized = [];
            let proceedBlocked = false;

            warningMessages.forEach(msg => {
                const lower = msg.toLowerCase();

                // ── AIS distance discrepancy — smart NM-gap decision ──────────
                const aisResult = classifyAISDistanceWarning(lower);
                if (aisResult !== null) {
                    if (aisResult.verdict === 'ok') {
                        setStatus(`✅ AIS distance gap (${aisResult.diffNM.toFixed(1)} NM) within normal weather/current tolerance — bypassing.`, 'success');
                    } else if (aisResult.verdict === 'warn') {
                        setStatus(`⚠️ AIS distance gap (${aisResult.diffNM.toFixed(1)} NM) is notable but under lockout threshold (${CONFIG.AIS_DIST_LOCKOUT_NM} NM) — proceeding with caution.`, 'warning');
                        setStatus(`⚠️ Warning: "${msg}"`, 'warning');
                    } else {
                        setStatus(`🛑 LOCKOUT: AIS distance gap (${aisResult.diffNM.toFixed(1)} NM) exceeds ${CONFIG.AIS_DIST_LOCKOUT_NM} NM threshold — halted. Please verify observed distance.`, 'error');
                        setStatus(`🛑 Warning text: "${msg}"`, 'error');
                        proceedBlocked = true;
                    }
                    return; // handled — don't fall through to generic bypass check
                }

                // ── Generic known-safe bypass list ────────────────────────────
                const alwaysOk = CONFIG.ALWAYS_BYPASS_WARNING_PHRASES.some(p => lower.includes(p));
                const portOk   = !contextData.reportType.toLowerCase().includes('sea') &&
                    CONFIG.PORT_CONTEXT_BYPASS_WARNING_PHRASES.some(p => lower.includes(p));
                if (alwaysOk) {
                    setStatus(`✅ Recognized bypassable warning: "${msg}"`, 'success');
                } else if (portOk) {
                    setStatus(`✅ Recognized bypassable warning (In Port context): "${msg}"`, 'success');
                } else {
                    unrecognized.push(msg);
                }
            });

            if (proceedBlocked) {
                haltForUser('AIS distance discrepancy exceeds the lockout threshold — please verify the observed distance.');
                return false;
            }

            if (unrecognized.length === 0) {
                proceedAnyway.click();
                setStatus('✅ "Proceed Anyway" bypassed all known-safe warnings successfully.', 'success');
                await sleep(CONFIG.SLEEP_POST_CLICK_MS);
            } else {
                unrecognized.forEach(msg => {
                    setStatus(`🛑 LOCKOUT: Unrecognized warning blocked auto-submission: "${msg}"`, 'error');
                });
                haltForUser(`Unrecognized warning blocked auto-submission: "${unrecognized[0]}"`);
                return false;
            }
        } else if (!contextData.reportType.toLowerCase().includes('sea')) {
            // Legacy fallback: dialog text could not be read on a non-At-Sea
            // report — distance 0 is expected, bypass safely.
            setStatus('⚠️ Distance 0 warning caught in non-At-Sea context (legacy fallback). Bypassing safely...', 'warning');
            proceedAnyway.click();
            setStatus('✅ "Proceed Anyway" bypassed warning successfully.', 'success');
            await sleep(CONFIG.SLEEP_POST_CLICK_MS);
        } else {
            setStatus('🛑 LOCKOUT: Observed Distance is 0 warning in AT SEA context! Halted.', 'error');
            haltForUser('Observed Distance is 0 on an At Sea report — please review the distance value.');
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
//   NAVIGATION  (v7.1.2 — strict sequential, never skips, warns on date gaps)
// ---------------------------------------------------------------------------

function extractDateFromSig(sig) {
    // Return a Date object from a card signature, or null if unparseable
    if (!sig || !sig.date) return null;
    const d = new Date(sig.date + 'T' + (sig.time || '00:00') + ':00' + (sig.utcOffset || '+00:00'));
    return isNaN(d.getTime()) ? null : d;
}

// v7.4.0 [3]: after clicking a card, confirm we actually landed on it before
// letting the loop treat it as the current report. Retries the click when the
// landing card does not match, so a mis-registered click can never cause a
// report to be silently stepped over.
async function verifyLandedOnCard(expectedSig, expectedCard) {
    if (!expectedSig) return true;

    for (let attempt = 1; attempt <= CONFIG.NAV_VERIFY_ATTEMPTS; attempt++) {
        await waitForDOMStable();

        const cards     = getAllReportCards();
        const activeCard = identifyCurrentCard(cards);
        const activeSig  = activeCard ? extractCardSignature(activeCard) : null;

        if (activeSig && signaturesMatch(activeSig, expectedSig)) return true;

        const pageText = document.body ? (document.body.innerText || '') : '';
        if (expectedSig.vesselName && expectedSig.date &&
            pageText.includes(expectedSig.vesselName) && pageText.includes(expectedSig.date)) {
            return true;
        }

        setStatus(
            `⚠️ Navigation check ${attempt}/${CONFIG.NAV_VERIFY_ATTEMPTS}: expected ` +
            `${describeSignature(expectedSig)} but the page has not settled on it — re-clicking.`,
            'warning'
        );

        const retryTarget =
            cards.find(c => signaturesMatch(extractCardSignature(c), expectedSig)) || expectedCard;
        if (retryTarget) retryTarget.click();
        await sleep(CONFIG.NAV_VERIFY_DELAY_MS);
    }

    setStatus(
        `⚠️ Navigation could not be confirmed for ${describeSignature(expectedSig)} — ` +
        `it stays marked as pending in the ledger so it will not be lost.`,
        'warning'
    );
    return false;
}

async function goToNextPendingReport(completedKey) {
    setStatus('Analyzing sidebar tracker matrix (sequential mode)...', 'info');

    // v7.4.0 [3]: never step forward until the current report is recorded as
    // finished. This is the guard that makes "processed exactly once" hold.
    if (completedKey && !ledgerIsComplete(completedKey)) {
        const entry = ProcessingLedger.entries.get(completedKey);
        setStatus(
            `⛔ Navigation blocked: the current report (${entry ? entry.label : completedKey}) is not marked ` +
            `complete (status: ${entry ? entry.status : 'unknown'}). Autopilot will not move on until it is.`,
            'error'
        );
        return 'blocked';
    }

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

    let nextCard = sidebarCards[nextIndex];

    // ── v7.4.0 [3] Ledger cross-check ──────────────────────────────────────
    // If the ledger says a different (earlier, still-unprocessed) report
    // should come next, prefer that card. This is what stops a report being
    // stepped over when the sidebar re-orders mid-run.
    if (completedKey) {
        const expectedKey = ledgerNextExpectedKey(completedKey);
        if (expectedKey) {
            const stepKey = sigKey(extractCardSignature(nextCard));
            if (stepKey !== expectedKey) {
                const ledgerCard = sidebarCards.find(c => sigKey(extractCardSignature(c)) === expectedKey);
                if (ledgerCard) {
                    const entry = ProcessingLedger.entries.get(expectedKey);
                    setStatus(
                        `🧾 Ledger override: the next unprocessed report is ${entry ? entry.label : expectedKey}, ` +
                        `not the card in the adjacent sidebar slot — navigating to the ledger target instead.`,
                        'warning'
                    );
                    nextCard = ledgerCard;
                }
            }
        } else if (ProcessingLedger.initialised) {
            setStatus('🧾 Ledger: every queued report has been processed.', 'success');
            return false;
        }
    }

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

    setStatus(`➡️ Moving to next report: ${describeSignature(nextSig)}`, 'success');
    nextCard.click();
    await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);

    // v7.3.0: the click may trigger a network fetch / buffering screen for
    // the newly-selected report — wait it out instead of pressing on blind.
    const navReady = await waitForPageReady('post-navigation load');
    if (!navReady) {
        // v7.4.0 [2]: a slow page after navigation is transient. Report it
        // as a retry so the loop re-attempts rather than stopping the bot.
        return 'retry';
    }

    // v7.4.0 [3]: confirm we actually landed where we intended.
    await verifyLandedOnCard(nextSig, nextCard);

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

// v7.4.0 [3]: single place where the loop steps forward. Navigation only
// happens once the finished report is recorded in the ledger.
async function advanceToNextReport(completedKey) {
    setStatus('━━━ Navigation phase: moving to next pending report ━━━', 'info');
    const hasMore = await goToNextPendingReport(completedKey);

    // 'blocked' means the current report is not finished — retry it rather
    // than stepping over it or mistaking the block for an empty queue.
    if (hasMore === 'blocked') return 'retry';
    if (hasMore === 'retry')   return 'retry';
    if (!hasMore) return 'complete';
    return 'continue';
}

// Processes exactly one report and reports what should happen next.
// Returns: 'continue' | 'retry' | 'halt' | 'complete'
async function processOneReport() {
    // v7.3.0: buffering/loading guard — pause and wait rather than erroring
    // out if the site is still loading before we look at the report state.
    const loopReady = await waitForPageReady('report queue check');
    if (!loopReady) return 'retry';

    // ── Ledger registration for the report currently on screen ──────────
    const sidebarCards = getAllReportCards();
    const currentCard  = identifyCurrentCard(sidebarCards);
    const currentSig   = currentCard ? extractCardSignature(currentCard) : null;

    if (!ProcessingLedger.initialised) {
        initialiseLedger(sidebarCards, currentCard);
    }

    const entry = currentSig ? ledgerEnsureEntry(currentSig) : null;
    const key   = entry ? entry.key : '';

    if (entry && LEDGER_COMPLETE_STATUSES.includes(entry.status)) {
        setStatus(`🧾 ${entry.label} is already recorded as "${entry.status}" — not re-processing it.`, 'info');
        return await advanceToNextReport(key);
    }
    if (entry) ledgerMark(key, 'in-progress');

    // ── Already-resolved reports ────────────────────────────────────────
    if (isCurrentReportAlreadyApproved()) {
        setStatus('⚠️ Current report already approved. Looking for next pending report...', 'warning');
        // v7.2.0: capture lat/lon before navigating away so DR chain stays intact
        const approvedPos = scrapeCurrentLatLon();
        if (approvedPos) {
            window._autopilotLastKnownPosition = approvedPos;
            setStatus(`📍 Position captured from approved report: ${approvedPos.latRaw || decimalToDMS(approvedPos.lat, true)}, ${approvedPos.lonRaw || decimalToDMS(approvedPos.lon, false)}`, 'info');
        }
        ledgerMark(key, 'already-approved', 'was already approved when reached');
        return await advanceToNextReport(key);
    }

    if (isCurrentReportAlreadyRejected()) {
        setStatus('⚠️ Current report is already rejected — moving on (recorded in the ledger).', 'warning');
        ledgerMark(key, 'already-rejected', 'was already rejected when reached');
        return await advanceToNextReport(key);
    }

    // ── STEP 1: Capture current report context ──────────────────────────
    setStatus('━━━ Context phase: capturing current report data ━━━', 'info');
    const contextReady = await waitForPageReady('context capture');
    if (!contextReady) return 'retry';

    const crossReportData = await gatherCrossReportBunkerData();

    // ── STEP 2: Validate — no navigation occurs inside here ──────────────
    setStatus('━━━ Validation phase: running all checks on current report ━━━', 'info');
    const isValid = await validateCurrentReport(crossReportData);

    // v7.3.0/[5]: a duplicate is a recoverable validation RESULT. The report
    // is rejected with an explanation, recorded, and the queue continues.
    if (isValid === 'duplicate-skip') {
        ledgerMark(key, 'rejected-duplicate', 'auto-rejected as a duplicate');
        setStatus('━━━ Navigation phase: duplicate handled, continuing the queue ━━━', 'info');
        return await advanceToNextReport(key);
    }

    if (!isValid) {
        ledgerMark(key, 'halted-validation', AutopilotState.haltReason || 'validation issue');
        return 'halt';
    }

    // ── STEP 3: Confirm we are still on the correct report ───────────────
    if (crossReportData.currentSig) {
        const onTarget = await ensureOnCurrentReport(
            crossReportData.currentSig,
            crossReportData.currentCard
        );
        if (onTarget === 'retry') return 'retry';
        if (!onTarget) {
            ledgerMark(key, 'halted-navigation', 'could not confirm the current report');
            return 'halt';
        }
    }

    // ── STEP 4: Approve the current report ───────────────────────────────
    setStatus('━━━ Approval phase: submitting current report ━━━', 'info');
    const approvalReady = await waitForPageReady('approval submission');
    if (!approvalReady) return 'retry';

    const approved = await approveReport();

    if (approved === 'retry') return 'retry';
    if (approved === false) {
        ledgerMark(key, 'halted-approval', AutopilotState.haltReason || 'approval blocked');
        return 'halt';
    }

    // ── STEP 4b: Verify the sidebar actually shows green/approved ────────
    if (approved === true && crossReportData.currentSig) {
        setStatus('━━━ Verification phase: confirming sidebar approval status ━━━', 'info');
        const verified = await verifyApprovalAndRetry(
            crossReportData.currentSig, crossReportData.currentCard
        );
        if (verified === 'retry') return 'retry';
        if (!verified) {
            ledgerMark(key, 'halted-verification', 'approval could not be confirmed');
            return 'halt';
        }
    }

    ledgerMark(key, approved === 'skipped' ? 'already-approved' : 'approved');

    // ── STEP 5: Navigate to next pending report ──────────────────────────
    return await advanceToNextReport(key);
}

async function runAutopilot() {
    // v7.4.0 [2]: only one loop may be active. The watchdog can call this
    // again after an unexpected stop, so re-entry must be harmless.
    if (AutopilotState.loopActive) return;
    AutopilotState.loopActive = true;

    try {
        while (window.autopilotRunning) {
            let outcome;

            try {
                outcome = await processOneReport();
            } catch (err) {
                // v7.4.0 [2]: an unexpected exception is treated as transient.
                // The bot retries instead of stopping on an internal glitch.
                setStatus(`💥 Recoverable exception: ${err.message} — retrying.`, 'warning');
                outcome = 'retry';
            }

            // Respect a Stop that arrived while the step was running.
            if (AutopilotState.userStopped) break;

            if (outcome === 'retry') {
                AutopilotState.transientRetries++;

                if (AutopilotState.transientRetries > CONFIG.MAX_TRANSIENT_RETRIES) {
                    haltForUser(
                        `No progress could be made on this report after ${CONFIG.MAX_TRANSIENT_RETRIES} ` +
                        `automatic recovery attempts. Please check the page, then click Start.`
                    );
                    reportLedgerReconciliation();
                    break;
                }

                setStatus(
                    `♻️ Recovering (attempt ${AutopilotState.transientRetries}/${CONFIG.MAX_TRANSIENT_RETRIES}) — ` +
                    `retrying the same report, not skipping it.`,
                    'warning'
                );
                await sleep(CONFIG.TRANSIENT_RETRY_DELAY_MS);
                continue;
            }

            AutopilotState.transientRetries = 0;

            if (outcome === 'halt') {
                if (!AutopilotState.genuineHalt) {
                    haltForUser('A validation issue on this report needs review.');
                }
                reportLedgerReconciliation();
                break;
            }

            if (outcome === 'complete') {
                reportLedgerReconciliation();
                finishRun('🎉 Queue complete — every report was validated and processed.');
                break;
            }

            // 'continue' → next report
        }
    } finally {
        AutopilotState.loopActive = false;
    }
}

// ---------------------------------------------------------------------------
//   UI CONTROL INTERFACE
// ---------------------------------------------------------------------------

function injectControlPanel() {
    document.getElementById('autopilot-btn')?.remove();
    document.getElementById('autopilot-status')?.remove();

    // v7.1.2: outer panel is now a flex column — a NON-scrolling header bar
    // (title + close button) on top, and a separately-scrolling content
    // area below it. This fixes the v7.0.1 bug where the close button,
    // although absolutely positioned, scrolled out of view along with the
    // log lines because it shared the same scrolling containing block.
    const statusBox = document.createElement('div');
    statusBox.id = 'autopilot-status';
    statusBox.style.cssText = `
        position: fixed; bottom: 85px; left: 20px; z-index: 99999;
        font-size: 13px; font-family: monospace;
        background-color: rgba(10, 11, 15, 0.98); color: #fff;
        border: 1px solid #444; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.7);
        display: none; min-width: 400px; max-width: 600px; max-height: 250px;
        flex-direction: column; overflow: hidden;
    `;
    document.body.appendChild(statusBox);

    const headerBar = document.createElement('div');
    headerBar.id = 'autopilot-status-header';
    headerBar.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        flex: 0 0 auto; padding: 10px 10px 8px 12px;
        border-bottom: 1px solid #222;
    `;

    const headerTitle = document.createElement('span');
    headerTitle.style.cssText = 'color:#888; font-weight:bold;';
    headerTitle.innerText = '🤖 SYSTEM ACTIVE LOG (v7.4.2):';
    headerBar.appendChild(headerTitle);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'autopilot-status-close';
    closeBtn.innerText = '×';
    closeBtn.title = 'Close log';
    closeBtn.style.cssText = `
        width: 22px; height: 22px; line-height: 18px; padding: 0;
        font-size: 16px; font-weight: bold; color: #e53935;
        background-color: transparent; border: 1px solid #e53935;
        border-radius: 50%; cursor: pointer; flex: 0 0 auto;
    `;
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = '#e53935';
        closeBtn.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.backgroundColor = 'transparent';
        closeBtn.style.color = '#e53935';
    });
    closeBtn.addEventListener('click', () => {
        statusBox.style.display = 'none';
    });
    headerBar.appendChild(closeBtn);
    statusBox.appendChild(headerBar);

    const contentArea = document.createElement('div');
    contentArea.id = 'autopilot-status-content';
    contentArea.style.cssText = `
        flex: 1 1 auto; overflow-y: auto; padding: 10px 12px 12px 12px;
    `;
    statusBox.appendChild(contentArea);

    const btn = document.createElement('button');
    btn.id = 'autopilot-btn';
    btn.innerText = '▶ Start Autopilot (v7.4.2)';
    btn.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; z-index: 99999;
        padding: 15px 25px; font-size: 16px; font-weight: bold;
        background-color: #2e7d32; color: white; border: none;
        border-radius: 5px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    `;

    // v7.4.0 [2]: strict Start/Stop semantics.
    //   Stop  → sticky. Nothing in this file may restart the bot afterwards.
    //   Start → the ONLY thing that clears a user stop or a genuine halt.
    btn.addEventListener('click', () => {
        if (window.autopilotRunning) {
            stopByUser();
            return;
        }

        statusBox.style.display = 'flex';

        AutopilotState.userStopped      = false;
        AutopilotState.genuineHalt      = false;
        AutopilotState.haltReason       = '';
        AutopilotState.sessionActive    = true;
        AutopilotState.transientRetries = 0;

        // v7.1.0: reset the stored position at the start of each fresh run so
        // the first report's great-circle check starts from a clean slate.
        window._autopilotLastKnownPosition = null;
        resetLedger();
        resetReportEventIndex();

        window.autopilotRunning = true;
        updateUIButton();
        setStatus('▶️ Started by user.', 'success');

        startWatchdog();
        runAutopilot();
    });

    document.body.appendChild(btn);
}

function setStatus(message, type = 'info') {
    const content = document.getElementById('autopilot-status-content');
    if (!content) return;

    const colorMap = { success: '#81c784', error: '#e57373', warning: '#fff176' };
    const color = colorMap[type] || '#ffffff';

    const line = document.createElement('div');
    line.style.cssText = `color: ${color}; margin-bottom: 4px; border-bottom: 1px solid #222; padding-bottom: 2px;`;
    line.innerText = message;

    content.appendChild(line);
    content.scrollTop = content.scrollHeight;
}

function clearStatus() {
    const content = document.getElementById('autopilot-status-content');
    if (content) {
        content.innerHTML = '';
    }
}

function updateUIButton() {
    const btn = document.getElementById('autopilot-btn');
    if (!btn) return;

    if (window.autopilotRunning) {
        btn.innerText = '⏹ STOP Autopilot';
        btn.style.backgroundColor = '#c62828';
        btn.title = 'Stop Autopilot. Once stopped it stays stopped until you click Start.';
        return;
    }

    // v7.4.0 [2]: make the reason for a stop visible on the control itself.
    if (AutopilotState.genuineHalt) {
        btn.innerText = '▶ Start Autopilot — HALTED (v7.4.2)';
        btn.style.backgroundColor = '#ef6c00';
        btn.title = `Halted: ${AutopilotState.haltReason}`;
    } else if (AutopilotState.userStopped) {
        btn.innerText = '▶ Start Autopilot — stopped by user (v7.4.2)';
        btn.style.backgroundColor = '#2e7d32';
        btn.title = 'Stopped by you. Autopilot will not restart on its own.';
    } else {
        btn.innerText = '▶ Start Autopilot (v7.4.2)';
        btn.style.backgroundColor = '#2e7d32';
        btn.title = '';
    }
}

// ---------------------------------------------------------------------------
//   TEST HOOKS
//
//   Exposes the pure/verifiable functions so a jsdom harness can exercise
//   them without driving the real UI. Has no effect on runtime behaviour.
// ---------------------------------------------------------------------------

window.__autopilotTestHooks = {
    CONFIG,
    AutopilotState,
    ProcessingLedger,
    ReportEventIndex,
    // v7.4.2
    isPageBuffering,
    getLastBufferingReason,
    waitForPageReady,
    isElementVisible,
    // Requirement [1]
    getPurposeFuelConsumptionTotals,
    normaliseColumnToken,
    purposeForToken,
    formatPurposeList,
    isVesselAtSea,
    getVesselStatusText,
    evaluateBlankEventRows,
    validatePortEvents,
    // Requirement [2]
    haltForUser,
    stopByUser,
    finishRun,
    startWatchdog,
    stopWatchdog,
    // Requirement [3]
    sigKey,
    resetLedger,
    initialiseLedger,
    ledgerEnsureEntry,
    ledgerMark,
    ledgerIsComplete,
    ledgerNextExpectedKey,
    reportLedgerReconciliation,
    goToNextPendingReport,
    // Requirement [4]
    scrapeBunkerSnapshot,
    // Requirement [5]
    signaturesMatch,
    signaturesAreDuplicate,
    checkIsDuplicateReport,
    extractCardSignature,
    // Requirements [6][7][9]
    scrapeEventRows,
    parseFlexibleDate,
    eventDateTimeToTimestamp,
    normaliseOffsetString,
    // v7.4.1
    cellLooksLikeLatLon,
    cellLooksLikeDateTime,
    locateDateTimeCells,
    buildEventHeaderMap,
    scrapeDateTimeCell,
    validateEventEndDateTimes,
    validateDepartureFinalEvent,
    isDepartureReportContext,
    recordAndCheckArrivalSeaEventConflicts,
    resetReportEventIndex,
    eventsAreSameOccurrence,
    // Loop
    validateCurrentReport,
    processOneReport,
    runAutopilot
};

injectControlPanel();

})();
