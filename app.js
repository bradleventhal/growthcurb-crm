const KEY='sitedrop_crm_records_v1';
const pOrder=['Lead','Contacted','Demo Sent','Interested','Closed','Active Client'];
const bOrder=['Not Started','Building','QA','Deployed','Live'];
const form=document.getElementById('prospectForm'), tbody=document.querySelector('#prospectsTable tbody'), summary=document.getElementById('summary');
async function load(){const local=localStorage.getItem(KEY); if(local) return JSON.parse(local); const seed=await (await fetch('data.json')).json(); localStorage.setItem(KEY,JSON.stringify(seed)); return seed;}
function save(r){localStorage.setItem(KEY,JSON.stringify(r));}
function render(r){tbody.innerHTML=''; const mrr=r.reduce((s,x)=>s+Number(x.monthlyRevenue||0),0); summary.textContent=`Prospects: ${r.length} | Tracked MRR: $${mrr.toFixed(2)}`;
 r.forEach((x,i)=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${x.name||''}</td><td>${x.category||''}</td><td>${x.location||''}</td><td>${x.website||''}</td><td><select data-i='${i}' data-f='pipelineStatus'>${pOrder.map(v=>`<option ${x.pipelineStatus===v?'selected':''}>${v}</option>`).join('')}</select></td><td><select data-i='${i}' data-f='siteBuildStatus'>${bOrder.map(v=>`<option ${x.siteBuildStatus===v?'selected':''}>${v}</option>`).join('')}</select></td><td>${x.contactName||''}<br>${x.email||''}<br>${x.phone||''}</td><td>${x.notes||''}</td><td>$${Number(x.monthlyRevenue||0).toFixed(2)}</td><td>${x.revenueStartDate||''}</td><td><button data-del='${i}'>Delete</button></td>`; tbody.appendChild(tr);});}
(async()=>{let rows=await load(); render(rows);
form.addEventListener('submit',e=>{e.preventDefault(); const d=Object.fromEntries(new FormData(form).entries()); d.monthlyRevenue=Number(d.monthlyRevenue||0); rows.push(d); save(rows); render(rows); form.reset();});
tbody.addEventListener('change',e=>{const i=e.target.dataset.i,f=e.target.dataset.f; if(i!==undefined&&f){rows[Number(i)][f]=e.target.value; save(rows); render(rows);}});
tbody.addEventListener('click',e=>{const i=e.target.dataset.del; if(i!==undefined){rows.splice(Number(i),1); save(rows); render(rows);}});
})();
