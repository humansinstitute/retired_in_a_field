// Simple 90s-style 3-letter initials picker
// Character order: A-Z, 0-9, space; wraps around

(function () {
  const charSet = [
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    ...'0123456789'.split(''),
    ' '
  ];

  let chars = ['A', 'A', 'A'];
  let initialized = false;

  function render() {
    for (let i = 0; i < 3; i++) {
      const el = document.getElementById(`pickerChar${i}`);
      if (el) el.textContent = chars[i];
    }
  }

  function move(index, delta) {
    const current = chars[index];
    const pos = charSet.indexOf(current);
    const next = (pos + delta + charSet.length) % charSet.length;
    chars[index] = charSet[next];
    render();
  }

  function attachHandlers() {
    if (initialized) return;
    initialized = true;
    const picker = document.getElementById('initialsPicker');
    if (!picker) return;
    picker.addEventListener('click', (e) => {
      const col = e.target.closest('.picker-col');
      if (!col) return;
      const index = Number(col.getAttribute('data-index')) || 0;
      if (e.target.classList.contains('picker-up')) {
        move(index, +1);
      } else if (e.target.classList.contains('picker-down')) {
        move(index, -1);
      }
    });
  }

  function setFromExisting(initials) {
    if (initials && initials.length === 3) {
      chars = initials.toUpperCase().split('').map(c => (charSet.includes(c) ? c : ' '));
      render();
    }
  }

  function getInitials() {
    return chars.join('');
  }

  function initInitialsUI() {
    attachHandlers();
    // If player has initials, prefill
    try {
      if (window.getPlayer) {
        const p = window.getPlayer();
        if (p && p.initials) setFromExisting(p.initials);
      }
    } catch (_) {}
    render();
  }

  // Expose helpers
  window.InitialsUI = {
    initInitialsUI,
    getInitials,
    setFromExisting,
  };

  // Initialize when initials screen is first shown
  document.addEventListener('DOMContentLoaded', () => {
    initInitialsUI();
  });
})();

