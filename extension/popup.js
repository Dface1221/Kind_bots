document.addEventListener('DOMContentLoaded', async () => {
  const tabsList = document.getElementById('tabsList');
  const importBtn = document.getElementById('importBtn');
  const statusDiv = document.getElementById('status');
  
  // Get all open tabs in current window
  let tabs = [];
  try {
    tabs = await browser.tabs.query({ currentWindow: true });
  } catch (e) {
    // Fallback for non-Firefox browsers or if browser namespace isn't available
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      tabs = await new Promise(resolve => chrome.tabs.query({ currentWindow: true }, resolve));
    }
  }

  // Filter out internal/unsupported tabs
  const validTabs = tabs.filter(t => {
    if (!t.url) return false;
    if (t.url.startsWith('about:')) return false;
    if (t.url.startsWith('moz-extension:')) return false;
    if (t.url.startsWith('chrome:')) return false;
    if (t.url.startsWith('chrome-extension:')) return false;
    if (t.url.startsWith('file:')) return false;
    return true;
  });

  if (validTabs.length === 0) {
    tabsList.innerHTML = '<div style="padding: 12px; text-align: center; color: #6b7280; font-size: 0.9rem;">No supported tabs found.</div>';
    importBtn.disabled = true;
    return;
  }

  validTabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = 'tab-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `tab-${tab.id}`;
    checkbox.value = tab.url;
    // Auto-check active tab
    if (tab.active) checkbox.checked = true;

    const label = document.createElement('label');
    label.htmlFor = `tab-${tab.id}`;
    label.textContent = tab.title || tab.url;
    label.title = tab.url;

    item.appendChild(checkbox);
    item.appendChild(label);
    tabsList.appendChild(item);
  });

  importBtn.addEventListener('click', async () => {
    const selectedUrls = Array.from(document.querySelectorAll('.tab-item input[type="checkbox"]:checked'))
      .map(cb => cb.value);

    if (selectedUrls.length === 0) {
      statusDiv.textContent = 'Please select at least one tab.';
      statusDiv.className = 'error';
      return;
    }

    importBtn.disabled = true;
    statusDiv.textContent = 'Sending to local backend...';
    statusDiv.className = '';

    try {
      const response = await fetch('http://127.0.0.1:8000/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls: selectedUrls })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const results = await response.json();
      
      const successCount = results.filter(r => r.status === 'success').length;
      if (successCount === selectedUrls.length) {
        statusDiv.textContent = `Successfully imported ${successCount} article(s).`;
        statusDiv.className = 'success';
      } else if (successCount > 0) {
        statusDiv.textContent = `Imported ${successCount}/${selectedUrls.length} article(s). Check frontend for errors.`;
        statusDiv.className = 'error';
      } else {
        statusDiv.textContent = 'Failed to import any articles. Ensure URLs are valid.';
        statusDiv.className = 'error';
      }
    } catch (err) {
      console.error(err);
      statusDiv.textContent = 'Connection error. Is Tabs to Trails backend running?';
      statusDiv.className = 'error';
    } finally {
      importBtn.disabled = false;
    }
  });
});
