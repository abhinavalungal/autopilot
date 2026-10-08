// ========================================================================
//   MARITIME REPORT AUTOPILOT — v8.0.4
//
//   [1] DUPLICATES NOT REJECTED — v8.0.3 rejected a copy only once another
//       copy was approved; while the other copy was still pending it
//       validated this one instead, so a duplicate got through whenever the
//       first copy was skipped/paused or the other copy lay outside the run.
//       The v7.5 rule is restored: a report is rejected as soon as another
//       report in the Report List has the same report name, date and EXACT
//       time (seconds included when the card shows them) and that report is
//       not already rejected. The comment is "Duplicate Report". Per-copy
//       ledger keys and the verified rejection from v8.0.3 are unchanged.
//   [2] EXACT DATE / TIME — the duplicate check compares the date and time
//       shown on the cards (12:00 +02:00 and 11:00 +01:00 are no longer the
//       same report); a different UTC offset still means a different report.
//
// ========================================================================
//   v8.0.3 notes (still accurate, except [1]'s rule — see v8.0.4 [1])
//
//   [1] DUPLICATES — one copy approved, the other rejected ("Duplicate
//       report"). Both copies were skipped: the ledger identified a report by
//       its text, so two identical copies shared ONE entry and finishing one
//       finished both. Each card now has its own key (a 2nd copy is "…#2").
//       A copy is rejected only once another copy is approved, the rejection
//       is verified on the platform, and if it cannot be completed the run
//       stops on that copy instead of skipping it.
//   [2] GO TO FIELD — the saved field could be a detached element after the
//       page re-drew the form, so the button did nothing. The field is found
//       again (id / name / row + column), or the report is re-checked first;
//       a hidden field is reported; a cut-short smooth scroll falls back to
//       an instant jump.
//   [3] NO CHANGE WITHOUT APPROVAL — blank event rows were deleted
//       automatically (the only unapproved change). They are now offered as
//       "Delete this blank row" and removed only when the user clicks it.
//   [4] "ERRORS DETECTED IN THE SUBMITTED DATA" ON THE FIRST RUN — Autopilot
//       validated ~0.6 s after a report opened and submitted straight after,
//       while the platform was still filling in / recalculating the list of
//       operations ROB and consumption totals (two checks only the platform
//       runs). It now validates and submits only once the form's values have
//       stopped changing, re-validates if they changed in between, and after
//       a first platform refusal closes the message and re-submits once.
//   [5] "SHIFTING FROM LAST BERTH TO SEA" NOT FOUND — a real event that is the
//       first option in its dropdown was read as a blank row (selectedIndex
//       0), and only sections titled "EVENTS" were read. Placeholder detection
//       now looks at the option itself, event sections are found by their
//       event-type dropdowns too, and the name match tolerates wording.
//
// ========================================================================
//   v8.0.2 notes (still accurate)
//
//   [1] REPORT LIST — ROOT CAUSE FIXED
//       The Report List was read with a broad ".card" selector that also
//       matched a form panel ("Noon Report - At Sea / NOTE: REPORT EVENTS ONLY
//       FOR PERIOD…"). That panel was taken for the selected report: it has no
//       date, so Steaming Hours "could not be verified", the duplicate check
//       silently passed, and the panel entered the ledger as a report that
//       navigation then tried to click. A Report List card must now carry a
//       vessel and a readable report date/time and hold no form fields, and
//       validation, duplicate check and navigation share ONE list and ONE
//       "selected report" finder (they each had their own copy before).
//   [2] STEAMING HOURS — verified again once [1] reads the right report;
//       the panel shows current, expected and the difference, with a fix.
//   [3] LAST ROB = ROB START — now an exact match (it used the 0.01 ADJ
//       tolerance, so 425.590 vs 425.592 got a green tick). ROB End + the
//       row's consumption decides which value the panel offers to correct.
//   [4] SKIP REPORT — one click (the two-click confirm read as broken); the
//       card is tagged "SKIPPED — NOT APPROVED" and is never re-validated.
//   [5] MOVING TO NEXT REPORT — navigation waits for the clicked card to
//       become selected; the page-text fallback (always true, since the list
//       itself shows every date) only counts when no card is marked selected.
//
// =========================================================================
//   v8.0.1 notes (still accurate)
//   (base: v7.6.0 — validation rules, selectors, approval, rejection and
//    navigation logic are unchanged. v8.0.1 changes only the items below.)
//
//   [1] LOG GLITCH — ROOT CAUSE FIXED
//       The log panel lived in the page DOM, so the validation scans read it
//       as part of the report: scanInlineValidationErrors() flagged Autopilot's
//       own log lines ("Select an event type…") as form errors and painted them
//       pink, and the body.innerText page checks matched vessel names/dates
//       printed in the log. The UI now lives in a shadow root, which every
//       querySelectorAll / innerText scan in this file is blind to.
//       Also fixed: the log was wiped on every re-check (clearStatus), it
//       force-scrolled to the bottom while you were reading, and every error
//       scrolled the page in turn so it landed on the LAST error.
//
//   [2] USER CORRECTION FLOW (replaces auto re-check ×2 → auto-skip for
//       validation failures only; transient/navigation recovery unchanged)
//       A failing report is never approved. Autopilot pauses on it, lists
//       every issue, highlights every affected field, and walks you through
//       them one at a time (scrolling to each). Where the correct value is
//       known — Steaming Hours (elapsed time), ADJ (0), ROB Start (Last ROB) —
//       it shows current vs expected and offers a one-click update. Editing a
//       field re-validates; once every check passes the report is approved
//       automatically. "Skip report" uses the existing error-skip path.
//
//   [3] ALL ERRORS IN ONE PASS
//       Checks that used to halt at the first failure (blank-row consumption,
//       unapproved event, End Date/Time, departure final event, Arrival/At
//       Sea conflict) now record their error and let the remaining checks run,
//       so every issue on the report is shown at once. Outcome is unchanged:
//       any failure blocks approval.
//
//   [4] RE-VALIDATION IS REPEATABLE
//       Dead reckoning restores the previous report's position before
//       re-checking the same report (it used to compare the report with its
//       own position on a second pass). The error summary separates errors
//       that were corrected (report later approved) from unresolved ones.
//
//   [5] UI — Start button states (ready / starting / running / needs review /
//       completed / finished with errors / stopped) and a redesigned SYSTEM
//       ACTIVE LOG: status bar with the current phase, issues panel, per-report
//       collapsible sections, "issues only" filter, minimise, and a scroll
//       position that stays put while you read.
//
// =========================================================================
//   v7.6.0 notes (still accurate)
//   (base: v7.4.2 — ONLY the six requested changes were applied; every
//    other rule, validation, selector and workflow is byte-for-byte the
//    v7.4.2 behaviour.)
//
//   [1] CONTINUE AFTER A DUPLICATE REPORT
//       After a duplicate is auto-rejected, Autopilot no longer relies on
//       the plain "step one card" navigation (which could land on a card
//       that is already green/red and stall the run). It now searches the
//       list for the next UNCHECKED report — one that is neither green
//       (approved) nor red (rejected) and is not already recorded as
//       finished in the ledger — navigates to it and carries on validating
//       until the queue is empty or another existing stop condition fires.
//
//   [2] RESET LOGIC REMOVED
//       resetLedger() and resetReportEventIndex() are gone, as is the
//       Start-button branch that wiped the ledger, the event index and the
//       last-known position. Nothing is ever thrown away. The ledger is
//       instead kept in step with the list by syncLedgerWithSidebar():
//       untracked unchecked cards are appended, and tracked reports whose
//       card has since turned green or red are recorded as finished.
//
//   [3] ERRORS ARE REPRINTED AT THE END OF THE LOG, AS ERRORS
//       Every line logged at error level is captured in RunErrors and
//       reprinted in red under an ERROR SUMMARY heading when the run ends.
//       Conditions that are genuine failures (a failed rejection, an
//       unconfirmed navigation) are logged at error level instead of
//       warning level.
//
//   [4] AUTOMATIC RESUME AFTER AN AUTOMATIC HALT
//       haltForUser() no longer parks the bot. It records the error, shows
//       the orange halted state, and the loop resumes by itself after
//       HALT_AUTO_RESUME_DELAY_MS. The same report is re-checked up to
//       MAX_HALT_AUTO_RESUMES times (so a fixed page recovers on its own);
//       if it still cannot clear, the error is recorded and Autopilot moves
//       to the next unchecked report rather than sitting halted. A user
//       Stop remains sticky — nothing auto-resumes after it.
//
//   [5] PERFORMANCE
//       Fixed sleeps replaced with condition-based waits where possible,
//       all polling intervals tightened, and getAllContexts() memoised for
//       a short TTL (it was being rebuilt thousands of times per report).
//       No validation rule, sequence requirement or expected result changed.
//
//   [6] ERROR DETECTION & HIGHLIGHTING
//       scanInlineValidationErrors() sweeps the form for the site's own
//       validation messages (".p-error"-style nodes and red error text such
//       as "Select an event type"), highlights each one — and its field —
//       in red, and reports them as errors. Dialog lines that are real
//       errors rather than advisories are now classified as errors and can
//       never be bypassed. Blank event-type dropdowns are outlined in red.
//       Warnings and info messages keep their own levels.
// =========================================================================

(function () {

const VERSION = '8.0.4';

const CONFIG = {
    REQUIRE_BUNKER_DATA: true,
    STEAMING_HOURS_MIN: 16,
    STEAMING_HOURS_MAX: 26,
    STEAMING_HOURS_IN_PORT_MIN: 0,
    STEAMING_HOURS_IN_PORT_MAX: 24,
    ADJ_TOLERANCE: 0.01,
    // v8.0.2 [3]: Last ROB and ROB Start must be IDENTICAL. The ROB check used
    // ADJ_TOLERANCE (0.01), so 425.590 vs 425.592 passed with a green tick.
    // This only absorbs floating-point noise, far below the 0.001 MT precision.
    ROB_MATCH_TOLERANCE: 0.000001,
    // Precision used when cross-checking ROB End + consumption (0.001 MT data).
    ROB_CROSSCHECK_TOLERANCE: 0.0005,
    STEAMING_HOURS_ELAPSED_TOLERANCE: 0.1,

    // ── v7.6.0 [5] Performance: every wait below was re-tuned. Each one is
    // now backed by a condition-based wait (waitForCondition /
    // waitForDOMStable / waitForPageReady), so the shorter value is a
    // *head start*, not a gamble — if the page needs longer, the condition
    // wait still holds Autopilot until it is ready.
    SLEEP_POLL_MS: 150,             // was 500
    SLEEP_POST_CLICK_MS: 450,       // was 1200
    SLEEP_POST_DIALOG_MS: 300,      // was 800
    DOM_STABLE_HEADSTART_MS: 120,   // was 400
    SLEEP_POST_NAVIGATE_MS: 650,    // was 3500
    SLEEP_INIT_MS: 120,             // was 500
    DOM_STABLE_TIMEOUT_MS: 2200,    // was 3000
    DOM_STABLE_DEBOUNCE_MS: 110,    // was 200
    YES_BTN_RETRY_COUNT: 6,         // was 3 (shorter delay → more attempts)
    YES_BTN_RETRY_DELAY_MS: 120,    // was 300
    // Budget for the new condition-based waits.
    CONDITION_POLL_MS: 60,
    CONDITION_TIMEOUT_MS: 2500,
    // How long getAllContexts() may be reused before it is rebuilt.
    CONTEXT_CACHE_TTL_MS: 250,

    // v7.1.2: reporting period validity window (Validation Check #2)
    // v7.3.0: max interval raised 25 → 26 hrs per updated report-time-gap
    // policy — any gap strictly greater than this halts Autopilot immediately.
    REPORT_INTERVAL_MIN_HOURS: 1,
    REPORT_INTERVAL_MAX_HOURS: 26,

    // v7.3.0: website buffering / loading-screen recovery. These govern
    // waitForPageReady() — buffering is never treated as an error on its
    // own; Autopilot pauses and polls, only halting if the page fails to
    // recover within this budget.
    PAGE_LOAD_POLL_MS: 220,         // v7.6.0 [5]: was 600
    PAGE_LOAD_POLL_MAX_MS: 1500,    // v7.6.0 [5]: was 4000
    PAGE_LOAD_MAX_WAIT_MS: 45000,
    PAGE_LOAD_MAX_RETRIES: 60,      // v7.6.0 [5]: polls are faster, so more
    // v7.4.2: a real buffering condition holds steady for at least this
    // long; a single-frame CSS-transition flicker does not. Requiring the
    // second isPageBuffering() check to still be true after this delay
    // filters that flicker out before Autopilot ever logs/pauses for it.
    BUFFERING_CONFIRM_DELAY_MS: 150,

    // v8.0.3 [4]: validate and submit only once the form's values have
    // stopped changing for FORM_SETTLE_QUIET_MS (checked every POLL_MS, for
    // at most MAX_MS).
    FORM_SETTLE_QUIET_MS: 800,
    FORM_SETTLE_POLL_MS: 200,
    FORM_SETTLE_MAX_MS: 8000,

    // ── v7.6.0 [4] Automatic halt recovery ────────────────────────────────
    // An automatic halt no longer parks the bot. The same report is retried
    // up to MAX_HALT_AUTO_RESUMES times; after that the error is recorded
    // and Autopilot continues with the next unchecked report.
    HALT_AUTO_RESUME_DELAY_MS: 1000,
    MAX_HALT_AUTO_RESUMES: 2,

    // ── v8.0.1 [2] User correction flow ───────────────────────────────────
    // Delay between an edit on the form (or a one-click fix) and the
    // re-validation it triggers; several quick edits collapse into one pass.
    CORRECTION_RECHECK_DELAY_MS: 600,
    // Oldest report sections are dropped from the log beyond this many.
    LOG_MAX_SECTIONS: 40,

    // ── v7.6.0 [6] Inline validation-error detection ──────────────────────
    // Longest message text the error sweep will treat as a field-level
    // validation message (anything longer is page copy, not an error).
    ERROR_SCAN_MAX_LEN: 220,
    ERROR_SCAN_PHRASE_MAX_LEN: 160,
    ERROR_SCAN_MAX_HITS: 30,

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

    // v8.0.3 [1]: the comment entered when a duplicate copy is rejected.
    DUPLICATE_REJECT_COMMENT: 'Duplicate Report',

    // ── v7.6.0 [6] Dialog lines that are ERRORS, not advisories ───────────
    // A dialog line matching one of these is a real validation error: it is
    // logged in red, recorded in the error summary, and can never be
    // bypassed via "Proceed Anyway" — even if it also matches a bypass
    // phrase above.
    ERROR_WARNING_PHRASES: [
        'select an event type',
        'select event type',
        'please select an event',
        'event type is required',
        'is required',
        'is mandatory',
        'cannot be blank',
        'cannot be empty',
        'must not be empty',
        'must be selected',
        'enter a valid',
        'invalid value'
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
    // transient failures on the same report is it escalated — and as of
    // v7.6.0 [4] that escalation records the error and moves on rather than
    // leaving the bot stopped.
    MAX_TRANSIENT_RETRIES: 4,
    TRANSIENT_RETRY_DELAY_MS: 250,  // v7.6.0 [5]: was 400
    // Watchdog: how often to check whether the loop stopped without a
    // genuine reason, and how quickly to resume when it did.
    WATCHDOG_INTERVAL_MS: 250,
    WATCHDOG_RESUME_DELAY_MS: 150,

    // ── v7.4.0 [3] No-skip navigation verification ────────────────────────
    NAV_VERIFY_ATTEMPTS: 3,
    NAV_VERIFY_DELAY_MS: 300,       // v7.6.0 [5]: was 600
    // v8.0.2 [5]: how long to wait for the clicked card to become selected.
    NAV_LAND_TIMEOUT_MS: 2500,

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

// ── v7.6.0 [5] Condition-based wait ──────────────────────────────────────
// Replaces "sleep a fixed amount and hope" with "poll cheaply and return
// the instant the condition is true". Returns the truthy value produced by
// the predicate, or null when the budget runs out.
async function waitForCondition(
    predicate,
    timeoutMs = CONFIG.CONDITION_TIMEOUT_MS,
    intervalMs = CONFIG.CONDITION_POLL_MS
) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        let value = null;
        try { value = predicate(); } catch { value = null; }
        if (value) return value;
        if (Date.now() >= deadline) return null;
        await sleep(intervalMs);
    }
}

const FIELD_STYLES = {
    ERROR_HEX_FULL:     'border: 3px solid #f44336 !important; background-color: #ffebee !important;',
    ERROR_KEYWORD_FULL:  'border: 3px solid red !important; background-color: #ffebee !important;',
    SUCCESS_FULL:        'border: 1px solid green !important; background-color: #e8f5e9 !important;',
    SUCCESS_NOBG:        'border: 1px solid green !important;',
    ERROR_BORDER_ONLY:   '3px solid #f44336',
    SUCCESS_BORDER_ONLY: '1px solid green',
    // v7.6.0 [6]: used for the site's own inline validation messages, which
    // are text nodes rather than fields — a filled box would hide the text.
    ERROR_INLINE_MESSAGE:
        'outline: 3px solid #f44336 !important; outline-offset: 1px !important; ' +
        'background-color: #ffebee !important; color: #b71c1c !important; font-weight: bold !important;'
};

window.autopilotRunning = false;


// ---------------------------------------------------------------------------
//   v7.6.0 [3] — RUN ERROR COLLECTOR
//
//   v7.6.0 wiped the panel between reports (clearStatus, removed in v8.0.1),
//   so anything logged for an earlier report disappeared. Every line logged at error level is
//   captured here and reprinted, in red, under an ERROR SUMMARY heading when
//   the run ends.
// ---------------------------------------------------------------------------

const RunErrors = {
    list: [],
    seen: new Set(),
    printedCount: 0,
    suspended: false
};
window.__autopilotErrors = RunErrors;

function normaliseErrorKey(message) {
    return (message || '')
        .replace(/^[\s\u{1F300}-\u{1FAFF}\u2000-\u27BF•\-–—]*/u, '')
        .replace(/^\s*\d+\.\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function recordError(message, context) {
    if (RunErrors.suspended) return;
    const text = (message || '').toString().trim();
    if (!text) return;

    // v8.0.1 [4]: errors are tied to the report they were raised on, and the
    // same message on two different reports is two errors, not one.
    const reportKey = UI.sectionKey || '';
    const key = normaliseErrorKey(text);
    if (!key || RunErrors.seen.has(`${reportKey}|${key}`)) return;

    RunErrors.seen.add(`${reportKey}|${key}`);
    RunErrors.list.push({
        message: text,
        context: context || '',
        reportKey,
        at: new Date().toISOString()
    });
}

// v8.0.1 [4]: an error was corrected when its report later passed every
// check and was approved by Autopilot. v8.0.3 [1]: for a duplicate copy the
// right outcome is rejection, so a rejected duplicate counts as resolved.
function errorWasResolved(e) {
    const entry = e.reportKey ? ProcessingLedger.entries.get(e.reportKey) : null;
    if (!entry) return false;
    return entry.status === 'approved' ||
        (!!entry.duplicate && (entry.status === 'rejected-duplicate' || entry.status === 'already-rejected'));
}

function unresolvedErrors() {
    return RunErrors.list.filter(e => !errorWasResolved(e));
}

// Reprints every recorded error at the end of the log, at error level.
function flushErrorSummary(headingSuffix) {
    if (RunErrors.printedCount >= RunErrors.list.length && RunErrors.printedCount > 0) return;

    RunErrors.suspended = true;
    try {
        beginSummarySection();
        setStatus('━━━━━━━━━━ ERROR SUMMARY ━━━━━━━━━━', 'error');

        const open  = unresolvedErrors();

        if (RunErrors.list.length === 0) {
            setStatus('✅ No errors were recorded during this run.', 'success');
        } else if (open.length === 0) {
            setStatus('✅ No unresolved errors — every error recorded was resolved (its report approved, or a duplicate copy rejected).', 'success');
        } else {
            setStatus(
                `🛑 ${open.length} error(s) were recorded during this run` +
                `${headingSuffix ? ` (${headingSuffix})` : ''}:`,
                'error'
            );
            open.forEach((e, i) => {
                setStatus(`   ${i + 1}. ${e.message}${e.context ? `  [${e.context}]` : ''}`, 'error');
            });
            setStatus('🛑 End of error list — every item above is an ERROR, not a warning.', 'error');
        }

        const corrected = [...IssueHistory].filter(([k]) => {
            const entry = ProcessingLedger.entries.get(k);
            return entry && entry.status === 'approved';
        });
        if (corrected.length > 0) {
            setStatus(`✅ ${corrected.length} report(s) had validation errors that were corrected, re-validated and then approved:`, 'success');
            corrected.forEach(([, h]) => setStatus(`   • ${h.label} — corrected: ${[...h.fields].join(', ')}`, 'success'));
        }

        setStatus('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'error');
        RunErrors.printedCount = RunErrors.list.length;
    } finally {
        RunErrors.suspended = false;
    }
}


const AutopilotState = {
    sessionActive:    false,
    userStopped:      false,
    genuineHalt:      false,
    haltReason:       '',
    loopActive:       false,
    transientRetries: 0,
    watchdogTimer:    null,
    resumeTimer:      null,
    // v7.6.0 [4]
    haltCounts:       new Map(),
    lastKey:          '',
    // v8.0.1 [2]: paused on a failing report, waiting for the user.
    awaitingCorrection: false,
    // v8.0.3 [4]: reports already re-submitted once after a platform refusal.
    platformRetried: new Set()
};
window.__autopilotState = AutopilotState;

// ---------------------------------------------------------------------------
//   v8.0.1 [2] — VALIDATION PASS + ISSUES FOR THE CORRECTION PANEL
//
//   A validation pass still produces the same plain `errors` strings as
//   before. Error sites that know which field is wrong also note metadata
//   (field, current / expected value, one-click fix) against that exact
//   message, so the panel can present the issue without changing any rule.
// ---------------------------------------------------------------------------

const ValidationPass = {
    active: false,     // true while validateCurrentReport() runs
    key:    '',        // report the pass belongs to
    meta:   new Map()  // error message → { id, field, problem, el, current, expected, reason, fix }
};

const ReportIssues = {
    key:      '',      // report the issues belong to
    list:     [],      // [{ id, message, field, problem, el, current, expected, reason, fix }]
    active:   0,       // index of the issue being worked on
    resolved: 0,       // issues cleared on this report since it first failed
    moved:    false    // active issue changed on the last update → scroll to it
};
window.__autopilotIssues = ReportIssues;

// v8.0.1 [4]: every issue a report ever had (report key → { label, fields }),
// so the summary can name what was corrected before approval.
const IssueHistory = new Map();

// v8.0.1 [4]: the previous report's position, captured on the first pass
// over a report so a re-check starts dead reckoning from the same place.
const DRBaseline = { key: '', pos: undefined };

function beginValidationPass(crossReportData) {
    const key = (crossReportData && crossReportData.currentKey) || sigKey(crossReportData && crossReportData.currentSig);
    ValidationPass.active = true;
    ValidationPass.key    = key;
    ValidationPass.meta   = new Map();

    if (key && DRBaseline.key === key) {
        window._autopilotLastKnownPosition = DRBaseline.pos;
    } else {
        DRBaseline.key = key;
        DRBaseline.pos = window._autopilotLastKnownPosition;
    }
}

function noteIssue(message, meta) {
    ValidationPass.meta.set(message, meta || {});
}

// Replaces the issue list for the current report. `entries` are error
// strings (metadata looked up from noteIssue) or ready-made issue objects.
function setReportIssues(entries) {
    const key         = ValidationPass.key;
    const sameReport  = !!key && key === ReportIssues.key;
    const prevIds     = sameReport ? ReportIssues.list.map(x => x.id) : [];
    const prevActive  = sameReport && ReportIssues.list[ReportIssues.active]
        ? ReportIssues.list[ReportIssues.active].id : null;

    const seen = new Set();
    const list = [];
    for (const entry of entries) {
        const message = typeof entry === 'string' ? entry : entry.message;
        const meta    = (typeof entry === 'string' ? ValidationPass.meta.get(entry) : entry) || {};
        const id      = meta.id || normaliseErrorKey(message);
        if (!message || seen.has(id)) continue;
        seen.add(id);
        list.push({ ...meta, message, id, loc: locatorFor(meta.el) }); // v8.0.3 [2]: loc finds a re-drawn field
    }

    if (key) {
        const entry = ProcessingLedger.entries.get(key);
        const history = IssueHistory.get(key) || { label: entry ? entry.label : (UI.report || key), fields: new Set() };
        list.forEach(x => history.fields.add(x.field || x.message));
        IssueHistory.set(key, history);
    }

    const resolvedNow = prevIds.filter(id => !seen.has(id)).length;
    const keep        = prevActive ? list.findIndex(x => x.id === prevActive) : -1;

    ReportIssues.key      = key;
    ReportIssues.list     = list;
    ReportIssues.resolved = (sameReport ? ReportIssues.resolved : 0) + resolvedNow;
    ReportIssues.active   = keep >= 0 ? keep : 0;
    ReportIssues.moved    = keep < 0;

    const first = list[ReportIssues.active];
    const label = first ? `#${ReportIssues.active + 1} ${first.field || 'validation issue'}` : '';
    if (!sameReport) {
        setStatus(`🧭 ${list.length} issue${list.length === 1 ? '' : 's'} found on this report — starting with ${label}.`, 'warning');
    } else if (resolvedNow > 0) {
        setStatus(`✅ ${resolvedNow} issue${resolvedNow === 1 ? '' : 's'} resolved — ${list.length} remaining. Next: ${label}.`, 'success');
    } else {
        setStatus(`⚠️ ${list.length} issue${list.length === 1 ? '' : 's'} still open — ${label} needs attention.`, 'warning');
    }
}

function clearReportIssues() {
    if (UI.panel) UI.panel.classList.remove('right');
    ReportIssues.key      = '';
    ReportIssues.list     = [];
    ReportIssues.active   = 0;
    ReportIssues.resolved = 0;
    ReportIssues.moved    = false;
    clearIssueMarks();
    renderIssues();
}

// ── v7.6.0 [4] ─────────────────────────────────────────────────────────────
// A halt is now a RECOVERABLE state. The reason is recorded as an error and
// shown in orange, but the loop resumes by itself — it is never parked.
// Only stopByUser() is sticky.
function haltForUser(reason) {
    const text = reason || 'Validation issue requires review.';
    AutopilotState.genuineHalt = true;
    AutopilotState.haltReason  = text;
    recordError(text, 'halt');
    setStatus(`🛑 HALTED — ${text}`, 'error');
    setStatus(
        ReportIssues.list.length > 0
            ? '   This report will NOT be approved. Waiting for your correction — work through the issues panel; Autopilot re-checks after each fix.'
            : '   Automatic recovery is enabled — Autopilot will resume by itself.',
        'warning'
    );
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
    // v8.0.1 [2]: release a loop that is waiting for a correction.
    finishCorrection('stopped');
    setStatus('⏹ Stopped by user. Autopilot will remain stopped until Start is clicked.', 'warning');
    flushErrorSummary('run stopped by user');
    updateUIButton();
}

// Normal completion — queue exhausted. Not a halt, not an error.
function finishRun(message) {
    AutopilotState.sessionActive = false;
    AutopilotState.genuineHalt   = false;
    AutopilotState.haltReason    = '';
    window.autopilotRunning      = false;
    stopWatchdog();
    clearReportIssues();
    if (message) setStatus(message, 'success');
    flushErrorSummary('end of run');
    UI.lastRun = unresolvedErrors().length > 0 ? 'errors' : 'completed';
    updateUIButton();
}

function startWatchdog() {
    if (AutopilotState.watchdogTimer) return;
    AutopilotState.watchdogTimer = setInterval(() => {
        // Never resume after a user Stop — this is the strict rule.
        if (AutopilotState.userStopped)    return;
        if (!AutopilotState.sessionActive) return;
        if (window.autopilotRunning)       return;
        if (AutopilotState.loopActive)     return;
        if (AutopilotState.resumeTimer)    return;

        // v7.6.0 [4]: an automatic halt is recovered here too, not just a
        // stop with no reason. The bot must never sit in the halted state.
        const why = AutopilotState.genuineHalt
            ? `after an automatic halt (${AutopilotState.haltReason || 'reason not recorded'})`
            : 'without a genuine validation reason';

        setStatus(`♻️ Autopilot is not running ${why} — resuming automatically...`, 'warning');
        AutopilotState.resumeTimer = setTimeout(() => {
            AutopilotState.resumeTimer = null;
            if (AutopilotState.userStopped)    return;
            if (!AutopilotState.sessionActive) return;
            AutopilotState.genuineHalt = false;
            AutopilotState.haltReason  = '';
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
        sig.seconds     || '',   // v8.0.4 [2]
        sig.utcOffset   || ''
    ].join('|');
}

// v8.0.3 [1]: the identity of ONE card in the Report List. Two duplicate
// reports have identical text, so the signature alone made them a single
// ledger entry — rejecting (or skipping) one marked the other as finished
// too, and neither got approved. The 2nd, 3rd… card with the same signature
// is keyed "…#2", "…#3" in list order. (An element nested inside a card of
// the same report shares that card's key.)
function cardKeyMap(cards) {
    const map = new Map();
    const counts = new Map();
    for (const card of cards) {
        const key = sigKey(extractCardSignature(card));
        const parent = cards.find(o => o !== card && o.contains(card) && map.has(o) && map.get(o).split('#')[0] === key);
        if (parent) { map.set(card, map.get(parent)); continue; }
        const n = (counts.get(key) || 0) + 1;
        counts.set(key, n);
        map.set(card, n > 1 ? `${key}#${n}` : key);
    }
    return map;
}

// Log label for a ledger entry; a duplicate copy says which copy it is.
function ledgerLabel(sig, key) {
    const copy = (key || '').split('#')[1];
    return describeSignature(sig) + (copy ? ` (duplicate copy ${copy})` : '');
}

function cardKey(card, cards) {
    if (!card) return '';
    const list = cards && cards.length ? cards : getAllReportCards();
    return cardKeyMap(list).get(card) || sigKey(extractCardSignature(card));
}

// ── v7.6.0 [2] ─────────────────────────────────────────────────────────────
// resetLedger() and resetReportEventIndex() have been REMOVED. Nothing in
// Autopilot discards state any more. syncLedgerWithSidebar() keeps the
// ledger honest instead: new unchecked cards are appended, and anything
// whose card has since turned green or red is recorded as finished.

// Builds the expected processing order from the sidebar. Processing runs
// from the currently-selected card upwards (index → 0), matching the
// existing sequential navigation behaviour.
function initialiseLedger(sidebarCards, currentCard) {
    const cards = sidebarCards && sidebarCards.length ? sidebarCards : getAllReportCards();
    if (!cards.length) return;

    const startIndex = Math.max(0, cards.indexOf(currentCard || identifyCurrentCard(cards)));
    const keys = cardKeyMap(cards);

    for (let i = startIndex; i >= 0; i--) {
        const sig = extractCardSignature(cards[i]);
        const key = keys.get(cards[i]);
        if (!key.replace(/\|/g, '')) continue;
        if (ProcessingLedger.entries.has(key)) continue;
        ProcessingLedger.order.push(key);
        ProcessingLedger.entries.set(key, {
            key,
            label: ledgerLabel(sig, key),
            status: 'pending',
            note: '',
            updatedAt: Date.now()
        });
    }

    ProcessingLedger.initialised = true;
    setStatus(`🧾 Processing ledger initialised — ${ProcessingLedger.order.length} report(s) queued for this run.`, 'info');
}

// v7.6.0 [2]: the replacement for the removed reset. Called on every pass so
// the ledger tracks the live list without ever being wiped.
function syncLedgerWithSidebar(sidebarCards) {
    const cards = sidebarCards && sidebarCards.length ? sidebarCards : getAllReportCards();
    if (!cards.length) return { added: 0, resolved: 0 };

    let added = 0;
    let resolved = 0;
    const keys = cardKeyMap(cards);

    for (const card of cards) {
        const sig = extractCardSignature(card);
        const key = keys.get(card);
        if (!key.replace(/\|/g, '')) continue;

        const checked  = isCardChecked(card);
        const rejected = !checked && isRejectedCard(card);

        if (!ProcessingLedger.entries.has(key)) {
            // Only untracked reports that still need work are queued.
            if (checked || rejected) continue;
            ProcessingLedger.entries.set(key, {
                key,
                label: ledgerLabel(sig, key),
                status: 'pending',
                note: 'appeared in the list after the run started',
                updatedAt: Date.now()
            });
            ProcessingLedger.order.push(key);
            added++;
            continue;
        }

        if (ledgerIsComplete(key)) continue;

        if (checked) {
            ledgerMark(key, 'already-approved', 'card is green in the list');
            resolved++;
        } else if (rejected) {
            ledgerMark(key, 'already-rejected', 'card is red in the list');
            resolved++;
        }
    }

    markSkippedCards(cards);
    if (added)    setStatus(`🧾 Ledger sync: ${added} new unchecked report(s) added to the queue.`, 'info');
    if (resolved) setStatus(`🧾 Ledger sync: ${resolved} report(s) recorded as finished from their card colour.`, 'info');

    return { added, resolved };
}

function ledgerEnsureEntry(sig, key = sigKey(sig)) {
    if (!key.replace(/\|/g, '')) return null;
    if (!ProcessingLedger.entries.has(key)) {
        // A report that was not in the original snapshot (queue changed
        // mid-run). Add it rather than letting it fall through unnoticed.
        ProcessingLedger.entries.set(key, {
            key,
            label: ledgerLabel(sig, key),
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

// v7.6.0 [4]: 'error-skipped' is a finished state — the report was checked,
// the error was recorded, and Autopilot moved on instead of staying halted.
const LEDGER_COMPLETE_STATUSES = [
    'approved', 'rejected-duplicate', 'already-approved', 'already-rejected', 'error-skipped'
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

    beginSummarySection();
    const missed = ProcessingLedger.order.filter(k => !ledgerIsComplete(k));
    const done   = ProcessingLedger.order.length - missed.length;
    const errored = ProcessingLedger.order.filter(k => {
        const e = ProcessingLedger.entries.get(k);
        return e && e.status === 'error-skipped';
    });

    setStatus('━━━ Processing reconciliation ━━━', 'info');
    setStatus(`🧾 ${done} of ${ProcessingLedger.order.length} queued report(s) completed.`, done === ProcessingLedger.order.length ? 'success' : 'warning');

    // v7.6.0 [3]: reports that finished only because their error could not be
    // cleared are called out as errors, not buried in the "completed" count.
    if (errored.length > 0) {
        setStatus(`🛑 ${errored.length} report(s) were completed WITH ERRORS and need review:`, 'error');
        errored.forEach(k => {
            const e = ProcessingLedger.entries.get(k);
            setStatus(`   • ${e.label} — ${e.note || 'validation error could not be cleared'}`, 'error');
        });
    }

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

// ── v7.6.0 [5] ─────────────────────────────────────────────────────────────
// getAllContexts() used to walk every iframe on every single call, and it is
// called thousands of times per report. The result is memoised for a short
// TTL and invalidated whenever the iframe count changes, which is the only
// thing that can change the answer.
let _contextCache = null;
let _contextCacheAt = 0;
let _contextCacheFrames = -1;

function getAllContexts() {
    const iframes = document.querySelectorAll('iframe');
    const now = Date.now();

    if (
        _contextCache &&
        iframes.length === _contextCacheFrames &&
        (now - _contextCacheAt) < CONFIG.CONTEXT_CACHE_TTL_MS
    ) {
        return _contextCache;
    }

    const contexts = [document];
    for (const iframe of iframes) {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc) contexts.push(doc);
        } catch { /* cross-origin */ }
    }

    _contextCache       = contexts;
    _contextCacheAt     = now;
    _contextCacheFrames = iframes.length;
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

    // v8.0.1 [1]: during a validation pass every error used to scroll the
    // page in turn, so it ended on the LAST error. The issues panel now
    // scrolls to issue #1 once the pass has found everything.
    if (ValidationPass.active) return true;

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

// ── v8.0.3 [4] Form settling ─────────────────────────────────────────────
// Every value on the report form, as one string. The platform fills in and
// recalculates some values (list of operations ROB, consumption totals) a
// moment after the form appears. Autopilot validated ~0.6 s after a report
// opened and submitted straight after, so the first Approve could go out on
// half-updated values and fail the platform's "Errors detected in the
// submitted data" check — while a re-run, much later, passed.
function formFingerprint() {
    const values = [];
    for (const el of queryAllContexts('input, select, textarea')) {
        if (el.type === 'hidden') continue;
        values.push(el.tagName === 'SELECT' ? String(el.selectedIndex)
            : (el.type === 'checkbox' || el.type === 'radio') ? String(el.checked) : el.value);
    }
    return `${values.length}:${values.join('\u0001')}`;
}

// Waits until no form value has changed for FORM_SETTLE_QUIET_MS (at most
// FORM_SETTLE_MAX_MS) and returns the settled fingerprint — or null if the
// form never went quiet, so callers do not compare a moving target.
async function waitForFormSettled(stepLabel) {
    const deadline = Date.now() + CONFIG.FORM_SETTLE_MAX_MS;
    let last = formFingerprint();
    let quietSince = Date.now();
    let changed = false;

    while (Date.now() < deadline) {
        await sleep(CONFIG.FORM_SETTLE_POLL_MS);
        const now = formFingerprint();
        if (now !== last) {
            last = now;
            quietSince = Date.now();
            changed = true;
        } else if (Date.now() - quietSince >= CONFIG.FORM_SETTLE_QUIET_MS) {
            if (changed) {
                setStatus(`⏳ The report form was still filling in / recalculating (${stepLabel}) — waited until its values stopped changing.`, 'info');
            }
            return last;
        }
    }

    setStatus(`⚠️ The report form was still changing after ${CONFIG.FORM_SETTLE_MAX_MS / 1000} s (${stepLabel}) — continuing with the current values.`, 'warning');
    return null;
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

// ── v7.6.0 [1] ─────────────────────────────────────────────────────────────
// "Unchecked" = the card has not been resolved either way: it is neither
// green (approved) nor red (rejected). This is what Autopilot looks for when
// it continues after a duplicate rejection or after skipping a report whose
// error could not be cleared.
function isCardResolved(card) {
    if (!card) return false;
    return isCardChecked(card) || isRejectedCard(card);
}

function isCardUnchecked(card) {
    return !!card && !isCardResolved(card);
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
    let seconds = '';   // v8.0.4 [2]: kept apart so every other use of `time` stays HH:MM
    let utcOffset = '';
    let dateLineIndex = -1;
    const dtPattern = /(\d{4}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]\d{4})\s+(\d{2}:\d{2})(?::(\d{2}))?(?:[:\d]*)?\s*([+-]\d{2}:?\d{2})?/;
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(dtPattern);
        if (m) {
            date = m[1].replace(/[./]/g, '-');
            time = m[2];
            seconds = m[3] || '';
            if (m[4]) {
                utcOffset = m[4].length === 5 ? `${m[4].slice(0, 3)}:${m[4].slice(3)}` : m[4];
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

    return { reportType, vesselName, date, time, seconds, utcOffset, routeInfo, rawText: raw };
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

    // v8.0.4 [2]: the report date and the EXACT time shown on the cards must
    // match (14:35:22 and 14:35:23 are different reports).
    if (a.date !== b.date || a.time !== b.time || (a.seconds || '') !== (b.seconds || '')) {
        return { isDuplicate: false, reason: 'the reported date/time values differ', offsetsCompared: false };
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
        + ` — ${sig.date || '????-??-??'} ${sig.time || '??:??'}${sig.seconds ? ':' + sig.seconds : ''}`;
}

function checkIsDuplicateReport() {
    // v8.0.2 [1]: the same Report List and the same "selected report" as every
    // other step. This used to keep its own looser copies of both, so a form
    // panel titled "Noon Report …" could be taken as the current report and
    // the duplicate check silently returned "no duplicate".
    const sidebarCards = getAllReportCards();
    if (sidebarCards.length < 2) return null;

    const currentCard = identifyCurrentCard(sidebarCards);
    const currentSig = extractCardSignature(currentCard);

    if (!currentSig.vesselName || !currentSig.date || !currentSig.time) {
        return null;
    }

    // v8.0.3 [1]: collect EVERY other copy of this report, with its state,
    // instead of stopping at the first one.
    const keys  = cardKeyMap(sidebarCards);
    const twins = [];

    // v7.4.0 [5]: compare the complete timestamp (including UTC offset), not
    // just the displayed date/time. Near-misses — same wall clock, different
    // offset — are logged so the user can see they were considered and
    // deliberately cleared.
    for (const card of sidebarCards) {
        // The current card, and any wrapper/inner element of it, is not a duplicate of itself.
        if (card === currentCard || card.contains(currentCard) || currentCard.contains(card)) continue;
        const sig = extractCardSignature(card);

        const verdict = signaturesAreDuplicate(currentSig, sig);

        if (verdict.isDuplicate) {
            const key = keys.get(card);
            if (!twins.some(t => t.key === key)) {
                twins.push({ card, sig, key, state: duplicateTwinState(card, key), reason: verdict.reason });
            }
            continue;
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

    return twins.length ? { currentSig, currentCard, twins } : null;
}

// v8.0.3 [1]: another copy of the report counts as approved / rejected from
// its card colour OR from what Autopilot itself did to it in this run (the
// colour can lag behind the action).
function duplicateTwinState(card, key) {
    const entry  = key ? ProcessingLedger.entries.get(key) : null;
    const status = entry ? entry.status : '';
    if (isCardChecked(card) || status === 'approved' || status === 'already-approved') return 'approved';
    if (isRejectedCard(card) || status === 'rejected-duplicate' || status === 'already-rejected') return 'rejected';
    return 'pending';
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
        // v8.0.3 [5]: a section not titled "EVENTS" (e.g. "List of Operations").
        if (!targetEventsBlock) targetEventsBlock = findEventsBlocks().find(b => b.ownerDocument === ctx) || null;

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

// v8.0.3 [5]: an event-type dropdown, however the section around it is titled.
const EVENT_TYPE_SELECTOR =
    'select[id*="eventtypes" i], select[name*="eventtypes" i], select[data-td-name*="eventtypes" i], select#gsinporteventtypes';

// v8.0.3 [5]: is this dropdown showing a placeholder rather than an event?
// Both blank-row rules also counted "selectedIndex === 0" as blank, so a real
// event that is the FIRST option in its list (no placeholder option) — e.g.
// "SHIFTING FROM LAST BERTH TO SEA" — was read as a blank row: hidden from
// every event check ("final event not present") and offered for deletion.
function isPlaceholderSelection(selectEl) {
    const opt = selectEl.options && selectEl.options[selectEl.selectedIndex];
    if (!opt) return true;
    const text = (opt.text || '').trim();
    if (!text || /\bselect\b/i.test(text) || /^[-–—.\s]+$/.test(text)) return true;
    // A first option with no value is a placeholder whatever it says.
    return opt.index === 0 && /^(|null|undefined|\d+:\s*(null|undefined))$/i.test((opt.value || '').trim());
}

// v8.0.3 [5]: the event section(s). A fieldset titled "…EVENTS…" as before,
// or any fieldset holding event-type dropdowns (e.g. titled "List of
// Operations"); event-type dropdowns outside any fieldset use their table.
function findEventsBlocks() {
    const blocks = [];
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        for (const fs of Array.from(ctx.querySelectorAll('fieldset'))) {
            if (blocks.some(b => b.contains(fs))) continue;
            const legend = fs.querySelector('legend');
            if ((legend && (legend.innerText || '').toUpperCase().includes('EVENTS')) || fs.querySelector(EVENT_TYPE_SELECTOR)) {
                blocks.push(fs);
            }
        }
        for (const sel of Array.from(ctx.querySelectorAll(EVENT_TYPE_SELECTOR))) {
            if (blocks.some(b => b.contains(sel))) continue;
            const box = sel.closest('table');
            if (box) blocks.push(box);
        }
    }
    return blocks;
}

// v8.0.3 [5]: "Shifting from Last Berth to Sea" however it is written —
// Shift / Shifting, any spacing, punctuation or trailing detail.
function isDepartureFinalEventName(text) {
    const t = (text || '').toUpperCase().replace(/\s+/g, ' ').trim();
    return CONFIG.DEPARTURE_FINAL_EVENT_ALIASES.some(a => t.includes(a.toUpperCase())) ||
           /\bSHIFT(?:ING)?\b.*\bLAST\W+BERTH\b.*\bSEA\b/.test(t);
}

// v8.0.3 [5]: the final event shown as plain text (a read-only operations
// list renders event names as text, not dropdowns).
function findDepartureFinalEventText() {
    const scopes = findEventsBlocks();
    const roots  = scopes.length ? scopes : getAllContexts().map(c => c && c.body).filter(Boolean);
    for (const root of roots) {
        for (const el of Array.from(root.querySelectorAll('td, span, div, label, p, li'))) {
            // Not a cell holding a dropdown (its text lists every option), and
            // the text must BE the event name — not a note that mentions it.
            if (el.children.length > 2 || el.querySelector('select, option')) continue;
            const text = (el.innerText || el.textContent || '').trim();
            if (text.length <= 60 && /^\W*SHIFT/i.test(text) && isDepartureFinalEventName(text) && isElementVisible(el)) return el;
        }
    }
    return null;
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

            const isBlank = !selectedText || isPlaceholderSelection(selectEl); // v8.0.3 [5]

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

    // ── Both conditions satisfied → the row MAY be deleted ───────────────
    // v8.0.3 [3]: nothing is deleted automatically any more. Each row is
    // offered in the issues panel ("Delete this blank row") and removed only
    // when the user clicks it; until then it fails validation like any other
    // blank event row.
    const deletable = [];
    let missingControl = 0;

    for (const row of blankRows) {
        const delBtn = row.rowEl.querySelector(
            'button[name="delBtn"], button.tblBtn[onclick*="removeFromCopy"]'
        );
        if (!delBtn) { missingControl++; continue; }
        deletable.push({ rowEl: row.rowEl, selectEl: row.selectEl, delBtn });
    }

    if (deletable.length === 0 && missingControl > 0) {
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
        outcome: 'deletable',
        deleted: 0,
        deletable,
        purposesWithConsumption: [],
        message: `${deletable.length} blank event row(s) can be deleted (At Sea, no purpose-column fuel consumption recorded) — waiting for your approval in the issues panel.`
    };
}

// v8.0.3 [3]: runs only when the user clicks "Delete this blank row".
async function deleteBlankEventRow(row) {
    if (!row.delBtn.isConnected) return false;
    row.delBtn.click();
    return !!(await waitForCondition(() => !row.rowEl.isConnected, 1500, 50));
}

function validatePortEvents() {
    let portLayoutDetected = false;
    let containsInvalidEvent = false;
    let invalidEventName = '';
    // v7.4.0 [1]: blank rows are counted separately from genuinely
    // unapproved events. A blank row is not an "unapproved event scenario" —
    // it is handled by the conditional auto-delete rules instead.
    let blankRowCount = 0;
    // v7.6.0 [6]: the blank dropdowns themselves, so "Select an event type"
    // can be highlighted in red and reported as an error.
    const blankSelects = [];
    let invalidSelect = null; // v8.0.1 [2]: the dropdown, for the issues panel

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
        // v8.0.3 [5]: a section not titled "EVENTS" (e.g. "List of Operations").
        if (!targetEventsBlock) targetEventsBlock = findEventsBlocks().find(b => b.ownerDocument === ctx) || null;

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
            // v7.6.0 [6]: the dropdown is now outlined in red so the missing
            // event type is visible on the page, not just in the log.
            if (isPlaceholderSelection(selectEl)) { // v8.0.3 [5]: was also "selectedIndex === 0"
                blankRowCount++;
                blankSelects.push({ selectEl, text: selectedText || 'Select an event type', row: totalDropdowns.indexOf(selectEl) + 1 });
                selectEl.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                continue;
            }

            const isApproved = CONFIG.APPROVED_PORT_EVENTS.some(approvedEvent =>
                upperText.includes(approvedEvent.toUpperCase())
            );

            if (!isApproved) {
                containsInvalidEvent = true;
                invalidEventName = selectedText;
                invalidSelect = selectEl;
                selectEl.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
            } else {
                selectEl.style.cssText = FIELD_STYLES.SUCCESS_NOBG;
            }
        }
    }

    if (!portLayoutDetected) return { status: 'SEA', blankRowCount, blankSelects };
    if (containsInvalidEvent) return { status: 'INVALID', event: invalidEventName, invalidSelect, blankRowCount, blankSelects };
    return { status: 'VALID_PORT', blankRowCount, blankSelects };
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
    // v8.0.1 [2]: `issues` runs parallel to `errors` (same order) and carries
    // the field each error belongs to, for the issues panel.
    const result = { errors: [], checked: 0, issues: [] };
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
        result.issues.push({ el: target, row: row.index + 1, eventType: row.eventType, missingPart });
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

    // v8.0.3 [5]: tolerant name match, and the event also counts when the
    // operations list shows it as plain text (no dropdown to read).
    const matchIndexes = rows
        .map((r, i) => (isDepartureFinalEventName(r.normalisedEventType) ? i : -1))
        .filter(i => i >= 0);

    if (matchIndexes.length === 0) {
        const asText = findDepartureFinalEventText();
        if (asText) {
            result.recognisedFromText = (asText.innerText || '').trim();
            return result;
        }
    }

    if (rows.length === 0) {
        result.errors.push(
            `Departure Report validation failed: the required final event "${CONFIG.DEPARTURE_FINAL_EVENT}" was not ` +
            `found — no event rows could be read (${findEventsBlocks().length} event section(s) found on the page).`
        );
        return result;
    }

    if (matchIndexes.length === 0) {
        const listed = rows.map((r, i) => `${i + 1}. ${r.eventType}`).join(' | ');
        if (rows.length) {
            const last = rows[rows.length - 1];
            if (last.selectEl && last.selectEl.style) last.selectEl.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
            scrollToIssueElement(last.selectEl || last.rowEl, 'Departure report is missing its final event.');
            result.target = last.selectEl || last.rowEl;
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
        result.target = trailing[0].selectEl || trailing[0].rowEl;
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

// v7.6.0 [2]: resetReportEventIndex() has been REMOVED along with the rest
// of the reset logic. Entries are keyed per report and updated in place, so
// the index stays correct across runs without ever being wiped.

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

// v8.0.2 [1]: a Report List card names a vessel and carries a readable
// report date/time ("Noon Report V103, / NAVI STAR, / … / 2026-09-17 12:00
// -04:00"), and holds no form fields. The broad selector below also matches
// other page panels — e.g. the form's "Noon Report - At Sea / NOTE: REPORT
// EVENTS ONLY FOR PERIOD…" box — which were being taken for the selected
// report: no date → Steaming Hours "cannot be verified", and a junk entry in
// the ledger that "Moving to next report" then tried to click.
function isReportListCard(card) {
    const sig = extractCardSignature(card);
    if (!sig.vesselName || !sig.date || !sig.time) return false;
    const field = card.querySelector('input:not([type="hidden"]), select, textarea');
    return !(field && isElementVisible(field));
}

function getAllReportCards() {
    const cards = Array.from(
        document.querySelectorAll('.card, div[class*="card"], .report-item, li[class*="report"]')
    ).filter(card => {
        const text = card.innerText || '';
        return (
            text.includes('Report')  ||
            text.includes('Notice')  ||
            text.includes('Noon')    ||
            text.includes('Arrival') ||
            text.includes('Departure')
        ) && isReportListCard(card);
    });

    // A wrapper around several cards (the list container) reads like its
    // first card; drop anything that contains a card for a different report.
    const keys = new Map(cards.map(c => [c, sigKey(extractCardSignature(c))]));
    return cards.filter(c => !cards.some(o => o !== c && c.contains(o) && keys.get(o) !== keys.get(c)));
}

// How the last identifyCurrentCard() call found the selected card — 'fallback'
// means nothing marked a card as selected and the first card was assumed.
let _currentCardMethod = '';

function identifyCurrentCard(sidebarCards) {
    const found = findSelectedCard(sidebarCards);
    _currentCardMethod = found ? found.method : 'none';
    return found ? found.card : null;
}

function findSelectedCard(sidebarCards) {
    const ACTIVE_CLASSES = ['active', 'p-highlight', 'selected', 'is-selected',
                            'current', 'focused', 'open', 'p-listbox-item-selected'];

    for (const card of sidebarCards) {
        if (ACTIVE_CLASSES.some(cls => card.classList.contains(cls))) return { card, method: 'class' };
    }
    for (const card of sidebarCards) {
        if (card.getAttribute('aria-selected') === 'true') return { card, method: 'aria' };
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
            return { card: cardsAtMax[0].card, method: 'border' };
        }
    }

    for (const card of sidebarCards) {
        const style = window.getComputedStyle(card);
        if (isBlueish(style.borderColor) || isBlueish(style.outlineColor) || isBlueish(style.boxShadow)) {
            return { card, method: 'colour' };
        }
    }
    for (const card of sidebarCards) {
        const bg = window.getComputedStyle(card).backgroundColor;
        if (bg && bg !== 'rgb(255, 255, 255)' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !isStatusColor(bg)) {
            return { card, method: 'background' };
        }
    }
    return sidebarCards[0] ? { card: sidebarCards[0], method: 'fallback' } : null;
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
//   v7.6.0 [1] — NEXT UNCHECKED REPORT
//
//   After a duplicate rejection (and after a report whose error could not be
//   cleared is recorded and skipped), Autopilot continues with the next
//   report that is still UNCHECKED — neither green nor red on the card, and
//   not already recorded as finished in the ledger. Processing order is the
//   existing one: descending sidebar index, newest → oldest.
// ---------------------------------------------------------------------------

function findNextUncheckedCard(currentCard, sidebarCards) {
    const cards = sidebarCards && sidebarCards.length ? sidebarCards : getAllReportCards();
    if (!cards.length) return null;

    const keys = cardKeyMap(cards); // v8.0.3 [1]: per card, so a duplicate stays available
    const isAvailable = (card) => {
        if (!isCardUnchecked(card)) return false;
        const key = keys.get(card);
        if (key && ledgerIsComplete(key)) return false;
        return true;
    };

    const startIdx = currentCard ? cards.indexOf(currentCard) : -1;

    // Sidebar order is newest → oldest (index 0 = newest). Processing walks
    // newest-first, i.e. from a higher index toward 0 (see goToNextPendingReport,
    // nextIndex = currentIndex - 1). So the report that comes "next" after the
    // current one is the nearest UNCHECKED card at a LOWER index (toward newest).
    if (startIdx > 0) {
        for (let i = startIdx - 1; i >= 0; i--) {
            if (isAvailable(cards[i])) return cards[i];
        }
    }

    // Nothing unchecked toward the newest end — a report may have been left
    // behind among the OLDER cards (higher index). Sweep those next, nearest
    // first, so a skipped-over report is still picked up rather than abandoned.
    if (startIdx >= 0) {
        for (let i = startIdx + 1; i < cards.length; i++) {
            if (isAvailable(cards[i])) return cards[i];
        }
    }

    // No currentCard reference — fall back to a full processing-order sweep
    // (newest → oldest) so we still return the first available report.
    if (startIdx < 0) {
        for (let i = 0; i < cards.length; i++) {
            if (isAvailable(cards[i])) return cards[i];
        }
    }

    return null;
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
            rowEl: row, // v8.0.2 [3]: for the ROB End / consumption cross-check
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
//   v8.0.2 [3] — WHICH ROB VALUE IS WRONG?
//
//   Last ROB is carried over from the previous report, and ROB End is ROB
//   Start minus what the row consumed. So ROB End + the row's consumption
//   shows which of the two mismatching values the rest of the row agrees
//   with. The suggestion only decides what the panel offers to correct — the
//   rule itself (Last ROB = ROB Start) is unchanged.
// ---------------------------------------------------------------------------

// Header label for every column of a table, from the lowest header row that
// covers it, so the "Used For" sub-columns (Propulsion, Generator, …) line
// up with the data cells despite the grouped header above them.
function leafHeaderLabels(table) {
    const grid = [];
    Array.from(table.querySelectorAll('thead tr')).forEach((tr, r) => {
        grid[r] = grid[r] || [];
        let c = 0;
        for (const cell of Array.from(tr.cells)) {
            while (grid[r][c] !== undefined) c++;
            const label = cell.getAttribute('data-td-name') || cell.innerText || '';
            const span = cell.colSpan || 1;
            for (let i = 0; i < (cell.rowSpan || 1); i++) {
                const row = (grid[r + i] = grid[r + i] || []);
                for (let j = 0; j < span; j++) row[c + j] = label;
            }
            c += span;
        }
    });
    return grid.length ? grid[grid.length - 1] : [];
}

// Fuel one bunker row consumed, summed over its "Used For" columns.
function rowConsumptionTotal(rowEl) {
    const table = rowEl && rowEl.closest('table');
    if (!table) return 0;
    const headers = leafHeaderLabels(table);
    let total = 0;
    Array.from(rowEl.cells).forEach((cell, idx) => {
        const titleEl = cell.querySelector('.p-column-title');
        const token = normaliseColumnToken(
            cell.getAttribute('data-td-name') || (titleEl && titleEl.innerText) || headers[idx] || ''
        );
        if (purposeForToken(token) || token === 'incinerator') total += parseNumericCellValue(cell);
    });
    return total;
}

function suggestRobCorrection(curr) {
    const shown     = (el, v) => (el && el.tagName === 'INPUT' && el.value.trim()) || String(v);
    const lastText  = shown(curr.lastRobInput, curr.lastRob);
    const startText = shown(curr.robStartInput, curr.robStart);
    const pick = (wrong, reason) => (wrong === 'Last ROB'
        ? { wrong, el: curr.lastRobInput,  currentText: lastText,  valueText: startText, lastText, startText, reason }
        : { wrong, el: curr.robStartInput, currentText: startText, valueText: lastText,  lastText, startText, reason });

    if (curr.robEnd !== null) {
        const used    = rowConsumptionTotal(curr.rowEl);
        const implied = curr.robEnd + used;
        const tol     = CONFIG.ROB_CROSSCHECK_TOLERANCE;
        const math    = `ROB End ${shown(curr.robEndInput, curr.robEnd)}` +
                        `${used ? ` + consumption ${used.toFixed(3)}` : ' (no consumption)'} = ${implied.toFixed(3)}`;
        const lastFits  = Math.abs(implied - curr.lastRob)  < tol;
        const startFits = Math.abs(implied - curr.robStart) < tol;
        if (lastFits && !startFits) {
            return pick('ROB Start', `${math}, which agrees with Last ROB — so ROB Start is the value to correct. ROB Start must be identical to Last ROB.`);
        }
        if (startFits && !lastFits) {
            return pick('Last ROB', `${math}, which agrees with ROB Start — so Last ROB (carried over from the previous report) looks wrong. Check the previous report's ROB End as well.`);
        }
    }
    return pick('ROB Start', 'ROB Start must be identical to Last ROB, the figure carried over from the previous report' +
        (curr.robEnd !== null ? ' (ROB End and consumption could not confirm either value).' : '.'));
}

// ---------------------------------------------------------------------------
//   DIALOG / MODAL HELPERS
// ---------------------------------------------------------------------------

function findOpenDialog() {
    const candidates = queryAllContexts(
        '.p-dialog, [role="dialog"], .modal, .p-confirm-dialog, .p-overlaypanel'
    );
    for (const el of candidates) {
        // v8.0.3 [1]: isElementVisible, not offsetParent — offsetParent is
        // null for a position:fixed dialog, so PrimeNG dialogs were missed.
        if (isElementVisible(el)) return el;
    }
    return null;
}

// ---------------------------------------------------------------------------
//   v7.6.0 [6] — INLINE VALIDATION-ERROR SWEEP
//
//   The site renders its own field-level validation messages (e.g.
//   "Select an event type") as small red text nodes rather than dialog
//   lines. These were never picked up, so a report the site would reject
//   could be approved. This sweep finds those messages, highlights each one
//   — and, where it can, the field it belongs to — in red, and returns them
//   as errors so validateCurrentReport() treats them as errors.
// ---------------------------------------------------------------------------

const INLINE_ERROR_SELECTORS = [
    '.p-error',
    '.p-invalid-feedback',
    '.p-message-error',
    '.field-error',
    '.error-message',
    '.validation-error',
    '.invalid-feedback',
    '.text-danger',
    '.ng-invalid.ng-dirty .p-error',
    '[class*="error" i][class*="message" i]',
    'small.p-error',
    'small[class*="error" i]'
];

// A visible node whose text reads like a validation message (short, and
// either matches a known error phrase or is styled red).
function looksLikeInlineErrorText(text) {
    const t = (text || '').trim();
    if (!t) return false;
    if (t.length > CONFIG.ERROR_SCAN_MAX_LEN) return false;
    const lower = t.toLowerCase();
    return CONFIG.ERROR_WARNING_PHRASES.some(p => lower.includes(p));
}

function isRedText(el) {
    try {
        const rgb = parseRgb(window.getComputedStyle(el).color);
        if (!rgb) return false;
        const { r, g, b } = rgb;
        return (r - g) > 40 && (r - b) > 40 && r > 120;
    } catch {
        return false;
    }
}

function highlightInlineError(el) {
    try {
        el.style.cssText = (el.style.cssText || '') + ';' + FIELD_STYLES.ERROR_INLINE_MESSAGE;
    } catch { /* ignore */ }

    // Also flag the field the message is attached to, when we can find it.
    const container =
        el.closest('.p-field, .field-group, tr, .form-row, fieldset, .p-inputgroup, .field') ||
        el.parentElement;
    if (container) {
        const field = container.querySelector('select, input, textarea');
        if (field && field.style) {
            field.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
        }
    }
}

// v8.0.1 [2]: optional onHit(text, el) receives the element of each message
// found, so the issues panel can scroll to it. Return value is unchanged.
function scanInlineValidationErrors(onHit) {
    const found = [];
    const seenText = new Set();
    const seenEls = new Set();

    const consider = (el, forceByPhrase) => {
        if (!el || seenEls.has(el)) return;
        if (!isElementVisible(el)) return;

        const text = (el.innerText || el.textContent || '').trim();
        if (!text || text.length > CONFIG.ERROR_SCAN_MAX_LEN) return;

        const byPhrase = looksLikeInlineErrorText(text);
        const byColour = forceByPhrase ? false : isRedText(el);

        // A selector-matched node counts if it is red OR reads like an error;
        // a phrase-matched node always counts.
        if (!byPhrase && !byColour) return;

        const key = text.toLowerCase();
        if (seenText.has(key)) { seenEls.add(el); return; }
        seenText.add(key);
        seenEls.add(el);

        highlightInlineError(el);
        found.push(text);
        if (onHit) onHit(text, el);
    };

    // 1. Known error-message containers.
    for (const sel of INLINE_ERROR_SELECTORS) {
        for (const el of queryAllContexts(sel)) {
            consider(el, false);
            if (found.length >= CONFIG.ERROR_SCAN_MAX_HITS) return found;
        }
    }

    // 2. Any small text node matching a known error phrase, wherever it sits.
    if (found.length < CONFIG.ERROR_SCAN_MAX_HITS) {
        for (const el of queryAllContexts('small, span, div, label, p')) {
            const text = (el.innerText || el.textContent || '').trim();
            if (!text || text.length > CONFIG.ERROR_SCAN_PHRASE_MAX_LEN) continue;
            // Only leaf-ish nodes, so we highlight the message and not a huge wrapper.
            if (el.children && el.children.length > 2) continue;
            if (!looksLikeInlineErrorText(text)) continue;
            consider(el, true);
            if (found.length >= CONFIG.ERROR_SCAN_MAX_HITS) break;
        }
    }

    return found;
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

// v7.6.0 [6]: is this dialog line an ERROR rather than a bypassable advisory?
function isErrorWarningPhrase(msgLower) {
    return CONFIG.ERROR_WARNING_PHRASES.some(p => msgLower.includes(p));
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
        currentKey: currentCard ? cardKey(currentCard, sidebarCards) : '', // v8.0.3 [1]
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
    // v8.0.3 [1]: the card itself while it is still on the page — a duplicate
    // copy has the same text, so a text match could pick the other copy.
    const matchedCard = (fallbackCard && fallbackCard.isConnected ? fallbackCard : null)
        || freshCards.find(c => signaturesMatch(extractCardSignature(c), targetSig));

    const clickTarget = matchedCard || fallbackCard;
    if (clickTarget) {
        clickTarget.click();
        // v7.6.0 [5]: wait for the DOM to settle rather than a fixed 3.5 s.
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
    // v7.6.0 [5]: poll returns the instant the card turns green rather than
    // sleeping the whole budget on every attempt.
    const cards0 = getAllReportCards();
    const target0 = (fallbackCard && fallbackCard.isConnected ? fallbackCard : null)
        || cards0.find(c => signaturesMatch(extractCardSignature(c), targetSig)) || fallbackCard;

    const greenNow = await waitForCondition(() => {
        const cards = getAllReportCards();
        const card  = (target0 && target0.isConnected ? target0 : null)
            || cards.find(c => signaturesMatch(extractCardSignature(c), targetSig)) || target0;
        return (card && isCardChecked(card)) ? card : null;
    }, 4000, 200);

    if (greenNow) {
        setStatus('✅ Sidebar confirms approved status (card highlighted green).', 'success');
        return true;
    }

    await waitForDOMStable();

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

// v8.0.1: thin wrapper — opens a validation pass (issue metadata, deferred
// scrolling, repeatable dead reckoning) around the unchanged checks.
async function validateCurrentReport(crossReportData) {
    beginValidationPass(crossReportData);
    try {
        const result = await runValidationChecks(crossReportData);
        if (result !== false && ReportIssues.list.length > 0) {
            if (result === true && ReportIssues.key === ValidationPass.key) {
                setStatus('✅ No open issues remain on this report — every check now passes.', 'success');
            }
            clearReportIssues();
        }
        return result;
    } finally {
        ValidationPass.active = false;
    }
}

async function runValidationChecks(crossReportData) {
    // v8.0.1 [1]: the log is no longer wiped here — each report has its own
    // log section (see beginLogSection), so re-checks never erase history.
    setStatus(`Initiating Smart Sandbox Scan (v${VERSION})...`, 'info');
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
        // v8.0.4 [1]: the v7.5 rule — this report is rejected with the comment
        // "Duplicate Report" as soon as another report with the same name, date
        // and exact time is on file and is not already rejected (approved OR
        // still pending). v8.0.3 waited for another copy to be approved first,
        // so a duplicate got through whenever that never happened. Each copy
        // keeps its own ledger key (v8.0.3 [1]), so rejecting this one never
        // marks the other copy as finished.
        const { currentSig, twins } = duplicateMatch;
        const liveTwin = twins.find(t => t.state === 'approved') || twins.find(t => t.state === 'pending');
        const where = t => `${describeSignature(t.sig)} ${t.sig.utcOffset || ''}`;

        if (liveTwin) {
            // Remember this copy is the duplicate: for it, ending up rejected is success.
            const ledgerEntry = ProcessingLedger.entries.get(ValidationPass.key);
            if (ledgerEntry) ledgerEntry.duplicate = true;
            setStatus(`⚠️ Duplicate report — a report with the same name, date and time is already on file. Rejecting this one with the comment "${CONFIG.DUPLICATE_REJECT_COMMENT}".`, 'warning');
            setStatus(`   This report:     ${describeSignature(currentSig)} ${currentSig.utcOffset || ''}`, 'warning');
            setStatus(`   Existing report: ${where(liveTwin)} (${liveTwin.state})`, 'warning');
            setStatus(`   Basis: ${liveTwin.reason || 'complete timestamp match'}`, 'warning');

            const rejected = await rejectReportAsDuplicate(CONFIG.DUPLICATE_REJECT_COMMENT);
            if (rejected.ok) {
                setStatus(`✅ Duplicate copy rejected with the comment "${CONFIG.DUPLICATE_REJECT_COMMENT}". Continuing to the next report…`, 'success');
                return 'duplicate-skip';
            }

            // Never silently skipped: if the rejection did not complete, stop
            // on this copy until it is rejected (by hand if need be).
            const failMsg =
                `Duplicate report could not be rejected automatically — ${rejected.reason}. ` +
                `Reject it on the platform with the comment "${CONFIG.DUPLICATE_REJECT_COMMENT}", then press Re-check.`;
            setStatus(`🛑 ${failMsg}`, 'error');
            recordError(failMsg, 'duplicate rejection');
            setReportIssues([{
                message: failMsg, id: 'duplicate-reject', field: 'Duplicate report', problem: 'Reject this copy',
                el: findActionButton('Reject', { matchVisibleText: true }),
                values: [{ k: 'Existing report', v: where(liveTwin), tone: 'good' }],
                reason: `A report with the same name, date and time is already on file, so this one must be rejected with the comment "${CONFIG.DUPLICATE_REJECT_COMMENT}". ${rejected.reason}.`
            }]);
            haltForUser(failMsg);
            return false;
        }

        setStatus('ℹ️ Duplicate detected but every other copy is already REJECTED — validating this one.', 'info');
    } else {
        setStatus('✅ Duplicate Scan: No matching duplicate found in the report list.', 'success');
    }

    // ── 2. PORT EVENTS BLOCK CHECK ───────────────────────────────────────────
    setStatus('Analyzing active operational event parameters...', 'info');
    let eventCheck = validatePortEvents();

    // v7.4.0 [1]: blank rows are no longer treated as an unapproved event.
    // They are resolved by the conditional auto-delete rules below.
    // v8.0.3 [3]: blank rows that the rules allow deleting — offered to the
    // user on their "Select an event type" issue below, never deleted here.
    const deletableRows = new Map();

    if (eventCheck.blankRowCount > 0) {
        setStatus(`⚠️ ${eventCheck.blankRowCount} blank event row(s) detected — applying the blank-row rules...`, 'warning');

        const blankResult = await evaluateBlankEventRows();

        switch (blankResult.outcome) {
            case 'deletable':
                // v8.0.3 [3]: offered for deletion, not deleted.
                setStatus(`🗑️ ${blankResult.message}`, 'warning');
                blankResult.deletable.forEach(d => deletableRows.set(d.selectEl, d));
                break;

            case 'preserved-not-at-sea':
                // In Port / Arrival / Departure — leave the row exactly as-is
                // and do NOT treat it as a lockout.
                setStatus(`ℹ️ ${blankResult.message}`, 'info');
                break;

            case 'blocked-consumption':
                // Real fuel consumption means a real operational event took
                // place. Preserve the row and stop for manual review.
                // v8.0.1 [3]: recorded, and the remaining checks still run.
                setStatus(`🛑 ${blankResult.message}`, 'error');
                errors.push(blankResult.message);
                noteIssue(blankResult.message, {
                    field: 'Events — blank row', problem: 'Needs an event',
                    el: eventCheck.blankSelects[0] && eventCheck.blankSelects[0].selectEl
                });
                isValid = false;
                break;

            case 'no-delete-control':
                setStatus(`🛑 ${blankResult.message}`, 'error');
                errors.push(blankResult.message);
                noteIssue(blankResult.message, {
                    field: 'Events — blank row', problem: 'Cannot be removed automatically',
                    el: eventCheck.blankSelects[0] && eventCheck.blankSelects[0].selectEl
                });
                isValid = false;
                break;

            default:
                break;
        }
    }

    // v7.6.0 [6]: any blank event-type dropdowns still present after the
    // conditional-delete rules are a genuine "Select an event type" error.
    // The dropdown is already outlined red by validatePortEvents(); here we
    // record it as an error and fail validation.
    if (eventCheck.blankSelects && eventCheck.blankSelects.length > 0) {
        eventCheck.blankSelects.forEach((b, i) => {
            const rowNo = b.row || i + 1; // v8.0.3: its position in the event table
            const msg = `Select an event type — event row ${rowNo} has no event type selected.`;
            errors.push(msg);
            const del = deletableRows.get(b.selectEl);
            noteIssue(msg, {
                id: `event-type:${rowNo}`, field: `Event type (row ${rowNo})`, problem: del ? 'Blank row' : 'Missing value',
                el: b.selectEl, current: '(blank)', expected: del ? 'an event type, or delete the row' : 'an approved event type',
                reason: del ? 'At Sea with no fuel consumption under any purpose column, so this blank row may be deleted — or choose an event type.' : undefined,
                fix: del ? { label: 'Delete this blank row', ask: 'Should I delete this blank event row?', run: () => deleteBlankEventRow(del) } : undefined
            });
            setStatus(`🛑 ${msg}`, 'error');
        });
        scrollToIssueElement(
            eventCheck.blankSelects[0].selectEl,
            'An event row has no event type selected — please choose an event type.'
        );
        isValid = false;
    }

    if (eventCheck.status === 'INVALID') {
        isValid = false;
        const lockoutMsg = `Unapproved event scenario detected [${eventCheck.event}].`;
        errors.push(lockoutMsg);
        noteIssue(lockoutMsg, {
            id: 'event-unapproved', field: 'Event type', problem: 'Not an approved event',
            el: eventCheck.invalidSelect, current: eventCheck.event,
            reason: 'Only events on the approved event list can be submitted.'
        });
        setStatus(`🛑 LOCKOUT: ${lockoutMsg} Halted.`, 'error');
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

        // v8.0.1 [2]: every Steaming Hours error shares one issue id, so a
        // correction is tracked as the same issue even as the value changes.
        const steamingIssue = (message, extra) => {
            errors.push(message);
            noteIssue(message, {
                id: 'steaming-hours', field: 'Steaming Hours', el: steamingHoursInput,
                current: `${steamingHoursInput.value.trim()} hrs`, ...extra
            });
        };

        if (isNaN(hours)) {
            steamingIssue(`Steaming hours (${hours}) is not a valid number.`, {
                problem: 'Not a number', current: steamingHoursInput.value.trim()
            });
            steamingHoursInput.style.border = FIELD_STYLES.ERROR_BORDER_ONLY;
            scrollToIssueElement(steamingHoursInput, 'Steaming Hours value is not a valid number.');
            isValid = false;
            setStatus(`❌ Steaming hrs failed numeric check: ${hours}`, 'error');
        } else if (earlyContext.reportType === 'In Port Report') {
            if (hours < 0 || hours > 25) {
                steamingIssue(`Steaming hours (${hours}) outside allowed in-port range [0–25].`, {
                    problem: 'Out of range', expected: '0 – 25 hrs',
                    reason: 'In Port reports must have Steaming Hours between 0 and 25.'
                });
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
                steamingIssue('Unable to calculate steaming hours because this report date/time could not be read from the report list.', {
                    problem: 'Cannot be verified'
                });
                steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                scrollToIssueElement(steamingHoursInput, 'This report date/time could not be read for Steaming Hours calculation.');
                isValid = false;
                setStatus('❌ Steaming Hours Elapsed-Time Check: Current report date/time could not be read from the report list.', 'error');
            } else {
                const prevCardForSteaming = findOneReportBackCard(resolvedSig, resolvedCards, resolvedCard);

                if (!prevCardForSteaming) {
                    steamingIssue('Unable to calculate steaming hours because the one-back report was not found.', {
                        problem: 'Cannot be verified'
                    });
                    steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                    scrollToIssueElement(steamingHoursInput, 'One-back report was not found for Steaming Hours calculation.');
                    isValid = false;
                    setStatus('❌ Steaming Hours Elapsed-Time Check: One-back report was not found.', 'error');
                } else {
                    const prevSig = extractCardSignature(prevCardForSteaming);
                    const currentTs = reportTimestamp(resolvedSig);
                    const prevTs = reportTimestamp(prevSig);

                    if (isNaN(prevTs)) {
                        steamingIssue('Unable to calculate steaming hours because the one-back report date/time could not be read.', {
                            problem: 'Cannot be verified'
                        });
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
                            steamingIssue(`Steaming hours could not be calculated because the one-back report (${refLabel}) is later than this report (${currLabel}).`, {
                                problem: 'Cannot be verified'
                            });
                            steamingHoursInput.style.cssText = FIELD_STYLES.ERROR_HEX_FULL;
                            scrollToIssueElement(steamingHoursInput, 'One-back report timestamp is later than current report timestamp.');
                            isValid = false;
                            setStatus(`❌ Steaming Hours Elapsed-Time Check: One-back report (${refLabel}) is later than current report (${currLabel}).`, 'error');
                        } else if (diff > CONFIG.STEAMING_HOURS_ELAPSED_TOLERANCE) {
                            setStatus(`🔍 DEBUG — current card: ${currLabel}`, 'warning');
                            setStatus(`🔍 DEBUG — one-back card: ${refLabel} | calculated=${actualElapsedHours.toFixed(2)} hrs | reported=${hours} hrs`, 'warning');
                            const expectedHours = +actualElapsedHours.toFixed(2);
                            steamingIssue(`Steaming hours (${hours}) does not match calculated elapsed time (${actualElapsedHours.toFixed(2)} hrs) between this report (${currLabel}) and the one-back report (${refLabel}).`, {
                                problem: 'Incorrect value', expected: `${expectedHours} hrs`,
                                values: [
                                    { k: 'Current value',  v: `${hours} hrs`, tone: 'bad' },
                                    { k: 'Expected value', v: `${expectedHours} hrs`, tone: 'good' },
                                    { k: 'Difference',     v: `${Math.abs(hours - expectedHours).toFixed(2)} hrs` }
                                ],
                                reason: `This value does not match the validated data: the elapsed time from the one-back report (${refLabel}) to this report (${currLabel}) is ${expectedHours} hrs.`,
                                fix: { value: expectedHours, label: `Update to ${expectedHours} hrs` }
                            });
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
            errors.push('Bunker ROB grid not found on this report page — cannot approve without verifying ROB values.');
            noteIssue('Bunker ROB grid not found on this report page — cannot approve without verifying ROB values.', {
                field: 'Bunkers ROB', problem: 'Section not found', el: locateTrueBunkerContainer()
            });
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
                    noteIssue(msg, {
                        id: `negative:${curr.displayLabel}:${f.name}`, field: `${f.name} [${curr.displayLabel}]`,
                        problem: 'Negative value', el: f.el, current: f.value, expected: '0 or more',
                        reason: 'Last ROB, ROB Start and Adjustment must never be negative.'
                    });
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
                noteIssue(nullMsg, {
                    id: `rob-read:${curr.displayLabel}`, field: `Bunkers ROB [${curr.displayLabel}]`,
                    problem: 'Missing value', el: curr.lastRobInput || curr.robStartInput || curr.robEndInput,
                    reason: 'Last ROB and ROB Start must both be filled in so continuity can be checked.'
                });
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

            // v8.0.2 [3]: exact match (was within ADJ_TOLERANCE 0.01).
            const robMismatch = Math.abs(curr.lastRob - curr.robStart) > CONFIG.ROB_MATCH_TOLERANCE;
            if (robMismatch) {
                const errMsg = `[${curr.displayLabel}] Last ROB (${curr.lastRob}) ≠ ROB Start (${curr.robStart}). They must be identical.`;
                errors.push(errMsg);
                const s = suggestRobCorrection(curr);
                noteIssue(errMsg, {
                    id: `rob:${curr.displayLabel}`, field: `${s.wrong} [${curr.displayLabel}]`, problem: 'Value mismatch',
                    el: s.el || curr.robStartInput || curr.lastRobInput,
                    current: s.currentText, expected: s.valueText,
                    values: [
                        { k: 'Last ROB',   v: s.lastText,  tone: s.wrong === 'Last ROB'  ? 'bad' : 'good' },
                        { k: 'ROB Start',  v: s.startText, tone: s.wrong === 'ROB Start' ? 'bad' : 'good' },
                        { k: 'Difference', v: Math.abs(curr.lastRob - curr.robStart).toFixed(3) }
                    ],
                    reason: s.reason,
                    fix: { value: s.valueText, label: `Set ${s.wrong} to ${s.valueText}` }
                });
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
                noteIssue(adjMsg, {
                    id: `adj:${curr.displayLabel}`, field: `ADJ [${curr.displayLabel}]`, problem: 'Must be 0',
                    el: curr.adjInput || curr.adjElementToHighlight, current: curr.adj, expected: 0,
                    reason: 'ADJ must always be 0 — no other value is permitted.',
                    fix: { value: 0, label: 'Set ADJ to 0' }
                });
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

    // v8.0.1 [2]: section-level issues (no single field) point at the EVENTS block.
    const eventsBlockEl = findEventsBlocks()[0] || null;

    if (eventRows.length > 0) {
        const timelineValidator = new GeoformsTimelineValidator();
        const timelineResult = timelineValidator.validateTimeline(reportContext, eventRows);

        if (!timelineResult.isValid) {
            isValid = false;
            timelineResult.errors.forEach(err => {
                errors.push(`[Timeline Matrix] ${err}`);
                noteIssue(`[Timeline Matrix] ${err}`, { field: 'Events timeline', problem: 'Rule violation', el: eventsBlockEl, reason: err });
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
            noteIssue(`[Event Fuel Block] ${errMsg}`, {
                field: 'Bunkers ROB', problem: 'Missing value', el: locateTrueBunkerContainer() || eventsBlockEl,
                reason: 'An event is recorded, so at least one fuel type must have a ROB value.'
            });
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

    // [9] End Date/Time must not be blank.
    // v8.0.1 [3]: fails validation and lets the remaining checks run, so
    // every issue on the report is listed at once (approval is still blocked).
    setStatus('Verifying every event has an End Date/Time...', 'info');
    const endTimeResult = validateEventEndDateTimes(detailedEventRows);
    if (endTimeResult.errors.length > 0) {
        isValid = false;
        endTimeResult.errors.forEach((err, i) => {
            errors.push(`[Event End Date/Time] ${err}`);
            const where = endTimeResult.issues[i] || {};
            noteIssue(`[Event End Date/Time] ${err}`, {
                id: `end-time:${where.row}`, field: `End Date/Time — event ${where.row || ''} [${where.eventType || ''}]`,
                problem: 'Missing value', el: where.el, current: '(blank)',
                reason: `${where.missingPart ? where.missingPart.charAt(0).toUpperCase() + where.missingPart.slice(1) : 'End Date/Time is missing'}. Every event with an event type needs a complete End Date/Time.`
            });
            setStatus(`🛑 ${err}`, 'error');
        });
    } else {
        setStatus(
            endTimeResult.checked > 0
                ? `✅ End Date/Time present on all ${endTimeResult.checked} event(s).`
                : 'ℹ️ End Date/Time check: no events with a selected event type on this report.',
            endTimeResult.checked > 0 ? 'success' : 'info'
        );
    }

    // [6] Departure report — final event must be SHIFTING FROM LAST BERTH TO SEA.
    if (isDepartureReportContext(reportContext, currentSigForEvents)) {
        setStatus('Departure report detected — verifying the final event in the sequence...', 'info');
        const departureResult = validateDepartureFinalEvent(detailedEventRows);
        if (departureResult.errors.length > 0) {
            isValid = false;
            departureResult.errors.forEach(err => {
                errors.push(`[Departure Final Event] ${err}`);
                noteIssue(`[Departure Final Event] ${err}`, {
                    id: 'departure-final', field: 'Departure final event', problem: 'Sequence rule',
                    el: departureResult.target || eventsBlockEl, expected: CONFIG.DEPARTURE_FINAL_EVENT, reason: err
                });
                setStatus(`🛑 ${err}`, 'error');
            });
        } else {
            setStatus(departureResult.recognisedFromText
                ? `✅ Departure final event "${departureResult.recognisedFromText}" found in the operations list (shown as text, so its position could not be checked).`
                : `✅ Departure sequence ends correctly with "${CONFIG.DEPARTURE_FINAL_EVENT}".`, 'success');
        }
    }

    // [7] The same event must not appear in both an Arrival and an At Sea report.
    const conflictResult = recordAndCheckArrivalSeaEventConflicts(
        reportContext, currentSigForEvents, detailedEventRows
    );
    if (conflictResult.errors.length > 0) {
        isValid = false;
        conflictResult.errors.forEach(err => {
            errors.push(`[Arrival/At Sea Conflict] ${err}`);
            noteIssue(`[Arrival/At Sea Conflict] ${err}`, {
                field: 'Arrival / At Sea events', problem: 'Conflict', el: eventsBlockEl, reason: err
            });
            setStatus(`🛑 ${err}`, 'error');
        });
    } else if (conflictResult.recorded > 0) {
        setStatus(`✅ Arrival/At Sea cross-check: ${conflictResult.recorded} event(s) indexed, no conflicts found.`, 'success');
    }

    // v7.1.2 — Sequential Date / Reporting Period / Voyage Continuity checks
    setStatus('Running sequence, period, and voyage continuity checks...', 'info');
    const sequenceResult = runSequenceAndContinuityChecks(crossReportData);
    if (sequenceResult.errors.length > 0) {
        isValid = false;
        sequenceResult.errors.forEach(err => {
            errors.push(`[Sequence] ${err}`);
            noteIssue(`[Sequence] ${err}`, {
                field: 'Report date/time', problem: 'Sequence rule',
                el: crossReportData && crossReportData.currentCard, reason: err
            });
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

    // ── 6. v7.6.0 [6] INLINE VALIDATION-ERROR SWEEP ─────────────────────────
    // Pick up the site's own field-level validation messages (e.g.
    // "Select an event type") that none of the checks above cover, highlight
    // each one in red, and treat it as an error.
    setStatus('Sweeping the form for inline validation errors...', 'info');
    const inlineErrorEls = new Map();
    const inlineErrors = scanInlineValidationErrors((text, el) => inlineErrorEls.set(text, el));
    if (inlineErrors.length > 0) {
        inlineErrors.forEach(msg => {
            errors.push(`[Form Validation] ${msg}`);
            noteIssue(`[Form Validation] ${msg}`, {
                field: 'Form field', problem: 'Flagged by the form', el: inlineErrorEls.get(msg), reason: msg
            });
            setStatus(`🛑 Validation error on the form: ${msg}`, 'error');
        });
        isValid = false;
    } else {
        setStatus('✅ Inline validation sweep: no field-level errors found on the form.', 'success');
    }

    await sleep(CONFIG.SLEEP_POLL_MS);

    if (!isValid) {
        setStatus(`🛑 LOCKOUT: ${errors.length} validation error(s) caught on this report:`, 'error');
        errors.forEach((e, i) => {
            setStatus(`   ${i + 1}. ${e}`, 'error');
            recordError(e, 'report validation');
        });
        // v8.0.1 [2]: hand the full list to the issues panel before halting.
        setReportIssues(errors.length ? errors : ['Validation errors detected on this report.']);
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

// v8.0.3 [4]: the platform's own consistency checks, which Autopilot does not
// run itself, explained in the issues panel.
const PLATFORM_CHECK_NOTES = [
    [/rob of last list of operation/i, 'List of operations — last ROB',
     'The platform compares the ROB at the end of the last operation with the report ROB in the Bunker section.'],
    [/sum of total consumptions/i, 'List of operations — consumption',
     'The platform compares the total consumption of all operations with the consumption in the Bunker section.']
];

// v8.0.2: a line from the approval dialog, as an issue for the panel.
function approvalDialogIssue(entry) {
    if (typeof entry !== 'string') return entry;
    const note = PLATFORM_CHECK_NOTES.find(([re]) => re.test(entry));
    return {
        message: entry,
        field: note ? note[1] : 'Approval dialog',
        problem: 'Blocked the submission',
        reason: (note ? `${note[2]} ` : '') +
            'The platform will not accept this report as it is. Close the dialog, correct the data it lists, then re-check.'
    };
}

function fieldLabelFor(el) {
    const d = el.ownerDocument;
    const byFor = el.id ? d.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
    const box = el.closest('.p-field, .field, .form-group, .form-row');
    const label = byFor || (box && box.querySelector('label'));
    return ((label && label.innerText) || el.getAttribute('aria-label') || el.getAttribute('placeholder') ||
            el.getAttribute('name') || el.id || 'Form field').trim();
}

// Fields the platform highlighted when it refused the submission.
function platformHighlightedIssues() {
    const seen = new Set();
    return queryAllContexts('.p-invalid, [aria-invalid="true"]')
        .map(el => (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) ? el : el.querySelector('input, select, textarea')))
        .filter(el => el && isElementVisible(el) && !seen.has(el) && seen.add(el))
        .slice(0, 10)
        .map((el, i) => ({
            message: `Field highlighted by the platform: ${fieldLabelFor(el)}`,
            id: `platform-field:${i}`, field: fieldLabelFor(el), problem: 'Highlighted by the platform',
            el, current: el.value || '(blank)',
            reason: 'The platform marked this field when it refused the submission — check it against the messages above.'
        }));
}

// Closes the platform's message dialog (OK / Close / ×), never "Proceed".
async function closePlatformDialog() {
    const found = getWarningDialog();
    if (!found) return true;
    const dialog = found.closest('.p-dialog, [role="dialog"], .modal') || found;
    const text = b => [b.innerText || b.textContent || '', b.getAttribute('label') || '', b.getAttribute('aria-label') || '']
        .join(' ').trim().toLowerCase();
    const buttons = Array.from(dialog.querySelectorAll('button, .p-button, [role="button"], .p-dialog-header-close'))
        .filter(b => isElementVisible(b) && !/proceed/.test(text(b)));
    const btn = buttons.find(b => /\b(ok|close|cancel|dismiss)\b/.test(text(b))) ||
                dialog.querySelector('.p-dialog-header-close');
    if (!btn) return false;
    btn.click();
    return !!(await waitForCondition(() => !dialog.isConnected || !isElementVisible(dialog), 2000, 100));
}

// v8.0.3 [4]: the platform refused the submission ("Errors detected in the
// submitted data") although Autopilot's checks passed on the values it read —
// and a manual re-run used to pass. The first time for a report: close the
// message, let the form settle, validate and submit once more. A second
// refusal is real: stop for the user with the platform's messages.
async function handlePlatformRejection(messages, fatal) {
    const key = ValidationPass.key;
    if (key && !AutopilotState.platformRetried.has(key)) {
        AutopilotState.platformRetried.add(key);
        if (await closePlatformDialog()) {
            setStatus(
                '♻️ The platform refused the submission, but Autopilot\'s checks had passed on the values it read — the ' +
                'platform had probably not finished recalculating them. Closed the message; the form will settle, be ' +
                'validated again and submitted once more.', 'warning'
            );
            UI.passReason = 'Re-submitting after the platform recalculated';
            return 'retry';
        }
    }
    setReportIssues([...messages.map(approvalDialogIssue), ...platformHighlightedIssues()]);
    haltForUser(`Errors detected in the submitted data: ${fatal}`);
    return false;
}

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
    // v7.6.0 [5]: give the confirm popup a short head start, then let the
    // condition-based waits below hold as long as the page actually needs.
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
        recordError(`Errors detected in the submitted data: ${postClickFatal}`, 'approval fatal');
        return await handlePlatformRejection(postClickWarnings, postClickFatal);
    }

    setStatus('Confirming report verification dialogue...', 'info');

    // Primary selector — covers both PrimeNG dialog and popup variants
    const YES_SELECTOR = '.p-confirm-dialog-accept, .p-confirm-popup-accept, button[aria-label="Yes"]';

    // v7.6.0 [5]: return the instant the Yes button appears instead of
    // sleeping the full retry budget every time.
    let yesBtn = await waitForCondition(
        () => queryAllContexts(YES_SELECTOR)[0] || null,
        CONFIG.YES_BTN_RETRY_COUNT * CONFIG.YES_BTN_RETRY_DELAY_MS,
        CONFIG.YES_BTN_RETRY_DELAY_MS
    );

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
        recordError(`Errors detected in the submitted data: ${fatalMessage}`, 'approval fatal');
        return await handlePlatformRejection(earlyWarningMessages, fatalMessage);
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
            const blockedMsgs  = []; // v8.0.1 [2]: for the issues panel
            let proceedBlocked = false;

            warningMessages.forEach(msg => {
                const lower = msg.toLowerCase();

                // ── v7.6.0 [6] REAL ERRORS CANNOT BE BYPASSED ─────────────────
                // A dialog line that is actually a validation error (e.g.
                // "Select an event type", "... is required") is logged in red,
                // recorded, and blocks the submission — no matter what else it
                // might match below.
                if (isErrorWarningPhrase(lower)) {
                    setStatus(`🛑 Validation error (cannot be bypassed): "${msg}"`, 'error');
                    recordError(msg, 'approval dialog error');
                    blockedMsgs.push(msg);
                    proceedBlocked = true;
                    return;
                }

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
                        recordError(`AIS distance gap (${aisResult.diffNM.toFixed(1)} NM) exceeds the ${CONFIG.AIS_DIST_LOCKOUT_NM} NM lockout threshold — verify observed distance. (${msg})`, 'approval dialog');
                        const od = scrapeObservedDistance();
                        blockedMsgs.push({
                            message: msg, field: 'Observed Distance', problem: 'AIS distance gap too large',
                            el: od ? od.input : null, current: od ? `${od.value} NM` : undefined,
                            reason: `Gap to the AIS distance is ${aisResult.diffNM.toFixed(1)} NM (lockout above ${CONFIG.AIS_DIST_LOCKOUT_NM} NM). Close the dialog, verify the distance, then re-check.`
                        });
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
                setReportIssues(blockedMsgs.map(approvalDialogIssue));
                haltForUser('A validation error in the confirmation dialog blocked auto-submission — please review the flagged field(s).');
                return false;
            }

            if (unrecognized.length === 0) {
                proceedAnyway.click();
                setStatus('✅ "Proceed Anyway" bypassed all known-safe warnings successfully.', 'success');
                await sleep(CONFIG.SLEEP_POST_CLICK_MS);
            } else {
                unrecognized.forEach(msg => {
                    setStatus(`🛑 LOCKOUT: Unrecognized warning blocked auto-submission: "${msg}"`, 'error');
                    recordError(`Unrecognized warning blocked auto-submission: "${msg}"`, 'approval dialog');
                });
                setReportIssues(unrecognized.map(msg => ({
                    message: msg, field: 'Confirmation dialog warning', problem: 'Not recognised',
                    reason: 'Autopilot only bypasses known-safe warnings. Correct the data (or choose "Proceed Anyway" yourself if it is acceptable), then re-check.'
                })));
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
            recordError('Observed Distance is 0 on an At Sea report — please review the distance value.', 'approval dialog');
            const od = scrapeObservedDistance();
            setReportIssues([{
                message: 'Observed Distance is 0 on an At Sea report — please review the distance value.',
                field: 'Observed Distance', problem: 'Zero on an At Sea report',
                el: od ? od.input : null, current: '0 NM',
                reason: 'An At Sea report must record the distance sailed. Close the dialog, correct the distance, then re-check.'
            }]);
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

// v8.0.3 [1]: the comment box inside the reject dialog — a field named or
// labelled comment/remark/reason/note, else the only textarea / text box.
function findRejectCommentField(dialog) {
    const fields = Array.from(dialog.querySelectorAll('textarea, input[type="text"], input:not([type])'))
        .filter(isElementVisible);
    const named = fields.find(el => /comment|remark|reason|note/i.test([
        el.id, el.getAttribute('name'), el.getAttribute('placeholder'),
        el.getAttribute('aria-label'), el.getAttribute('formcontrolname')
    ].join(' ')));
    return named || fields.find(el => el.tagName === 'TEXTAREA') || (fields.length === 1 ? fields[0] : null);
}

// The dialog's confirming button ("Reject", else Submit/Confirm/Yes/OK) —
// never Cancel / Close / No.
function findRejectConfirmButton(dialog) {
    const text = b => [b.innerText || b.textContent || '', b.getAttribute('label') || '', b.getAttribute('aria-label') || '']
        .join(' ').trim().toLowerCase();
    const buttons = Array.from(dialog.querySelectorAll('button, .p-button, [role="button"]'))
        .filter(b => isElementVisible(b) && !/\b(cancel|close|no)\b/.test(text(b)));
    return buttons.find(b => /\breject\b/.test(text(b)))
        || buttons.find(b => /\b(submit|confirm|yes|ok|save)\b/.test(text(b)))
        || null;
}

// Rejects the report on screen with `comment`. Returns { ok, reason } and
// only reports success once the platform shows the report as rejected.
async function rejectReportAsDuplicate(comment) {
    setStatus('Locating Reject control...', 'info');

    const rejectBtn = findActionButton('Reject', { matchVisibleText: true });
    if (!rejectBtn) {
        setStatus('❌ Reject control not found on screen — cannot auto-reject duplicate.', 'error');
        return { ok: false, reason: 'the Reject button was not found on the page' };
    }

    const cards  = getAllReportCards();
    const card   = identifyCurrentCard(cards);
    const key    = card ? cardKey(card, cards) : '';
    const isDone = () => {
        if (isCurrentReportAlreadyRejected()) return true;
        const now = getAllReportCards();
        const keys = cardKeyMap(now);
        const same = now.find(c => keys.get(c) === key);
        if (same && isRejectedCard(same)) return true;
        // The action buttons go away once the report is rejected.
        return !findOpenDialog() && !findActionButton('Reject', { matchVisibleText: true });
    };

    rejectBtn.click();
    await sleep(CONFIG.SLEEP_POST_CLICK_MS);

    // v7.6.0 [5]: wait for the reject dialog to appear rather than assuming
    // it rendered within the fixed sleep above.
    const dialog = await waitForCondition(() => findOpenDialog(), 2500, 80);

    if (dialog) {
        const commentField = findRejectCommentField(dialog);
        if (commentField) {
            writeFieldValue(commentField, comment);
            setStatus(`📝 Rejection comment entered: "${commentField.value}"`, 'warning');
        } else {
            setStatus('⚠️ No comment box found inside the Reject dialog — proceeding without one.', 'warning');
        }

        const confirmBtn = findRejectConfirmButton(dialog)
            || queryAllContexts('.p-confirm-dialog-accept, .p-confirm-popup-accept, button[aria-label="Yes"]')[0];
        if (!confirmBtn) {
            setStatus('❌ Rejection confirmation button not found. Reject dialog may require manual completion.', 'error');
            return { ok: false, reason: 'the Reject dialog has no confirm button Autopilot recognises' };
        }
        confirmBtn.click();
    } else {
        setStatus('⚠️ No dialog opened after clicking Reject — checking whether the report was rejected directly…', 'warning');
    }

    const done = await waitForCondition(isDone, 6000, 150);
    if (!done) {
        return {
            ok: false,
            reason: findOpenDialog()
                ? 'the Reject dialog is still open, so the platform did not accept the rejection (a required field may be empty)'
                : 'the report does not show as rejected after confirming'
        };
    }

    await waitForDOMStable();
    setStatus('✅ Report rejected due to duplicate detection.', 'warning');
    return { ok: true, reason: '' };
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
        // v8.0.2 [5]: wait for the selection to actually move to the target
        // card rather than checking once after the DOM settles.
        const landed = await waitForCondition(() => {
            const active = identifyCurrentCard(getAllReportCards());
            if (!active) return false;
            // v8.0.3 [1]: the clicked card itself when it is still on the page
            // (a duplicate copy has the same text as the one just finished).
            if (expectedCard && expectedCard.isConnected) {
                return active === expectedCard || active.contains(expectedCard) || expectedCard.contains(active);
            }
            return signaturesMatch(extractCardSignature(active), expectedSig);
        }, CONFIG.NAV_LAND_TIMEOUT_MS, 100);
        if (landed) return true;

        const cards = getAllReportCards();

        // The Report List itself always shows the target's vessel and date, so
        // page text only counts when the list marks no card as selected at all.
        const pageText = document.body ? (document.body.innerText || '') : '';
        if (_currentCardMethod === 'fallback' && expectedSig.vesselName && expectedSig.date &&
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

// ── v7.6.0 [1] — CLICK THROUGH TO THE NEXT UNCHECKED REPORT ─────────────────
// Used after a duplicate rejection (or an error-skip): finds the next card
// that is still unchecked, navigates to it, confirms the landing, and waits
// out any buffering. Returns true (moved), false (nothing left) or 'retry'.
async function goToNextUncheckedReport(currentCard) {
    const sidebarCards = getAllReportCards();
    // Keep the ledger honest with the live list before choosing a target.
    syncLedgerWithSidebar(sidebarCards);

    const nextCard = findNextUncheckedCard(currentCard, sidebarCards);
    if (!nextCard) {
        setStatus('🎉 No more unchecked reports in the list — every report has been processed.', 'success');
        return false;
    }

    const nextSig = extractCardSignature(nextCard);
    setStatus(`➡️ Continuing to next unchecked report: ${describeSignature(nextSig)}`, 'success');
    nextCard.click();
    await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);

    const navReady = await waitForPageReady('post-navigation load');
    if (!navReady) return 'retry';

    await verifyLandedOnCard(nextSig, nextCard);
    return true;
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

    // v8.0.2 [5]: the same Report List and selected card as validation uses.
    // This kept its own looser copies, so the form panel could sit in the list
    // as the "next" report and navigation clicked it instead of a real card.
    const sidebarCards = getAllReportCards();

    if (sidebarCards.length === 0) {
        setStatus('🎉 Queue cleared successfully with clean data locks!', 'success');
        return false;
    }

    const currentCard  = identifyCurrentCard(sidebarCards);
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
            const keys = cardKeyMap(sidebarCards);
            const stepKey = keys.get(nextCard);
            if (stepKey !== expectedKey) {
                const ledgerCard = sidebarCards.find(c => keys.get(c) === expectedKey);
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
async function advanceToNextReport(completedKey, options = {}) {
    clearReportIssues(); // v8.0.1 [2]: issues belong to the report being left
    setStatus('━━━ Navigation phase: moving to next pending report ━━━', 'info');

    // v7.6.0 [1]: after a duplicate rejection (or an error-skip) the just-
    // finished card is red/green, so stepping one sidebar slot could land on
    // an already-resolved card. In that case, jump straight to the next
    // UNCHECKED report instead — that is what keeps the run going.
    if (options.preferNextUnchecked) {
        const cards = getAllReportCards();
        const keys = cardKeyMap(cards);
        const currentCard = cards.find(c => keys.get(c) === completedKey)
            || identifyCurrentCard(cards);
        const jumped = await goToNextUncheckedReport(currentCard);
        if (jumped === 'retry') return 'retry';
        if (jumped) return 'continue';
        // Nothing unchecked ahead — fall through to the normal check so a
        // ledger-tracked report elsewhere can still be reached.
    }

    const hasMore = await goToNextPendingReport(completedKey);

    // 'blocked' means the current report is not finished — retry it rather
    // than stepping over it or mistaking the block for an empty queue.
    if (hasMore === 'blocked') return 'retry';
    if (hasMore === 'retry')   return 'retry';
    if (!hasMore) {
        // v7.6.0 [1]: before declaring the queue done, make sure no unchecked
        // report was left behind (e.g. skipped past earlier). If one remains,
        // go to it and keep processing.
        const cards = getAllReportCards();
        syncLedgerWithSidebar(cards);
        const leftover = findNextUncheckedCard(identifyCurrentCard(cards), cards);
        if (leftover) {
            const sig = extractCardSignature(leftover);
            setStatus(`➡️ Sequential pass finished but an unchecked report remains — going to it: ${describeSignature(sig)}`, 'warning');
            leftover.click();
            await sleep(CONFIG.SLEEP_POST_NAVIGATE_MS);
            const ready = await waitForPageReady('post-navigation load');
            if (!ready) return 'retry';
            await verifyLandedOnCard(sig, leftover);
            return 'continue';
        }
        return 'complete';
    }
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

    // v8.0.1 [1]: one log section per report (a re-check adds a divider to
    // the same section instead of wiping the log).
    // v8.0.3 [1]: this card's own key — a duplicate copy is tracked separately.
    const sectionKey = currentCard ? cardKey(currentCard, sidebarCards) : '';
    if (ReportIssues.key && ReportIssues.key !== sectionKey) clearReportIssues();
    beginLogSection(sectionKey, currentSig ? describeSignature(currentSig) : 'Current report');

    // v8.0.2 [1]: say which report the Report List says is on screen, so a
    // misidentified report is visible instead of silently mis-validated.
    if (!currentCard) {
        setStatus('🛑 Report List not found — no report card with a vessel name and report date/time could be read. ' +
                  'Every date-based check needs the Report List.', 'error');
    } else {
        setStatus(`📋 Report List: ${sidebarCards.length} report(s) — validating ${describeSignature(currentSig)} ${currentSig.utcOffset || ''}`, 'info');
        if (_currentCardMethod === 'fallback') {
            setStatus('⚠️ No card in the Report List is marked as selected — assuming the first one. If that is not the report on screen, stop and select it.', 'warning');
        }
    }

    if (!ProcessingLedger.initialised) {
        initialiseLedger(sidebarCards, currentCard);
    }

    // v7.6.0 [2]: keep the ledger in step with the live list on every pass
    // (this replaces the removed reset — new cards get queued, resolved
    // cards get recorded).
    syncLedgerWithSidebar(sidebarCards);

    const entry = currentSig ? ledgerEnsureEntry(currentSig, sectionKey) : null;
    const key   = entry ? entry.key : '';

    if (entry && LEDGER_COMPLETE_STATUSES.includes(entry.status)) {
        setStatus(`🧾 ${entry.label} is already recorded as "${entry.status}" — not re-processing it.`, 'info');
        setSectionBadge('Already done', '');
        // v7.6.0 [1]: the current card is finished, so prefer the next
        // unchecked report rather than blindly stepping one slot.
        return await advanceToNextReport(key, { preferNextUnchecked: true });
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
        setSectionBadge('Already approved', '');
        return await advanceToNextReport(key, { preferNextUnchecked: true });
    }

    if (isCurrentReportAlreadyRejected()) {
        setStatus('⚠️ Current report is already rejected — moving on (recorded in the ledger).', 'warning');
        ledgerMark(key, 'already-rejected', 'was already rejected when reached');
        setSectionBadge('Already rejected', '');
        return await advanceToNextReport(key, { preferNextUnchecked: true });
    }

    // ── STEP 1: Capture current report context ──────────────────────────
    setStatus('━━━ Context phase: capturing current report data ━━━', 'info');
    const contextReady = await waitForPageReady('context capture');
    if (!contextReady) return 'retry';

    // v8.0.3 [4]: the platform keeps filling in / recalculating values (list
    // of operations ROB, consumption totals) after the form appears. Validate
    // only once every field has stopped changing, and remember what was read.
    const validatedValues = await waitForFormSettled('loading the report');

    const crossReportData = await gatherCrossReportBunkerData();

    // ── STEP 2: Validate — no navigation occurs inside here ──────────────
    setStatus('━━━ Validation phase: running all checks on current report ━━━', 'info');
    const isValid = await validateCurrentReport(crossReportData);

    // v7.3.0/[5]: a duplicate is a recoverable validation RESULT. The report
    // is rejected with an explanation, recorded, and the queue continues.
    if (isValid === 'duplicate-skip') {
        ledgerMark(key, 'rejected-duplicate', 'auto-rejected as a duplicate');
        setSectionBadge('Rejected · duplicate', 'warn');
        setStatus('━━━ Navigation phase: duplicate handled, continuing the queue ━━━', 'info');
        // v7.6.0 [1]: the card is now red — go to the next UNCHECKED report.
        return await advanceToNextReport(key, { preferNextUnchecked: true });
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

    // v8.0.3 [4]: submit exactly what was validated. If the platform changed
    // any value after the checks ran, check again before submitting.
    const submitValues = await waitForFormSettled('approval');
    if (validatedValues && submitValues && submitValues !== validatedValues) {
        setStatus('♻️ Form values changed after they were validated (the platform recalculated them) — validating again before submitting.', 'warning');
        UI.passReason = 'Re-validating changed values';
        return 'retry';
    }

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
    setSectionBadge(approved === 'skipped' ? 'Already approved' : 'Approved', 'ok');

    // ── STEP 5: Navigate to next pending report ──────────────────────────
    return await advanceToNextReport(key);
}

// ── v7.6.0 [4] ─────────────────────────────────────────────────────────────
// A halt no longer stops the bot. It is retried on the same report up to
// MAX_HALT_AUTO_RESUMES times; if it still cannot clear, the error is
// recorded, the report is marked error-skipped, and Autopilot moves on to
// the next unchecked report. Returns the next loop outcome to act on.
async function recoverFromHalt() {
    const cards = getAllReportCards();
    const currentCard = identifyCurrentCard(cards);
    const currentSig  = currentCard ? extractCardSignature(currentCard) : null;
    const key = currentCard ? cardKey(currentCard, cards) : (AutopilotState.lastKey || '');

    const count = (AutopilotState.haltCounts.get(key) || 0) + 1;
    AutopilotState.haltCounts.set(key, count);

    // Clear the halted flag so the run is no longer parked.
    AutopilotState.genuineHalt = false;
    const reason = AutopilotState.haltReason || 'a validation issue';
    AutopilotState.haltReason = '';
    window.autopilotRunning = true;
    updateUIButton();

    if (count <= CONFIG.MAX_HALT_AUTO_RESUMES) {
        setStatus(
            `♻️ Auto-resume ${count}/${CONFIG.MAX_HALT_AUTO_RESUMES} after halt (${reason}) — ` +
            `re-checking the same report.`,
            'warning'
        );
        await sleep(CONFIG.HALT_AUTO_RESUME_DELAY_MS);
        return 'continue'; // re-run processOneReport() on the same report
    }

    // Exhausted automatic re-checks on this report. Record the error and move
    // on rather than sitting halted forever.
    const skipMsg =
        `Report could not be cleared automatically after ${CONFIG.MAX_HALT_AUTO_RESUMES} ` +
        `re-checks (${reason})` +
        (currentSig ? ` — ${describeSignature(currentSig)}` : '') +
        `. Recorded as an error and skipped so the run can continue.`;
    return await skipReportWithError(skipMsg, key, 'auto-skip after halt',
        'validation error could not be cleared automatically');
}

// v8.0.1 [2]: the error-skip path, shared by automatic recovery and the
// "Skip report" button — record the error, mark the report finished with
// errors, and move on to the next unchecked report.
async function skipReportWithError(skipMsg, key, context, note) {
    setStatus(`🛑 ${skipMsg}`, 'error');
    recordError(skipMsg, context);

    if (key) ledgerMark(key, 'error-skipped', note);
    AutopilotState.haltCounts.delete(key);
    setSectionBadge('Skipped — not approved', 'bad');
    markSkippedCards();
    clearReportIssues();
    setStatus('⏭ Report skipped — it was NOT approved and will not be validated again this run. Moving to the next report…', 'warning');

    await sleep(CONFIG.HALT_AUTO_RESUME_DELAY_MS);
    // Move to the next unchecked report and keep going.
    return await advanceToNextReport(key, { preferNextUnchecked: true });
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
                    // v7.6.0 [4]: even a stuck report no longer parks the bot.
                    // Record it as an error, skip it, and carry on.
                    const cards = getAllReportCards();
                    const cur   = identifyCurrentCard(cards);
                    const curSig = cur ? extractCardSignature(cur) : null;
                    const curKey = cur ? cardKey(cur, cards) : '';
                    const stuckMsg =
                        `No progress could be made on this report after ${CONFIG.MAX_TRANSIENT_RETRIES} ` +
                        `automatic recovery attempts` +
                        (curSig ? ` — ${describeSignature(curSig)}` : '') +
                        `. Recorded as an error and skipped so the run can continue.`;
                    setStatus(`🛑 ${stuckMsg}`, 'error');
                    recordError(stuckMsg, 'auto-skip after retries');
                    if (curKey) ledgerMark(curKey, 'error-skipped', 'no progress after repeated retries');
                    AutopilotState.transientRetries = 0;

                    const moved = await advanceToNextReport(curKey, { preferNextUnchecked: true });
                    if (moved === 'complete') {
                        reportLedgerReconciliation();
                        finishRun('🎉 Queue complete — run finished (some reports were skipped with errors, see summary).');
                        break;
                    }
                    if (moved === 'retry') {
                        // Genuinely nothing actionable — end the run cleanly.
                        reportLedgerReconciliation();
                        finishRun('⚠️ Run ended — no further progress possible. See the error summary above.');
                        break;
                    }
                    continue; // 'continue' → next report
                }

                setStatus(
                    `♻️ Recovering (attempt ${AutopilotState.transientRetries}/${CONFIG.MAX_TRANSIENT_RETRIES}) — ` +
                    `retrying the same report, not skipping it.`,
                    'warning'
                );
                UI.passReason = UI.passReason || 'Retry';
                await sleep(CONFIG.TRANSIENT_RETRY_DELAY_MS);
                continue;
            }

            AutopilotState.transientRetries = 0;

            if (outcome === 'halt') {
                if (AutopilotState.userStopped) break;

                // v8.0.1 [2]: a data problem on the report is never approved
                // and never auto-skipped — Autopilot waits for the user to
                // correct it, then re-validates the same report.
                if (ReportIssues.list.length > 0) {
                    const choice = await awaitUserCorrection();
                    if (AutopilotState.userStopped || choice === 'stopped') break;

                    AutopilotState.genuineHalt = false;
                    AutopilotState.haltReason  = '';

                    if (choice === 'skip') {
                        const cards  = getAllReportCards();
                        const cur    = identifyCurrentCard(cards);
                        const curSig = cur ? extractCardSignature(cur) : null;
                        const skipMsg =
                            `Report skipped by the user with ${ReportIssues.list.length} unresolved issue(s)` +
                            (curSig ? ` — ${describeSignature(curSig)}` : '') +
                            `. Recorded as an error; the report was NOT approved.`;
                        const moved = await skipReportWithError(
                            skipMsg, cur ? cardKey(cur, cards) : '', 'skipped by user', 'skipped by the user with unresolved issues'
                        );
                        if (moved === 'complete') {
                            reportLedgerReconciliation();
                            finishRun('🎉 Queue complete — run finished (some reports were skipped with errors, see summary).');
                            break;
                        }
                    }
                    // 'recheck' (or after a skip) → run the loop again.
                    continue;
                }

                // v7.6.0 [4]: no issue list (e.g. a navigation problem) —
                // recover automatically instead of parking.
                const recovered = await recoverFromHalt();

                if (AutopilotState.userStopped) break;

                if (recovered === 'complete') {
                    reportLedgerReconciliation();
                    finishRun('🎉 Queue complete — run finished (some reports were skipped with errors, see summary).');
                    break;
                }
                // 'continue' (re-check same report) or 'retry'/next report:
                // just loop again. window.autopilotRunning was re-armed inside
                // recoverFromHalt().
                continue;
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
//   UI CONTROL INTERFACE  (v8.0.1)
//
//   Everything Autopilot draws — the Start button, the SYSTEM ACTIVE LOG and
//   the issues panel — lives inside ONE shadow root (#autopilot-ui). The
//   validation engine reads the page with querySelectorAll / innerText and
//   neither crosses a shadow boundary, so Autopilot's own text can never be
//   read back as part of the report again (the v7.6.0 log glitch).
// ---------------------------------------------------------------------------

const UI = {
    root: null, panel: null, status: null, statusText: null, statusReport: null, statusSpin: null,
    issues: null, log: null, jump: null,
    btn: null, btnIcon: null, btnLabel: null, btnSub: null, logToggle: null,
    phase: '', report: '', starting: false, lastRun: '', passReason: '',
    section: null, sectionKey: '', sectionPasses: 0,
    pinned: true, scrollQueued: false,
    markedEls: new Set(),
    focusAfterCheck: false
};

const SUMMARY_SECTION_KEY = '__run_summary__';

const PHASE_LABELS = {
    context: 'Reading report',
    validation: 'Validating',
    approval: 'Approving',
    verification: 'Confirming approval',
    navigation: 'Moving to next report'
};

const UI_FONT  = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const UI_MONO  = 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace';

const UI_CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
button { font: inherit; color: inherit; margin: 0; }
button:focus-visible, [role="button"]:focus-visible { outline: 2px solid #90caf9; outline-offset: 2px; }

.dock { position: fixed; left: 20px; bottom: 20px; z-index: 99999; display: flex; gap: 8px; align-items: stretch;
        font: 500 14px/1.25 ${UI_FONT}; }
.btn-main { --tone: #2e7d32; --tone-hi: #388e3c; display: flex; align-items: center; gap: 12px;
            min-width: 240px; max-width: 330px; padding: 9px 18px 9px 10px; border: 1px solid rgba(255,255,255,.16);
            border-radius: 12px; background: var(--tone); color: #fff; text-align: left; cursor: pointer;
            box-shadow: 0 6px 18px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12); }
.btn-main:hover { background: var(--tone-hi); }
.btn-main:active { transform: translateY(1px); }
.btn-main:disabled { cursor: progress; }
.tone-running   { --tone: #c62828; --tone-hi: #d32f2f; }
.tone-attention { --tone: #ef6c00; --tone-hi: #f57c00; }
.btn-icon { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
            background: rgba(0,0,0,.22); font-size: 14px; font-weight: 800; }
.flag .btn-icon { background: #b71c1c; }
.btn-text { display: flex; flex-direction: column; min-width: 0; }
.btn-label { font-size: 15px; font-weight: 700; letter-spacing: .2px; }
.btn-sub { margin-top: 2px; font-size: 12px; font-weight: 500; opacity: .92; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-log { width: 46px; border-radius: 12px; border: 1px solid #444; background: rgba(10,11,15,.96); color: #cfd8dc;
           font-size: 17px; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.45); }
.btn-log:hover { background: #1c1e24; color: #fff; }
.btn-log[aria-pressed="true"] { border-color: #78909c; }

.spin { border-radius: 50%; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; animation: ap-spin .8s linear infinite; }
.btn-icon.spin { border-width: 3px; background: none; }
.spin.sm { width: 12px; height: 12px; flex: 0 0 auto; }
@keyframes ap-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }

.panel { position: fixed; left: 20px; bottom: 88px; z-index: 99999; width: min(560px, calc(100vw - 40px));
         max-height: min(calc(100vh - 110px), 640px); display: flex; flex-direction: column; overflow: hidden;
         background: rgba(10,11,15,.98); color: #e8eaed; border: 1px solid #444; border-radius: 12px;
         box-shadow: 0 10px 30px rgba(0,0,0,.6); font: 13px/1.45 ${UI_FONT}; }
.panel.right { left: auto; right: 20px; }
.panel.min .status, .panel.min .issues, .panel.min .logwrap { display: none; }
.head { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 8px 10px 8px 14px; border-bottom: 1px solid #23252b; }
.title { font-size: 11.5px; font-weight: 700; letter-spacing: .9px; text-transform: uppercase; color: #9aa4ae; }
.ver { font: 600 11px/1.6 ${UI_MONO}; color: #81c784; border: 1px solid #2e5e32; border-radius: 99px; padding: 0 7px; }
.grow { flex: 1 1 auto; }
.seg { display: flex; border: 1px solid #3a3d44; border-radius: 7px; overflow: hidden; }
.seg button { border: 0; background: transparent; color: #9aa4ae; padding: 3px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
.seg button[aria-pressed="true"] { background: #2a2d34; color: #fff; }
.icon-btn { width: 26px; height: 26px; display: grid; place-items: center; padding: 0; border: 1px solid #3a3d44; border-radius: 7px;
            background: transparent; color: #b0b8c1; font-size: 15px; line-height: 1; cursor: pointer; }
.icon-btn:hover { background: #22252c; color: #fff; }
.icon-btn:disabled { opacity: .35; cursor: default; background: transparent; }
.icon-btn.close { color: #e57373; border-color: #6b2b2b; }
.icon-btn.close:hover { background: #e53935; border-color: #e53935; color: #fff; }

.status { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 6px 14px;
          background: #111318; border-bottom: 1px solid #23252b; font-size: 12.5px; color: #dfe3e8; }
.status .dot { width: 8px; height: 8px; border-radius: 50%; background: #607d8b; flex: 0 0 auto; }
.s-running .dot { display: none; }
.s-attention .dot { background: #ffa726; }
.s-error .dot { background: #ef5350; }
.s-done .dot { background: #66bb6a; }
.status-text { flex: 0 0 auto; font-weight: 600; }
.s-attention .status-text { color: #ffcc80; }
.s-error .status-text { color: #ef9a9a; }
.status-report { flex: 1 1 auto; min-width: 0; text-align: right; color: #8a939c; font: 11.5px ${UI_MONO};
                 overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.issues { flex: 0 0 auto; display: flex; flex-direction: column; max-height: min(50vh, 420px); overflow: hidden;
          background: #16130d; border-bottom: 1px solid #3a3120; }
.is-head { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 9px 14px 7px; }
.is-title { color: #ffb74d; font-weight: 700; }
.is-resolved { color: #81c784; font-size: 12px; font-weight: 600; }
.is-state { color: #b0b8c1; font-size: 12px; }
.pager { min-width: 44px; text-align: center; color: #9aa4ae; font: 12px ${UI_MONO}; }
.is-active { flex: 0 0 auto; margin: 0 14px 8px; padding: 10px 12px 12px; border: 1px solid #5b4320;
             border-left: 3px solid #ff9800; border-radius: 8px; background: #1f1a11; }
.is-field { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.is-num { flex: 0 0 auto; display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 5px;
          border-radius: 99px; background: #3e2c12; color: #ffcc80; font: 700 11px ${UI_MONO}; }
.is-name { font-weight: 700; color: #fff; font-size: 13.5px; }
.tag { font-size: 11px; font-weight: 700; color: #ffcc80; border: 1px solid #6d4c1f; border-radius: 99px; padding: 0 8px; line-height: 18px; }
.is-vals { display: flex; flex-wrap: wrap; gap: 2px 22px; margin-top: 8px; font: 12.5px/1.5 ${UI_MONO}; }
.k { color: #8a939c; margin-right: 8px; }
.v { color: #e8eaed; font-weight: 700; }
.v.bad { color: #ef9a9a; font-weight: 700; }
.v.good { color: #a5d6a7; font-weight: 700; }
.is-reason { margin-top: 8px; color: #cfd8dc; font-size: 12.5px; }
.is-ask { margin-top: 8px; color: #fff; font-size: 12.5px; font-weight: 600; }
.is-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
.is-note { color: #8a939c; font-size: 12px; }
.b { flex: 0 0 auto; white-space: nowrap; padding: 6px 12px; border-radius: 7px; border: 1px solid #4a4e57; background: #23262d; color: #e8eaed;
     font-size: 12.5px; font-weight: 600; cursor: pointer; }
.b:hover { background: #2c3038; }
.b:disabled { opacity: .45; cursor: not-allowed; }
.b-primary { background: #2e7d32; border-color: #2e7d32; color: #fff; }
.b-primary:hover { background: #388e3c; }
.b-danger { background: transparent; border-color: #5c2b2b; color: #ef9a9a; }
.b-danger:hover { background: #3b1d1d; }
.is-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: 0 14px 8px; }
.is-list li { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: 6px; color: #cfd8dc;
              font-size: 12.5px; cursor: pointer; }
.is-list li:hover { background: #221d14; }
.is-list li.on { background: #2b2214; color: #fff; }
.is-li-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.is-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 8px 14px 10px; border-top: 1px solid #2e2718; }
.hint { flex: 1 1 auto; color: #9aa4ae; font-size: 11.5px; }

.logwrap { position: relative; flex: 1 1 auto; min-height: 96px; display: flex; }
.log { flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 8px; font: 12px/1.5 ${UI_MONO}; }
.sec { border-bottom: 1px solid #1b1d22; }
.sec > summary { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 6px 14px;
                 list-style: none; cursor: pointer; background: #0e0f14; color: #b0b8c1; font: 600 12px/1.4 ${UI_FONT}; }
.sec > summary::-webkit-details-marker { display: none; }
.sec > summary:hover { color: #fff; }
.chev { display: inline-block; width: 10px; color: #6f7985; }
.sec[open] > summary .chev { transform: rotate(90deg); }
.sec-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { margin-left: auto; flex: 0 0 auto; padding: 0 8px; border-radius: 99px; background: #263238; color: #b0bec5;
         font-size: 11px; line-height: 18px; }
.badge:empty { display: none; }
.badge.ok { background: #1b3a20; color: #a5d6a7; }
.badge.bad { background: #3b1d1d; color: #ef9a9a; }
.badge.warn { background: #3a2e12; color: #ffcc80; }
.row { display: grid; grid-template-columns: 58px 1fr; gap: 8px; padding: 1px 14px 1px 12px; border-left: 2px solid transparent;
       color: #dfe3e8; white-space: pre-wrap; overflow-wrap: anywhere; }
.row .t { color: #555d66; font-size: 11px; }
.row-success { color: #81c784; }
.row-warning { color: #ffd54f; border-left-color: #8d6e1f; }
.row-error { color: #ef9a9a; border-left-color: #e53935; background: rgba(229,57,53,.09); }
.row-debug { color: #6f7985; font-size: 11px; }
.row-divider, .row-divider-error { margin-top: 6px; color: #90a4ae; font: 700 10.5px/1.6 ${UI_FONT};
                                   letter-spacing: .8px; text-transform: uppercase; }
.row-divider-error { color: #ef9a9a; }
.row-rule { height: 1px; margin: 4px 14px; background: #2a2d34; }
.log.only-issues .row:not(.row-error):not(.row-warning), .log.only-issues .row-rule { display: none; }
.jump { position: absolute; right: 16px; bottom: 10px; padding: 4px 12px; border: 0; border-radius: 99px;
        background: #37474f; color: #fff; font: 600 12px ${UI_FONT}; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.5); }
.jump.err { background: #c62828; }
`;

// Outlines drawn on the REPORT page (not in the shadow root): every field
// with an issue is dashed red, the one being worked on is solid orange.
const HOST_HIGHLIGHT_CSS =
    '.ap-issue-mark{outline:2px dashed #f44336!important;outline-offset:2px!important}' +
    '.ap-issue-focus{outline:3px solid #ff9800!important;outline-offset:2px!important;' +
    'box-shadow:0 0 0 5px rgba(255,152,0,.35)!important}' +
    // v8.0.2 [4]: a label only — the card's own border/outline/colours, which
    // the selected / approved / rejected detection reads, are left untouched.
    '.ap-card-skipped::after{content:"SKIPPED — NOT APPROVED";position:absolute;right:6px;bottom:4px;' +
    'padding:0 6px;border-radius:4px;background:#ef6c00;color:#fff;font:700 10px/16px system-ui,Arial,sans-serif;' +
    'letter-spacing:.4px;pointer-events:none}';

// v8.0.2 [4]: a skipped report stays unapproved on the platform, so its card
// would look untouched. Tag every card the ledger records as skipped (also
// re-applied on each pass, in case the site re-renders the list).
function markSkippedCards(cards) {
    const list = cards || getAllReportCards();
    const keys = cardKeyMap(list);
    for (const card of list) {
        if (card.classList.contains('ap-card-skipped')) continue;
        const entry = ProcessingLedger.entries.get(keys.get(card));
        if (!entry || entry.status !== 'error-skipped') continue;
        ensureHostHighlightStyles(card.ownerDocument);
        if (window.getComputedStyle(card).position === 'static') card.style.position = 'relative';
        card.classList.add('ap-card-skipped');
    }
}

function mk(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
}

function button(text, cls, onClick, title) {
    const b = mk('button', cls, text);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
}

function injectControlPanel() {
    // Remove any earlier Autopilot UI on this page, including a v7.x panel.
    ['autopilot-btn', 'autopilot-status', 'autopilot-ui', 'autopilot-host-highlight']
        .forEach(id => document.getElementById(id)?.remove());

    const host = document.createElement('div');
    host.id = 'autopilot-ui';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
        <style>${UI_CSS}</style>
        <section class="panel" hidden aria-label="Autopilot system active log">
            <header class="head">
                <span class="title">System Active Log</span>
                <span class="ver">v${VERSION}</span>
                <span class="grow"></span>
                <div class="seg" role="group" aria-label="Log filter">
                    <button type="button" data-filter="all" aria-pressed="true" title="Show every log line">All</button>
                    <button type="button" data-filter="issues" aria-pressed="false" title="Show errors and warnings only">Issues</button>
                </div>
                <button type="button" class="icon-btn" data-act="min" title="Minimise" aria-label="Minimise log">–</button>
                <button type="button" class="icon-btn close" data-act="close" title="Close log" aria-label="Close log">×</button>
            </header>
            <div class="status s-idle" aria-live="polite">
                <span class="dot"></span><span class="spin sm" hidden></span>
                <span class="status-text">Ready</span>
                <span class="status-report"></span>
            </div>
            <div class="issues" hidden></div>
            <div class="logwrap">
                <div class="log" role="log" aria-live="off"></div>
                <button type="button" class="jump" hidden>↓ New messages</button>
            </div>
        </section>
        <div class="dock">
            <button type="button" class="btn-main tone-idle">
                <span class="btn-icon">▶</span>
                <span class="btn-text"><span class="btn-label">Start Autopilot</span><span class="btn-sub"></span></span>
            </button>
            <button type="button" class="btn-log" title="Show / hide the log" aria-label="Show or hide the log" aria-pressed="false">☰</button>
        </div>`;
    document.body.appendChild(host);

    const $ = sel => root.querySelector(sel);
    Object.assign(UI, {
        root,
        panel: $('.panel'), status: $('.status'), statusText: $('.status-text'),
        statusReport: $('.status-report'), statusSpin: $('.status .spin'),
        issues: $('.issues'), log: $('.log'), jump: $('.jump'),
        btn: $('.btn-main'), btnIcon: $('.btn-icon'), btnLabel: $('.btn-label'), btnSub: $('.btn-sub'),
        logToggle: $('.btn-log'),
        section: null, sectionKey: ''
    });

    // v8.0.1 [1]: follow new lines only while the reader is at the bottom.
    UI.log.addEventListener('scroll', () => {
        if (UI.scrollQueued) return; // layout moved, not the reader
        UI.pinned = UI.log.scrollHeight - UI.log.scrollTop - UI.log.clientHeight < 40;
        if (UI.pinned) hideJump();
    });
    UI.jump.addEventListener('click', () => {
        UI.log.scrollTop = UI.log.scrollHeight;
        hideJump();
    });

    root.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
        UI.log.classList.toggle('only-issues', b.dataset.filter === 'issues');
        root.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    $('[data-act="min"]').addEventListener('click', e => {
        const min = UI.panel.classList.toggle('min');
        e.currentTarget.textContent = min ? '+' : '–';
        e.currentTarget.title = min ? 'Expand' : 'Minimise';
    });
    $('[data-act="close"]').addEventListener('click', hidePanel);
    UI.logToggle.addEventListener('click', () => (UI.panel.hidden ? showPanel() : hidePanel()));

    // v7.4.0 [2]: strict Start/Stop semantics.
    //   Stop  → sticky. Nothing in this file may restart the bot afterwards.
    //   Start → the ONLY thing that clears a user stop.
    // v7.6.0 [2]: Start no longer wipes the ledger, the event index or the
    // last-known position — the reset logic has been removed entirely. Start
    // simply resumes; state is preserved and reconciled against the live list.
    UI.btn.addEventListener('click', () => {
        if (window.autopilotRunning) {
            stopByUser();
            return;
        }

        showPanel();

        AutopilotState.userStopped      = false;
        AutopilotState.genuineHalt      = false;
        AutopilotState.haltReason       = '';
        AutopilotState.sessionActive    = true;
        AutopilotState.transientRetries = 0;
        AutopilotState.platformRetried.clear();

        beginLogSection('', `Session started ${new Date().toLocaleTimeString([], { hour12: false })}`);
        UI.starting = true;
        UI.lastRun  = '';
        UI.phase    = '';
        // A short lock so a double-click cannot start and immediately stop.
        UI.btn.disabled = true;
        setTimeout(() => { UI.btn.disabled = false; }, 600);

        window.autopilotRunning = true;
        updateUIButton();
        setStatus(`▶️ Started by user (v${VERSION}).`, 'success');

        startWatchdog();
        runAutopilot();
    });

    updateUIButton();
}

function showPanel() {
    if (!UI.panel) return;
    UI.panel.hidden = false;
    UI.logToggle.setAttribute('aria-pressed', 'true');
}

function hidePanel() {
    if (!UI.panel) return;
    UI.panel.hidden = true;
    UI.logToggle.setAttribute('aria-pressed', 'false');
}

// ── Log ─────────────────────────────────────────────────────────────────────

// Starts the log section for a report. The same report again (a re-check or
// retry) gets a divider in its existing section rather than a new one.
function beginLogSection(key, title) {
    if (!UI.log) return;
    UI.starting = false;
    if (key && key !== SUMMARY_SECTION_KEY) UI.report = title;

    if (key && key === UI.sectionKey && UI.section) {
        UI.sectionPasses++;
        UI.section.open = true;
        appendRow(`↻ ${UI.passReason || 'Re-check'} — pass ${UI.sectionPasses + 1}`, 'divider');
        UI.passReason = '';
        updateUIButton();
        return;
    }

    // Collapse the finished section — unless the reader has scrolled up to
    // read it, in which case nothing moves under them.
    if (UI.section && UI.pinned) UI.section.open = false;

    const sec = mk('details', 'sec');
    sec.open = true;
    const summary = mk('summary');
    summary.append(mk('span', 'chev', '▸'), mk('span', 'sec-title', title), mk('span', 'badge'));
    sec.append(summary, mk('div', 'sec-body'));
    UI.log.appendChild(sec);

    UI.section = sec;
    UI.sectionKey = key;
    UI.sectionPasses = 0;
    UI.passReason = '';
    while (UI.log.children.length > CONFIG.LOG_MAX_SECTIONS) UI.log.firstElementChild.remove();

    updateUIButton();
    if (UI.pinned) queueScroll();
}

function beginSummarySection() {
    if (UI.sectionKey !== SUMMARY_SECTION_KEY) beginLogSection(SUMMARY_SECTION_KEY, 'Run summary');
}

function setSectionBadge(text, tone) {
    const badge = UI.section && UI.section.querySelector('.badge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = `badge${tone ? ` ${tone}` : ''}`;
}

function appendRow(text, kind) {
    if (!UI.log) return;
    if (!UI.section) beginLogSection('', 'Session');

    const row = kind === 'rule' ? mk('div', 'row-rule') : mk('div', `row row-${kind}`);
    if (kind !== 'rule') {
        row.append(mk('span', 't', new Date().toLocaleTimeString([], { hour12: false })), mk('span', 'm', text));
    }
    UI.section.lastElementChild.appendChild(row);

    if (UI.pinned) queueScroll();
    else showJump(kind === 'error');
}

// One scroll for every line logged in the same step. A timer rather than
// requestAnimationFrame, which never fires while the tab is in the background.
function queueScroll() {
    if (UI.scrollQueued || !UI.log) return;
    UI.scrollQueued = true;
    setTimeout(() => {
        UI.scrollQueued = false;
        UI.log.scrollTop = UI.log.scrollHeight;
    }, 0);
}

function showJump(isError) {
    if (!UI.jump) return;
    UI.jump.hidden = false;
    if (isError) UI.jump.classList.add('err');
    UI.jump.textContent = UI.jump.classList.contains('err') ? '↓ New error' : '↓ New messages';
}

function hideJump() {
    if (!UI.jump) return;
    UI.jump.hidden = true;
    UI.jump.classList.remove('err');
}

function setStatus(message, type = 'info') {
    // v7.6.0 [3]: capture every error-level line for the end-of-run summary.
    if (type === 'error') recordError(message);

    const text = String(message);

    // "━━━ Validation phase: … ━━━" lines become section dividers and drive
    // the phase shown in the status bar and on the button.
    if (/^━/.test(text)) {
        const phase = text.match(/^━+\s*(\w+) phase/i);
        if (phase) {
            UI.phase = PHASE_LABELS[phase[1].toLowerCase()] || phase[1];
            updateUIButton();
        }
        const label = text.replace(/━+/g, '').trim();
        appendRow(label, label ? (type === 'error' ? 'divider-error' : 'divider') : 'rule');
        return;
    }

    appendRow(text, text.startsWith('🔍 DEBUG') ? 'debug' : type);
}

// ── Start button + status bar ───────────────────────────────────────────────

function currentUiState() {
    const n      = ReportIssues.list.length;
    const issues = `${n} issue${n === 1 ? '' : 's'}`;

    if (AutopilotState.awaitingCorrection) {
        return {
            tone: 'attention', icon: '!', label: 'Stop Autopilot', sub: `Needs your review · ${issues}`,
            dot: 'attention', status: `Waiting for your correction — ${issues} on this report`,
            title: 'Autopilot is paused on this report until every issue is corrected. Click to stop.'
        };
    }
    if (window.autopilotRunning) {
        const phase = UI.starting ? 'Starting…' : (UI.phase || 'Working');
        return {
            tone: 'running', icon: '■', label: 'Stop Autopilot', sub: `Running · ${phase}`,
            dot: 'running', status: phase, busy: true,
            title: 'Stop Autopilot. Once stopped it stays stopped until you click Start.'
        };
    }
    if (AutopilotState.userStopped) {
        return {
            tone: 'idle', icon: '▶', label: 'Start Autopilot', sub: 'Stopped by you · click to resume',
            dot: 'idle', status: 'Stopped by you',
            title: 'Stopped by you. Autopilot will not restart on its own.'
        };
    }
    if (UI.lastRun === 'errors') {
        const open = unresolvedErrors().length;
        return {
            tone: 'idle', icon: '!', flag: true, label: 'Start Autopilot',
            sub: `Last run: ${open} unresolved error${open === 1 ? '' : 's'}`,
            dot: 'error', status: `Run finished with ${open} unresolved error${open === 1 ? '' : 's'} — see the summary`,
            title: 'The last run finished with errors — open the log for the error summary.'
        };
    }
    if (UI.lastRun === 'completed') {
        return {
            tone: 'idle', icon: '✓', label: 'Start Autopilot', sub: 'Last run completed',
            dot: 'done', status: 'Run completed — every report was processed', title: ''
        };
    }
    return {
        tone: 'idle', icon: '▶', label: 'Start Autopilot', sub: `v${VERSION} · Ready`,
        dot: 'idle', status: 'Ready', title: ''
    };
}

// Kept under its v7 name: every state change calls it. Renders the button
// and the status bar from the current state.
function updateUIButton() {
    if (!UI.btn) return;
    const s = currentUiState();
    const spinning = !!(s.busy && UI.starting);

    UI.btn.className = `btn-main tone-${s.tone}${s.flag ? ' flag' : ''}`;
    UI.btn.title = s.title || '';
    UI.btn.setAttribute('aria-label', `${s.label} — ${s.sub}`);
    UI.btnIcon.classList.toggle('spin', spinning);
    UI.btnIcon.textContent = spinning ? '' : s.icon;
    UI.btnLabel.textContent = s.label;
    UI.btnSub.textContent = s.sub;

    UI.status.className = `status s-${s.dot}`;
    UI.statusSpin.hidden = !s.busy;
    UI.statusText.textContent = s.status;
    UI.statusReport.textContent = UI.report || '';
}

// ── Issues panel + page highlights ──────────────────────────────────────────

function ensureHostHighlightStyles(doc) {
    if (!doc || doc.getElementById('autopilot-host-highlight')) return;
    const style = doc.createElement('style');
    style.id = 'autopilot-host-highlight';
    style.textContent = HOST_HIGHLIGHT_CSS;
    (doc.head || doc.documentElement).appendChild(style);
}

// Every field with an issue stays highlighted; the active one is orange.
function markIssueElements() {
    clearIssueMarks();
    ReportIssues.list.forEach((issue, i) => {
        const el = resolveIssueElement(issue);
        if (!el || !el.classList) return;
        ensureHostHighlightStyles(el.ownerDocument);
        el.classList.add(i === ReportIssues.active ? 'ap-issue-focus' : 'ap-issue-mark');
        UI.markedEls.add(el);
    });
}

function clearIssueMarks() {
    UI.markedEls.forEach(el => el.classList.remove('ap-issue-mark', 'ap-issue-focus'));
    UI.markedEls.clear();
}

function focusActiveIssue({ scroll = true, focusField = false } = {}) {
    markIssueElements();
    const issue = ReportIssues.list[ReportIssues.active];
    const el = resolveIssueElement(issue);
    if (!el) return false;
    if (scroll) revealIssueElement(el);
    if (focusField && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
        try { el.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
    return true;
}

// Element rect in top-window coordinates (fields may sit inside iframes).
function rectInTopWindow(el) {
    const r = el.getBoundingClientRect();
    let x = r.left, y = r.top;
    let win = el.ownerDocument.defaultView;
    try {
        while (win && win !== window && win.frameElement) {
            const fr = win.frameElement.getBoundingClientRect();
            x += fr.left; y += fr.top;
            win = win.parent;
        }
    } catch { /* cross-origin frame — use the local rect */ }
    return { left: x, top: y, right: x + r.width, bottom: y + r.height };
}

// Scrolls the field into view WITHOUT leaving it behind the log panel. A
// field on the panel's side moves the panel to the other side when that side
// is clear; on a window too narrow for that, the field is parked in the band
// above the panel instead.
function revealIssueElement(el) {
    const panel = UI.panel && !UI.panel.hidden && !UI.panel.classList.contains('min') ? UI.panel : null;
    let block = 'center';
    el.style.scrollMarginBottom = '';

    if (panel) {
        panel.classList.remove('right');
        const p = panel.getBoundingClientRect();
        const r = rectInTopWindow(el);
        const overlaps = (left, right) => r.right > left && r.left < right;
        if (overlaps(p.left, p.right)) {
            const rightDockLeft = window.innerWidth - 20 - p.width;
            if (!overlaps(rightDockLeft, rightDockLeft + p.width)) {
                panel.classList.add('right');
            } else {
                el.style.scrollMarginBottom = `${Math.max(0, Math.round(window.innerHeight - p.top + 16))}px`;
                block = 'end';
            }
        }
    }

    el.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' });

    // v8.0.3 [2]: some page containers ignore or cut short a smooth scroll —
    // if the field is still off screen, jump there instead.
    setTimeout(() => {
        if (!el.isConnected) return;
        const r = rectInTopWindow(el);
        if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) {
            el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        }
    }, 800);
}

function moveIssue(delta) {
    const n = ReportIssues.list.length;
    if (n < 2) return;
    ReportIssues.active = (ReportIssues.active + delta + n) % n;
    renderIssues();
    focusActiveIssue({ scroll: true });
}

// v8.0.3 [2]: enough about an issue's field to find it again after the page
// re-draws it (Angular replaces elements, which left "Go to field" and the
// fix buttons holding a detached element that scrolled nowhere).
function locatorFor(el) {
    if (!el || !el.ownerDocument || !el.closest) return null;
    const cell = el.closest('td, th');
    const row  = el.closest('tr');
    return {
        doc: el.ownerDocument,
        tag: el.tagName,
        id: el.id || '',
        name: el.getAttribute('name') || '',
        cellName: cell ? (cell.getAttribute('data-td-name') || '') : '',
        rowLabel: row && row.cells && row.cells[0] ? (row.cells[0].innerText || '').trim() : ''
    };
}

function relocate(loc) {
    if (!loc || !loc.doc) return null;
    const d = loc.doc;
    const byId = loc.id ? d.getElementById(loc.id) : null;
    if (byId && byId.tagName === loc.tag) return byId;
    if (loc.name) {
        const byName = Array.from(d.getElementsByName(loc.name)).find(e => e.tagName === loc.tag);
        if (byName) return byName;
    }
    if (loc.rowLabel && loc.cellName) {
        const sel  = `[data-td-name="${CSS.escape(loc.cellName)}"]`;
        const row  = Array.from(d.querySelectorAll('tr')).find(r =>
            r.cells && r.cells[0] && (r.cells[0].innerText || '').trim() === loc.rowLabel && r.querySelector(sel));
        const cell = row && row.querySelector(sel);
        if (cell) return cell.tagName === loc.tag ? cell : (cell.querySelector(loc.tag.toLowerCase()) || cell);
    }
    return null;
}

// The issue's live field: the saved element while it is on the page, else
// the same field found again.
function resolveIssueElement(issue) {
    if (!issue) return null;
    if (issue.el && issue.el.isConnected) return issue.el;
    const fresh = relocate(issue.loc);
    if (fresh) issue.el = fresh;
    return fresh;
}

// "Go to field": scroll to the field (finding it again if the page re-drew
// it) and put the cursor in it; say why when that is not possible.
function goToIssueField() {
    const issue = ReportIssues.list[ReportIssues.active];
    if (!issue) return;
    const el = resolveIssueElement(issue);
    if (!el) {
        if (Correction.resolve) {
            setStatus(`📍 ${issue.field}: the page re-drew this field — re-checking the report to find it again…`, 'info');
            UI.focusAfterCheck = true;
            requestRecheck();
        } else {
            setStatus(`📍 ${issue.field}: the page re-drew this field — press Start to re-check the report, then Go to field.`, 'warning');
        }
        return;
    }
    if (!isElementVisible(el)) {
        setStatus(`📍 ${issue.field}: the field is hidden on the page (a collapsed section or another tab?) — open that section, then click Go to field again.`, 'warning');
        return;
    }
    setStatus(`📍 Going to ${issue.field}.`, 'info');
    focusActiveIssue({ scroll: true, focusField: true });
}

function canApplyFix(issue) {
    if (!issue || !issue.fix) return false;
    const el = resolveIssueElement(issue);
    if (!el) return false;
    if (issue.fix.run) return true;
    return (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.readOnly && !el.disabled;
}

// Runs only when the user clicks the fix button — that click IS the approval.
// v8.0.3 [3]: nothing in this file changes a value or a row any other way.
async function applyIssueFix(issue) {
    if (!issue || !issue.fix) return;
    if (!resolveIssueElement(issue)) {
        setStatus(`⚠️ ${issue.field}: the page re-drew this field, so nothing was changed. Re-checking the report — then click the fix again.`, 'warning');
        requestRecheck();
        return;
    }
    if (!canApplyFix(issue)) {
        setStatus(`⚠️ ${issue.field}: this field cannot be edited here (it is read-only) — nothing was changed.`, 'warning');
        return;
    }

    if (issue.fix.run) {
        const ok = await issue.fix.run();
        if (ok) {
            setStatus(`🗑️ ${issue.field}: deleted (approved by you from the issues panel). Re-checking…`, 'success');
            scheduleRecheck(CONFIG.CORRECTION_RECHECK_DELAY_MS);
        } else {
            setStatus(`⚠️ ${issue.field}: the row was not removed — if the page asks you to confirm, confirm it, then press Re-check.`, 'warning');
        }
        return;
    }

    const before = issue.el.value;
    if (writeFieldValue(issue.el, issue.fix.value)) {
        setStatus(`✏️ ${issue.field}: ${before} → ${issue.fix.value} (approved by you from the issues panel). Re-checking…`, 'success');
    } else {
        setStatus(`⚠️ ${issue.field}: the page did not accept ${issue.fix.value} (the field shows "${issue.el.value}") — please type it in.`, 'warning');
    }
    scheduleRecheck(250);
}

// Sets an input the way typing would, so Angular / PrimeNG pick the value up.
function writeFieldValue(input, value) {
    const win = (input.ownerDocument && input.ownerDocument.defaultView) || window;
    // v8.0.3: inputs and textareas (the reject comment box) alike.
    const proto  = input.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    try { input.focus({ preventScroll: true }); } catch { /* ignore */ }
    setter.call(input, String(value));
    input.dispatchEvent(new win.Event('input',  { bubbles: true }));
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
    input.blur(); // Angular marks the control touched / PrimeNG commits on blur
    return input.value === String(value) ||
        (String(value).trim() !== '' && !isNaN(Number(value)) && parseFloat(input.value) === Number(value));
}


function renderIssues() {
    const box = UI.issues;
    if (!box) return;
    const list = ReportIssues.list;
    box.replaceChildren();
    box.hidden = list.length === 0;
    if (!list.length) return;

    const waiting  = AutopilotState.awaitingCorrection;
    const checking = !waiting && window.autopilotRunning;
    const i   = Math.min(ReportIssues.active, list.length - 1);
    const cur = list[i];

    // Header — how many, how many already fixed, and where we are.
    const head = mk('div', 'is-head');
    head.append(mk('span', 'is-title',
        `⚠ ${list.length} issue${list.length === 1 ? '' : 's'} ${ReportIssues.resolved ? 'remaining' : 'found'}`));
    if (ReportIssues.resolved) head.append(mk('span', 'is-resolved', `✓ ${ReportIssues.resolved} resolved`));
    head.append(mk('span', 'grow'));
    if (checking) head.append(mk('span', 'spin sm'), mk('span', 'is-state', 'Re-checking…'));
    const prev = button('‹', 'icon-btn', () => moveIssue(-1), 'Previous issue');
    const next = button('›', 'icon-btn', () => moveIssue(1), 'Next issue');
    prev.disabled = next.disabled = list.length < 2;
    head.append(prev, mk('span', 'pager', `${i + 1} / ${list.length}`), next);

    // The issue being worked on.
    const card = mk('div', 'is-active');
    const fieldLine = mk('div', 'is-field');
    fieldLine.append(mk('span', 'is-num', String(i + 1)), mk('span', 'is-name', cur.field || 'Validation issue'));
    if (cur.problem) fieldLine.append(mk('span', 'tag', cur.problem));
    card.append(fieldLine);

    // Labelled values (e.g. Last ROB / ROB Start / Difference), else current vs expected.
    const pairs = cur.values || [
        ...(cur.current  !== undefined ? [{ k: 'Current value',  v: cur.current,  tone: 'bad'  }] : []),
        ...(cur.expected !== undefined ? [{ k: 'Expected value', v: cur.expected, tone: 'good' }] : [])
    ];
    if (pairs.length) {
        const vals = mk('div', 'is-vals');
        pairs.forEach(({ k, v, tone }) => {
            const p = mk('span');
            p.append(mk('span', 'k', k), mk('span', `v ${tone || ''}`, String(v)));
            vals.append(p);
        });
        card.append(vals);
    }
    card.append(mk('div', 'is-reason', cur.reason || cur.message));

    const fixable = canApplyFix(cur);
    if (fixable) {
        card.append(mk('div', 'is-ask',
            cur.fix.ask || `I found that the ${cur.field} value appears to be incorrect. Should I update it to ${cur.expected}?`));
    }
    const actions = mk('div', 'is-actions');
    if (fixable) {
        const fixBtn = button(cur.fix.label || 'Correct this value', 'b b-primary', () => applyIssueFix(cur),
            cur.fix.run ? 'Makes this change on the page, then re-checks the report' : 'Writes the expected value into the field, then re-checks the report');
        fixBtn.disabled = checking;
        actions.append(fixBtn);
    }
    if (cur.el || cur.loc) {
        actions.append(button('Go to field', 'b', goToIssueField, 'Scroll to this field and put the cursor in it'));
    } else {
        actions.append(mk('span', 'is-note', 'No single field to jump to — review the section named above.'));
    }
    card.append(actions);

    // Every issue, so none is hidden while one is being worked on.
    const ol = mk('ol', 'is-list');
    list.forEach((issue, n) => {
        const li = mk('li', n === i ? 'on' : '');
        li.tabIndex = 0;
        li.setAttribute('role', 'button');
        li.title = issue.message;
        // Field-level issues read "Field — problem"; rule-level ones (timeline,
        // sequence, dialog) show the rule itself so two of them never look alike.
        const valueIssue = issue.current !== undefined || issue.expected !== undefined;
        const detail = valueIssue || !issue.message ? issue.problem : issue.message.replace(/^\[[^\]]+\]\s*/, '');
        li.append(mk('span', 'is-num', String(n + 1)),
                  mk('span', 'is-li-text', `${issue.field || 'Validation issue'}${detail ? ` — ${detail}` : ''}`));
        const pick = () => { ReportIssues.active = n; renderIssues(); focusActiveIssue({ scroll: true }); };
        li.addEventListener('click', pick);
        li.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
        });
        ol.append(li);
    });

    const foot = mk('div', 'is-foot');
    foot.append(mk('span', 'hint', waiting
        ? 'Edit the highlighted field — it re-checks when you leave it and approves once every check passes.'
        : checking ? 'Re-validating this report…' : 'Autopilot is stopped — press Start to re-check this report.'));
    const recheck = button('Re-check now', 'b', requestRecheck, 'Run every validation on this report again');
    const skip = button('Skip report', 'b b-danger', requestSkip,
        'Record this report as an error and move on WITHOUT approving it');
    recheck.disabled = skip.disabled = !waiting;
    foot.append(recheck, skip);

    box.append(head, card, ol, foot);
}

// ── v8.0.1 [2] Waiting for the user's correction ────────────────────────────

const Correction = { resolve: null, timer: null, docs: [] };

// Any committed edit on the report form (change fires when the user leaves
// a field or picks an option) schedules a re-check.
function onCorrectionEdit() {
    scheduleRecheck(CONFIG.CORRECTION_RECHECK_DELAY_MS);
}

function scheduleRecheck(delayMs) {
    if (!Correction.resolve) return;
    clearTimeout(Correction.timer);
    Correction.timer = setTimeout(() => finishCorrection('recheck'), delayMs);
}

function requestRecheck() {
    if (!Correction.resolve) return;
    if (findOpenDialog()) {
        setStatus('ℹ️ A platform dialog is still open — close it if the re-check stalls.', 'info');
    }
    finishCorrection('recheck');
}

// v8.0.2 [4]: one click. (v8.0.1 needed a second "Confirm skip" click within
// 4 s, which read as Skip not working.) Skipping changes nothing on the
// platform — the report simply stays unapproved and is recorded as an error.
function requestSkip() {
    if (!Correction.resolve) return;
    finishCorrection('skip');
}

function finishCorrection(choice) {
    const resolve = Correction.resolve;
    if (!resolve) return;
    Correction.resolve = null;
    clearTimeout(Correction.timer);
    Correction.docs.forEach(doc => doc.removeEventListener('change', onCorrectionEdit, true));
    Correction.docs = [];
    AutopilotState.awaitingCorrection = false;
    if (choice === 'recheck') UI.passReason = 'Re-check after correction';
    resolve(choice);
    renderIssues();
    updateUIButton();
}

// Pauses the loop on the current report. Resolves 'recheck' | 'skip' | 'stopped'.
function awaitUserCorrection() {
    AutopilotState.awaitingCorrection = true;
    const n = ReportIssues.list.length;
    setSectionBadge(`${n} issue${n === 1 ? '' : 's'} · needs review`, 'bad');
    showPanel();
    renderIssues();
    // v8.0.3 [2]: after a re-check asked for by Go to field, go to the field.
    focusActiveIssue({ scroll: ReportIssues.moved || UI.focusAfterCheck, focusField: UI.focusAfterCheck });
    UI.focusAfterCheck = false;
    updateUIButton();

    return new Promise(resolve => {
        Correction.resolve = resolve;
        Correction.docs = getAllContexts().filter(Boolean);
        Correction.docs.forEach(doc => doc.addEventListener('change', onCorrectionEdit, true));
    });
}

// ---------------------------------------------------------------------------
//   TEST HOOKS
//
//   Exposes the pure/verifiable functions so a jsdom harness can exercise
//   them without driving the real UI. Has no effect on runtime behaviour.
// ---------------------------------------------------------------------------

window.__autopilotTestHooks = {
    CONFIG,
    VERSION,
    AutopilotState,
    ProcessingLedger,
    ReportEventIndex,
    RunErrors,
    // v8.0.3
    cardKey,
    cardKeyMap,
    duplicateTwinState,
    rejectReportAsDuplicate,
    isPlaceholderSelection,
    findEventsBlocks,
    isDepartureFinalEventName,
    findDepartureFinalEventText,
    formFingerprint,
    waitForFormSettled,
    resolveIssueElement,
    goToIssueField,
    // v8.0.2
    isReportListCard,
    getAllReportCards,
    identifyCurrentCard,
    suggestRobCorrection,
    rowConsumptionTotal,
    leafHeaderLabels,
    markSkippedCards,
    // v8.0.1
    UI,
    ReportIssues,
    ValidationPass,
    beginValidationPass,
    setReportIssues,
    clearReportIssues,
    awaitUserCorrection,
    finishCorrection,
    writeFieldValue,
    canApplyFix,
    errorWasResolved,
    unresolvedErrors,
    skipReportWithError,
    // v7.6.0 [3]
    recordError,
    flushErrorSummary,
    normaliseErrorKey,
    // v7.6.0 [1]
    isCardChecked,
    isRejectedCard,
    isCardResolved,
    isCardUnchecked,
    findNextUncheckedCard,
    goToNextUncheckedReport,
    // v7.6.0 [2]
    syncLedgerWithSidebar,
    // v7.6.0 [4]
    recoverFromHalt,
    // v7.6.0 [5]
    waitForCondition,
    getAllContexts,
    // v7.6.0 [6]
    scanInlineValidationErrors,
    isErrorWarningPhrase,
    looksLikeInlineErrorText,
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
    eventsAreSameOccurrence,
    // Loop
    validateCurrentReport,
    processOneReport,
    runAutopilot
};

injectControlPanel();

})();