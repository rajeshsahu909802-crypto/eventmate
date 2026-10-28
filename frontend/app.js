const API_BASE = '';
const sessionId = `web-${Math.random().toString(36).slice(2, 9)}`;

async function initApp() {
  const [schedRes, spkRes, venRes, faqRes] = await Promise.all([
    fetch(`${API_BASE}/api/schedule`),
    fetch(`${API_BASE}/api/speakers`),
    fetch(`${API_BASE}/api/venues`),
    fetch(`${API_BASE}/api/faqs`),
  ]);

  const sched = await schedRes.json();
  const spk = await spkRes.json();
  const ven = await venRes.json();
  const faq = await faqRes.json();

  document.getElementById('schedule-list').innerHTML = sched.sessions
    .map(
      (s) =>
        `<div style="padding:0.75rem 0;border-bottom:1px solid #e2e8f0"><strong>${s.title}</strong><br/><small>${s.date} · ${s.start_time}–${s.end_time} IST · ${s.venue_name} · Speaker: ${s.speaker_name}</small></div>`
    )
    .join('');

  document.getElementById('speakers-list').innerHTML = spk.speakers
    .map(
      (item) =>
        `<div style="padding:0.75rem 0;border-bottom:1px solid #e2e8f0"><strong>${item.name}</strong> — ${item.title}<br/><small>${item.biography}</small></div>`
    )
    .join('');

  document.getElementById('venues-list').innerHTML = ven.venues
    .map(
      (v) =>
        `<div style="padding:0.75rem 0;border-bottom:1px solid #e2e8f0"><strong>${v.name}</strong> (${v.building}, ${v.floor}, ${v.room})<br/><small>${v.directions}</small></div>`
    )
    .join('');

  document.getElementById('faqs-list').innerHTML = faq.faqs
    .map(
      (f) =>
        `<div style="padding:0.75rem 0;border-bottom:1px solid #e2e8f0"><strong>[${f.category}] ${f.question}</strong><br/><small>${f.answer}</small></div>`
    )
    .join('');
}

async function sendQuestion(message) {
  const chatBox = document.getElementById('chat-messages');
  chatBox.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  const data = await res.json();
  chatBox.innerHTML += `<p style="margin-top:0.5rem"><strong>EventMate:</strong> ${data.answer || data.error}</p><hr style="margin:0.75rem 0;border:none;border-top:1px solid #e2e8f0"/>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('chat-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  if (input.value.trim()) {
    sendQuestion(input.value.trim());
    input.value = '';
  }
});

initApp();
