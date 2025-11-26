// public/cargos.js
const API = '/api/cargos';

const tbody = document.getElementById('tbody');
const btnNuevo = document.getElementById('btnNuevo');
const modal = new bootstrap.Modal(document.getElementById('modal'));
const $ = (id)=>document.getElementById(id);

// para saber si el usuario actual es admin
const isAdmin = window.CURRENT_USER_ROLE === 'admin';
console.log(isAdmin);

// Helpers
function prettyError(err) {
  let msg = (err && err.message) ? err.message : 'Error';
  if (typeof msg === 'string' && (msg.trim().startsWith('{') || msg.trim().startsWith('['))) {
    try {
      const obj = JSON.parse(msg);
      if (Array.isArray(obj?.errors)) return obj.errors.join(' | ');
      if (obj?.error) return String(obj.error);
      return JSON.stringify(obj);
    } catch {}

  }
  return msg;
}
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const bg = type==='success'?'bg-success':type==='error'?'bg-danger':'bg-info';
  const el = document.createElement('div');
  el.className = `toast align-items-center text-white ${bg} border-0`;
  el.role='alert'; el.ariaLive='assertive'; el.ariaAtomic='true';
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  container.appendChild(el);
  const t=new bootstrap.Toast(el,{delay:2800}); t.show();
  el.addEventListener('hidden.bs.toast', ()=>el.remove());
}
async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  const text = await r.text();
  if (!r.ok) {
    try {
      const j = JSON.parse(text);
      const msg = j?.errors?.join(' | ') || j?.error || text || 'Error';
      throw new Error(msg);
    } catch {
      throw new Error(text || 'Error');
    }
  }
  return text ? JSON.parse(text) : {};
}

// Listado
async function listar(){
  const params = new URLSearchParams();
  const q = $('q')?.value?.trim();
  const tipo = $('fTipo')?.value;
  if (q) params.set('q', q);
  if (tipo) params.set('tipo', tipo);

  const data = await fetchJSON(`${API}${params.toString()?`?${params}`:''}`);
  tbody.innerHTML = '';

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length){
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Sin resultados</td></tr>';
    return;
  }

  rows.forEach(c=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nombre}</td>
      <td class="text-capitalize">${c.tipo}</td>
      <td>${c.descripcion||''}</td>
      <td>${c.createdAt||''}</td>
      <td>${c.updatedAt||''}</td>
      <td class="col-acciones">
        ${
          isAdmin
            ? `
              <button class="btn btn-sm btn-warning me-2"
                      data-act="edit" data-id="${c.id}">Editar</button>
              <button class="btn btn-sm btn-danger"
                      data-act="del" data-id="${c.id}">Eliminar</button>
            `
            : `<span class="text-muted small">Solo lectura</span>`
        }
      </td>`;
    tbody.appendChild(tr);
  });
}

// Filtros
document.getElementById('btnFiltrar').addEventListener('click', ()=>listar().catch(()=>showToast('Error al filtrar','error')));
document.getElementById('btnLimpiar').addEventListener('click', ()=>{
  $('q').value=''; $('fTipo').value='';
  listar().catch(()=>showToast('Error','error'));
});

// Nuevo  👇 solo se engancha si el botón existe (admin)
btnNuevo?.addEventListener('click', ()=>{
  $('title').textContent='Nuevo cargo';
  $('id').value=''; $('nombre').value=''; $('tipo').value='interno'; $('descripcion').value='';
  modal.show();
});

// Acciones tabla
tbody.addEventListener('click', async (e)=>{
  // Si no es admin, ignoramos cualquier intento (por si alguien inyecta botones en el DOM)
  if (!isAdmin) return;

  const btn = e.target.closest('button'); if(!btn) return;
  const {act,id} = btn.dataset;
  if (act==='edit'){
    const it = await fetchJSON(`${API}/${id}`);
    $('title').textContent = `Editar cargo #${id}`;
    $('id').value = id;
    $('nombre').value = it.nombre || '';
    $('tipo').value = it.tipo || 'interno';
    $('descripcion').value = it.descripcion || '';
    modal.show();
  } else if (act==='del'){
    if(!confirm('¿Eliminar cargo? (No debe tener personas asociadas)')) return;
    try {
      await fetchJSON(`${API}/${id}`, { method:'DELETE' });
      await listar();
      showToast('Cargo eliminado','info');
    } catch (e) {
      showToast(prettyError(e) || 'No se pudo eliminar','error');
    }
  }
});

// Guardar (solo admin; el user nunca debería poder enviar el form)
document.getElementById('form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  if (!isAdmin) {
    showToast('No tiene permisos para modificar cargos','error');
    return;
  }

  const payload = {
    nombre: $('nombre').value.trim(),
    tipo: $('tipo').value,
    descripcion: $('descripcion').value.trim()
  };
  const id = $('id').value;
  try {
    if (id) {
      await fetchJSON(`${API}/${id}`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
    } else {
      await fetchJSON(API, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
    }
    modal.hide();
    await listar();
    showToast(id ? 'Cargo actualizado' : 'Cargo creado');
  } catch (e) {
    showToast(prettyError(e) || 'No se pudo guardar','error');
  }
});

// init
(async function init(){
  try{ await listar(); }
  catch(e){ console.error(e); showToast('Error de carga','error'); }
})();
