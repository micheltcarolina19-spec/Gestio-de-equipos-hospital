const API = '/api/ubicaciones';
const tbody = document.getElementById('tbody');
const btnNueva = document.getElementById('btnNueva');
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

function renderRows(ubicaciones, q = '') {
  tbody.innerHTML = '';
  const filtro = q.toLowerCase();
  ubicaciones
    .filter(u =>
      u.identificacion.toLowerCase().includes(filtro) ||
      u.sede.toLowerCase().includes(filtro) ||
      u.edificio.toLowerCase().includes(filtro) ||
      u.piso.toLowerCase().includes(filtro) ||
      u.sala.toLowerCase().includes(filtro)
    )
    .forEach(u => {
      const tr = document.createElement('tr');
      tr.dataset.id = u.id;
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.identificacion}</td>
        <td>${u.sede}</td>
        <td>${u.edificio}</td>
        <td>${u.piso}</td>
        <td>${u.sala}</td>
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
    });
}

// Cargar ubicaciones
async function loadUbicaciones(q = '') {
  try {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    const data = await fetchJSON(`${API}${params}`);
    renderRows(data, q);
  } catch (e) {
    console.error(e);
    showToast('Error al cargar ubicaciones', 'error');
  }
}

btnNueva.addEventListener('click', ()=>{
  $('title').textContent='Nueva ubicación';
  $('id').value=''; $('identificacion').value=''; $('sede').value=''; $('edificio').value=''; $('piso').value=''; $('sala').value='';
  modal.show();
});

tbody.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const {act,id} = btn.dataset;
  if (act==='edit'){
    const items = await fetchJSON(API);
    const u = items.find(x=>x.id==id); if(!u) return showToast('No encontrado','error');
    $('title').textContent = `Editar ubicación #${id}`;
    $('id').value=id; $('identificacion').value=u.identificacion; $('sede').value=u.sede; $('edificio').value=u.edificio; $('piso').value=u.piso; $('sala').value=u.sala;
    modal.show();
  } else if (act==='del'){
    if(!confirm('¿Eliminar ubicación?')) return;
    try { await fetchJSON(`${API}/${id}`, { method:'DELETE' }); await loadUbicaciones(); showToast('Ubicación eliminada','info'); }
    catch(e){ showToast('No se pudo eliminar (quizá tiene equipos)','error'); }
  }
});

document.getElementById('form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = {
    identificacion: $('identificacion').value.trim(),
    sede: $('sede').value.trim(),
    edificio: $('edificio').value.trim(),
    piso: $('piso').value.trim(),
    sala: $('sala').value.trim()
  };
  const id = $('id').value;
  try{
    if (id) await fetchJSON(`${API}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    else     await fetchJSON(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    modal.hide(); await loadUbicaciones(); showToast(id?'Ubicación actualizada':'Ubicación creada');
  }catch(e){ showToast('Error al guardar','error'); }
});

// Filtrado / búsqueda con debounce
let searchTimeout;
searchInput?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadUbicaciones(searchInput.value.trim());
  }, 400);
});

// Inicial
loadUbicaciones();
