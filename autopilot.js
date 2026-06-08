// =========================================================================
//   MARITIME REPORT AUTOPILOT — v5.5 (Unified Validation Engine)
//   Fixes & Upgrades applied:
//     [FIX-1 to 7] Maintained core timeline engine stability fixes.
//     [FIX-8] Connected bridge between DOM scrapers and compliance matrix.
//     [UPGRADE - v5.2] OVERRIDE INTERCEPTOR: Automatically clears 0-distance
//             warning modals inside an In Port report context.
//     [UPGRADE - v5.3] DUPLICATE CHECKER: Validates report uniqueness
//             by verifying date/timestamps against the next pending report.
//     [FIX - v5.4] CRITICAL ADJ STRICTNESS: Explicitly targets and extracts
//             the "ADJ" column (inputs or static text). Reports are immediately
//             rejected if any ADJ cell value is non-zero.
//     [UPGRADE - v5.5] VERBOSE AUDIT LOGS: Added explicit, descriptive on-screen
//             success confirmations for each step to make approvals fully transparent.
// =========================================================================

const CONFIG = {
    REQUIRE_BUNKER_DATA: true,
    STEAMING_HOURS_MIN: 16,
    STEAMING_HOURS_MAX: 26,
    ADJ_TOLERANCE: 0.01,
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
        'LOAD - DISCH - IDLE',
        'SHIFT FROM LAST BERTH TO SEA',
        'DRIFTING OR REDUCTION FOR SAFETY REASON',
        'CANAL/STRAIT TRANSIT',
        'DRY DOCK / SHIPYARD PERIOD',
        'SEA TRIALS'
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

function addValidationComment(commentText) {
    const commentField = queryAllContexts('textarea, input[type="text"]').find(el => {
        const id = (el.id || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        const ph = (el.getAttribute('placeholder') || '').toLowerCase();
        return id.includes('comment') || id.includes('remark') || id.includes('reason') || 
               name.includes('comment') || name.includes('remark') || 
               ph.includes('comment') || ph.includes('remark');
    });

    if (commentField) {
        commentField.value = commentText;
        commentField.dispatchEvent(new Event('input', { bubbles: true }));
        commentField.dispatchEvent(new Event('change', { bubbles: true }));
        commentField.style.cssText = 'border: 2px solid #ff9800 !important; background-color: #fff3e0 !important;';
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
//   DUPLICATE TIMELINE SCANNER
// ---------------------------------------------------------------------------

function extractTimestampSignature(text) {
    const lines = text.split('\n');
    for (const line of lines) {
        if (/\d{2}:\d{2}/.test(line)) {
            return line.trim();
        }
    }
    return null;
}

function checkIsDuplicateReport() {
    const sidebarCards = queryAllContexts('.card, div[class*="card"], .report-item').filter(card => {
        const text = card.innerText || '';
        return text.includes('Report') || text.includes('Notice') || text.includes('Noon') || text.includes('Arrival');
    });

    if (sidebarCards.length < 2) return false;

    let currentCard = null;
    let nextCard = null;

    for (let i = 0; i < sidebarCards.length; i++) {
        const card = sidebarCards[i];
        const isCurrent = card.classList.contains('active') || 
                          card.classList.contains('p-highlight') || 
                          card.classList.contains('selected') ||
                          !(card.style.backgroundColor === 'rgb(255, 255, 255)' || 
                            card.style.backgroundColor === 'transparent' || 
                            window.getComputedStyle(card).backgroundColor === 'rgb(255, 255, 255)' ||
                            window.getComputedStyle(card).backgroundColor === 'rgba(0, 0, 0, 0)');
        
        if (isCurrent && !currentCard) {
            currentCard = card;
            if (i + 1 < sidebarCards.length) {
                nextCard = sidebarCards[i + 1];
            }
            break;
        }
    }

    if (!currentCard) {
        currentCard = sidebarCards[0];
        nextCard = sidebarCards[1];
    }

    if (!currentCard || !nextCard) return false;

    const currentTS = extractTimestampSignature(currentCard.innerText || '');
    const nextTS = extractTimestampSignature(nextCard.innerText || '');

    return (currentTS && nextTS && currentTS === nextTS);
}

function extractReportContext() {
    let reportType = "In Port Report";
    
    const subHeaders = queryAllContexts('.p-panel-header, h1, h2, h3, .report-title');
    for (const sh of subHeaders) {
        const txt = (sh.innerText || '').toUpperCase();
        if (txt.includes('NOON') || txt.includes('AT SEA')) {
            reportType = "At Sea NOON Report";
            break;
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
    for (const ctx of getAllContexts()) {
        if (!ctx) continue;
        const fieldsets = ctx.querySelectorAll('fieldset');
        for (const fs of fieldsets) {
            const legend = fs.querySelector('legend');
            if (legend) {
                const legendText = legend.innerText.trim().toUpperCase();
                if (legendText === 'BUNKER ROB') return fs;
            }
        }
    }

    const badges = queryAllContexts(
        '.p-panel-header, .p-component-header, legend, .bunker-header'
    );
    for (const badge of badges) {
        const text = (badge.innerText || '').toUpperCase();
        if (text === 'BUNKER ROB' || text === 'BUNKER') {
            let current = badge.parentElement;
            while (current && current !== current.ownerDocument.body) {
                if (
                    current.tagName === 'FIELDSET' ||
                    current.classList.contains('p-component') ||
                    current.classList.contains('card')
                ) {
                    return current;
                }
                current = current.parentElement;
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
        return inputs.length >= 2;
    });
}

// ---------------------------------------------------------------------------
//   CORE VALIDATION RUNNER WITH VERBOSE AUDITING
// ---------------------------------------------------------------------------

async function validateCurrentReport() {
    clearStatus();
    setStatus('Initiating Smart Sandbox Scan (v5.5)...', 'info');
    await sleep(CONFIG.SLEEP_INIT_MS);

    let isValid = true;
    const errors = [];

    // 1. DUPLICATE TIMESTAMP SCAN
    setStatus('Scanning timeline matrix for concurrent duplicates...', 'info');
    if (checkIsDuplicateReport()) {
        const commentLogged = addValidationComment('Duplicate Report');
        const commentResult = commentLogged ? 'Commented: "Duplicate Report".' : 'Warning: Comment field unreachable.';
        setStatus(`🛑 LOCKOUT: Exact timeline duplicate matched with next report. ${commentResult} Halted.`, 'error');
        return false;
    } else {
        setStatus('✅ Duplicate Scan: No concurrent timeline duplicates detected.', 'success');
    }

    // 2. PORT EVENTS BLOCK CHECK
    setStatus('Analyzing active operational event parameters...', 'info');
    const eventCheck = validatePortEvents();

    if (eventCheck.status === 'INVALID') {
        isValid = false;
        setStatus(`🛑 LOCKOUT: Unapproved event scenario detected [${eventCheck.event}]. Halted.', 'error`);
        return false;
    } else if (eventCheck.status === 'VALID_PORT') {
        setStatus('✅ Operational Scenario: Approved Port Event layout and sequence rules confirmed.', 'success');
    } else {
        setStatus("✅ Operational Scenario: Approved At Sea state profile confirmed.", 'success');
    }

    // 3. STEAMING HOURS VALIDATION
    const steamingHoursInput = findSteamingHoursInput();
    if (steamingHoursInput && steamingHoursInput.value.trim() !== '') {
        const hours = parseFloat(steamingHoursInput.value);
        if (
            isNaN(hours) ||
            hours < CONFIG.STEAMING_HOURS_MIN ||
            hours > CONFIG.STEAMING_HOURS_MAX
        ) {
            errors.push(`Steaming hours (${hours}) outside bounds.`);
            steamingHoursInput.style.border = '3px solid #f44336';
            isValid = false;
            setStatus(`❌ Steaming hrs failed bounds check: ${hours}`, 'error');
        } else {
            steamingHoursInput.style.border = '1px solid green';
            setStatus(`✅ Steaming Hours Matrix: Value (${hours} hrs) falls perfectly within safe parameters.`, 'success');
        }
    } else {
        setStatus('ℹ️ Steaming Hours: Field unpopulated or not applicable to this report layout index.', 'info');
    }

    // 4. BUNKER ROB & STICKY ADJ ZERO-VERIFICATION
    setStatus('Targeting isolated Bunker ROB grid for values and ADJ fields...', 'info');
    const bunkerRows = locateBunkerRows();

    if (bunkerRows.length > 0) {
        let validationFailTriggered = false;

        bunkerRows.forEach((row, index) => {
            const cells = Array.from(row.querySelectorAll('td'));
            let fuelTypeLabel = (cells[0] && cells[0].innerText.trim().split('\n')[0]) || `Line ${index + 1}`;

            let lastRobInput = null;
            let robStartInput = null;
            let adjInput = null;
            let adjStaticVal = 0;
            let hasAdjColumn = false;
            let adjElementToHighlight = null;

            cells.forEach(cell => {
                const titleEl = cell.querySelector('.p-column-title');
                const titleText = titleEl ? titleEl.innerText.toLowerCase().trim() : '';
                const input = cell.querySelector('input');
                
                const inputId = input ? (input.id || '').toLowerCase() : '';
                const inputName = input ? (input.name || '').toLowerCase() : '';

                if (titleText.includes('last rob') || titleText.includes('previous') || inputId.includes('lastrob') || inputName.includes('last_rob')) {
                    if (input) lastRobInput = input;
                } else if (titleText.includes('rob start') || titleText.includes('start') || inputId.includes('robstart') || inputName.includes('rob_start')) {
                    if (input) robStartInput = input;
                } 
                else if (titleText.includes('adj') || titleText.includes('adjustment') || inputId.includes('adj') || inputName.includes('adjustment')) {
                    hasAdjColumn = true;
                    if (input) {
                        adjInput = input;
                        adjElementToHighlight = input;
                    } else {
                        const cellCleanText = cell.innerText.replace(titleEl ? titleEl.innerText : '', '').trim();
                        adjStaticVal = parseFloat(cellCleanText.replace(/,/g, '')) || 0;
                        adjElementToHighlight = cell;
                    }
                }
            });

            if (!lastRobInput || !robStartInput) {
                const rowInputs = cells.map(c => c.querySelector('input')).filter(inp => inp && inp.type !== 'hidden' && !inp.disabled);
                if (rowInputs.length >= 2) {
                    lastRobInput = rowInputs[0];
                    robStartInput = rowInputs[1];
                }
            }

            // CRITICAL ADJ STRICT ENFORCEMENT
            let finalAdjValue = 0;
            if (adjInput) {
                finalAdjValue = parseFloat(adjInput.value.replace(/,/g, '').trim()) || 0;
            } else if (hasAdjColumn) {
                finalAdjValue = adjStaticVal;
            }

            if (finalAdjValue !== 0) {
                errors.push(`[${fuelTypeLabel}] ADJ value must be exactly 0 (Current: ${finalAdjValue})`);
                if (adjElementToHighlight) {
                    adjElementToHighlight.style.cssText = 'border: 3px solid red !important; background-color: #ffebee !important;';
                }
                isValid = false;
                validationFailTriggered = true;
                setStatus(`❌ ADJ Error [${fuelTypeLabel}]: Field is non-zero (${finalAdjValue}). Report Rejected.`, 'error');
            } else if (adjInput) {
                adjInput.style.cssText = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
            }

            // Validate implicit layout consistency
            if (lastRobInput && robStartInput) {
                const lastRobVal  = parseFloat(lastRobInput.value.replace(/,/g, '').trim());
                const robStartVal = parseFloat(robStartInput.value.replace(/,/g, '').trim());

                const safeLast  = isNaN(lastRobVal)  ? 0 : lastRobVal;
                const safeStart = isNaN(robStartVal) ? 0 : robStartVal;

                if (lastRobInput.value.trim() !== '' || robStartInput.value.trim() !== '') {
                    if (Math.abs(safeLast - safeStart) > CONFIG.ADJ_TOLERANCE) {
                        errors.push(`[${fuelTypeLabel}] Mismatch: Last (${safeLast}) != Start (${safeStart})`);
                        lastRobInput.style.cssText = 'border: 3px solid red !important; background-color: #ffebee !important;';
                        robStartInput.style.cssText = 'border: 3px solid red !important; background-color: #ffebee !important;';
                        isValid = false;
                        validationFailTriggered = true;
                        setStatus(`❌ ROB Mismatch [${fuelTypeLabel}]: Last (${safeLast}) ≠ Start (${safeStart})`, 'error');
                    } else {
                        lastRobInput.style.cssText = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
                        robStartInput.style.cssText = 'border: 1px solid green !important; background-color: #e8f5e9 !important;';
                    }
                }
            }
        });

        if (!validationFailTriggered) {
            setStatus('✅ Bunker ROB Grid: Confirmed perfect data alignment inside the Bunker ROB grid (all ADJ values are exactly 0).', 'success');
        }
    }

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
    
    // --- OVERRIDE INTERCEPTOR FOR ZERO DISTANCE WARNINGS ---
    setStatus('Evaluating modal chain for trailing warnings...', 'info');
    await sleep(800);

    let combinedScreenText = '';
    getAllContexts().forEach(ctx => {
        if (ctx && ctx.body) combinedScreenText += ctx.body.innerText || '';
    });

    if (
        combinedScreenText.toLowerCase().includes('observed distance reported is 0') ||
        combinedScreenText.toLowerCase().includes('observed distance')
    ) {
        const contextData = extractReportContext();

        if (contextData.reportType === 'In Port Report') {
            setStatus('⚠️ Distance 0 warning caught in Port Context. Bypassing safely...', 'warning');
            
            let proceedBtn = queryAllContexts('button, .p-button, [role="button"]').find(el => {
                const innerT = (el.innerText || el.textContent || '').trim().toLowerCase();
                const labelT = (el.getAttribute('label') || '').toLowerCase();
                return innerT.includes('proceed anyway') || labelT.includes('proceed anyway');
            });

            if (proceedBtn) {
                proceedBtn.click();
                setStatus('✅ "Proceed Anyway" bypassed warning successfully.', 'success');
                await sleep(CONFIG.SLEEP_POST_CLICK_MS);
            } else {
                setStatus('❌ Zero distance warning detected, but "Proceed Anyway" button is unreachable.', 'error');
                return false;
            }
        } else {
            setStatus('🛑 LOCKOUT: Observed Distance is 0 warning dropped in an AT SEA report context! Halted.', 'error');
            return false;
        }
    }
    // --- END INTERCEPTOR ---

    setStatus('✅ Report successfully validated, signed off, and approved in system.', 'success');
    await sleep(CONFIG.DOM_STABLE_HEADSTART_MS);
    await waitForDOMStable();
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

    const pendingCards = sidebarCards.filter(card => {
        const bgColor = card.style.backgroundColor || window.getComputedStyle(card).backgroundColor;
        return (
            bgColor === 'rgb(255, 255, 255)' ||
            bgColor === 'rgba(0, 0, 0, 0)' ||
            bgColor === 'transparent'
        );
    });

    const nextPendingCard = pendingCards[0];

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

async function runAutopilot() {
    try {
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
    btn.innerText = '▶ Start Autopilot (v5.5)';
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
        box.innerHTML = "<div style='color:#888; margin-bottom:8px; font-weight:bold;'>🤖 SYSTEM ACTIVE LOG (v5.5):</div>";
    }
}

function updateUIButton() {
    const btn = document.getElementById('autopilot-btn');
    if (!btn) return;
    if (window.autopilotRunning) {
        btn.innerText = '⏹ STOP Autopilot';
        btn.style.backgroundColor = '#c62828';
    } else {
        btn.innerText = '▶ Start Autopilot (v5.5)';
        btn.style.backgroundColor = '#2e7d32';
    }
}

injectControlPanel();

// ===========================================================================
//   Geoforms Timeline & Events Validation Engine
//   Handles Core IMO-DCS / MRV Carbon Footprint Compliance Rules
// ===========================================================================

class GeoformsTimelineValidator {
    constructor() {
        this.PORT_EVENTS_WHITELIST = [
            'Idle in Port',
            'Shift to Anchor',
            'Shifting to Anchorage',
            'Shift to Berth',
            'Load - Disch - Idle',
            'Shift from Last Berth to Sea',
            'Drifting or Reduction for safety reason',
            'Canal/Strait Transit',
            'Dry Dock / Shipyard Period',
            'Sea Trials'
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
        if (reportContext.reportType === 'At Sea NOON Report') {
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
            const match = this.SEA_EVENTS_WHITELIST.some(e => e.toLowerCase() === row.eventType.toLowerCase());
            if (!match) {
                result.errors.push(`Row [${row.eventType}] is unauthorized inside an 'At Sea' report context.`);
            }
        } else {
            const match = this.PORT_EVENTS_WHITELIST.some(e => e.toLowerCase() === row.eventType.toLowerCase());
            if (!match) {
                result.errors.push(`Row [${row.eventType}] is unauthorized inside an 'In Port' or 'Arrival/Departure' context.`);
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
        if (reportContext.reportType === 'At Sea NOON Report') {
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