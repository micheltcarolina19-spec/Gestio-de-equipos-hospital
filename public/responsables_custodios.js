// public/responsables_custodios.js
const API = '/api/responsables-custodios';
const tbody = document.getElementById('tbody');
const btnNuevo = document.getElementById('btnNuevo');
const modal = new bootstrap.Modal(document.getElementById('modal'));
const $ = (id)=>document.getElementById(id);
const searchInput = document.getElementById('search');

// para saber si el usuario actual es admin
const isAdmin = window.CURRENT_USER_ROLE === 'admin';
console.log(isAdmin);

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const bg = type==='success'?'bg-success':type==='error'?'bg-danger':'bg-info';
  const el = document.createElement('div');
  el.className = `toast align-items-center text-white ${bg} border-0`;
  el.role='alert'; el.ariaLive='assertive'; el.ariaAtomic='true';
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  container.appendChild(el); const t=new bootstrap.Toast(el,{delay:2800}); t.show();
  el.addEventListener('hidden.bs.toast', ()=>el.remove());
}

async function fetchJSON(url, opts){ const r=await fetch(url,opts); if(!r.ok) throw new Error(await r.text()); return r.json(); }

function renderRows(responsables_custodios, q = '') {
  tbody.innerHTML = '';
  const filtro = q.toLowerCase();
  responsables_custodios
    .filter(u =>
      u.id_area.toLowerCase().includes(filtro) ||
      u.nombre_area.toLowerCase().includes(filtro)
    )
    .forEach(u => {
      const tr = document.createElement('tr');
      tr.dataset.id = u.id;
      tr.innerHTML = `
      <td>${u.id}</td>
        <td>${u.id_area}</td>
        <td>${u.nombre_area}</td>
        <td>${u.createdAt || ''}</td>
        <td>${u.updatedAt || ''}</td>
        <td class="col-acciones">
        ${isAdmin
         ? `

        <button class="btn btn-sm btn-warning me-2" data-act="edit" data-id="${u.id}">Editar</button>
        <button class="btn btn-sm btn-danger" data-act="del" data-id="${u.id}">Eliminar</button>
         `
        :`
        <span class="text-muted small">Solo lectura</span>
      `
      }
      </td>`;
      tbody.appendChild(tr);
    })};

async function loadresponsables(q = '') {
  try {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    const data = await fetchJSON(`${API}${params}`);
    renderRows(data, q);
  } catch (e) {
    console.error(e);
    showToast('Error al cargar responsables', 'error');
  }
}

btnNuevo.addEventListener('click', ()=>{
  $('title').textContent='Nuevo responsable/custodio';
  $('id').value=''; $('id_area').value=''; $('nombre_area').value='';
  modal.show();
});

tbody.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const {act,id} = btn.dataset;
  if (act==='edit'){
    const items = await fetchJSON(API);
    const r = items.find(x=>x.id==id); if(!r) return showToast('No encontrado','error');
    $('title').textContent=`Editar responsable/custodio #${id}`;
    $('id').value=id; $('id_area').value=r.id_area; $('nombre_area').value=r.nombre_area;
    modal.show();
  } else if (act==='del'){
    if(!confirm('¿Eliminar responsable/custodio?')) return;
    try { await fetchJSON(`${API}/${id}`, { method:'DELETE' }); await loadresponsables(); showToast('Eliminado','info'); }
    catch(e){ showToast('No se pudo eliminar (quizá tiene equipos)','error'); }
  }
});

document.getElementById('form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = { id_area: $('id_area').value.trim(), nombre_area: $('nombre_area').value.trim() };
  const id = $('id').value;
  try{
    if (id) await fetchJSON(`${API}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    else     await fetchJSON(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    modal.hide(); await loadresponsables(); showToast(id?'Actualizado':'Creado');
  }catch(e){ showToast('Error al guardar','error'); }
});

// Filtrado / búsqueda con debounce
let searchTimeout;
searchInput?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadresponsables(searchInput.value.trim());
  }, 400);
});

// Inicial
loadresponsables();
