const STORAGE_KEY = 'locallift_crm_v2_data';
const STATUSES = ['Lead','Contacted','Demo Sent','Interested','Closed','Active'];
const ADDON_PRICING = {
  seo_boost: {label:'SEO Boost', price:79},
  review_management: {label:'Review Management', price:49},
  ai_chat: {label:'AI Chat Widget', price:59},
  monthly_content: {label:'Monthly Content', price:99},
};

const pipelineEl = document.getElementById('pipeline');
const metricsEl = document.getElementById('metrics');
const addBtn = document.getElementById('addClientBtn');
const clientDialog = document.getElementById('clientDialog');
const clientForm = document.getElementById('clientForm');
const detailDialog = document.getElementById('detailDialog');
const detailContent = document.getElementById('detailContent');

const filters = {
  status: document.getElementById('filterStatus'),
  category: document.getElementById('filterCategory'),
  location: document.getElementById('filterLocation'),
  search: document.getElementById('filterSearch'),
};

let clients = [];

const money = n => Number(n || 0).toLocaleString(undefined, {maximumFractionDigits:2});
const todayTs = () => new Date().toISOString().slice(0,16).replace('T',' ');
const addonTotal = (addOns=[]) => addOns.reduce((s,k)=>s+(ADDON_PRICING[k]?.price||0),0);

async function seed() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) return JSON.parse(local);

  const res = await fetch('data.json');
  const raw = await res.json();
  const normalized = raw.map(r => {
    const addOns = Array.isArray(r.addOns) ? r.addOns : [];
    const basePrice = Number(r.basePrice ?? r.monthlySpend ?? r.monthlyRevenue ?? 0);
    return {
      id: crypto.randomUUID(),
      name: r.name || '',
      category: r.category || '',
      location: r.location || '',
      website: r.website || '',
      websiteStatus: r.websiteStatus || '',
      contactName: r.contactName || '',
      email: r.email || '',
      phone: r.phone || '',
      pipelineStatus: STATUSES.includes(r.pipelineStatus) ? r.pipelineStatus : 'Lead',
      siteBuildStatus: r.siteBuildStatus || 'Not Started',
      packageSelected: r.packageSelected || 'Core',
      basePrice,
      addOns,
      monthlySpend: Number(r.monthlySpend ?? (basePrice + addonTotal(addOns))),
      siteUrl: r.siteUrl || r.website || '',
      launchDate: r.launchDate || r.revenueStartDate || '',
      notes: r.notes || '',
      activityLog: Array.isArray(r.activityLog) ? r.activityLog : [`${todayTs()} — Imported from LocalLift prospect list`]
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); }

function applyFilters(items) {
  const fStatus = filters.status.value;
  const fCat = filters.category.value;
  const fLoc = filters.location.value;
  const q = filters.search.value.trim().toLowerCase();
  return items.filter(c => {
    const hitStatus = !fStatus || c.pipelineStatus === fStatus;
    const hitCat = !fCat || c.category === fCat;
    const hitLoc = !fLoc || c.location === fLoc;
    const blob = `${c.name} ${c.website} ${c.notes} ${c.websiteStatus}`.toLowerCase();
    const hitQ = !q || blob.includes(q);
    return hitStatus && hitCat && hitLoc && hitQ;
  });
}

function renderMetrics(items) {
  const active = items.filter(c => c.pipelineStatus === 'Active');
  const mrr = active.reduce((s,c)=>s+Number(c.monthlySpend||0),0);
  const avg = active.length ? mrr / active.length : 0;
  const values = [
    ['Total Clients', items.length],
    ['Active Clients', active.length],
    ['Total MRR', `$${money(mrr)}`],
    ['Average Spend', `$${money(avg)}`],
  ];
  metricsEl.innerHTML = values.map(([k,v]) => `<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
}

function renderFilters(items) {
  const unique = arr => [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const patchOptions = (el, list) => {
    const current = el.value;
    el.innerHTML = '<option value="">All</option>' + list.map(v => `<option>${v}</option>`).join('');
    if (list.includes(current)) el.value = current;
  };
  patchOptions(filters.status, STATUSES);
  patchOptions(filters.category, unique(items.map(c=>c.category)));
  patchOptions(filters.location, unique(items.map(c=>c.location)));
}

function addOnLabels(addOns=[]){
  return addOns.map(k=>ADDON_PRICING[k]?.label).filter(Boolean).join(', ') || 'None';
}

function clientCard(c) {
  return `<article class="client" data-id="${c.id}">
    <h4>${c.name}</h4>
    <div class="meta">${c.category} • ${c.location}</div>
    <div class="meta">Build: ${c.siteBuildStatus}</div>
    <div class="chips">
      <span class="chip">${c.packageSelected}</span>
      <span class="chip">$${money(c.monthlySpend)}/mo</span>
    </div>
    <div class="meta">Add-ons: ${addOnLabels(c.addOns)}</div>
    <div class="actions">
      <button data-action="prev">◀</button>
      <button data-action="next">▶</button>
      <button data-action="detail">Details</button>
      <button data-action="delete">Delete</button>
    </div>
  </article>`;
}

function renderPipeline(items) {
  pipelineEl.innerHTML = STATUSES.map(s => {
    const colItems = items.filter(c => c.pipelineStatus === s);
    return `<section class="col"><h3>${s} <span>${colItems.length}</span></h3><div class="stack">${colItems.map(clientCard).join('')}</div></section>`;
  }).join('');
}

function render() {
  const filtered = applyFilters(clients);
  renderMetrics(filtered);
  renderFilters(clients);
  renderPipeline(filtered);
}

function openDetail(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  const addOnBreakdown = (c.addOns||[]).map(k=>`<li>${ADDON_PRICING[k]?.label||k}: $${money(ADDON_PRICING[k]?.price||0)}</li>`).join('');
  detailContent.innerHTML = `
    <h3>${c.name}</h3>
    <div class="detail-grid">
      <div class="panel">
        <h4>Client Detail</h4>
        <div class="kv">
          <strong>Business</strong><span>${c.name}</span>
          <strong>Category</strong><span>${c.category}</span>
          <strong>Location</strong><span>${c.location}</span>
          <strong>Website Status</strong><span>${c.websiteStatus || ''}</span>
          <strong>Package</strong><span>${c.packageSelected}</span>
          <strong>Base Price</strong><span>$${money(c.basePrice)}</span>
          <strong>Add-ons</strong><span>${addOnLabels(c.addOns)}</span>
          <strong>Monthly Spend</strong><span>$${money(c.monthlySpend)}</span>
          <strong>Site URL</strong><span>${c.siteUrl || c.website || ''}</span>
          <strong>Launch Date</strong><span>${c.launchDate || ''}</span>
          <strong>Contact</strong><span>${c.contactName || ''} ${c.email ? '• '+c.email : ''} ${c.phone ? '• '+c.phone : ''}</span>
          <strong>Pipeline</strong><span>${c.pipelineStatus}</span>
          <strong>Build Status</strong><span>${c.siteBuildStatus}</span>
        </div>
        <h4 style="margin-top:10px">Pricing Breakdown</h4>
        <ul class="log"><li>Base: $${money(c.basePrice)}</li>${addOnBreakdown}</ul>
      </div>
      <div class="panel">
        <h4>Activity Log</h4>
        <ul class="log">${(c.activityLog||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
        <form id="activityForm">
          <input id="activityInput" placeholder="Add activity note..." required />
          <button class="btn-primary" type="submit">Add Log</button>
        </form>
      </div>
    </div>
  `;

  detailContent.querySelector('#activityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = detailContent.querySelector('#activityInput');
    const note = input.value.trim();
    if (!note) return;
    c.activityLog = c.activityLog || [];
    c.activityLog.unshift(`${todayTs()} — ${note}`);
    save();
    openDetail(id);
    render();
  });
  detailDialog.showModal();
}

function moveStatus(id, dir) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  const i = STATUSES.indexOf(c.pipelineStatus);
  const next = i + dir;
  if (next < 0 || next >= STATUSES.length) return;
  c.pipelineStatus = STATUSES[next];
  (c.activityLog ||= []).unshift(`${todayTs()} — Moved to ${c.pipelineStatus}`);
  save(); render();
}

pipelineEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const card = e.target.closest('.client');
  if (!card) return;
  const id = card.dataset.id;
  const action = btn.dataset.action;
  if (action === 'prev') moveStatus(id, -1);
  if (action === 'next') moveStatus(id, +1);
  if (action === 'detail') openDetail(id);
  if (action === 'delete') { clients = clients.filter(c => c.id !== id); save(); render(); }
});

addBtn.addEventListener('click', () => clientDialog.showModal());
clientForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(clientForm);
  const addOns = fd.getAll('addOns');
  const basePrice = Number(fd.get('basePrice') || 0);
  const c = {
    id: crypto.randomUUID(),
    name: fd.get('name') || '',
    category: fd.get('category') || '',
    location: fd.get('location') || '',
    website: fd.get('website') || '',
    websiteStatus: fd.get('websiteStatus') || '',
    contactName: fd.get('contactName') || '',
    email: fd.get('email') || '',
    phone: fd.get('phone') || '',
    pipelineStatus: fd.get('pipelineStatus') || 'Lead',
    siteBuildStatus: fd.get('siteBuildStatus') || 'Not Started',
    packageSelected: fd.get('packageSelected') || 'Core',
    basePrice,
    addOns,
    monthlySpend: basePrice + addonTotal(addOns),
    siteUrl: fd.get('siteUrl') || fd.get('website') || '',
    launchDate: fd.get('launchDate') || '',
    notes: fd.get('notes') || '',
    activityLog: [`${todayTs()} — Client created`]
  };
  clients.unshift(c);
  save(); render(); clientForm.reset(); clientDialog.close();
});

Object.values(filters).forEach(el => el.addEventListener('input', render));

detailDialog.addEventListener('click', (e) => {
  const rect = detailDialog.getBoundingClientRect();
  const inDialog = rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
  if (!inDialog) detailDialog.close();
});

(async function init(){
  clients = await seed();
  clients.forEach(c => {
    if (c.pipelineStatus === 'Active Client') c.pipelineStatus = 'Active';
    c.basePrice = Number(c.basePrice ?? c.monthlySpend ?? 0);
    c.addOns = Array.isArray(c.addOns) ? c.addOns : [];
    c.monthlySpend = Number(c.monthlySpend ?? (c.basePrice + addonTotal(c.addOns)));
  });
  save(); render();
})();
