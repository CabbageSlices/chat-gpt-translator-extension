document.getElementById('options-form').addEventListener('submit', saveOptions);

function saveOptions(e) {
  e.preventDefault();
  const apiKey = document.getElementById('api-key-input').value;
  chrome.storage.sync.set({ apiKey }, () => {
    console.log('API Key saved.');
  });
}

function restoreOptions() {
  chrome.storage.sync.get('apiKey', (data) => {
    document.getElementById('api-key-input').value = data.apiKey || '';
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
