import {
  auth,
  provider,
  signInWithPopup,
  onAuthStateChanged
} from "./firebase.js";
// ════════════════════════════════════════════════
//  PALETTE & CONSTANTS
// ════════════════════════════════════════════════
const PALETTE = [
  '#6c8ef5','#a78bf5','#f5836c','#f5c842','#3dd68c',
  '#f56ca5','#5cd4f5','#f5a83d','#85d45c','#f55c5c',
  '#5cf5d4','#c4a35c'
];

// ════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════
let state = loadState() || {
  currentCycle: '2026-1',
  cycles: {
    '2026-1': {
      totalCredits: 20,
      courses: [
        { id:'c1', name:'PRECÁLCULO',  color:'#f5a83d', credits: 5, evals:[
          {id:'e1',name:'EE1',week:4,weight:0.20,nota:null,given:false},
          {id:'e2',name:'EE2',week:8,weight:0.25,nota:null,given:false},
          {id:'e3',name:'Colaborativo',week:12,weight:0.20,nota:null,given:false},
          {id:'e4',name:'EE4',week:null,weight:0.35,nota:null,given:false},
        ]},
        { id:'c2', name:'METODOLOGÍA', color:'#3dd68c', credits: 3, evals:[
          {id:'e1',name:'EE1',week:4,weight:0.20,nota:null,given:false},
          {id:'e2',name:'EE2',week:7,weight:0.20,nota:null,given:false},
          {id:'e3',name:'EE3',week:11,weight:0.25,nota:null,given:false},
          {id:'e4',name:'Colaborativo',week:13,weight:0.15,nota:null,given:false},
          {id:'e5',name:'Exposición oral',week:15,weight:0.20,nota:null,given:false},
        ]},
        { id:'c3', name:'PSICOLOGÍA',  color:'#a78bf5', credits: 3, evals:[
          {id:'e1',name:'EC1',week:6,weight:0.25,nota:null,given:false},
          {id:'e2',name:'EC2',week:18,weight:0.20,nota:null,given:false},
          {id:'e3',name:'Colaborativo',week:12,weight:0.15,nota:null,given:false},
          {id:'e4',name:'T. Producción',week:13,weight:0.15,nota:null,given:false},
          {id:'e5',name:'EE3',week:15,weight:0.20,nota:null,given:false},
        ]},
        { id:'c4', name:'INTRODUCCIÓN', color:'#5cd4f5', credits: 3, evals:[
          {id:'e1',name:'T. Producción',week:5,weight:0.15,nota:null,given:false},
          {id:'e2',name:'Colaborativo',week:9,weight:0.15,nota:null,given:false},
          {id:'e3',name:'Proyecto',week:11,weight:0.15,nota:null,given:false},
          {id:'e4',name:'E. Escrito',week:13,weight:0.20,nota:null,given:false},
          {id:'e5',name:'Exposición oral',week:15,weight:0.35,nota:null,given:false},
        ]},
        { id:'c5', name:'ÉTICA',        color:'#ff5f5f', credits: 2, evals:[
          {id:'e1',name:'Colaborativo 1',week:7,weight:0.25,nota:null,given:false},
          {id:'e2',name:'Proyecto Grupal 1',week:9,weight:0.25,nota:null,given:false},
          {id:'e3',name:'Colaborativo 2',week:13,weight:0.25,nota:null,given:false},
          {id:'e4',name:'Proyecto Grupal 2',week:14,weight:0.25,nota:null,given:false},
        ]},
        { id:'c6', name:'LENGUA',       color:'#f5c842', credits: 4, evals:[
          {id:'e1',name:'EE1',week:5,weight:0.10,nota:null,given:false},
          {id:'e2',name:'EE2',week:9,weight:0.30,nota:null,given:false},
          {id:'e3',name:'Colaborativo',week:13,weight:0.10,nota:null,given:false},
          {id:'e4',name:'EE3',week:15,weight:0.35,nota:null,given:false},
          {id:'e5',name:'Exposición oral',week:15,weight:0.15,nota:null,given:false},
        ]},
      ]
    }
  }
};

function saveState() { try { localStorage.setItem('notas26v2', JSON.stringify(state)); } catch(e) {} }
function loadState() { try { const s=localStorage.getItem('notas26v2'); return s?JSON.parse(s):null; } catch(e){return null;} }
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function courses() { return state.cycles[state.currentCycle]?.courses || []; }
function cycleData() { return state.cycles[state.currentCycle] || {}; }

// ════════════════════════════════════════════════
//  GRADE UTILS  — color rules:
//  Individual eval notes + global ponderado → red/yellow/green
//  Course avg + pond panel course vals → course color
// ════════════════════════════════════════════════
function gradeClass(n) {
  if (n===null||n===''||n===undefined) return '';
  const v=parseFloat(n);
  if (v<11) return 'c-red';
  if (v<15) return 'c-yellow';
  return 'c-green';
}
function gradeHex(n) { // only for individual notes & global avg
  if (n===null||n===''||n===undefined) return 'var(--muted)';
  const v=parseFloat(n);
  if (v<11) return 'var(--red)';
  if (v<15) return 'var(--yellow)';
  return 'var(--green)';
}
function gradeStatusClass(n) {
  if (n===null) return '';
  const v=parseFloat(n);
  if (v<11) return 'red';
  if (v<15) return 'yellow';
  return 'green';
}
function gradeLabel(n) {
  if (n===null) return '';
  const v=parseFloat(n);
  if (v<11) return 'Jalado';
  if (v<15) return 'Regular';
  return 'Aprobado';
}

function courseAvg(c) {
  let sum=0,w=0;
  for (const e of c.evals) {
    if (e.nota!==null&&e.nota!==''&&e.weight) {
      sum+=parseFloat(e.nota)*parseFloat(e.weight);
      w+=parseFloat(e.weight);
    }
  }
  if (!w) return null;
  return Math.round(sum/w);
}

// Weighted average by credits
function globalAvg() {
  const cs = courses();
  const total = cs.reduce((s,c)=>s+(c.credits||0),0);
  if (!total) {
    // fallback: simple average
    const avgs = cs.map(courseAvg).filter(v=>v!==null);
    if (!avgs.length) return null;
    return (avgs.reduce((a,b)=>a+b,0)/avgs.length).toFixed(2);
  }
  let sum=0, wsum=0;
  for (const c of cs) {
    const avg=courseAvg(c);
    if (avg!==null && c.credits) { sum+=avg*c.credits; wsum+=c.credits; }
  }
  if (!wsum) return null;
  return (sum/wsum).toFixed(2);
}

// ════════════════════════════════════════════════
//  RENDER
// ════════════════════════════════════════════════
function render() { renderChips(); renderPond(); renderGrid(); saveState(); }

function renderChips() {
  const keys = Object.keys(state.cycles);
  document.getElementById('cycleChips').innerHTML = keys.map(k=>{
    const canDel = keys.length > 1;
    return `<div class="chip-wrap ${canDel?'deletable':''}">
      <button class="chip ${k===state.currentCycle?'active':''}" onclick="switchCycle('${k}')">${k}</button>
      <button class="chip-del" onclick="deleteCycle('${k}')" title="Eliminar ciclo">×</button>
    </div>`;
  }).join('');
}

function renderPond() {
  const g = globalAvg();
  const gv = document.getElementById('globalVal');
  const gs = document.getElementById('globalStatus');
  const gb = document.getElementById('globalBar');
  gv.textContent = g!==null ? g : '—';
  // Global val uses grade color (red/yellow/green)
  gv.style.color = g!==null ? gradeHex(g) : 'var(--sub)';
  if (g!==null) {
    const sc=gradeStatusClass(g);
    gs.textContent=gradeLabel(g); gs.className='pond-status '+sc;
    gb.style.width=Math.min(100,parseFloat(g)/20*100)+'%';
    gb.style.background=gradeHex(g);
  } else { gs.textContent=''; gb.style.width='0%'; }

  // Credits display
  const cd = cycleData();
  const totalC = cd.totalCredits || '?';
  const usedC = courses().reduce((s,c)=>s+(c.credits||0),0);
  document.getElementById('pondCreditsDisplay').textContent = `${usedC} / ${totalC} créditos`;

  // Course items in pond — use COURSE COLOR for avg value
  document.getElementById('pondCourses').innerHTML = courses().map(c=>{
    const avg=courseAvg(c);
    const credPct = cd.totalCredits ? Math.round((c.credits||0)/cd.totalCredits*100) : null;
    return `
      <div class="pond-course-item" onclick="openColorPickerFor('${c.id}')">
        <div class="pond-course-dot" style="background:${c.color}"></div>
        <div class="pond-course-name">${c.name}</div>
        <div class="pond-course-val" style="color:${c.color}">${avg!==null?avg:'—'}</div>
        ${credPct!==null?`<div class="pond-course-credits">${c.credits||0}cr · ${credPct}%</div>`:''}
      </div>`;
  }).join('');
}

function renderGrid() {
  const grid = document.getElementById('coursesGrid');
  grid.innerHTML = '';
  const cs = courses();

  cs.forEach((c, idx) => {
    const avg = courseAvg(c);
    const totalW = c.evals.reduce((s,e)=>s+(parseFloat(e.weight)||0),0);
    const partial = c.evals.reduce((s,e)=>{
      if(e.nota!==null&&e.nota!==''&&e.weight) return s+parseFloat(e.nota)*parseFloat(e.weight);
      return s;
    },0).toFixed(2);
    const cd = cycleData();
    const credPct = cd.totalCredits ? Math.round((c.credits||0)/cd.totalCredits*100) : null;

    const rows = c.evals.map((ev, ei)=>{
      const nota = ev.nota!==null&&ev.nota!==undefined ? ev.nota : '';
      const partSc = (nota!==''&&ev.weight) ? (parseFloat(nota)*parseFloat(ev.weight)).toFixed(1) : '—';
      return `
        <div class="eval-row">
          <div class="eval-row-order-btns">
            <button class="eval-row-order-btn" onclick="moveEval('${c.id}',${ei},-1)" ${ei===0?'disabled':''}>▲</button>
            <button class="eval-row-order-btn" onclick="moveEval('${c.id}',${ei},1)" ${ei===c.evals.length-1?'disabled':''}>▼</button>
          </div>
          <div class="eval-name-col">
            <div class="eval-name">${ev.name}</div>
            <div class="eval-meta">${ev.week?'Sem. '+ev.week:''}${ev.week&&ev.weight?' · ':''}${Math.round(ev.weight*100)}%</div>
          </div>
          <div class="nota-wrap">
            <div class="nota-label">Nota</div>
            <input class="nota-input ${gradeClass(nota)}${!ev.given?' c-pred':''}"
              type="number" inputmode="numeric" min="0" max="20" step="1" value="${nota}"
              onchange="updateNota('${c.id}','${ev.id}',this.value)">
          </div>
          <div class="toggle-wrap">
            <div class="toggle-label">${ev.given?'Dada':'Pred.'}</div>
            <label class="toggle">
              <input type="checkbox" ${ev.given?'checked':''} onchange="toggleGiven('${c.id}','${ev.id}',this.checked)">
              <div class="toggle-track"></div>
              <div class="toggle-thumb"></div>
            </label>
          </div>
          <div class="partial-col">${partSc}</div>
        </div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'course-card';
    card.dataset.id = c.id;
    card.draggable = true;
    // Card avg uses COURSE COLOR (not grade color)
    card.innerHTML = `
      <div class="card-header">
        <div class="drag-handle" title="Arrastrar para reordenar">⠿</div>
        <div class="card-color-dot" style="background:${c.color}" onclick="openColorPickerFor('${c.id}')"></div>
        <div class="card-title" style="color:${c.color}">${c.name}</div>
        <div class="card-avg" style="color:${c.color}">${avg!==null?avg:'—'}</div>
        <div class="card-order-btns">
          <button class="order-btn" onclick="moveCourse('${c.id}',-1)" ${idx===0?'disabled':''} title="Subir">▲</button>
          <button class="order-btn" onclick="moveCourse('${c.id}',1)" ${idx===cs.length-1?'disabled':''} title="Bajar">▼</button>
        </div>
        <button class="card-edit-btn" onclick="openEditSheet('${c.id}')">✎</button>
      </div>
      <div class="eval-list">${rows}</div>
      <div class="card-footer">
        <span class="card-footer-label">Ponderado acumulado</span>
        <div class="card-footer-right">
          <span class="card-footer-val" style="color:${c.color}">${partial} / ${(totalW*20).toFixed(0)}</span>
          ${c.credits?`<span class="card-footer-credits">${c.credits} crédito${c.credits!==1?'s':''}${credPct!==null?' · '+credPct+'% del ciclo':''}</span>`:''}
        </div>
      </div>`;

    // Drag events
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover',  onDragOver);
    card.addEventListener('dragleave', onDragLeave);
    card.addEventListener('drop',      onDrop);
    card.addEventListener('dragend',   onDragEnd);
    // Touch drag
    card.querySelector('.drag-handle').addEventListener('touchstart', onTouchStart, {passive:false});

    grid.appendChild(card);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'add-course-btn';
  addBtn.innerHTML = '＋ Añadir curso';
  addBtn.onclick = openAddCourseSheet;
  grid.appendChild(addBtn);
}

// ════════════════════════════════════════════════
//  REORDER — Arrow buttons
// ════════════════════════════════════════════════
function moveCourse(cid, dir) {
  const cs = courses();
  const idx = cs.findIndex(c=>c.id===cid);
  if (idx<0) return;
  const newIdx = idx+dir;
  if (newIdx<0||newIdx>=cs.length) return;
  [cs[idx],cs[newIdx]] = [cs[newIdx],cs[idx]];
  render();
}

// ════════════════════════════════════════════════
//  REORDER — Drag & Drop (desktop)
// ════════════════════════════════════════════════
let dragSrcId = null;

function onDragStart(e) {
  dragSrcId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const card = e.currentTarget;
  if (card.dataset.id !== dragSrcId) card.classList.add('drag-over');
}
function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onDrop(e) {
  e.preventDefault();
  const targetId = e.currentTarget.dataset.id;
  e.currentTarget.classList.remove('drag-over');
  if (!dragSrcId||dragSrcId===targetId) return;
  const cs = courses();
  const from = cs.findIndex(c=>c.id===dragSrcId);
  const to   = cs.findIndex(c=>c.id===targetId);
  if (from<0||to<0) return;
  const [moved] = cs.splice(from,1);
  cs.splice(to,0,moved);
  render();
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.course-card').forEach(c=>c.classList.remove('drag-over'));
  dragSrcId = null;
}

// ════════════════════════════════════════════════
//  REORDER — Touch drag (Android)
// ════════════════════════════════════════════════
let touchDragId = null, touchClone = null, touchOffY = 0;

function onTouchStart(e) {
  if (e.touches.length!==1) return;
  e.preventDefault();
  const handle = e.currentTarget;
  const card = handle.closest('.course-card');
  touchDragId = card.dataset.id;

  const rect = card.getBoundingClientRect();
  touchOffY = e.touches[0].clientY - rect.top;

  // Clone for visual feedback
  touchClone = card.cloneNode(true);
  touchClone.style.cssText = `
    position:fixed; left:${rect.left}px; top:${rect.top}px;
    width:${rect.width}px; z-index:999; opacity:0.9; pointer-events:none;
    transform:scale(1.02); box-shadow:0 8px 32px rgba(0,0,0,0.5);
    border-radius:16px; transition:none;
  `;
  document.body.appendChild(touchClone);
  card.style.opacity = '0.3';

  document.addEventListener('touchmove', onTouchMove, {passive:false});
  document.addEventListener('touchend',  onTouchEnd);
}

function onTouchMove(e) {
  if (!touchClone) return;
  e.preventDefault();
  const y = e.touches[0].clientY;
  const x = e.touches[0].clientX;
  touchClone.style.top = (y - touchOffY) + 'px';

  // Find card under touch point (excluding clone)
  touchClone.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  touchClone.style.display = '';
  const target = el?.closest('.course-card');
  document.querySelectorAll('.course-card').forEach(c=>c.classList.remove('drag-over'));
  if (target && target.dataset.id && target.dataset.id!==touchDragId) {
    target.classList.add('drag-over');
  }
}

function onTouchEnd(e) {
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend',  onTouchEnd);

  // Find drop target
  const x = e.changedTouches[0].clientX;
  const y = e.changedTouches[0].clientY;
  if (touchClone) { touchClone.style.display='none'; }
  const el = document.elementFromPoint(x,y);
  if (touchClone) { touchClone.style.display=''; }
  const target = el?.closest('.course-card');

  if (target && target.dataset.id && target.dataset.id!==touchDragId) {
    const cs = courses();
    const from = cs.findIndex(c=>c.id===touchDragId);
    const to   = cs.findIndex(c=>c.id===target.dataset.id);
    if (from>=0&&to>=0) {
      const [moved]=cs.splice(from,1);
      cs.splice(to,0,moved);
    }
  }

  if (touchClone) { touchClone.remove(); touchClone=null; }
  document.querySelectorAll('.course-card').forEach(c=>{
    c.classList.remove('drag-over');
    c.style.opacity='';
  });
  touchDragId = null;
  render();
}

// ════════════════════════════════════════════════
//  ACTIONS
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
//  CONFIRM HELPER
// ════════════════════════════════════════════════
function showConfirm(msg, onOk) {
  document.getElementById('confirmMsg').textContent = msg;
  const btn = document.getElementById('confirmOkBtn');
  btn.onclick = () => { closeSheet('confirmSheet'); onOk(); };
  openSheet('confirmSheet');
}

function switchCycle(name) { state.currentCycle=name; render(); }
function deleteCycle(name) {
  const keys=Object.keys(state.cycles);
  if(keys.length<=1) return;
  showConfirm(`¿Eliminar el ciclo "${name}" y todos sus cursos?`, ()=>{
    delete state.cycles[name];
    if(state.currentCycle===name) state.currentCycle=Object.keys(state.cycles)[0];
    render();
  });
}
function moveEval(cid, idx, dir) {
  const c=courses().find(c=>c.id===cid); if(!c)return;
  const j=idx+dir;
  if(j<0||j>=c.evals.length)return;
  [c.evals[idx],c.evals[j]]=[c.evals[j],c.evals[idx]];
  render();
}
function updateNota(cid,eid,val) {
  const c=courses().find(c=>c.id===cid); if(!c)return;
  const e=c.evals.find(e=>e.id===eid); if(!e)return;
  const n=parseFloat(val); e.nota=isNaN(n)?null:Math.min(20,Math.max(0,n));
  render();
}
function toggleGiven(cid,eid,checked) {
  const c=courses().find(c=>c.id===cid); if(!c)return;
  const e=c.evals.find(e=>e.id===eid); if(!e)return;
  e.given=checked; render();
}

// ════════════════════════════════════════════════
//  COLOR PICKER
// ════════════════════════════════════════════════
let colorTarget=null;
function openColorPickerFor(cid) {
  colorTarget=cid;
  const c=courses().find(c=>c.id===cid);
  document.getElementById('colorGrid').innerHTML=PALETTE.map(hex=>
    `<div class="cswatch ${c&&c.color===hex?'selected':''}" style="background:${hex}" onclick="applyColor('${hex}')"></div>`
  ).join('');
  openSheet('colorSheet');
}
function applyColor(hex) {
  if(!colorTarget)return;
  const c=courses().find(c=>c.id===colorTarget);
  if(c) c.color=hex;
  colorTarget=null; closeSheet('colorSheet'); render();
}

// ════════════════════════════════════════════════
//  EDIT SHEET
// ════════════════════════════════════════════════
let editingId=null, editEvs=[];
function openEditSheet(cid) {
  editingId=cid;
  const c=courses().find(c=>c.id===cid); if(!c)return;
  document.getElementById('editSheetTitle').textContent=c.name;
  document.getElementById('editCourseName').value=c.name;
  document.getElementById('editCourseCredits').value=c.credits||0;
  editEvs=c.evals.map(e=>({...e}));
  renderEditEvRows();
  document.getElementById('deleteBtn').onclick=()=>{
    showConfirm(`¿Eliminar el curso "${courses().find(c=>c.id===editingId)?.name}"?`, ()=>{
      state.cycles[state.currentCycle].courses=courses().filter(c=>c.id!==editingId);
      closeSheet('editSheet'); render();
    });
  };
  openSheet('editSheet');
}
function renderEditEvRows() {
  const n=editEvs.length;
  const container = document.getElementById('editEvalRows');
  container.innerHTML=editEvs.map((e,i)=>`
    <div class="eval-editor-row" data-ei="${i}" draggable="true">
      <div class="eval-order-btns" style="cursor:grab;touch-action:none" data-drag-handle>
        <button class="eval-order-btn" ${i===0?'disabled':''} onclick="moveEditEv(${i},-1)">▲</button>
        <button class="eval-order-btn" ${i===n-1?'disabled':''} onclick="moveEditEv(${i},1)">▼</button>
      </div>
      <input class="mini-inp name-inp" value="${e.name}" placeholder="Nombre" oninput="editEvs[${i}].name=this.value">
      <input class="mini-inp" type="number" inputmode="numeric" value="${e.week??''}" placeholder="—" min="1" max="18"
        oninput="editEvs[${i}].week=this.value?parseInt(this.value):null">
      <input class="mini-inp" type="number" inputmode="numeric" value="${Math.round((e.weight||0)*100)}" placeholder="%" min="0" max="100"
        oninput="editEvs[${i}].weight=parseFloat(this.value)/100||0;updEditW()">
      <input class="mini-inp" type="number" inputmode="numeric" value="${e.nota??''}" placeholder="—" min="0" max="20"
        oninput="editEvs[${i}].nota=this.value!==''?parseFloat(this.value):null">
      <button class="rm-eval-btn" onclick="editEvs.splice(${i},1);renderEditEvRows()">×</button>
    </div>`).join('');

  // Desktop drag
  let dragEi=null;
  container.querySelectorAll('.eval-editor-row').forEach(row=>{
    row.addEventListener('dragstart', e=>{ dragEi=parseInt(row.dataset.ei); row.style.opacity='0.4'; e.dataTransfer.effectAllowed='move'; });
    row.addEventListener('dragend', ()=>{ row.style.opacity=''; dragEi=null; });
    row.addEventListener('dragover', e=>{ e.preventDefault(); row.style.background='var(--s3)'; });
    row.addEventListener('dragleave', ()=>{ row.style.background=''; });
    row.addEventListener('drop', e=>{ e.preventDefault(); row.style.background=''; const ti=parseInt(row.dataset.ei); if(dragEi!==null&&dragEi!==ti){const [m]=editEvs.splice(dragEi,1);editEvs.splice(ti,0,m);renderEditEvRows();} });
  });

  // Touch drag
  let tEi=null, tClone=null, tOffY=0;
  container.querySelectorAll('[data-drag-handle]').forEach(handle=>{
    handle.addEventListener('touchstart', e=>{
      if(e.touches.length!==1)return;
      e.preventDefault();
      const row=handle.closest('.eval-editor-row');
      tEi=parseInt(row.dataset.ei);
      const rect=row.getBoundingClientRect();
      tOffY=e.touches[0].clientY-rect.top;
      tClone=row.cloneNode(true);
      tClone.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;z-index:9999;opacity:0.9;pointer-events:none;transform:scale(1.02);box-shadow:0 4px 20px rgba(0,0,0,0.5);border-radius:8px;background:var(--s3);`;
      document.body.appendChild(tClone);
      row.style.opacity='0.3';
      const onMove=ev=>{
        ev.preventDefault();
        tClone.style.top=(ev.touches[0].clientY-tOffY)+'px';
        tClone.style.display='none';
        const el=document.elementFromPoint(ev.touches[0].clientX,ev.touches[0].clientY);
        tClone.style.display='';
        container.querySelectorAll('.eval-editor-row').forEach(r=>r.style.background='');
        const tr=el?.closest('.eval-editor-row');
        if(tr&&tr.dataset.ei!==String(tEi)) tr.style.background='var(--s3)';
      };
      const onEnd=ev=>{
        document.removeEventListener('touchmove',onMove);
        document.removeEventListener('touchend',onEnd);
        tClone.style.display='none';
        const el=document.elementFromPoint(ev.changedTouches[0].clientX,ev.changedTouches[0].clientY);
        tClone.remove(); tClone=null;
        container.querySelectorAll('.eval-editor-row').forEach(r=>{r.style.background='';r.style.opacity='';});
        const tr=el?.closest('.eval-editor-row');
        const ti=tr?parseInt(tr.dataset.ei):null;
        if(ti!==null&&ti!==tEi){const[m]=editEvs.splice(tEi,1);editEvs.splice(ti,0,m);}
        tEi=null; renderEditEvRows();
      };
      document.addEventListener('touchmove',onMove,{passive:false});
      document.addEventListener('touchend',onEnd);
    },{passive:false});
  });
  updEditW();
}
function moveEditEv(i,dir) {
  const j=i+dir;
  if(j<0||j>=editEvs.length)return;
  [editEvs[i],editEvs[j]]=[editEvs[j],editEvs[i]];
  renderEditEvRows();
}
function addEditEvalRow() { editEvs.push({id:uid(),name:'',week:null,weight:0,nota:null,given:false}); renderEditEvRows(); }
function updEditW() {
  const t=editEvs.reduce((s,e)=>s+(parseFloat(e.weight)||0),0);
  const p=Math.round(t*100), el=document.getElementById('editWeightInd');
  el.textContent=`Pesos: ${p}%`;
  el.className='weight-indicator '+(p===100?'wi-ok':p>100?'wi-err':'wi-warn');
}
function saveEdit() {
  const c=courses().find(c=>c.id===editingId); if(!c)return;
  c.name=document.getElementById('editCourseName').value.trim().toUpperCase()||c.name;
  c.credits=parseInt(document.getElementById('editCourseCredits').value)||0;
  c.evals=editEvs;
  closeSheet('editSheet'); render();
}

// ════════════════════════════════════════════════
//  ADD COURSE
// ════════════════════════════════════════════════
let newEvs=[];
function openAddCourseSheet() {
  newEvs=[{id:uid(),name:'',week:null,weight:0,nota:null,given:false}];
  document.getElementById('newCourseName').value='';
  document.getElementById('newCourseCredits').value='';
  renderAddEvRows();
  openSheet('addCourseSheet');
}
function renderAddEvRows() {
  const n=newEvs.length;
  document.getElementById('addEvalRows').innerHTML=newEvs.map((e,i)=>`
    <div class="eval-editor-row">
      <div class="eval-order-btns">
        <button class="eval-order-btn" ${i===0?'disabled':''} onclick="moveNewEv(${i},-1)">▲</button>
        <button class="eval-order-btn" ${i===n-1?'disabled':''} onclick="moveNewEv(${i},1)">▼</button>
      </div>
      <input class="mini-inp name-inp" value="${e.name}" placeholder="Nombre" oninput="newEvs[${i}].name=this.value">
      <input class="mini-inp" type="number" inputmode="numeric" value="${e.week??''}" placeholder="—" min="1" max="18"
        oninput="newEvs[${i}].week=this.value?parseInt(this.value):null">
      <input class="mini-inp" type="number" inputmode="numeric" value="${Math.round((e.weight||0)*100)}" placeholder="%" min="0" max="100"
        oninput="newEvs[${i}].weight=parseFloat(this.value)/100||0;updAddW()">
      <input class="mini-inp" type="number" inputmode="numeric" value="${e.nota??''}" placeholder="—" min="0" max="20"
        oninput="newEvs[${i}].nota=this.value!==''?parseFloat(this.value):null">
      <button class="rm-eval-btn" onclick="newEvs.splice(${i},1);renderAddEvRows()">×</button>
    </div>`).join('');
  updAddW();
}
function moveNewEv(i,dir) {
  const j=i+dir;
  if(j<0||j>=newEvs.length)return;
  [newEvs[i],newEvs[j]]=[newEvs[j],newEvs[i]];
  renderAddEvRows();
}
function addNewEvalRow() { newEvs.push({id:uid(),name:'',week:null,weight:0,nota:null,given:false}); renderAddEvRows(); }
function updAddW() {
  const t=newEvs.reduce((s,e)=>s+(parseFloat(e.weight)||0),0);
  const p=Math.round(t*100), el=document.getElementById('addWeightInd');
  el.textContent=`Pesos: ${p}%`;
  el.className='weight-indicator '+(p===100?'wi-ok':p>100?'wi-err':'wi-warn');
}
function saveNewCourse() {
  const name=document.getElementById('newCourseName').value.trim();
  if(!name){document.getElementById('newCourseName').focus();return;}
  const cs=courses();
  const color=PALETTE[cs.length%PALETTE.length];
  const creds=parseInt(document.getElementById('newCourseCredits').value)||0;
  state.cycles[state.currentCycle].courses.push({id:uid(),name:name.toUpperCase(),color,credits:creds,evals:newEvs.map(e=>({...e}))});
  closeSheet('addCourseSheet'); render();
}

// ════════════════════════════════════════════════
//  ADD CYCLE
// ════════════════════════════════════════════════
function saveNewCycle() {
  const name=document.getElementById('newCycleName').value.trim();
  if(!name){document.getElementById('newCycleName').focus();return;}
  if(state.cycles[name]){document.getElementById('newCycleName').select();return;}
  state.cycles[name]={totalCredits:20,courses:[]};
  state.currentCycle=name;
  closeSheet('addCycleSheet'); render();
}

// ════════════════════════════════════════════════
//  CREDITS SHEET
// ════════════════════════════════════════════════
let creditsDraft = {};

function openCreditsSheet() {
  const cd = cycleData();
  creditsDraft = {
    totalCredits: cd.totalCredits || 20,
    courseCredits: {}
  };
  courses().forEach(c=>{ creditsDraft.courseCredits[c.id] = c.credits||0; });

  document.getElementById('creditsBody').innerHTML = `
    <div class="credits-cycle-row">
      <span class="credits-cycle-label">Total de créditos del ciclo</span>
      <input class="credits-total-inp" id="totalCredInp" type="number" inputmode="numeric"
        min="1" max="60" value="${creditsDraft.totalCredits}"
        oninput="creditsDraft.totalCredits=parseInt(this.value)||0;refreshCreditsPct()">
    </div>
    <div class="field-label" style="margin-bottom:8px">Créditos por curso</div>
    <div id="creditsCourseList">
      ${courses().map(c=>`
        <div class="credits-course-row">
          <div class="credits-course-dot" style="background:${c.color}"></div>
          <div class="credits-course-name">${c.name}</div>
          <input class="credits-course-inp" data-cid="${c.id}" type="number" inputmode="numeric"
            min="0" max="20" value="${c.credits||0}"
            oninput="creditsDraft.courseCredits['${c.id}']=parseInt(this.value)||0;refreshCreditsPct()">
          <div class="credits-course-pct" id="cpct-${c.id}">—</div>
        </div>`).join('')}
    </div>
  `;
  refreshCreditsPct();
  openSheet('creditsSheet');
}

function refreshCreditsPct() {
  const total = parseInt(document.getElementById('totalCredInp')?.value)||1;
  courses().forEach(c=>{
    const inp = document.querySelector(`.credits-course-inp[data-cid="${c.id}"]`);
    const cred = inp ? parseInt(inp.value)||0 : 0;
    const el = document.getElementById('cpct-'+c.id);
    if (el) el.textContent = total ? Math.round(cred/total*100)+'%' : '—';
  });
}

function saveCredits() {
  const cd = state.cycles[state.currentCycle];
  cd.totalCredits = creditsDraft.totalCredits;
  courses().forEach(c=>{ c.credits = creditsDraft.courseCredits[c.id]||0; });
  closeSheet('creditsSheet'); render();
}

// ════════════════════════════════════════════════
//  SHEET HELPERS
// ════════════════════════════════════════════════
function openSheet(id)  { document.getElementById(id).classList.add('open'); }
function closeSheet(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.overlay').forEach(o=>{
  o.addEventListener('click', e=>{ if(e.target===o) o.classList.remove('open'); });
});

// ════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════
const loginBtn = document.getElementById("loginBtn");

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginBtn.textContent = user.displayName.split(" ")[0];
    } else {
        loginBtn.textContent = "👤";
    }
});

loginBtn.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});
