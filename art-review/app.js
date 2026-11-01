const $ = id => document.getElementById(id);
const labels = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada', revision: 'Revisão solicitada' };
let proposals = [], history = [], current;
async function api(url, options) { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }
const events = () => history.filter(e => e.id === current.id && e.version === current.version);
function decisions() {
  const list = events(); $('status').textContent = labels[list.at(-1)?.status || 'pending']; $('history').replaceChildren();
  document.querySelectorAll('[data-proposal]').forEach(card => {
    const p = proposals.find(p => p.id === card.dataset.proposal && p.version === card.dataset.version);
    const latest = history.filter(e => e.id === p.id && e.version === p.version).at(-1);
    card.querySelector('.card-status').textContent = labels[latest?.status || 'pending'];
    card.classList.toggle('selected', p.id === current.id);
  });
  for (const e of [...list].reverse()) { const li = document.createElement('li'); li.textContent = `${new Date(e.date).toLocaleString('pt-BR')} · ${labels[e.status]}\n${e.note}`; $('history').append(li); }
}
function layout() {
  const zoom = Number($('zoom').value);
  for (const id of ['original', 'proposed']) { const img = $(id); img.style.width = `${img.naturalWidth * zoom}px`; img.style.height = `${img.naturalHeight * zoom}px`; }
  $('dimensions').textContent = `Original: ${$('original').naturalWidth} × ${$('original').naturalHeight}px · Proposta: ${$('proposed').naturalWidth} × ${$('proposed').naturalHeight}px · 1:1 = um pixel da imagem por pixel CSS`;
  const slider = $('mode').value === 'slider'; $('stage').classList.toggle('slider', slider); $('sliderControl').hidden = !slider;
  $('stage').style.width = slider ? `${Math.max($('original').naturalWidth, $('proposed').naturalWidth) * zoom}px` : '';
  $('stage').style.height = slider ? `${Math.max($('original').naturalHeight, $('proposed').naturalHeight) * zoom}px` : '';
  $('after').style.clipPath = slider ? `inset(0 ${100 - Number($('slider').value)}% 0 0)` : '';
  $('comparison').className = $('background').value;
}
function select(p) {
  current = p; $('detail').hidden = false; $('empty').hidden = true; $('name').textContent = p.name;
  $('version').replaceChildren();
  for (const item of proposals.filter(x => x.id === p.id)) { const option = document.createElement('option'); option.value = item.version; option.textContent = item.version; option.selected = item.version === p.version; $('version').append(option); }
  $('meta').textContent = `${p.category} · ${p.level} · ${p.date}`; $('description').textContent = p.description; $('report').textContent = p.report;
  $('preview').hidden = !p.preview; if (p.preview) $('preview').href = p.preview;
  $('source-path').textContent = p.sourceOriginal || p.original;
  $('original-link').href = p.original; $('original-link').textContent = p.original;
  $('proposed-link').href = p.proposed; $('proposed-link').textContent = p.proposed;
  $('comparison-link').href = p.comparison || p.proposed;
  $('note').value = ''; $('original').src = p.original; $('proposed').src = p.proposed; decisions();
}
async function save(status) {
  const buttons = [...document.querySelectorAll('.actions button')]; buttons.forEach(b => b.disabled = true);
  try { const data = await api('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: current.id, version: current.version, status, note: $('note').value }) }); history = data.history; $('note').value = ''; decisions(); $('message').textContent = 'Decisão registrada. Nenhum arquivo do jogo foi alterado.'; }
  catch (e) { $('message').textContent = e.message; } finally { buttons.forEach(b => b.disabled = false); }
}
for (const id of ['mode', 'background', 'zoom', 'slider']) $(id).addEventListener('input', layout);
for (const id of ['original', 'proposed']) { $(id).addEventListener('load', layout); $(id).addEventListener('error', () => { $('message').textContent = 'Imagem não encontrada ou formato não suportado.'; layout(); }); }
$('version').addEventListener('change', () => select(proposals.find(p => p.id === current.id && p.version === $('version').value)));
document.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => save(b.dataset.status)));
$('annotate').addEventListener('click', () => { if (!$('note').value.trim()) { $('message').textContent = 'Escreva uma observação.'; return; } save(events().at(-1)?.status || 'pending'); });
try {
  [proposals, { history }] = await Promise.all([api('/api/proposals'), api('/api/approvals')]);
  const ids = new Set();
  for (const p of proposals) {
    if (ids.has(p.id)) continue; ids.add(p.id);
    const button = document.createElement('button'); button.dataset.proposal = p.id; button.dataset.version = p.version;
    const img = document.createElement('img'); img.src = p.proposed; img.alt = '';
    const title = document.createElement('strong'); title.textContent = p.name;
    const meta = document.createElement('small'); meta.textContent = `${p.category} · ${p.level} · ${p.date} · ${proposals.filter(x => x.id === p.id).length} versão(ões)`;
    const status = document.createElement('small'); status.className = 'card-status';
    button.append(img, title, meta, status); button.addEventListener('click', () => select(p)); $('gallery').append(button);
  }
  if (proposals.length) select(proposals[0]); else $('empty').textContent = 'Nenhuma proposta. Crie art-review/proposals.json conforme o README.';
} catch (e) { $('empty').textContent = e.message; }
