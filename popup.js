const statusEl = document.getElementById('status');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');

const setStatus = (text, running = false) => {
  statusEl.textContent = text;
  statusEl.classList.toggle('running', running);
  startBtn.disabled = running;
  stopBtn.disabled = !running;
};

const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const sendMessageToActiveTab = async (message) => {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('No active tab.');
  return chrome.tabs.sendMessage(tab.id, message);
};

const refreshStatus = async () => {
  try {
    const response = await sendMessageToActiveTab({ type: 'li-auto-liker-status' });
    if (response?.status === 'running') {
      setStatus('Running', true);
    } else {
      setStatus('Idle');
    }
  } catch (err) {
    console.warn('Status check failed', err);
    setStatus('LinkedIn tab not ready');
  }
};

startBtn.addEventListener('click', async () => {
  try {
    await sendMessageToActiveTab({ type: 'li-auto-liker-start' });
    setStatus('Starting…', true);
  } catch (err) {
    setStatus('LinkedIn tab not ready');
    console.error(err);
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    await sendMessageToActiveTab({ type: 'li-auto-liker-stop' });
    setStatus('Stopping…');
  } catch (err) {
    setStatus('LinkedIn tab not ready');
    console.error(err);
  }
});

refreshStatus();
