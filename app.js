// Chest Pain Story Score — simple, framework-free version
// Saves selections in localStorage so it "remembers" your last choices.

const STORAGE_KEY = "cp_story_score_v1";

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? Number(el.value) : null;
}

function setRadioValue(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

function sumOrNull(values) {
  // If any are null, we consider the score incomplete (return null)
  if (values.some(v => v === null)) return null;
  return values.reduce((a, b) => a + b, 0);
}

function interpretACS(score) {
  if (score === null) {
    return { text: "Select options to calculate.", rule: "" };
  }
  if (score <= 2) return { text: "Low ischemic likelihood", rule: "" };
  if (score <= 5) return { text: "Possible ischemia", rule: "" };
  return { text: "Probable ACS (start medical management)", rule: "≥6 = treat as ischemia until proven otherwise" };
}

function interpretOMI(score) {
  if (score === null) {
    return { text: "Select options to calculate.", rule: "" };
  }
  if (score <= 2) return { text: "Occlusion unlikely", rule: "" };
  if (score <= 5) return { text: "Possible OMI", rule: "" };
  if (score <= 8) return { text: "Probable OMI (high suspicion)", rule: "≥6 = assume ECG may be falsely negative" };
  return { text: "Presumed OMI (cath-lab mindset now)", rule: "≥9 = story alone justifies urgency" };
}

function calculate() {
  const acs = sumOrNull([
    getRadioValue("acs_quality"),
    getRadioValue("acs_radiation"),
    getRadioValue("acs_provrel"),
    getRadioValue("acs_assoc"),
    getRadioValue("acs_temporal"),
  ]);

  const omi = sumOrNull([
    getRadioValue("omi_onset"),
    getRadioValue("omi_persist"),
    getRadioValue("omi_auto"),
    getRadioValue("omi_equiv"),
    getRadioValue("omi_hemo"),
  ]);

  // Update UI
  document.getElementById("acsScore").textContent = (acs === null) ? "—" : String(acs);
  const acsInterp = interpretACS(acs);
  document.getElementById("acsInterp").textContent = acsInterp.text;
  document.getElementById("acsRule").textContent = acsInterp.rule;

  document.getElementById("omiScore").textContent = (omi === null) ? "—" : String(omi);
  const omiInterp = interpretOMI(omi);
  document.getElementById("omiInterp").textContent = omiInterp.text;
  document.getElementById("omiRule").textContent = omiInterp.rule;

  // Persist state
  saveState();
}

function getAllRadioNames() {
  const inputs = Array.from(document.querySelectorAll('input[type="radio"]'));
  return Array.from(new Set(inputs.map(i => i.name)));
}

function saveState() {
  const names = getAllRadioNames();
  const state = {};
  for (const name of names) {
    const v = getRadioValue(name);
    if (v !== null) state[name] = v;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    for (const [name, value] of Object.entries(state)) {
      setRadioValue(name, value);
    }
  } catch {
    // ignore
  }
}

function resetAll() {
  const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
  radios.forEach(r => (r.checked = false));
  localStorage.removeItem(STORAGE_KEY);
  calculate();
}

function buildSummaryText() {
  const acs = sumOrNull([
    getRadioValue("acs_quality"),
    getRadioValue("acs_radiation"),
    getRadioValue("acs_provrel"),
    getRadioValue("acs_assoc"),
    getRadioValue("acs_temporal"),
  ]);

  const omi = sumOrNull([
    getRadioValue("omi_onset"),
    getRadioValue("omi_persist"),
    getRadioValue("omi_auto"),
    getRadioValue("omi_equiv"),
    getRadioValue("omi_hemo"),
  ]);

  const a = interpretACS(acs);
  const o = interpretOMI(omi);

  return [
    "Chest Pain Story Score",
    `ACS: ${acs === null ? "—" : acs}/10 — ${a.text}${a.rule ? ` (${a.rule})` : ""}`,
    `OMI: ${omi === null ? "—" : omi}/12 — ${o.text}${o.rule ? ` (${o.rule})` : ""}`,
    "Heuristic: ACS hurts with demand. OMI hurts because blood flow is gone — and it does not stop.",
  ].join("\n");
}

async function copySummary() {
  const text = buildSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied summary to clipboard.");
  } catch {
    alert("Could not copy automatically. You can select and copy manually:\n\n" + text);
  }
}

function wireUp() {
  document.addEventListener("change", (e) => {
    if (e.target && e.target.matches('input[type="radio"]')) {
      calculate();
    }
  });

  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.getElementById("copyBtn").addEventListener("click", copySummary);

  loadState();
  calculate();
}

wireUp();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
