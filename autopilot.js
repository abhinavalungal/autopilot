// =========================================================================
//   MARITIME REPORT AUTOPILOT — v7.2.6
//
//   v7.2.6 changes:
//     - Fixed false "Sidebar not green" halts. Three compounding bugs fixed:
//       1. isGreenish() threshold lowered (10→5) and minimum brightness
//          added to catch GeoEmissions' muted/teal green cards.
//       2. isCardChecked() now scans ALL descendant elements of the card,
//          not just the outermost wrapper — the green highlight is applied
//          to inner divs/spans in GeoEmissions' Angular component tree.
//          Also checks for green check-mark icons and CSS class names.
//       3. verifyApprovalAndRetry() now polls up to 5 times with
//          increasing delays (800ms..2500ms) before concluding failure,
//          accounting for Angular CSS transitions. Falls back to
//          isCurrentReportAlreadyApproved() form-state check. Never
//          halts on colour-detection uncertainty — warns and continues.
//
//   v7.2.5 changes:
//     - "Observed Distance reported is 0 kindly review" now bypassed on
//       all non-At-Sea reports (In Port, Departure, Arrival). The old
//       phrase 'observed distance is 0' did not match GeoEmissions' actual
//       warning text. Four variants now covered:
//         'observed distance is 0'
//         'observed distance reported is 0'
//         'distance reported is 0'
//         'distance is 0'
//     - Port-context bypass broadened from 'In Port Report' exact match
//       to any report whose type does not include 'sea', so Departure and
//       Arrival reports also get the distance-0 bypass.
//
//   v7.2.4 changes:
//     - Fixed spurious "Pre-approval guard failed" halt. Root cause: after
//       approval Angular briefly de-highlights the active sidebar card,
//       so identifyCurrentCard() returns null and signaturesMatch() fails
//       even though the UI is still on the correct report.
//       ensureOnCurrentReport() now has three fallback tiers:
//         1. Sidebar card signature match (as before)
//         2. Page body content fingerprint (vessel name + date visible in DOM)
//         3. Navigate back → re-check content fingerprint before halting
//       Only halts if we can positively confirm we are on the WRONG report
//       and cannot recover — never halts on mere navigation uncertainty.
//
//   v7.2.3 changes:
//     - AIS distance discrepancy warning now uses a 3-tier NM-gap decision
//       instead of a blanket lockout:
//         diff ≤ 30 NM  → bypass silently (normal weather/current/wave variation)
//         diff 30-50 NM → log advisory warning but still click Proceed Anyway
//         diff > 50 NM  → hard lockout (likely a data entry error)
//       Thresholds configurable via CONFIG.AIS_DIST_WARN_NM /
//       CONFIG.AIS_DIST_LOCKOUT_NM.
//
//   v7.2.2 changes:
//     - Fixed false Event Fuel Block Lockout: scrapeEventFuelRows() was
//       using wrong table selectors and returning empty results even when
//       ROB values were present. Now reuses the already-correctly-scraped
//       currentBunkerCheck data (which the DEBUG output confirms works).
//     - Dead reckoning now stores lat/lon on ALL report types (port,
//       arrival, departure) not just At Sea, so the position chain stays
//       intact across mixed report sequences.
//
//   v7.2.1 changes:
//     - Auto-delete blank event rows: when the EVENTS grid contains a row
//       with no event type selected ("Select a Event Types"), Autopilot now
//       clicks the row's delete button (name="delBtn") automatically and
//       re-runs the event check. Only locks out if a genuinely unapproved
//       event type (non-blank) remains after the delete.
//
//   v7.2.0 changes:
//     - Dead Reckoning Position Estimator for At Sea reports.
//       Reads the previous report's confirmed position (stored in session),
//       the current report's heading (input[name="heading"]) and observed
//       distance (input[name="observeddistancesincelastreport"]), then uses
//       the spherical Earth direct-reckoning formula to calculate where the
//       vessel SHOULD be. Compares against the reported lat/lon and shows:
//         ✅  gap ≤ 15 NM  → passes (normal current/route variation)
//         ⚠️  gap 15-40 NM → advisory + suggested corrected coordinates
//         ⚠️  gap > 40 NM  → significant discrepancy + suggested coordinates
//              formatted in DMS ready to copy into the form
//       Suggestion only — never writes to the form.
//       If heading field absent, falls back to great-circle distance check.
//       If gap > 40 NM, the DR estimate is used as the baseline for the
//       NEXT report (avoids compounding errors from a bad coordinate).
//
//   v7.1.4 changes:
//     - Fixed false lockout on "Please confirm if voyage number needs an
//       increment" (and other valid bypass phrases). Root cause: the single
//       extractWarningDialogMessages() function was also reading boilerplate
//       nodes — div.header, p.subtitle, div.previous-report-info ("Prev Ref.
//       Report: ...") — which are never in the bypass list, so unrecognized[]
//       was always non-empty even when the only real warning was bypassable.
//       Fix: split into two functions:
//         extractWarningMessages()       STRICT — only <ul><li>/.warning-item
//           → used for bypass/lockout decision.
//         extractWarningDialogMessages() BROAD  — also reads headings/titles
//           → used only for fatal-error detection.
//
//   v7.1.3 changes:
//     - "Please confirm if voyage number needs an increment" added to the
//       always-bypass warning list — Autopilot clicks Proceed Anyway
//       automatically without halting.
//
//   v7.1.2 changes:
//     - New Validation Check #6: Great-Circle Distance Verification.
//       Reads the current report's Latitude and Longitude fields
//       (id="latitude", id="longitude", DMS format: "DD M' SS\" N/S"),
//       stores each position as Autopilot processes reports, and calculates
//       the Haversine great-circle distance (in Nautical Miles) between
//       the previous report's position and the current one.
//       Results shown in the log every report:
//         • Previous position / Current position (raw DMS + decimal)
//         • Calculated great-circle distance in NM
//         • Reported Observed Distance and the absolute/relative difference
//       Warnings triggered:
//         • >10% AND >20 NM difference  →  minor discrepancy notice
//         • >20% AND >50 NM difference  →  significant discrepancy warning
//       The first report in a run stores the position and skips comparison
//       (no prior position to compare against). Position resets on every
//       fresh Autopilot start.
//
//   v7.0.3 changes:
//     - ADJ must always be 0. Any non-zero ADJ value (positive or negative,
//       e.g. -1) in the Bunker ROB grid now blocks approval as a hard
//       error, with the offending ADJ field highlighted red and scrolled
//       into view, same as the existing Last ROB / ROB Start checks.
//
//   v7.0.2 changes:
//     - Fixed close-button placement: it was absolutely positioned inside
//       the same scrollable element as the log lines, so it scrolled out
//       of view as the log grew (appeared "stuck" near the bottom). The
//       log panel is now a fixed (non-scrolling) header bar — title left,
//       red × close button top-right — with a separately-scrolling content
//       area underneath. The button never moves regardless of log length.
//     - The "Errors detected in the submitted data" hard-error modal is now
//       detected in two places: immediately after clicking Approve (this
//       modal has no Yes/Proceed button of its own), and after the Yes
//       confirmation click. Either match stops Autopilot outright.
//     - extractWarningDialogMessages() now also reads dialog headings/
//       titles, not just <p>/<li> text, so a modal whose error text is the
//       title itself (as in "Errors detected in the submitted data") is
//       still picked up.
//
//   v7.0.1: version bump only (re-tag for cache-busting / deployment
//   verification — confirms the close-button repositioning and the fatal
//   "errors detected in the submitted data" hard-stop from v7.0.0 are
//   live). No functional changes beyond v7.0.0.
//
//   v7.0.0 changes:
//     - Warning-dialog interceptor now reads the actual warning text list
//       (not just report context) and bypasses only known-safe warnings:
//       "Confirm if the incinerator value is correct" and
//       "Report time cannot be less than vessel activation date" (plus the
//       existing Observed-Distance-0-in-Port-context bypass). Any other
//       warning text still causes a hard LOCKOUT.
//     - Close (×) button added to the SYSTEM ACTIVE LOG panel.
//     - Post-approval guard: if a report is approved but its sidebar card
//       is not green (i.e. not actually confirmed approved), Autopilot
//       automatically returns to that report and re-runs the approval flow.
//     - New validation checks: sequential date verification, reporting
//       period limits (1-25 hrs between reports), voyage continuity
//       (sidebar), observed-distance-vs-fuel-consumption logic, and event
//       block fuel ROB validation (ROB Start = ROB End where applicable,
//       and at least one fuel type ROB value must not be blank).
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

    // v7.1.2: reporting period validity window (Validation Check #2)
    REPORT_INTERVAL_MIN_HOURS: 1,
    REPORT_INTERVAL_MAX_HOURS: 25,

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
//   AUTO-DELETE BLANK EVENT ROWS  (v7.2.1)
//
//   When the EVENTS grid contains a row with no event type selected
//   ("Select a Event Types"), finds the delete button (name="delBtn") in
//   that row's Actions column and clicks it, then returns how many rows
//   were deleted so the caller can re-validate.
// ---------------------------------------------------------------------------

async function deleteBlankEventRows() {
    let deleted = 0;

    for (const ctx of getAllContexts()) {
        if (!ctx) continue;

        // Find all event-type dropdowns — both at-sea and in-port variants
        const dropdowns = Array.from(ctx.querySelectorAll(
            'select[id*="eventtypes" i], select[name*="eventtypes" i], ' +
            'select[data-td-name*="eventtypes" i], select#gsinporteventtypes'
        ));

        for (const sel of dropdowns) {
            const selectedText = (
                sel.options[sel.selectedIndex]
                    ? sel.options[sel.selectedIndex].text
                    : ''
            ).trim();

            const isBlank =
                !selectedText ||
                selectedText.toLowerCase().includes('select') ||
                selectedText === '' ||
                sel.selectedIndex === 0;

            if (!isBlank) continue;

            // Walk up to the containing <tr> and find the delete button
            const row = sel.closest('tr');
            if (!row) continue;

            const delBtn = row.querySelector(
                'button[name="delBtn"], button.tblBtn[onclick*="removeFromCopy"]'
            );

            if (delBtn) {
                setStatus(`🗑️ Auto-deleting blank event row (no event type selected)...`, 'warning');
                delBtn.click();
                await sleep(400);
                deleted++;
            }
        }
    }

    return deleted;
}

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
                result.errors.push(
                    `Reporting Period Violation: interval since previous report is ${hoursDiff.toFixed(2)} hrs, ` +
                    `exceeding the maximum allowed ${CONFIG.REPORT_INTERVAL_MAX_HOURS} hrs — a report may be missing.`
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
    // 'already approved' (true) or success (true) both continue; only explicit false halts
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

        // Genuinely on the wrong page and can't recover — only halt here.
        setStatus('🛑 Pre-approval guard: navigated to wrong report and could not recover. Halting.', 'error');
        return false;
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
    setStatus('Initiating Smart Sandbox Scan (v7.2.6)...', 'info');
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
    let eventCheck = validatePortEvents();

    if (eventCheck.status === 'INVALID') {
        // v7.2.1: if the invalid event is a blank/placeholder row
        // ("Select a Event Types"), auto-delete it and re-validate
        // instead of locking out.
        const isBlankRow =
            !eventCheck.event ||
            eventCheck.event.trim() === '' ||
            eventCheck.event.toLowerCase().includes('select');

        if (isBlankRow) {
            setStatus(`⚠️ Blank event row detected — attempting auto-delete...`, 'warning');
            const deletedCount = await deleteBlankEventRows();
            if (deletedCount > 0) {
                setStatus(`✅ ${deletedCount} blank event row(s) deleted — re-running event check...`, 'success');
                await sleep(CONFIG.SLEEP_POST_CLICK_MS);
                eventCheck = validatePortEvents();
            }
        }

        if (eventCheck.status === 'INVALID') {
            isValid = false;
            setStatus(`🛑 LOCKOUT: Unapproved event scenario detected [${eventCheck.event}]. Halted.`, 'error');
            return false;
        }
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
        setStatus('🛑 Errors detected in the submitted data — stopping Autopilot.', 'error');
        window.autopilotRunning = false;
        updateUIButton();
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
        setStatus('❌ Modal submission dialogue confirmation button missing after all retry attempts.', 'error');
        return false;
    }

    yesBtn.click();

    setStatus('Evaluating modal chain for trailing warnings...', 'info');
    await sleep(CONFIG.SLEEP_POST_DIALOG_MS);

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
        setStatus('🛑 Errors detected in the submitted data — stopping Autopilot.', 'error');
        window.autopilotRunning = false;
        updateUIButton();
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
    // v7.1.0: reset the stored position at the start of each fresh run so
    // the first report's great-circle check starts from a clean slate.
    window._autopilotLastKnownPosition = null;
    try {
        while (window.autopilotRunning) {
            if (isCurrentReportAlreadyApproved()) {
                setStatus('⚠️ Current report already approved. Looking for next pending report...', 'warning');
                // v7.2.0: capture lat/lon before navigating away so DR chain stays intact
                const approvedPos = scrapeCurrentLatLon();
                if (approvedPos) {
                    window._autopilotLastKnownPosition = approvedPos;
                    setStatus(`📍 Position captured from approved report: ${approvedPos.latRaw || decimalToDMS(approvedPos.lat, true)}, ${approvedPos.lonRaw || decimalToDMS(approvedPos.lon, false)}`, 'info');
                }
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

            // ── STEP 4b: Verify the sidebar actually shows green/approved ─────
            if (approved === true && crossReportData.currentSig) {
                setStatus('━━━ Verification phase: confirming sidebar approval status ━━━', 'info');
                const verified = await verifyApprovalAndRetry(crossReportData.currentSig, crossReportData.currentCard);
                if (!verified) {
                    window.autopilotRunning = false;
                    updateUIButton();
                    break;
                }
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
    headerTitle.innerText = '🤖 SYSTEM ACTIVE LOG (v7.2.6):';
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
    btn.innerText = '▶ Start Autopilot (v7.2.6)';
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
            statusBox.style.display = 'flex';
            runAutopilot();
        } else {
            setStatus('⏹ Interrupted execution chain manually.', 'warning');
        }
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
    } else {
        btn.innerText = '▶ Start Autopilot (v7.2.6)';
    }
}

injectControlPanel();

})();
