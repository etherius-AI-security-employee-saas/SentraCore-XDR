const autoScanToggle = document.getElementById("autoScanToggle");
const localAiToggle = document.getElementById("localAiToggle");
const onboardedToggle = document.getElementById("onboardedToggle");
const modeSelect = document.getElementById("modeSelect");
const saveModeButton = document.getElementById("saveModeButton");
const saveButton = document.getElementById("saveButton");
const status = document.getElementById("status");

chrome.storage.local.get(["autoScan", "localAiEnabled", "onboarded", "protectionMode"], (data) => {
  autoScanToggle.checked = data.autoScan !== false;
  localAiToggle.checked = data.localAiEnabled !== false;
  onboardedToggle.checked = data.onboarded === true;
  modeSelect.value = data.protectionMode || "balanced";
});

saveButton?.addEventListener("click", () => {
  chrome.storage.local.set({
    autoScan: autoScanToggle.checked,
    localAiEnabled: localAiToggle.checked,
    onboarded: onboardedToggle.checked
  }, () => {
    status.textContent = "Settings saved successfully.";
    status.className = "status success";
  });
});

saveModeButton?.addEventListener("click", () => {
  chrome.storage.local.set({ protectionMode: modeSelect.value }, () => {
    status.textContent = `Protection mode saved: ${modeSelect.value}.`;
    status.className = "status success";
  });
});
