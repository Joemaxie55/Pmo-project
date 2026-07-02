const empty = { projects: [], raid: [], milestones: [], budget: [], resources: [], docs: {} };
let state = JSON.parse(localStorage.getItem('pmoApp') || JSON.stringify(empty));
let editing = null;
const money = n => '£' + Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 });
const save = () => { localStorage.setItem('pmoApp', JSON.stringify(state)); renderAll(); };
const projectName = id => (state.projects.find(p => String(p.id) === String(id)) || {}).name || '';

function addForm(formId, collection, mapper) {
  document.getElementById(formId).addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const mapped = mapper(data);
    if (editing && editing.collection === collection) {
      state[collection] = state[collection].map(x => x.id === editing.id ? { ...x, ...mapped } : x);
      editing = null;
      e.target.querySelector('button').textContent = e.target.dataset.addText || 'Add';
    } else {
      state[collection].push({ id: Date.now(), ...mapped });
    }
    e.target.reset(); save();
  });
}

addForm('projectForm', 'projects', d => d);
addForm('raidForm', 'raid', d => d);
addForm('milestoneForm', 'milestones', d => d);
addForm('budgetForm', 'budget', d => d);
addForm('resourceForm', 'resources', d => ({ ...d, weeklyCost: Number(d.hours || 0) * Number(d.rate || 0), monthlyCost: Number(d.hours || 0) * Number(d.rate || 0) * 4.33 }));

document.querySelectorAll('form').forEach(f => f.dataset.addText = f.querySelector('button').textContent);
document.querySelectorAll('.nav').forEach(btn => btn.onclick = () => { document.querySelectorAll('.nav,.view').forEach(x => x.classList.remove('active')); btn.classList.add('active'); document.getElementById(btn.dataset.view).classList.add('active'); pageTitle.textContent = btn.textContent; });
resetBtn.onclick = () => { if (confirm('Reset all local data?')) { state = structuredClone(empty); save(); } };
seedBtn.onclick = () => { state = { projects:[{id:1,name:'Digital Case Management',sponsor:'Sponsor Name',manager:'Project Manager',rag:'Amber',start:'2026-07-01',end:'2026-12-31'}], raid:[{id:2,project:'1',type:'Risk',description:'Resource capacity may impact milestone delivery.',owner:'PM',rag:'Amber',status:'Open'}], milestones:[{id:3,project:'1',name:'PID approved',due:'2026-07-31',rag:'Amber',status:'In Progress'}], budget:[{id:4,project:'1',month:'2026-07',budget:50000,actual:21000,forecast:48000}], resources:[{id:5,project:'1',name:'Business Analyst',role:'BA',start:'2026-07-01',end:'2026-09-30',allocation:50,hours:18.75,rate:65,costCentre:'PMO',weeklyCost:1218.75,monthlyCost:5277.19}], docs:{'1_PID':'Purpose, scope, governance, roles, milestones, RAID summary and approval route.'} }; save(); };

function options() { return state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join(''); }
function escapeHtml(v){return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function rag(v){return `<strong class="rag-${escapeHtml(v)}">${escapeHtml(v)}</strong>`;}
function table(rows, cols, collection) {
  if (!rows.length) return '<p class="card">No records yet.</p>';
  return `<table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${c[2] ? c[2](r[c[1]], r) : escapeHtml(r[c[1]])}</td>`).join('')}<td class="rowactions"><button class="smallbtn edit" onclick="editItem('${collection}',${r.id})">Edit</button><button class="smallbtn delete" onclick="removeItem('${collection}',${r.id})">Delete</button></td></tr>`).join('')}</tbody></table>`;
}
function removeItem(collection, id) { state[collection] = state[collection].filter(x => x.id !== id); save(); }
function editItem(collection, id) {
  const item = state[collection].find(x => x.id === id); if (!item) return;
  editing = { collection, id };
  const form = document.getElementById(collection === 'projects' ? 'projectForm' : collection.slice(0, -1) + 'Form');
  Object.keys(item).forEach(k => { if (form.elements[k]) form.elements[k].value = item[k]; });
  form.querySelector('button').textContent = 'Save Changes';
  document.querySelector(`.nav[data-view="${collection === 'projects' ? 'projects' : collection}"]`)?.click();
  form.scrollIntoView({ behavior: 'smooth' });
}
function renderAll() {
  document.querySelectorAll('select[name="project"],#docProject').forEach(s => s.innerHTML = options());
  const totalBudget = state.budget.reduce((a,b)=>a+Number(b.budget||0),0), actual = state.budget.reduce((a,b)=>a+Number(b.actual||0),0), res = state.resources.reduce((a,b)=>a+Number(b.monthlyCost||0),0);
  const rags = state.projects.map(p=>p.rag); const overall = rags.includes('Red')?'Red':rags.includes('Amber')?'Amber':rags.includes('Blue')?'Blue':'Green';
  kpiProjects.textContent = state.projects.length; kpiRag.textContent = overall; kpiRag.className = 'rag-' + overall; kpiBudget.textContent = money(totalBudget); kpiActual.textContent = money(actual); kpiResources.textContent = money(res); kpiRaid.textContent = state.raid.filter(r=>r.status!=='Closed').length;
  projectTable.innerHTML = table(state.projects, [['Name','name'],['Sponsor','sponsor'],['PM','manager'],['RAG','rag',rag],['Start','start'],['End','end']], 'projects');
  raidTable.innerHTML = table(state.raid, [['Project','project',v=>escapeHtml(projectName(v))],['Type','type'],['Description','description'],['Owner','owner'],['RAG','rag',rag],['Status','status']], 'raid');
  milestoneTable.innerHTML = table(state.milestones, [['Project','project',v=>escapeHtml(projectName(v))],['Milestone','name'],['Due','due'],['RAG','rag',rag],['Status','status']], 'milestones');
  budgetTable.innerHTML = table(state.budget, [['Project','project',v=>escapeHtml(projectName(v))],['Month','month'],['Budget','budget',money],['Actual','actual',money],['Forecast','forecast',money],['Variance','actual',(v,r)=>money(Number(r.budget||0)-Number(r.actual||0))]], 'budget');
  resourceTable.innerHTML = table(state.resources, [['Project','project',v=>escapeHtml(projectName(v))],['Name','name'],['Role','role'],['Allocation %','allocation'],['Hours/Wk','hours'],['Rate','rate',money],['Weekly Cost','weeklyCost',money],['Monthly Cost','monthlyCost',money],['Cost Centre','costCentre']], 'resources');
  loadDoc();
}
docProject.onchange = loadDoc; docType.onchange = loadDoc;
function loadDoc(){ docContent.value = state.docs[`${docProject.value}_${docType.value}`] || ''; }
saveDocBtn.onclick = () => { state.docs[`${docProject.value}_${docType.value}`] = docContent.value; save(); alert('Document saved.'); };
downloadDocBtn.onclick = () => downloadWord(`${docType.value} - ${projectName(docProject.value)}`, docContent.value);
function exportCSV(collection){ const rows = state[collection]; if(!rows.length) return alert('No data to export'); const headers = [...new Set(rows.flatMap(Object.keys))].filter(h=>h!=='id'); const csv = [headers.join(','), ...rows.map(r=>headers.map(h=>`"${String(r[h] ?? '').replaceAll('"','""')}"`).join(','))].join('\n'); download(`${collection}.csv`, csv, 'text/csv'); }
function download(name, content, type){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], {type})); a.download = name; a.click(); }
function downloadWord(title, body){ const html = `<html><body><h1>${escapeHtml(title)}</h1><pre style="font-family:Arial;white-space:pre-wrap">${escapeHtml(body || '')}</pre></body></html>`; download(`${title}.doc`, html, 'application/msword'); }
function generateReport(){ const lines=[]; lines.push('Overall Project Highlight Report\n'); lines.push(`Total projects: ${state.projects.length}`); lines.push(`Total budget: ${money(state.budget.reduce((a,b)=>a+Number(b.budget||0),0))}`); lines.push(`Actual spend: ${money(state.budget.reduce((a,b)=>a+Number(b.actual||0),0))}`); lines.push(`Monthly resource forecast: ${money(state.resources.reduce((a,b)=>a+Number(b.monthlyCost||0),0))}\n`); state.projects.forEach(p=>{ lines.push(`${p.name} - ${p.rag}`); lines.push(`Sponsor: ${p.sponsor||'TBC'} | PM: ${p.manager||'TBC'}`); const ms = state.milestones.filter(m=>String(m.project)===String(p.id)).map(m=>`- ${m.name}: ${m.status}, due ${m.due||'TBC'}, RAG ${m.rag}`).join('\n'); if(ms) lines.push('Milestones:\n'+ms); const rr = state.raid.filter(r=>String(r.project)===String(p.id)&&r.status!=='Closed').map(r=>`- ${r.type}: ${r.description} (${r.rag})`).join('\n'); if(rr) lines.push('Open RAID:\n'+rr); lines.push(''); }); reportOutput.value = lines.join('\n'); }
renderAll();
