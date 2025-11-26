const API = '/api/personas-mantenimiento';
const API_CARGOS = '/api/cargos';

const tbody = document.getElementById('tbody');
const btnNuevo = document.getElementById('btnNuevo');
const modal = new bootstrap.Modal(document.getElementById('modal'));
const $ = (id)=>document.getElementById(id);
const searchInput = document.getElementById('search');


// para saber si el usuario actual es admin
const isAdmin = window.CURRENT_USER_ROLE === 'admin';
console.log(isAdmin);

function showToast(message, type='success'){
  const container = document.getElementById('toastContainer');
  const bg = type==='success'?'bg-success':type==='error'?'bg-danger':'bg-info';
  const el = document.createElement('div');
  el.className = `toast align-items-center text-white ${bg} border-0`;
  el.role='alert'; el.ariaLive='assertive'; el.ariaAtomic='true';
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  container.appendChild(el);
  const t=new bootstrap.Toast(el,{delay:2800}); t.show();
  el.addEventListener('hidden.bs.toast', ()=>el.remove());
}

async function fetchJSON(url, opts){
  const r = await fetch(url, opts);
  const text = await r.text();
  if(!r.ok){
    try{
      const j = JSON.parse(text);
      throw new Error(j?.error || j?.errors?.join(' | ') || text || 'Error');
    }catch{
      throw new Error(text || 'Error');
    }
  }
  return text ? JSON.parse(text) : {};
}

/* ===== Cargar cargos para el select ===== */
async function cargarCargos(){
  const select = $('cargoId');
  select.innerHTML = `<option value="">(Sin cargo)</option>`;
  const cargos = await fetchJSON(API_CARGOS);
  cargos.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.nombre} (${c.tipo})`;
    select.appendChild(opt);
  });
}

/* ===== Listar personas ===== */
function renderRows(personas_mantenimiento, q = '') {
  tbody.innerHTML = '';
  const filtro = q.toLowerCase();
  personas_mantenimiento
    .filter(u => {
  const nombres = (u.nombres || "").toLowerCase();
  const apellidos = (u.apellidos || "").toLowerCase();
  const email = (u.email || "").toLowerCase();
  const telefono = (u.telefono || "").toLowerCase();

  return (
    nombres.includes(filtro) ||
    apellidos.includes(filtro) ||
    email.includes(filtro) ||
    telefono.includes(filtro)
  );
})
    .forEach(u => {
      const tr = document.createElement('tr');
      tr.dataset.id = u.id;
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.identificacion}</td>
        <td>${u.nombres}</td>
        <td>${u.apellidos}</td>
        <td>${u.cargoId}</td>
        <td>${u.email}</td>
        <td>${u.telefono}</td>
        <td>${u.createdAt || ''}</td>
        <td>${u.updatedAt || ''}</td>
        <td class="col-acciones">
      ${
          isAdmin
            ? `
        <button class="btn btn-sm btn-warning me-2" data-act="edit" data-id="${u.id}">Editar</button>
        <button class="btn btn-sm btn-danger" data-act="del" data-id="${u.id}">Eliminar</button>
         `
            : `<span class="text-muted small">Solo lectura</span>`
        }
      </td>`;
      tbody.appendChild(tr);
    });
}

async function loadPersonasMantenimiento(q = '') {
  try {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    const data = await fetchJSON(`${API}${params}`);
    renderRows(data, q);
  } catch (e) {
    console.error(e);
    showToast('Error al cargar personas de mantenimiento', 'error');
  }
}


/* ===== Nueva persona mantenimiento ===== */ 
/**
 * editado para mostrar opcion solo al admin 
 */
if (btnNuevo) {
  btnNuevo.addEventListener('click', async ()=> {
    $('title').textContent = 'Nueva persona de mantenimiento';
    $('id').value='';
    $('identificacion').value='';
    $('nombres').value='';
    $('apellidos').value='';
    $('email').value='';
    $('telefono').value='';
    await cargarCargos();
    $('cargoId').value='';
    modal.show();
  });
}

/* ===== Acciones editar/eliminar ===== */
tbody.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const {act,id} = btn.dataset;
  if (act==='edit'){
    const it = await fetchJSON(`${API}/${id}`);
    $('title').textContent = `Editar persona #${id}`;
    $('id').value = id;
    $('identificacion').value = it.identificacion || '';
    $('nombres').value = it.nombres || '';
    $('apellidos').value = it.apellidos || '';
    $('email').value = it.email || '';
    $('telefono').value = it.telefono || '';
    await cargarCargos();
    $('cargoId').value = (it.cargoId ?? it.Cargo?.id) || '';
    modal.show();
  } else if (act==='del'){
    if(!confirm('¿Eliminar persona?')) return;
    try{
      await fetchJSON(`${API}/${id}`, { method:'DELETE' });
      await loadPersonasMantenimiento(); showToast('Persona eliminada','info');
    }catch(e){ showToast(e.message || 'No se pudo eliminar','error'); }
  }
});

/* ===== Guardar (POST/PUT) ===== */
document.getElementById('form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = {
    identificacion: $('identificacion').value.trim(),
    nombres: $('nombres').value.trim(),
    apellidos: $('apellidos').value.trim(),
    cargoId: $('cargoId').value ? Number($('cargoId').value) : null,
    email: $('email').value.trim() || null,
    telefono: $('telefono').value.trim() || null,
  };
  const id = $('id').value;
  try{
    if (id) {
      await fetchJSON(`${API}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    } else {
      await fetchJSON(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    }
    modal.hide(); await loadPersonasMantenimiento(); showToast(id?'Persona actualizada':'Persona creada');
  }catch(e){ showToast(e.message || 'Error al guardar','error'); }
});


// Filtrado / búsqueda con debounce
let searchTimeout;
searchInput?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadPersonasMantenimiento(searchInput.value.trim());
  }, 400);
});

// Inicial
loadPersonasMantenimiento();