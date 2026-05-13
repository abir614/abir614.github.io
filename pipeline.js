// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let flow = 1, queue = [], results = [];
let _previewSrc = { w: 0, h: 0 };

// ═══════════════════════════════════════
// MODEL DOWNLOAD OVERLAY
// ═══════════════════════════════════════
let _modelOverlay = null;

function showModelOverlay() {
  if (_modelOverlay) return;
  _modelOverlay = document.createElement('div');
  _modelOverlay.id = 'modelOverlay';
  _modelOverlay.innerHTML = `
    <div class="mo-card">
      <div class="mo-icon-wrap">
        <svg class="mo-spinner" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="rgba(0,224,176,0.15)" stroke-width="3"/>
          <path d="M24 4 A20 20 0 0 1 44 24" stroke="var(--a3)" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <span class="mo-icon-inner">🧠</span>
      </div>
      <div class="mo-title">Loading ISNet AI Model</div>
      <div class="mo-sub" id="moSub">Initialising…</div>
      <div class="mo-track">
        <div class="mo-bar-wrap">
          <div class="mo-bar" id="moBar"></div>
          <div class="mo-bar-glow" id="moBarGlow"></div>
        </div>
        <div class="mo-pct" id="moPct">0%</div>
      </div>
      <div class="mo-files" id="moFiles"></div>
      <div class="mo-note">One-time download · cached in browser</div>
    </div>`;
  document.body.appendChild(_modelOverlay);
  requestAnimationFrame(() => _modelOverlay.classList.add('visible'));
}

function updateModelProgress(pct, label, fileInfo) {
  const bar = document.getElementById('moBar');
  const glow = document.getElementById('moBarGlow');
  const pctEl = document.getElementById('moPct');
  const subEl = document.getElementById('moSub');
  const filesEl = document.getElementById('moFiles');
  if (bar) { bar.style.width = pct + '%'; }
  if (glow) { glow.style.left = pct + '%'; }
  if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  if (subEl && label) subEl.textContent = label;
  if (filesEl && fileInfo) filesEl.textContent = fileInfo;
}

function hideModelOverlay() {
  if (!_modelOverlay) return;
  _modelOverlay.classList.add('hiding');
  setTimeout(() => { _modelOverlay?.remove(); _modelOverlay = null; }, 600);
}

// ═══════════════════════════════════════════════════════════════
// INLINE STEP PROGRESS OVERLAY
// Shown for upscale, encode, and AI extension steps
// ═══════════════════════════════════════════════════════════════
let _inlineOverlay = null;

function showInlineProgress(title, icon = '⚙️') {
  if (_inlineOverlay) return;
  _inlineOverlay = document.createElement('div');
  _inlineOverlay.id = 'inlineOverlay';
  _inlineOverlay.innerHTML = `
    <div class="mo-card">
      <div class="mo-icon-wrap">
        <svg class="mo-spinner" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="rgba(198,241,53,0.12)" stroke-width="3"/>
          <path d="M24 4 A20 20 0 0 1 44 24" stroke="var(--a)" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <span class="mo-icon-inner" id="ipoIcon">${icon}</span>
      </div>
      <div class="mo-title" id="ipoTitle">${title}</div>
      <div class="mo-sub" id="ipoSub">Starting…</div>
      <div class="mo-track">
        <div class="mo-bar-wrap">
          <div class="mo-bar" id="ipoBar" style="background:linear-gradient(90deg,var(--a2),var(--a))"></div>
          <div class="mo-bar-glow" id="ipoBarGlow" style="background:radial-gradient(ellipse,rgba(198,241,53,.55),transparent 70%)"></div>
        </div>
        <div class="mo-pct" id="ipoPct" style="color:var(--a)">0%</div>
      </div>
      <div class="mo-files" id="ipoDetail"></div>
    </div>`;
  document.body.appendChild(_inlineOverlay);
  requestAnimationFrame(() => _inlineOverlay.classList.add('visible'));
}

function updateInlineProgress(pct, sub, detail) {
  const bar = document.getElementById('ipoBar');
  const glow = document.getElementById('ipoBarGlow');
  const pctEl = document.getElementById('ipoPct');
  const subEl = document.getElementById('ipoSub');
  const detEl = document.getElementById('ipoDetail');
  if (bar) bar.style.width = pct + '%';
  if (glow) glow.style.left = pct + '%';
  if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  if (subEl && sub != null) subEl.textContent = sub;
  if (detEl && detail != null) detEl.textContent = detail;
}

function hideInlineProgress() {
  if (!_inlineOverlay) return;
  _inlineOverlay.classList.add('hiding');
  setTimeout(() => { _inlineOverlay?.remove(); _inlineOverlay = null; }, 500);
}

// ═══════════════════════════════════════
// FLOW UI
// ═══════════════════════════════════════
function selectFlow(n) {
  flow = n;
  document.querySelectorAll('.ftab').forEach((b, i) => b.classList.toggle('active', i === n - 1));

  document.getElementById('bgModelGroup').classList.toggle('sg-hidden', n !== 2);
  document.getElementById('bgSensGroup').classList.toggle('sg-hidden', n !== 2);
  document.getElementById('bgFeatherGroup').classList.toggle('sg-hidden', n !== 2);
  document.getElementById('bgOutputGroup').classList.toggle('sg-hidden', n !== 2);
  document.getElementById('bgInfo').classList.toggle('sg-hidden', n !== 2);

  document.querySelectorAll('.resize-setting').forEach(el => el.classList.toggle('sg-hidden', n !== 3));
  document.getElementById('resizeInfo').classList.toggle('sg-hidden', n !== 3);
  document.getElementById('resizePreview').classList.toggle('sg-hidden', n !== 3);

  toggleFillColor();
  onResizeModeChange();
  renderTrack();
  if (n === 3) updateResizePreview();
}

function onResizeModeChange() {
  if (flow !== 3) return;
  const mode = document.getElementById('resizeMode')?.value;
  const blendGroup = document.getElementById('resizeBlendGroup');
  if (blendGroup) blendGroup.classList.toggle('sg-hidden', mode !== 'smart-crop-extend');
  const focusGroup = document.getElementById('resizeFocusGroup');
  if (focusGroup) focusGroup.classList.toggle('sg-hidden', mode !== 'smart-crop-extend');
  const fillEl = document.getElementById('resizeFill');
  if (!fillEl) return;
  const prevVal = fillEl.value;
  const hasBluryOption = [...fillEl.options].some(o => o.value === 'blur');
  const hasAIOption    = [...fillEl.options].some(o => o.value === 'ai-extend');
  if (mode === 'proportional') {
    // Remove AI option, add Blur option
    if (hasAIOption) [...fillEl.options].find(o => o.value === 'ai-extend')?.remove();
    if (!hasBluryOption) {
      const opt = document.createElement('option');
      opt.value = 'blur'; opt.textContent = 'Blurred Source (cinematic)';
      fillEl.insertBefore(opt, fillEl.options[1]);
    }
    // If was on ai-extend, switch to edge-extend
    if (fillEl.value === 'ai-extend' || !fillEl.value) fillEl.value = 'extend';
  } else {
    // Remove Blur option, ensure AI option is present
    if (hasBluryOption) [...fillEl.options].find(o => o.value === 'blur')?.remove();
    if (!hasAIOption) {
      const opt = document.createElement('option');
      opt.value = 'ai-extend'; opt.textContent = '🤖 AI Environment Fill (smart)';
      const extOpt = [...fillEl.options].find(o => o.value === 'extend');
      if (extOpt) fillEl.insertBefore(opt, extOpt.nextSibling);
      else fillEl.appendChild(opt);
    }
    // Default smart mode to AI fill if coming from proportional or on first load
    if (prevVal === 'blur' || !prevVal) fillEl.value = 'ai-extend';
  }
  toggleFillColor();
  updateResizePreview();
}

function renderTrack() {
  let steps;
  if (flow === 1) steps = [['🔎','Lanczos\nUpscale'],['📐','Shopify\nResize'],['🌐','WebP\nEncode']];
  else if (flow === 2) steps = [['🧠','ISNet AI\nBG Remove'],['✨','Refine\nEdges'],['🔎','Lanczos\nUpscale'],['🌐','WebP\nEncode']];
  else steps = [['🔍','Detect\nSubject'],['🔎','Upscale'],['⚡','Smart\nResize'],['🌐','Encode']];

  document.getElementById('pipeTrack').innerHTML = steps.map((s, i) => `
    <div class="pt-step">
      <div class="pt-icon" id="ptd-${i}">${s[0]}</div>
      <div class="pt-label" id="ptl-${i}">${s[1].replace('\n','<br>')}</div>
    </div>
    ${i < steps.length - 1 ? `<div class="pt-line" id="ptln-${i}"></div>` : ''}
  `).join('');
}

function pipeStep(i, state) {
  const d = document.getElementById('ptd-' + i);
  const l = document.getElementById('ptln-' + i);
  if (d) { d.classList.remove('running','done'); if (state) d.classList.add(state); }
  if (state === 'done' && l) l.classList.add('done');
}

function resetTrack() {
  document.querySelectorAll('.pt-icon').forEach(d => d.classList.remove('running','done'));
  document.querySelectorAll('.pt-line').forEach(l => l.classList.remove('done'));
}

function toggleFillColor() {
  const mode = document.getElementById('resizeFill')?.value;
  const cg = document.getElementById('fillColorGroup');
  if (!cg) return;
  cg.classList.toggle('sg-hidden', mode !== 'color' || flow !== 3);
}

// ═══════════════════════════════════════════════════════════════════
// LIVE RESIZE PREVIEW (updated for unified aspect-aware crop)
// ═══════════════════════════════════════════════════════════════════
function updateResizePreview() {
  if (flow !== 3) return;
  const tw = parseInt(document.getElementById('resizeW')?.value) || 0;
  const th = parseInt(document.getElementById('resizeH')?.value) || 0;
  const mode = document.getElementById('resizeMode')?.value || 'smart-crop-extend';

  const rpSrc     = document.getElementById('rpSrc');
  const rpTarget  = document.getElementById('rpTarget');
  const rpW       = document.getElementById('rpW');
  const rpH       = document.getElementById('rpH');

  if (rpTarget) rpTarget.textContent = tw && th ? `${tw} × ${th}` : '—';

  if (!_previewSrc.w || !tw || !th) {
    if (rpSrc) rpSrc.textContent = _previewSrc.w ? `${_previewSrc.w} × ${_previewSrc.h}` : '(drop image)';
    if (rpW) { rpW.textContent = 'W: —'; rpW.className = 'rp-axis'; }
    if (rpH) { rpH.textContent = 'H: —'; rpH.className = 'rp-axis'; }
    return;
  }

  if (rpSrc) rpSrc.textContent = `${_previewSrc.w} × ${_previewSrc.h}`;

  if (mode === 'proportional') {
    const ratio = Math.min(tw / _previewSrc.w, th / _previewSrc.h);
    const fw = Math.round(_previewSrc.w * ratio);
    const fh = Math.round(_previewSrc.h * ratio);
    const padW = tw - fw, padH = th - fh;
    if (rpW) { rpW.textContent = `W: scale → ${fw}px (${padW > 0 ? '+'+padW+' pad' : 'no pad'})`; rpW.className = 'rp-axis fit'; }
    if (rpH) { rpH.textContent = `H: scale → ${fh}px (${padH > 0 ? '+'+padH+' pad' : 'no pad'})`; rpH.className = 'rp-axis fit'; }
  } else {
    // Unified aspect-aware — what actually happens:
    const sW = _previewSrc.w, sH = _previewSrc.h;
    const sAR = sW / sH, tAR = tw / th;
    let wLabel, hLabel, wCls, hCls;

    if (sW < tw && sH < th) {
      // Extend both
      wLabel = `W: ${sW}px → extend → ${tw}px`; wCls = 'extend';
      hLabel = `H: ${sH}px → extend → ${th}px`; hCls = 'extend';
    } else if (sW >= tw && sH >= th) {
      // Need to crop — unified single crop to exact target AR
      if (Math.abs(sAR - tAR) < 0.005) {
        wLabel = `W: ${sW}px → scale → ${tw}px`; wCls = 'match';
        hLabel = `H: ${sH}px → scale → ${th}px`; hCls = 'match';
      } else if (sAR > tAR) {
        // Source wider — crop width, height fits
        wLabel = `W: ${sW}px → crop → ${tw}px (subject-centred)`; wCls = 'crop';
        hLabel = `H: ${sH}px → fit ✓`; hCls = 'match';
      } else {
        // Source taller — crop height, width fits
        wLabel = `W: ${sW}px → fit ✓`; wCls = 'match';
        hLabel = `H: ${sH}px → crop → ${th}px (subject-centred)`; hCls = 'crop';
      }
    } else if (sW < tw) {
      wLabel = `W: ${sW}px → extend → ${tw}px`; wCls = 'extend';
      hLabel = `H: ${sH}px → crop → ${th}px`; hCls = 'crop';
    } else {
      wLabel = `W: ${sW}px → crop → ${tw}px`; wCls = 'crop';
      hLabel = `H: ${sH}px → extend → ${th}px`; hCls = 'extend';
    }
    if (rpW) { rpW.textContent = wLabel; rpW.className = 'rp-axis ' + wCls; }
    if (rpH) { rpH.textContent = hLabel; rpH.className = 'rp-axis ' + hCls; }
  }
}

// ═══════════════════════════════════════
// FILE INPUT
// ═══════════════════════════════════════
const dz = document.getElementById('dropZone');
const fi = document.getElementById('fileInput');
dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); addFiles([...e.dataTransfer.files]); });
fi.addEventListener('change', () => { addFiles([...fi.files]); fi.value = ''; });

function addFiles(files) {
  files.filter(f => f.type.startsWith('image/')).forEach(f => {
    if (queue.find(q => q.name === f.name && q.size === f.size)) return;
    const item = { id: Date.now() + Math.random(), file: f, name: f.name, size: f.size };
    queue.push(item);
    renderQI(item);
  });
  syncQ();
}

function renderQI(item) {
  document.getElementById('emptyMsg')?.remove();
  const div = document.createElement('div');
  div.className = 'qi'; div.id = 'qi-' + item.id;
  div.innerHTML = `
    <img class="qi-thumb" id="qt-${item.id}" src="">
    <div>
      <div class="qi-name">${item.name}</div>
      <div class="qi-meta"><span>${(item.size/1024).toFixed(0)} KB</span><span id="qdm-${item.id}">—</span></div>
      <div class="qpb" id="qpb-${item.id}"><div class="qpbr" id="qpbr-${item.id}"></div></div>
    </div>
    <span class="qs sw" id="qs-${item.id}">WAITING</span>`;
  document.getElementById('queueList').appendChild(div);
  const r = new FileReader();
  r.onload = e => { const el = document.getElementById('qt-' + item.id); if (el) el.src = e.target.result; };
  r.readAsDataURL(item.file);
  const img = new Image();
  img.onload = () => {
    const d = document.getElementById('qdm-' + item.id);
    if (d) d.textContent = img.width + '×' + img.height;
    _previewSrc = { w: img.width, h: img.height };
    updateResizePreview();
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(item.file);
}

function syncQ() {
  document.getElementById('qCount').textContent = queue.length + (queue.length === 1 ? ' file' : ' files');
  document.getElementById('runBtn').disabled = queue.length === 0;
}

function clearQueue() {
  queue = [];
  _previewSrc = { w: 0, h: 0 };
  document.getElementById('queueList').innerHTML = '<div class="empty" id="emptyMsg">No images queued</div>';
  syncQ();
  updateResizePreview();
}

function setQS(id, cls, txt) { const e = document.getElementById('qs-'+id); if (e) { e.className='qs '+cls; e.textContent=txt; } }
function setPB(id, show, pct) {
  const pb = document.getElementById('qpb-'+id), pbr = document.getElementById('qpbr-'+id);
  if (pb) pb.classList.toggle('on', show); if (pbr) pbr.style.width = pct+'%';
}
function log(msg, cls='') {
  const w = document.getElementById('logWrap');
  w.classList.add('on');
  const d = document.createElement('div');
  d.className='log-line '+cls; d.textContent='» '+msg;
  w.appendChild(d); w.scrollTop = w.scrollHeight;
}

// ═══════════════════════════════════════
// PIPELINE RUNNER
// ═══════════════════════════════════════
async function runPipeline() {
  if (!queue.length) return;
  results = [];
  document.getElementById('resGrid').innerHTML = '';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('logWrap').innerHTML = '';
  document.getElementById('logWrap').classList.remove('on');
  document.getElementById('runBtn').disabled = true;

  const resizeMode = document.getElementById('resizeMode')?.value || 'smart-crop-extend';

  const cfg = {
    factor:       parseFloat(document.getElementById('upscaleFactor').value),
    method:       document.getElementById('upscaleMethod').value,
    shopify:      parseInt(document.getElementById('shopifySize').value),
    quality:      parseInt(document.getElementById('webpQ').value) / 100,
    maxKB:        parseInt(document.getElementById('maxKB').value),
    feather:      parseInt(document.getElementById('bgFeather').value),
    bgModel:      document.getElementById('bgModel')?.value || 'isnet',
    resizeW:      parseInt(document.getElementById('resizeW')?.value) || 0,
    resizeH:      parseInt(document.getElementById('resizeH')?.value) || 0,
    resizeMode,
    resizeFocus:  document.getElementById('resizeFocus')?.value || 'smart',
    resizeAlign:  document.getElementById('resizeAlign')?.value || 'center',
    resizeBlend:  parseInt(document.getElementById('resizeBlend')?.value) || 40,
    resizeFill:   document.getElementById('resizeFill')?.value || 'ai-extend',
    fillColor:    document.getElementById('fillColor')?.value || '#ffffff',
  };

  for (const item of queue) {
    setQS(item.id, 'sp', 'PROCESSING'); setPB(item.id, true, 0);
    log(`Processing: ${item.name}`);
    try {
      let canvas = await loadCanvas(item.file);
      let step = 0;

      // ── Flow 1: Standard ──
      if (flow === 1) {
        const total = 3;
        pipeStep(step, 'running');
        log(`  → upscaling ×${cfg.factor} (${cfg.method})...`, 'warn');
        showInlineProgress(`Upscaling ×${cfg.factor}`, '🔎');
        const origW = canvas.width, origH = canvas.height;
        canvas = await upscale(canvas, cfg.factor, cfg.method, (p) => {
          updateInlineProgress(p, `Lanczos-3 — ${Math.round(p)}% complete`, `${origW}×${origH} → ${Math.round(origW*cfg.factor)}×${Math.round(origH*cfg.factor)}`);
          setPB(item.id, true, Math.round(p / total));
        });
        hideInlineProgress();
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log(`  ✓ upscaled → ${canvas.width}×${canvas.height}`, 'ok');

        pipeStep(step, 'running');
        log(`  → shopify resize (max ${cfg.shopify}px)...`, 'warn');
        canvas = shopifyResize(canvas, cfg.shopify);
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log(`  ✓ resized → ${canvas.width}×${canvas.height}`, 'ok');

        pipeStep(step,'running');
        log('  → encoding WebP...','warn');
        showInlineProgress('Encoding WebP', '🌐');
        updateInlineProgress(30, 'Compressing…', `quality: ${Math.round(cfg.quality*100)}%`);
        const { blob, dataURL } = await encodeWebP(canvas, cfg.quality, cfg.maxKB);
        updateInlineProgress(100, 'Done ✓', '');
        hideInlineProgress();
        pipeStep(step,'done'); setPB(item.id, true, 100);
        const base = item.name.replace(/\.[^.]+$/, '');
        const out = { id: item.id, name: `shopify_${base}.webp`, blob, dataURL, orig: item.size, size: blob.size, dims: `${canvas.width}×${canvas.height}` };
        results.push(out); addResult(out); setQS(item.id,'sd','DONE');
        log(`  ✓ ${out.name} — ${(blob.size/1024).toFixed(0)} KB`, 'ok');

      // ── Flow 2: No Background ──
      } else if (flow === 2) {
        const total = 4;
        pipeStep(step,'running');
        log(`  → launching @imgly/background-removal (model: ${cfg.bgModel})...`, 'warn');
        const bgResult = await removeBackgroundAI(canvas, cfg.feather, cfg.bgModel);
        canvas = bgResult.canvas;
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log('  ✓ background removed', 'ok');

        pipeStep(step,'running');
        log(`  → refining edges (feather: ${cfg.feather}px)...`, 'warn');
        await tick();
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log('  ✓ edges refined', 'ok');

        pipeStep(step,'running');
        log(`  → upscaling ×${cfg.factor} (${cfg.method})...`,'warn');
        showInlineProgress(`Upscaling ×${cfg.factor}`, '🔎');
        canvas = await upscale(canvas, cfg.factor, cfg.method, (p) => {
          updateInlineProgress(p, `Processing — ${Math.round(p)}%`, '');
          setPB(item.id, true, Math.round((step/total*100) + p*(1/total)));
        });
        hideInlineProgress();
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log(`  ✓ upscaled → ${canvas.width}×${canvas.height}`,'ok');

        pipeStep(step,'running');
        const usePNG = document.getElementById('bgOutputFormat')?.value === 'png';
        log(`  → encoding ${usePNG ? 'PNG (transparency preserved)' : 'WebP'}...`,'warn');
        showInlineProgress(`Encoding ${usePNG ? 'PNG' : 'WebP'}`, '🌐');
        updateInlineProgress(40, 'Compressing with alpha…', '');
        // Re-draw to a fresh canvas to prevent stale state issues on alpha canvases
        const encCanvas = document.createElement('canvas');
        encCanvas.width = canvas.width; encCanvas.height = canvas.height;
        const encCtx = encCanvas.getContext('2d');
        encCtx.clearRect(0, 0, encCanvas.width, encCanvas.height);
        encCtx.drawImage(canvas, 0, 0);
        let blob, dataURL;
        if (usePNG) {
          ({ blob, dataURL } = await encodePNG(encCanvas));
        } else {
          ({ blob, dataURL } = await encodeWebP(encCanvas, cfg.quality, cfg.maxKB));
        }
        updateInlineProgress(100, 'Done ✓', '');
        hideInlineProgress();
        pipeStep(step,'done'); setPB(item.id, true, 100);
        const base2 = item.name.replace(/\.[^.]+$/, '');
        const ext = usePNG ? 'png' : 'webp';
        const out2 = { id: item.id, name: `nobg_${base2}.${ext}`, blob, dataURL, orig: item.size, size: blob.size, dims: `${canvas.width}×${canvas.height}` };
        results.push(out2); addResult(out2); setQS(item.id,'sd','DONE');
        log(`  ✓ ${out2.name} — ${(blob.size/1024).toFixed(0)} KB`,'ok');

      // ── Flow 3: Smart Resize ──
      } else if (flow === 3) {
        const total = 4;
        const tw = cfg.resizeW, th = cfg.resizeH;
        const sw = canvas.width, sh = canvas.height;

        pipeStep(step,'running');
        log(`  → detecting: source ${sw}×${sh} → target ${tw}×${th} (mode: ${cfg.resizeMode})`, 'warn');
        const sAR = sw/sh, tAR = tw/th;
        let decisionLog = '';
        if (cfg.resizeMode === 'proportional') {
          const ratio = Math.min(tw/sw, th/sh);
          decisionLog = `proportional fit: ${Math.round(sw*ratio)}×${Math.round(sh*ratio)} + padding`;
        } else if (sw < tw && sh < th) {
          decisionLog = `extend both axes → ${tw}×${th}`;
        } else if (sw >= tw && sh >= th) {
          if (Math.abs(sAR-tAR) < 0.005) decisionLog = `scale to ${tw}×${th}`;
          else if (sAR > tAR) decisionLog = `unified crop width (source wider) → ${tw}×${th}, subject-centred`;
          else decisionLog = `unified crop height (source taller) → ${tw}×${th}, subject-centred`;
        } else {
          decisionLog = `mixed: crop+extend → ${tw}×${th}`;
        }
        log(`  ✓ decision: ${decisionLog}`, 'ok');
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));

        // ── CORRECT ORDER: smart resize at native res FIRST, then upscale ──
        // If we upscale first, the image always becomes larger than target,
        // so the crop path hits exact match and AI fill never runs.
        // Instead: resize/extend at original resolution → then upscale to target.
        pipeStep(step,'running');
        if (cfg.resizeMode === 'proportional') {
          // Proportional: scale to fit within target, then pad — upscale integrated
          const fitRatio  = Math.min(tw / sw, th / sh);
          const prescaleW = Math.round(sw * fitRatio);
          const prescaleH = Math.round(sh * fitRatio);
          log(`  → proportional fit: scale ${sw}×${sh} → ${prescaleW}×${prescaleH}, then pad to ${tw}×${th}`, 'warn');
          showInlineProgress('Proportional Fit', '📐');
          updateInlineProgress(20, 'Scaling…', '');
          canvas = await upscale(canvas, fitRatio, cfg.method, p => {
            updateInlineProgress(20 + p * 0.5, `Scaling — ${Math.round(p)}%`, '');
            setPB(item.id, true, Math.round((step/total*100) + (p * 0.5)*(1/total)));
          });
          updateInlineProgress(75, 'Padding…', '');
          canvas = proportionalResize(canvas, tw, th, cfg.resizeFill, cfg.resizeAlign, cfg.fillColor);
          updateInlineProgress(100, 'Done ✓', '');
          hideInlineProgress();
          log(`  ✓ proportional fit → ${canvas.width}×${canvas.height}`, 'ok');
        } else {
          const fillLabel = cfg.resizeFill === 'ai-extend' ? '🤖 AI Environment Fill' : 'Smart Resize';
          showInlineProgress(fillLabel, cfg.resizeFill === 'ai-extend' ? '🤖' : '⚡');
          updateInlineProgress(5, 'Subject detection…', '');
          // Smart resize at NATIVE resolution — preserves border texture quality for AI analysis
          canvas = await smartResize(
            canvas, tw, th, cfg.resizeFocus, cfg.resizeAlign,
            cfg.resizeFill, cfg.fillColor, cfg.resizeBlend,
            (p, sub) => {
              updateInlineProgress(p, sub || 'Processing…', '');
              setPB(item.id, true, Math.round((step/total*100) + p*(1/total)));
            }
          );
          hideInlineProgress();
          log(`  ✓ smart resize → ${canvas.width}×${canvas.height}`, 'ok');
        }
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));

        // ── Now upscale the composed result ──
        pipeStep(step,'running');
        log(`  → upscaling ×${cfg.factor} (${cfg.method})...`,'warn');
        showInlineProgress(`Upscaling ×${cfg.factor}`, '🔎');
        canvas = await upscale(canvas, cfg.factor, cfg.method, (p) => {
          updateInlineProgress(p, `Lanczos-3 — ${Math.round(p)}%`, '');
          setPB(item.id, true, Math.round((step/total*100) + p*(1/total)));
        });
        hideInlineProgress();
        log(`  ✓ upscaled → ${canvas.width}×${canvas.height}`,'ok');
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));

        pipeStep(step,'running');
        log('  → encoding WebP...','warn');
        showInlineProgress('Encoding WebP', '🌐');
        updateInlineProgress(30, 'Compressing…', `quality: ${Math.round(cfg.quality*100)}%`);
        const { blob: blob3, dataURL: dataURL3 } = await encodeWebP(canvas, cfg.quality, cfg.maxKB);
        updateInlineProgress(100, 'Done ✓', '');
        hideInlineProgress();
        pipeStep(step,'done'); setPB(item.id, true, 100);
        const base3 = item.name.replace(/\.[^.]+$/, '');
        const prefix = cfg.resizeMode === 'proportional' ? 'fit' : 'resize';
        const out3 = { id: item.id, name: `${prefix}_${base3}.webp`, blob: blob3, dataURL: dataURL3, orig: item.size, size: blob3.size, dims: `${canvas.width}×${canvas.height}` };
        results.push(out3); addResult(out3); setQS(item.id,'sd','DONE');
        log(`  ✓ ${out3.name} — ${(blob3.size/1024).toFixed(0)} KB`,'ok');
      }

    } catch (err) {
      setQS(item.id,'se','ERROR'); log('  ✗ '+err.message,'err'); console.error(err);
      hideModelOverlay(); hideInlineProgress();
    }
    setPB(item.id, false, 0); resetTrack();
  }

  document.getElementById('statsCount').textContent = results.length;
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('resCount').textContent = results.length + ' file' + (results.length !== 1 ? 's' : '');
  document.getElementById('runBtn').disabled = false;
  log(`Done. ${results.length} file(s) ready.`, 'ok');
}

const tick = () => new Promise(r => setTimeout(r, 0));

// ═══════════════════════════════════════════════════════════════════
// PROPORTIONAL FIT
// ═══════════════════════════════════════════════════════════════════
function proportionalResize(srcCanvas, targetW, targetH, fillMode, align, fillColor) {
  const sW = srcCanvas.width, sH = srcCanvas.height;
  const ratio = Math.min(targetW / sW, targetH / sH);
  const fitW  = Math.round(sW * ratio);
  const fitH  = Math.round(sH * ratio);
  const scaled = document.createElement('canvas');
  scaled.width = fitW; scaled.height = fitH;
  const sCtx = scaled.getContext('2d');
  sCtx.imageSmoothingEnabled = true; sCtx.imageSmoothingQuality = 'high';
  sCtx.drawImage(srcCanvas, 0, 0, fitW, fitH);
  const out = document.createElement('canvas');
  out.width = targetW; out.height = targetH;
  const ctx = out.getContext('2d');
  if      (fillMode === 'white')  { ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,targetW,targetH); }
  else if (fillMode === 'black')  { ctx.fillStyle='#000000'; ctx.fillRect(0,0,targetW,targetH); }
  else if (fillMode === 'color')  { ctx.fillStyle=fillColor; ctx.fillRect(0,0,targetW,targetH); }
  else if (fillMode === 'blur')   { drawBlurredBackground(ctx, srcCanvas, targetW, targetH); }
  const padX = targetW - fitW, padY = targetH - fitH;
  let ox = Math.round(padX/2), oy = Math.round(padY/2);
  switch (align) {
    case 'top-left':      ox=0;     oy=0;     break;
    case 'top-center':    ox=Math.round(padX/2); oy=0; break;
    case 'top-right':     ox=padX;  oy=0;     break;
    case 'middle-left':   ox=0;     oy=Math.round(padY/2); break;
    case 'middle-right':  ox=padX;  oy=Math.round(padY/2); break;
    case 'bottom-left':   ox=0;     oy=padY;  break;
    case 'bottom-center': ox=Math.round(padX/2); oy=padY; break;
    case 'bottom-right':  ox=padX;  oy=padY;  break;
  }
  ox = Math.max(0, ox); oy = Math.max(0, oy);
  ctx.drawImage(scaled, ox, oy);
  return out;
}

function drawBlurredBackground(ctx, srcCanvas, W, H) {
  const coverRatio = Math.max(W/srcCanvas.width, H/srcCanvas.height);
  const cW=Math.round(srcCanvas.width*coverRatio), cH=Math.round(srcCanvas.height*coverRatio);
  const ox=Math.round((W-cW)/2), oy=Math.round((H-cH)/2);
  ctx.filter='blur(24px) brightness(0.6) saturate(1.3)';
  ctx.drawImage(srcCanvas, ox, oy, cW, cH);
  ctx.filter='none';
  ctx.fillStyle='rgba(0,0,0,0.1)';
  ctx.fillRect(0,0,W,H);
}

// ═══════════════════════════════════════════════════════════════════
// SMART RESIZE — Unified aspect-aware crop + AI/seamless extension
//
// FIX: Old code cropped each axis independently which could distort
// aspect ratio. New code computes ONE crop region matching the target
// AR exactly, centred on the AI-detected focal point.
// Extension is separate and uses AI environment analysis when selected.
// ═══════════════════════════════════════════════════════════════════
async function smartResize(srcCanvas, targetW, targetH, focus, align, fillMode, fillColor, blendRadius, onProgress) {
  const sW = srcCanvas.width, sH = srcCanvas.height;
  const tAR = targetW / targetH;
  const sAR = sW / sH;

  onProgress && onProgress(8, 'Subject detection…');

  // Detect subject focal point for crop centering
  let fx = 0.5, fy = 0.4;
  if (focus === 'smart') {
    const result = await computeObjectCenter(srcCanvas);
    fx = result.x; fy = result.y;
    const methodLabel = result.method === 'ai-detection'
      ? `AI (${result.boxes?.length ?? 0} subjects)`
      : 'pixel saliency fallback';
    log(`  ✓ crop focus: ${(fx*100).toFixed(0)}% × ${(fy*100).toFixed(0)}%  [${methodLabel}]`, 'ok');
  } else {
    const map = { center:[.5,.5], top:[.5,.15], bottom:[.5,.85], left:[.15,.5], right:[.85,.5] };
    [fx, fy] = map[focus] || [.5,.5];
  }

  onProgress && onProgress(40, 'Computing layout…');

  // ── Determine how the source fits into the target canvas ──
  // Key insight: we place the source ON the target canvas (possibly cropped),
  // then fill extension zones. We do NOT early-return just because dims match
  // after cropping — we must still pass through the fill pipeline.

  // How much of the source to use (crop if source is larger than target in any axis)
  const usedW = Math.min(sW, targetW);
  const usedH = Math.min(sH, targetH);

  // If source is larger in BOTH axes: crop to target AR, center on focal point
  let cropX = 0, cropY = 0, cropW = usedW, cropH = usedH;
  if (sW > targetW || sH > targetH) {
    if (sAR > tAR) {
      // Source wider → fit height, crop width
      cropH = Math.min(sH, targetH);
      cropW = Math.round(cropH * tAR);
    } else {
      // Source taller → fit width, crop height
      cropW = Math.min(sW, targetW);
      cropH = Math.round(cropW / tAR);
    }
    cropW = Math.min(cropW, sW);
    cropH = Math.min(cropH, sH);
    cropX = Math.round(fx * sW - cropW / 2);
    cropY = Math.round(fy * sH - cropH / 2);
    cropX = Math.max(0, Math.min(sW - cropW, cropX));
    cropY = Math.max(0, Math.min(sH - cropH, cropY));
  }

  // Draw the (possibly cropped) source region
  const placed = document.createElement('canvas');
  placed.width = cropW; placed.height = cropH;
  placed.getContext('2d').drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // Anchor offset: where the placed image sits on the output canvas
  const { ox, oy } = getAnchorOffset(cropW, cropH, targetW, targetH, align);

  // If source fills the target exactly with no extension zones needed, skip fill
  const needsFill = cropW < targetW || cropH < targetH;

  const out = document.createElement('canvas');
  out.width = targetW; out.height = targetH;
  const ctx = out.getContext('2d');

  if (!needsFill) {
    // Pure crop — no extension zones exist, just draw
    ctx.drawImage(placed, ox, oy);
    onProgress && onProgress(100, 'Done ✓');
    return out;
  }

  onProgress && onProgress(55, fillMode === 'ai-extend' ? 'AI environment analysis…' : 'Filling extended areas…');

  if (fillMode === 'ai-extend') {
    // Pass the ORIGINAL srcCanvas as the border reference so AI samples
    // the true background colors, not the already-cropped region
    await fillSeamlessAI(ctx, placed, srcCanvas, ox, oy, targetW, targetH, blendRadius,
      (p, s) => onProgress && onProgress(55 + p * 0.40, s)
    );
  } else if (fillMode === 'extend') {
    fillSeamless(ctx, placed, ox, oy, targetW, targetH, blendRadius);
  } else if (fillMode === 'blur') {
    drawBlurredBackground(ctx, srcCanvas, targetW, targetH);
    ctx.drawImage(placed, ox, oy);
  } else {
    applyFill(ctx, targetW, targetH, fillMode, fillColor);
    ctx.drawImage(placed, ox, oy);
  }

  onProgress && onProgress(100, 'Done ✓');
  return out;
}

function getAnchorOffset(srcW, srcH, W, H, align) {
  const cx=Math.round((W-srcW)/2), cy=Math.round((H-srcH)/2);
  const bx=W-srcW, by=H-srcH;
  let ox=cx, oy=cy;
  switch (align) {
    case 'top-left':      ox=0;  oy=0;  break;
    case 'top-center':    ox=cx; oy=0;  break;
    case 'top-right':     ox=bx; oy=0;  break;
    case 'middle-left':   ox=0;  oy=cy; break;
    case 'middle-right':  ox=bx; oy=cy; break;
    case 'bottom-left':   ox=0;  oy=by; break;
    case 'bottom-center': ox=cx; oy=by; break;
    case 'bottom-right':  ox=bx; oy=by; break;
  }
  return { ox, oy };
}

function applyFill(ctx, W, H, fillMode, fillColor) {
  ctx.clearRect(0,0,W,H);
  if      (fillMode==='white') { ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H); }
  else if (fillMode==='black') { ctx.fillStyle='#000000'; ctx.fillRect(0,0,W,H); }
  else if (fillMode==='color') { ctx.fillStyle=fillColor; ctx.fillRect(0,0,W,H); }
}

// ═══════════════════════════════════════════════════════════════════
// LaMa ONNX — in-browser AI inpainting engine
//
// Model: Carve/LaMa-ONNX (Apache 2.0) — 51M param, 208MB fp32
// Runtime: onnxruntime-web WASM (WebGPU skipped — FFC ops incompatible)
// Cached: IndexedDB after first download — never re-downloads
//
// Outpainting strategy:
//   For each extension zone (top/bottom/left/right):
//   1. Build a 512×512 context window that straddles the seam:
//      ~half original image pixels (known), ~half extension area (to fill).
//   2. Create a binary mask: 0 = known pixels, 1 = fill area.
//   3. Run LaMa inference → model hallucinates the fill area from context.
//   4. Composite the filled tiles back onto the output canvas.
//   5. Multi-pass seam blend for smooth integration.
// ═══════════════════════════════════════════════════════════════════

// ── LaMa model state ──
let _lamaSession = null;
let _lamaLoading = false;

const LAMA_MODEL_URL = 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx';
const LAMA_CACHE_KEY = 'imgflow_lama_fp32_v1';
const LAMA_SIZE = 512; // model fixed input size

async function loadLaMaModel(onProgress) {
  if (_lamaSession) return _lamaSession;
  if (_lamaLoading) {
    // Wait for concurrent load
    while (_lamaLoading) await new Promise(r => setTimeout(r, 100));
    return _lamaSession;
  }
  _lamaLoading = true;
  try {
    // ── Load onnxruntime-web via esm.sh ──
    onProgress && onProgress(2, 'Loading ONNX Runtime…', '');
    const ortModule = await import('https://esm.sh/onnxruntime-web@1.21.0');
    const ort = ortModule.default || ortModule;

    // Point WASM binaries to CDN
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';
    ort.env.wasm.numThreads = 1; // safer cross-browser default

    // ── Try to get model from IndexedDB cache ──
    onProgress && onProgress(5, 'Checking local cache…', '');
    let modelBuffer = await loadFromIDB(LAMA_CACHE_KEY);

    if (!modelBuffer) {
      // ── Download model with progress ──
      onProgress && onProgress(8, 'Downloading LaMa model (208 MB)…', 'First run — will be cached forever');
      modelBuffer = await downloadWithProgress(LAMA_MODEL_URL, (loaded, total) => {
        const pct = total > 0 ? 8 + (loaded / total) * 75 : 8;
        const loadedMB = (loaded / 1048576).toFixed(1);
        const totalMB  = total > 0 ? (total / 1048576).toFixed(1) : '?';
        onProgress && onProgress(pct, `Downloading LaMa model…`, `${loadedMB} / ${totalMB} MB`);
      });

      onProgress && onProgress(85, 'Caching model in IndexedDB…', '');
      await saveToIDB(LAMA_CACHE_KEY, modelBuffer);
    } else {
      onProgress && onProgress(80, 'Model loaded from cache ✓', '');
    }

    // ── Create ORT session — WASM only ──
    // LaMa's Fourier Feature Convolutions (FFC) trigger a WebGPU kernel crash:
    // "Can't perform binary op on given tensors" on the irfftn Add nodes.
    // WASM is stable everywhere and fast enough for 512×512 tiles.
    onProgress && onProgress(88, 'Initialising ONNX session (WASM)…', '');
    const ep = 'wasm';
    _lamaSession = await ort.InferenceSession.create(modelBuffer, {
      graphOptimizationLevel: 'all',
      executionProviders: ['wasm'],
    });
    log(`  ✓ LaMa ONNX session ready (${ep})`, 'ok');
    onProgress && onProgress(100, `LaMa ready (WASM) ✓`, '');
    return _lamaSession;
  } finally {
    _lamaLoading = false;
  }
}

// ── IndexedDB helpers ──
async function loadFromIDB(key) {
  return new Promise(res => {
    try {
      const req = indexedDB.open('imgflow_models', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('models');
      req.onsuccess = e => {
        const tx = e.target.result.transaction('models', 'readonly');
        const get = tx.objectStore('models').get(key);
        get.onsuccess = () => res(get.result || null);
        get.onerror = () => res(null);
      };
      req.onerror = () => res(null);
    } catch { res(null); }
  });
}

async function saveToIDB(key, buffer) {
  return new Promise(res => {
    try {
      const req = indexedDB.open('imgflow_models', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('models');
      req.onsuccess = e => {
        const tx = e.target.result.transaction('models', 'readwrite');
        tx.objectStore('models').put(buffer, key);
        tx.oncomplete = () => res(true);
        tx.onerror = () => res(false);
      };
      req.onerror = () => res(false);
    } catch { res(false); }
  });
}

async function downloadWithProgress(url, onProgress) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} downloading model`);
  const total = parseInt(resp.headers.get('Content-Length') || '0');
  const reader = resp.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total);
  }
  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  return merged.buffer;
}

// ── Run LaMa on a 512×512 tile ──
async function lamaInpaint(session, imageCanvas512, maskCanvas512) {
  // imageCanvas512 and maskCanvas512 must be exactly 512×512
  const ortModule = await import('https://esm.sh/onnxruntime-web@1.21.0');
  const ort = ortModule.default || ortModule;

  const imgCtx = imageCanvas512.getContext('2d');
  const mskCtx = maskCanvas512.getContext('2d');
  const imgD = imgCtx.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE).data;
  const mskD = mskCtx.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE).data;

  // Image: RGBA uint8 → float32 [1,3,512,512] (RGB, 0-1 range)
  const imgF = new Float32Array(3 * LAMA_SIZE * LAMA_SIZE);
  for (let i = 0; i < LAMA_SIZE * LAMA_SIZE; i++) {
    imgF[i]                           = imgD[i * 4]     / 255; // R channel
    imgF[LAMA_SIZE * LAMA_SIZE + i]   = imgD[i * 4 + 1] / 255; // G channel
    imgF[2 * LAMA_SIZE * LAMA_SIZE + i] = imgD[i * 4 + 2] / 255; // B channel
  }

  // Mask: single channel float32 [1,1,512,512] — 1.0 = fill this pixel, 0.0 = keep
  const mskF = new Float32Array(LAMA_SIZE * LAMA_SIZE);
  for (let i = 0; i < LAMA_SIZE * LAMA_SIZE; i++) {
    mskF[i] = mskD[i * 4] > 127 ? 1.0 : 0.0;
  }

  const imgTensor = new ort.Tensor('float32', imgF, [1, 3, LAMA_SIZE, LAMA_SIZE]);
  const mskTensor = new ort.Tensor('float32', mskF, [1, 1, LAMA_SIZE, LAMA_SIZE]);

  // LaMa input names: 'image' and 'mask'
  const feeds = { image: imgTensor, mask: mskTensor };
  const results = await session.run(feeds);

  // Output tensor: [1,3,512,512], values 0-255 (ONNX version outputs 0-255 directly)
  const outTensor = results[Object.keys(results)[0]];
  const outData = outTensor.data;

  // Convert back to canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = LAMA_SIZE; outCanvas.height = LAMA_SIZE;
  const outCtx = outCanvas.getContext('2d');
  const outImgD = outCtx.createImageData(LAMA_SIZE, LAMA_SIZE);
  const od = outImgD.data;
  const N = LAMA_SIZE * LAMA_SIZE;
  for (let i = 0; i < N; i++) {
    od[i * 4]     = clamp(outData[i]         | 0, 0, 255); // R
    od[i * 4 + 1] = clamp(outData[N + i]     | 0, 0, 255); // G
    od[i * 4 + 2] = clamp(outData[2 * N + i] | 0, 0, 255); // B
    od[i * 4 + 3] = 255;
  }
  outCtx.putImageData(outImgD, 0, 0);
  return outCanvas;
}

// ── Main AI fill entry point ──
async function fillSeamlessAI(ctx, srcCanvas, origCanvas, ox, oy, W, H, blendRadius, onProgress) {
  onProgress && onProgress(0, 'Loading LaMa AI model…');
  const sW = srcCanvas.width, sH = srcCanvas.height;

  // ── Load LaMa session (downloads + caches on first run) ──
  let session;
  try {
    session = await loadLaMaModel((pct, sub, detail) => {
      updateModelProgress(pct, sub, detail);
      onProgress && onProgress(pct * 0.35, sub); // model load = 0-35% of fill progress
    });
  } catch (e) {
    log(`  ⚠ LaMa load failed (${e.message}) — falling back to edge sampling`, 'warn');
    fillSeamless(ctx, srcCanvas, ox, oy, W, H, blendRadius);
    return;
  }

  onProgress && onProgress(36, 'Preparing tiles…');
  await tick();

  // ── Build full composite canvas at output resolution ──
  // Start with edge-pixel fill as the base (seamless fallback pixels for non-LaMa regions)
  fillSeamless(ctx, srcCanvas, ox, oy, W, H, blendRadius);

  // ── For each extension zone, run LaMa inpainting ──
  // Strategy: create a 512×512 tile centred on the seam, mask the extension zone,
  // run LaMa, then composite the filled region back.

  const zones = [];
  if (ox > 0)           zones.push({ side: 'left',   extW: ox,       extH: sH       });
  if (ox + sW < W)      zones.push({ side: 'right',  extW: W-ox-sW,  extH: sH       });
  if (oy > 0)           zones.push({ side: 'top',    extW: W,        extH: oy       });
  if (oy + sH < H)      zones.push({ side: 'bottom', extW: W,        extH: H-oy-sH  });

  if (zones.length === 0) { onProgress && onProgress(100, 'Done ✓'); return; }

  const zoneProgressShare = 60 / zones.length; // 36-96% split across zones

  for (let zi = 0; zi < zones.length; zi++) {
    const z = zones[zi];
    const zBase = 36 + zi * zoneProgressShare;

    onProgress && onProgress(zBase, `LaMa: processing ${z.side} zone…`);
    await tick();

    // ── Tile along the seam edge in 512px strips ──
    // For each strip: overlap 50% known pixels + 50% extension pixels
    // We march along the strip's long axis in steps

    const HALF = LAMA_SIZE >> 1; // 256px of known, 256px of fill

    // Determine geometry for this zone
    let strips;
    if (z.side === 'left' || z.side === 'right') {
      // Vertical zones: march along Y
      const isLeft = z.side === 'left';
      const tileKnownW = Math.min(HALF, sW);
      const tileFillW  = Math.min(HALF, z.extW);
      const tileW = tileKnownW + tileFillW;
      const step = LAMA_SIZE; // step along Y (full tile height)
      strips = [];
      for (let tileTop = oy; tileTop < oy + sH; tileTop += step) {
        const tileH = Math.min(LAMA_SIZE, oy + sH - tileTop);
        strips.push({ tileTop, tileH, tileW, tileKnownW, tileFillW, isLeft });
      }
    } else {
      // Horizontal zones: march along X
      const isTop = z.side === 'top';
      const tileKnownH = Math.min(HALF, sH);
      const tileFillH  = Math.min(HALF, z.extH);
      const tileH = tileKnownH + tileFillH;
      const step = LAMA_SIZE;
      strips = [];
      for (let tileLeft = ox; tileLeft < ox + sW; tileLeft += step) {
        const tileW = Math.min(LAMA_SIZE, ox + sW - tileLeft);
        strips.push({ tileLeft, tileW, tileH, tileKnownH, tileFillH, isTop });
      }
    }

    for (let si = 0; si < strips.length; si++) {
      const sp = strips[si];
      const stripProg = zBase + (si / strips.length) * zoneProgressShare * 0.9;
      onProgress && onProgress(stripProg, `LaMa: ${z.side} strip ${si + 1}/${strips.length}…`);
      await tick();

      // Build 512×512 input tile
      const tileImg = document.createElement('canvas');
      tileImg.width = LAMA_SIZE; tileImg.height = LAMA_SIZE;
      const tileCtx = tileImg.getContext('2d');

      const tileMsk = document.createElement('canvas');
      tileMsk.width = LAMA_SIZE; tileMsk.height = LAMA_SIZE;
      const maskCtx = tileMsk.getContext('2d');

      // Fill tile background with edge-pixel base (from fillSeamless done earlier)
      const existingData = ctx.getImageData(0, 0, W, H);

      if (z.side === 'left' || z.side === 'right') {
        const { tileTop, tileH, tileW, tileKnownW, tileFillW, isLeft } = sp;
        // Known region: rightmost tileKnownW pixels of src (for left ext) or leftmost (for right ext)
        let srcKnownX, fillStartX, fillMaskX;
        if (isLeft) {
          srcKnownX  = ox;                         // known region starts at ox in output
          fillMaskX  = 0;                          // fill region is on the left (x=0..tileFillW in tile)
          // tile layout: [fill_zone | known_zone]
          // draw known region on right side of tile
          for (let row = 0; row < tileH; row++) {
            const srcY = tileTop + row;
            if (srcY >= oy && srcY < oy + sH) {
              for (let col = 0; col < tileKnownW; col++) {
                const srcX = ox + col;
                const sp2 = (srcY * W + srcX) * 4;
                const tp = (row * LAMA_SIZE + tileFillW + col) * 4;
                const td = tileCtx.createImageData ? null : null; // use putPixel approach
                // We'll draw via a temp array
              }
            }
          }
          // Easier: draw srcCanvas region directly
          tileCtx.drawImage(srcCanvas,
            0, tileTop - oy, tileKnownW, tileH,         // src rect (left edge of srcCanvas)
            tileFillW, 0, tileKnownW, tileH              // tile dest (right half)
          );
          // Fill left half from edge-pixel base
          const baseSlice = ctx.getImageData(0, tileTop, tileFillW, tileH);
          const baseTileD = tileCtx.createImageData(tileFillW, tileH);
          baseTileD.data.set(baseSlice.data);
          tileCtx.putImageData(baseTileD, 0, 0);
          // Mask: left half = fill, right half = known
          maskCtx.fillStyle = '#ffffff';
          maskCtx.fillRect(0, 0, tileFillW, tileH);
          maskCtx.fillStyle = '#000000';
          maskCtx.fillRect(tileFillW, 0, tileKnownW, tileH);
        } else {
          // right extension
          const rightEdgeX = ox + sW;  // where extension starts in output
          tileCtx.drawImage(srcCanvas,
            sW - tileKnownW, tileTop - oy, tileKnownW, tileH, // right edge of src
            0, 0, tileKnownW, tileH                            // tile left half
          );
          // Fill right half from edge-pixel base
          const baseSlice = ctx.getImageData(rightEdgeX, tileTop, tileFillW, tileH);
          const baseTileD = tileCtx.createImageData(tileFillW, tileH);
          baseTileD.data.set(baseSlice.data);
          tileCtx.putImageData(baseTileD, tileKnownW, 0);
          // Mask
          maskCtx.fillStyle = '#000000';
          maskCtx.fillRect(0, 0, tileKnownW, tileH);
          maskCtx.fillStyle = '#ffffff';
          maskCtx.fillRect(tileKnownW, 0, tileFillW, tileH);
        }
      } else {
        // top / bottom
        const { tileLeft, tileW, tileH, tileKnownH, tileFillH, isTop } = sp;
        if (isTop) {
          // known region on bottom of tile, fill on top
          tileCtx.drawImage(srcCanvas,
            tileLeft - ox, 0, tileW, tileKnownH,    // top edge of srcCanvas
            0, tileFillH, tileW, tileKnownH          // tile bottom half
          );
          const baseSlice = ctx.getImageData(tileLeft, oy - tileFillH, tileW, tileFillH);
          const baseTileD = tileCtx.createImageData(tileW, tileFillH);
          baseTileD.data.set(baseSlice.data);
          tileCtx.putImageData(baseTileD, 0, 0);
          maskCtx.fillStyle = '#ffffff';
          maskCtx.fillRect(0, 0, tileW, tileFillH);
          maskCtx.fillStyle = '#000000';
          maskCtx.fillRect(0, tileFillH, tileW, tileKnownH);
        } else {
          // bottom extension — known on top, fill on bottom
          tileCtx.drawImage(srcCanvas,
            tileLeft - ox, sH - tileKnownH, tileW, tileKnownH,
            0, 0, tileW, tileKnownH
          );
          const bottomExtY = oy + sH;
          const baseSlice = ctx.getImageData(tileLeft, bottomExtY, tileW, tileFillH);
          const baseTileD = tileCtx.createImageData(tileW, tileFillH);
          baseTileD.data.set(baseSlice.data);
          tileCtx.putImageData(baseTileD, 0, tileKnownH);
          maskCtx.fillStyle = '#000000';
          maskCtx.fillRect(0, 0, tileW, tileKnownH);
          maskCtx.fillStyle = '#ffffff';
          maskCtx.fillRect(0, tileKnownH, tileW, tileFillH);
        }
      }

      // Scale tile to exact 512×512 for LaMa (it needs fixed 512×512)
      const scaledImg = document.createElement('canvas');
      scaledImg.width = LAMA_SIZE; scaledImg.height = LAMA_SIZE;
      scaledImg.getContext('2d').drawImage(tileImg, 0, 0, LAMA_SIZE, LAMA_SIZE);

      const scaledMsk = document.createElement('canvas');
      scaledMsk.width = LAMA_SIZE; scaledMsk.height = LAMA_SIZE;
      scaledMsk.getContext('2d').drawImage(tileMsk, 0, 0, LAMA_SIZE, LAMA_SIZE);

      // ── Run LaMa ──
      let resultCanvas;
      try {
        resultCanvas = await lamaInpaint(session, scaledImg, scaledMsk);
      } catch (e) {
        log(`  ⚠ LaMa tile failed: ${e.message}`, 'warn');
        continue;
      }

      // ── Composite result back ──
      // Scale result back to tile's original dimensions, then draw only the MASK region onto output
      if (z.side === 'left' || z.side === 'right') {
        const { tileTop, tileH, tileFillW, isLeft } = sp;
        const resultScaled = document.createElement('canvas');
        const rW = isLeft ? tileFillW : sp.tileFillW;
        resultScaled.width = rW; resultScaled.height = tileH;
        const rCtx = resultScaled.getContext('2d');
        if (isLeft) {
          rCtx.drawImage(resultCanvas, 0, 0, tileFillW, tileH, 0, 0, rW, tileH);
          ctx.drawImage(resultScaled, 0, tileTop, rW, tileH);
        } else {
          const srcX = sp.tileKnownW / LAMA_SIZE * LAMA_SIZE; // = tileKnownW (already 512-space)
          rCtx.drawImage(resultCanvas, sp.tileKnownW, 0, sp.tileFillW, tileH, 0, 0, rW, tileH);
          ctx.drawImage(resultScaled, ox + sW, tileTop, rW, tileH);
        }
      } else {
        const { tileLeft, tileW, tileFillH, isTop } = sp;
        const resultScaled = document.createElement('canvas');
        resultScaled.width = tileW; resultScaled.height = tileFillH;
        const rCtx = resultScaled.getContext('2d');
        if (isTop) {
          rCtx.drawImage(resultCanvas, 0, 0, tileW, tileFillH, 0, 0, tileW, tileFillH);
          ctx.drawImage(resultScaled, tileLeft, 0, tileW, tileFillH);
        } else {
          rCtx.drawImage(resultCanvas, 0, sp.tileKnownH, tileW, tileFillH, 0, 0, tileW, tileFillH);
          ctx.drawImage(resultScaled, tileLeft, oy + sH, tileW, tileFillH);
        }
      }
    }
  }

  // ── Re-stamp the source image (LaMa may have slightly altered seam pixels) ──
  ctx.drawImage(srcCanvas, ox, oy);

  onProgress && onProgress(96, 'Multi-pass seam blending…');
  await tick();

  // Three-pass seam blend
  const br = Math.max(8, blendRadius);
  blendSeam(ctx, ox, oy, sW, sH, W, H, br * 2.5 | 0);
  await tick();
  blendSeam(ctx, ox, oy, sW, sH, W, H, br);
  await tick();
  blendSeam(ctx, ox, oy, sW, sH, W, H, Math.max(4, br >> 1));

  onProgress && onProgress(100, 'LaMa AI extension complete ✓');
}

// Multi-scale border palette: samples at 3 different strip depths for richer data
function sampleBorderPalettesMultiScale(data, W, H, strip) {
  // Combine samples from inner, mid, and outer strip zones
  const buckets = { top:[], bottom:[], left:[], right:[] };
  const depths = [Math.max(4, strip >> 2), Math.max(8, strip >> 1), strip];
  for (const d of depths) {
    const step = Math.max(1, W >> 7);
    for (let y = 0; y < Math.min(d, H); y++)
      for (let x = 0; x < W; x += step) { const i=(y*W+x)*4; buckets.top.push([data[i],data[i+1],data[i+2]]); }
    for (let y = Math.max(0,H-d); y < H; y++)
      for (let x = 0; x < W; x += step) { const i=(y*W+x)*4; buckets.bottom.push([data[i],data[i+1],data[i+2]]); }
    const stepH = Math.max(1, H >> 7);
    for (let y = 0; y < H; y += stepH)
      for (let x = 0; x < Math.min(d, W); x++) { const i=(y*W+x)*4; buckets.left.push([data[i],data[i+1],data[i+2]]); }
    for (let y = 0; y < H; y += stepH)
      for (let x = Math.max(0,W-d); x < W; x++) { const i=(y*W+x)*4; buckets.right.push([data[i],data[i+1],data[i+2]]); }
  }
  const avg = arr => {
    if (!arr.length) return {r:128,g:128,b:128};
    let r=0,g=0,b=0;
    for (const [cr,cg,cb] of arr){r+=cr;g+=cg;b+=cb;}
    return {r:r/arr.length, g:g/arr.length, b:b/arr.length};
  };
  return { top:avg(buckets.top), bottom:avg(buckets.bottom), left:avg(buckets.left), right:avg(buckets.right) };
}

// sampleBorderPalettes replaced by sampleBorderPalettesMultiScale above

// Measure texture frequency via local variance in border strip
function analyseTextureFrequency(data, W, H, strip) {
  let totalVar = 0, count = 0;
  const step = Math.max(1, (strip * 2 * W) >> 10);
  for (let y = 0; y < Math.min(strip*2, H-1); y++)
    for (let x = 1; x < W-1; x += step) {
      const i = (y*W+x)*4;
      totalVar += Math.abs(data[i]-data[i+4]) + Math.abs(data[i+1]-data[i+5]) + Math.abs(data[i+2]-data[i+6]);
      count++;
    }
  const avgVar = count > 0 ? totalVar / count : 0;
  const t = Math.min(avgVar / 75, 1);
  return {
    noiseScale: lerp(0.006, 0.048, t),
    noiseAmp:   lerp(0.015, 0.28,  t),
    avgVar,
  };
}

function getDominantBorderColor(pal, xZone, yZone) {
  let r=0, g=0, b=0, w=0;
  if (xZone==='left')   { r+=pal.left.r;   g+=pal.left.g;   b+=pal.left.b;   w++; }
  if (xZone==='right')  { r+=pal.right.r;  g+=pal.right.g;  b+=pal.right.b;  w++; }
  if (yZone==='top')    { r+=pal.top.r;    g+=pal.top.g;    b+=pal.top.b;    w++; }
  if (yZone==='bottom') { r+=pal.bottom.r; g+=pal.bottom.g; b+=pal.bottom.b; w++; }
  if (w===0) return {r:128,g:128,b:128};
  return {r:r/w, g:g/w, b:b/w};
}

// Smooth deterministic value noise using gradient hash
function valueNoise(x, y) {
  const xi = x | 0, yi = y | 0;
  const xf = x - xi, yf = y - yi;
  const fade = t => t*t*(3-2*t);
  const h = (a, b) => {
    let s = (a*1619 + b*31337) | 0;
    s ^= s<<13; s ^= s>>17; s ^= s<<5;
    return ((s>>>0) / 0xFFFFFFFF) * 2 - 1;
  };
  return lerp(
    lerp(h(xi,yi), h(xi+1,yi), fade(xf)),
    lerp(h(xi,yi+1), h(xi+1,yi+1), fade(xf)),
    fade(yf)
  );
}

// ═══════════════════════════════════════════════════════════════════
// SEAMLESS EXTENSION (edge-pixel sampling, used for fillMode='extend')
// ═══════════════════════════════════════════════════════════════════
function fillSeamless(ctx, srcCanvas, ox, oy, W, H, blendRadius) {
  const sW=srcCanvas.width, sH=srcCanvas.height;
  const srcCtx=srcCanvas.getContext('2d');
  const srcData=srcCtx.getImageData(0,0,sW,sH).data;
  const imgData=ctx.createImageData(W,H);
  const od=imgData.data;
  const STRIP=Math.max(6,Math.min(blendRadius,(Math.min(sW,sH)*0.18)|0));

  for (let y=0;y<H;y++) {
    for (let x=0;x<W;x++) {
      const rx=x-ox, ry=y-oy;
      const inX=rx>=0&&rx<sW, inY=ry>=0&&ry<sH;
      if (inX&&inY) {
        const sp=(ry*sW+rx)*4, dp=(y*W+x)*4;
        od[dp]=srcData[sp]; od[dp+1]=srcData[sp+1]; od[dp+2]=srcData[sp+2]; od[dp+3]=srcData[sp+3];
        continue;
      }
      let r=0,g=0,b=0,a=0,wt=0;
      for (let k=0;k<STRIP;k++) {
        const w=Math.pow((STRIP-k)/STRIP,1.5);
        let sx,sy;
        if (!inX&&!inY) {
          sx=rx<0?Math.min(k,sW-1):Math.max(sW-1-k,0);
          sy=ry<0?Math.min(k,sH-1):Math.max(sH-1-k,0);
        } else if (!inX) {
          sx=rx<0?Math.min(k,sW-1):Math.max(sW-1-k,0);
          sy=clamp(ry,0,sH-1);
        } else {
          sy=ry<0?Math.min(k,sH-1):Math.max(sH-1-k,0);
          sx=clamp(rx,0,sW-1);
        }
        const sp=(sy*sW+sx)*4;
        r+=srcData[sp]*w; g+=srcData[sp+1]*w; b+=srcData[sp+2]*w; a+=(srcData[sp+3]/255)*w; wt+=w;
      }
      if (wt>0){r/=wt;g/=wt;b/=wt;a/=wt;}
      const distX=inX?0:(rx<0?-rx:rx-sW+1);
      const distY=inY?0:(ry<0?-ry:ry-sH+1);
      const dist=Math.max(distX,distY);
      const fade=Math.min(dist/(STRIP*3.0),1.0);
      r=lerp(r,lerp(r,200,0.15),fade*0.25);
      g=lerp(g,lerp(g,200,0.15),fade*0.25);
      b=lerp(b,lerp(b,200,0.15),fade*0.25);
      const dp=(y*W+x)*4;
      od[dp]=clamp(r|0,0,255); od[dp+1]=clamp(g|0,0,255); od[dp+2]=clamp(b|0,0,255); od[dp+3]=clamp((a*255)|0,0,255);
    }
  }
  ctx.putImageData(imgData,0,0);
  if (blendRadius>0) blendSeam(ctx,ox,oy,sW,sH,W,H,blendRadius);
}

function blendSeam(ctx,ox,oy,srcW,srcH,W,H,radius) {
  const imgData=ctx.getImageData(0,0,W,H); const data=imgData.data;
  for (let y=oy;y<oy+srcH&&y<H;y++) {
    for (let x=ox;x<ox+srcW&&x<W;x++) {
      const dx=Math.min(x-ox,ox+srcW-1-x), dy=Math.min(y-oy,oy+srcH-1-y);
      const d=Math.min(dx,dy); if (d>=radius) continue;
      const t=d/radius, smooth=t*t*(3-2*t);
      const pi=(y*W+x)*4;
      let nx,ny;
      if (dx<=dy) { nx=x<ox+srcW/2?ox-1:ox+srcW; ny=y; }
      else { ny=y<oy+srcH/2?oy-1:oy+srcH; nx=x; }
      nx=clamp(nx,0,W-1); ny=clamp(ny,0,H-1);
      const np=(ny*W+nx)*4;
      data[pi]  =lerp(data[np],  data[pi],  smooth)|0;
      data[pi+1]=lerp(data[np+1],data[pi+1],smooth)|0;
      data[pi+2]=lerp(data[np+2],data[pi+2],smooth)|0;
    }
  }
  ctx.putImageData(imgData,0,0);
}

function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function lerp(a,b,t){return a+(b-a)*t;}

// ═══════════════════════════════════════════════════════════════════
// AI SUBJECT DETECTION — COCO-SSD + BlazeFace + saliency fallback
// ═══════════════════════════════════════════════════════════════════
const CLASS_PRIORITY = {
  person:0.95, face:1.0, cat:0.90, dog:0.90, bird:0.85,
  horse:0.85, sheep:0.80, cow:0.80, elephant:0.80, bear:0.80,
  zebra:0.80, giraffe:0.80,
  bottle:0.55, wine_glass:0.55, cup:0.55, fork:0.50, knife:0.50,
  spoon:0.50, bowl:0.55, banana:0.50, apple:0.50, sandwich:0.50,
  orange:0.50, broccoli:0.45, carrot:0.45, hot_dog:0.50, pizza:0.55,
  donut:0.50, cake:0.55,
  chair:0.40, couch:0.40, potted_plant:0.40, bed:0.40, dining_table:0.40,
  toilet:0.35, tv:0.45, laptop:0.60, mouse:0.50, remote:0.50,
  keyboard:0.50, cell_phone:0.60, microwave:0.45, oven:0.45,
  toaster:0.40, sink:0.40, refrigerator:0.40, book:0.45,
  clock:0.50, vase:0.55, scissors:0.45, teddy_bear:0.70,
  hair_drier:0.45, toothbrush:0.45,
  bicycle:0.65, car:0.65, motorcycle:0.65, airplane:0.70, bus:0.65,
  train:0.65, truck:0.65, boat:0.60, traffic_light:0.45,
  fire_hydrant:0.45, stop_sign:0.50, parking_meter:0.40, bench:0.40,
  backpack:0.60, umbrella:0.55, handbag:0.60, tie:0.55, suitcase:0.55,
  frisbee:0.50, skis:0.50, snowboard:0.50, sports_ball:0.55, kite:0.50,
  baseball_bat:0.50, baseball_glove:0.50, skateboard:0.55,
  surfboard:0.55, tennis_racket:0.55,
};

let _tfMod = null, _cocoMod = null, _faceMod = null;

async function loadTFModels(onProgress) {
  if (_cocoMod && _faceMod) return { coco: _cocoMod, face: _faceMod };
  onProgress(5, 'Importing TensorFlow.js…', '');
  if (!_tfMod) { _tfMod = await import('https://esm.sh/@tensorflow/tfjs@4.22.0'); await _tfMod.ready(); }
  onProgress(20, 'TF.js ready · loading COCO-SSD…', '');
  const [cocoMod, blazeMod] = await Promise.all([
    import('https://esm.sh/@tensorflow-models/coco-ssd@2.2.3'),
    import('https://esm.sh/@tensorflow-models/blazeface@0.1.0'),
  ]);
  onProgress(45, 'Modules loaded · initialising models…', '');
  const [cocoModel, faceModel] = await Promise.all([cocoMod.load({ base: 'lite_mobilenet_v2' }), blazeMod.load()]);
  onProgress(100, 'Models ready ✓', '');
  _cocoMod = cocoModel; _faceMod = faceModel;
  return { coco: _cocoMod, face: _faceMod };
}

let _detectionOverlay = null;

function showDetectionOverlay() {
  if (_detectionOverlay) return;
  _detectionOverlay = document.createElement('div');
  _detectionOverlay.id = 'detectionOverlay';
  _detectionOverlay.innerHTML = `
    <div class="mo-card">
      <div class="mo-icon-wrap">
        <svg class="mo-spinner" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="rgba(124,92,255,0.15)" stroke-width="3"/>
          <path d="M24 4 A20 20 0 0 1 44 24" stroke="var(--a2)" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <span class="mo-icon-inner">🎯</span>
      </div>
      <div class="mo-title">Loading AI Subject Detector</div>
      <div class="mo-sub" id="doSub">Initialising…</div>
      <div class="mo-track">
        <div class="mo-bar-wrap">
          <div class="mo-bar" id="doBar" style="background:linear-gradient(90deg,var(--a2),var(--a))"></div>
          <div class="mo-bar-glow" id="doBarGlow" style="background:radial-gradient(ellipse,rgba(124,92,255,.6),transparent 70%)"></div>
        </div>
        <div class="mo-pct" id="doPct" style="color:var(--a2)">0%</div>
      </div>
      <div class="mo-files" id="doFiles">COCO-SSD (80 classes) + BlazeFace</div>
      <div class="mo-note">One-time download · models cached in browser</div>
    </div>`;
  document.body.appendChild(_detectionOverlay);
  requestAnimationFrame(() => _detectionOverlay.classList.add('visible'));
}

function updateDetectionProgress(pct, label, info) {
  const bar=document.getElementById('doBar'); const glow=document.getElementById('doBarGlow');
  const pctEl=document.getElementById('doPct'); const subEl=document.getElementById('doSub');
  const filesEl=document.getElementById('doFiles');
  if (bar) bar.style.width=pct+'%'; if (glow) glow.style.left=pct+'%';
  if (pctEl) pctEl.textContent=Math.round(pct)+'%';
  if (subEl&&label) subEl.textContent=label; if (filesEl&&info) filesEl.textContent=info;
}

function hideDetectionOverlay() {
  if (!_detectionOverlay) return;
  _detectionOverlay.classList.add('hiding');
  setTimeout(() => { _detectionOverlay?.remove(); _detectionOverlay=null; }, 600);
}

async function computeObjectCenter(canvas) {
  const W=canvas.width, H=canvas.height;
  const IW=Math.min(640,W), IH=Math.round(H*IW/W);
  const inferCanvas=document.createElement('canvas');
  inferCanvas.width=IW; inferCanvas.height=IH;
  inferCanvas.getContext('2d').drawImage(canvas,0,0,IW,IH);
  let boxes=[], usedMethod='saliency';
  try {
    const needsLoad=!_cocoMod||!_faceMod;
    if (needsLoad) { showDetectionOverlay(); log('  → loading TF.js + COCO-SSD + BlazeFace (first run only)…','warn'); }
    else { log('  → running AI subject detection (COCO-SSD + BlazeFace)…','warn'); }
    const { coco, face } = await loadTFModels((pct,label,info) => { if (needsLoad) updateDetectionProgress(pct,label,info); });
    if (needsLoad) hideDetectionOverlay();
    const cocoResults=await coco.detect(inferCanvas,20,0.25);
    for (const r of cocoResults) {
      const [bx,by,bw,bh]=r.bbox; const priority=CLASS_PRIORITY[r.class]??0.45;
      boxes.push({x:bx/IW,y:by/IH,w:bw/IW,h:bh/IH,label:r.class,score:r.score*priority,layer:'coco',rawScore:r.score});
    }
    const faceResults=await face.estimateFaces(inferCanvas,false);
    for (const f of faceResults) {
      const [ftl,fbr]=[f.topLeft,f.bottomRight];
      const [fx,fy]=Array.isArray(ftl)?ftl:[ftl[0],ftl[1]];
      const [fx2,fy2]=Array.isArray(fbr)?fbr:[fbr[0],fbr[1]];
      const prob=f.probability?.[0]??0.9;
      boxes.push({x:fx/IW,y:fy/IH,w:(fx2-fx)/IW,h:(fy2-fy)/IH,label:'face',score:prob,layer:'blazeface',rawScore:prob});
    }
    if (boxes.length>0){usedMethod='ai-detection'; log(`  ✓ detected ${boxes.length} subject(s): ${summariseBoxes(boxes)}`,'ok');}
    else log('  ⚠ no subjects detected — falling back to pixel saliency','warn');
  } catch(err) {
    log(`  ⚠ AI detection failed (${err.message}) — using saliency fallback`,'warn');
    hideDetectionOverlay(); boxes=[];
  }
  if (boxes.length>0) {
    boxes=mergeOverlappingBoxes(boxes);
    let tx=0,ty=0,tw=0;
    for (const b of boxes) {
      const area=b.w*b.h, areaBonus=Math.min(Math.sqrt(area)*2,1.2);
      const cx=b.x+b.w/2, cy=b.y+b.h/2;
      const centreBonus=1-Math.sqrt((cx-.5)**2+(cy-.5)**2)*0.3;
      const weight=b.score*areaBonus*centreBonus;
      tx+=(b.x+b.w/2)*weight; ty+=(b.y+b.h/2)*weight; tw+=weight;
    }
    if (tw>1e-6) return {x:tx/tw, y:ty/tw, boxes, method:usedMethod};
  }
  log('  → computing pixel saliency…','warn');
  const pt=await pixelSaliencyCenter(canvas);
  return {x:pt.x, y:pt.y, boxes:[], method:'saliency'};
}

function summariseBoxes(boxes) {
  const counts={};
  for (const b of boxes) counts[b.label]=(counts[b.label]||0)+1;
  return Object.entries(counts).map(([k,v])=>v>1?`${k}×${v}`:k).join(', ');
}

function mergeOverlappingBoxes(boxes) {
  const keep=[], used=new Set();
  const sorted=[...boxes].sort((a,b)=>b.score-a.score);
  for (let i=0;i<sorted.length;i++) {
    if (used.has(i)) continue;
    keep.push(sorted[i]);
    for (let j=i+1;j<sorted.length;j++) { if (!used.has(j)&&iou(sorted[i],sorted[j])>0.45) used.add(j); }
  }
  return keep;
}

function iou(a,b) {
  const ix1=Math.max(a.x,b.x),iy1=Math.max(a.y,b.y),ix2=Math.min(a.x+a.w,b.x+b.w),iy2=Math.min(a.y+a.h,b.y+b.h);
  const inter=Math.max(0,ix2-ix1)*Math.max(0,iy2-iy1);
  const union=a.w*a.h+b.w*b.h-inter;
  return union>0?inter/union:0;
}

// ═══════════════════════════════════════════════════════════════════
// PIXEL SALIENCY FALLBACK
// ═══════════════════════════════════════════════════════════════════
async function pixelSaliencyCenter(canvas) {
  const TW=80, TH=Math.max(1,Math.round(canvas.height/canvas.width*80));
  const tmp=document.createElement('canvas'); tmp.width=TW; tmp.height=TH;
  tmp.getContext('2d').drawImage(canvas,0,0,TW,TH);
  const {data}=tmp.getContext('2d').getImageData(0,0,TW,TH);
  const N=TW*TH;
  const lum=new Float32Array(N), rCh=new Float32Array(N), gCh=new Float32Array(N), bCh=new Float32Array(N);
  for (let i=0;i<N;i++){rCh[i]=data[i*4];gCh[i]=data[i*4+1];bCh[i]=data[i*4+2];lum[i]=.299*rCh[i]+.587*gCh[i]+.114*bCh[i];}
  let mR=0,mG=0,mB=0;
  for (let i=0;i<N;i++){mR+=rCh[i];mG+=gCh[i];mB+=bCh[i];}
  mR/=N;mG/=N;mB/=N;
  const colDist=new Float32Array(N);
  for (let i=0;i<N;i++){const dr=rCh[i]-mR,dg=gCh[i]-mG,db=bCh[i]-mB;colDist[i]=Math.sqrt(dr*dr+dg*dg+db*db);}
  const edges=new Float32Array(N);
  for (let y=1;y<TH-1;y++) for (let x=1;x<TW-1;x++) {
    const gx=-lum[(y-1)*TW+(x-1)]+lum[(y-1)*TW+(x+1)]-2*lum[y*TW+(x-1)]+2*lum[y*TW+(x+1)]-lum[(y+1)*TW+(x-1)]+lum[(y+1)*TW+(x+1)];
    const gy=-lum[(y-1)*TW+(x-1)]-2*lum[(y-1)*TW+x]-lum[(y-1)*TW+(x+1)]+lum[(y+1)*TW+(x-1)]+2*lum[(y+1)*TW+x]+lum[(y+1)*TW+(x+1)];
    edges[y*TW+x]=Math.sqrt(gx*gx+gy*gy);
  }
  const localC=new Float32Array(N);
  for (let y=1;y<TH-1;y++) for (let x=1;x<TW-1;x++) {
    let sum=0,sum2=0;
    for (let ky=-1;ky<=1;ky++) for (let kx=-1;kx<=1;kx++){const v=lum[(y+ky)*TW+(x+kx)];sum+=v;sum2+=v*v;}
    const mean=sum/9; localC[y*TW+x]=Math.sqrt(Math.max(0,sum2/9-mean*mean));
  }
  const norm=arr=>{let mx=0;for(let i=0;i<arr.length;i++)if(arr[i]>mx)mx=arr[i];if(mx<1e-6)return arr;const out=new Float32Array(arr.length);for(let i=0;i<arr.length;i++)out[i]=arr[i]/mx;return out;};
  const nc=norm(colDist),ne=norm(edges),nl=norm(localC);
  const sal=new Float32Array(N);
  for (let i=0;i<N;i++) sal[i]=nc[i]*0.45+ne[i]*0.30+nl[i]*0.25;
  for (let y=0;y<TH;y++) for (let x=0;x<TW;x++){const cx=Math.abs(x/TW-.5)*2,cy=Math.abs(y/TH-.5)*2;sal[y*TW+x]*=(1-Math.max(cx,cy)*0.20);}
  const blurred=gaussBlurAlpha(sal,TW,TH,6);
  let maxV=0;for(let i=0;i<blurred.length;i++)if(blurred[i]>maxV)maxV=blurred[i];
  const thresh=maxV*0.60;
  let sx=0,sy=0,sw=0;
  for (let y=0;y<TH;y++) for (let x=0;x<TW;x++){const v=blurred[y*TW+x];if(v>=thresh){sx+=x*v;sy+=y*v;sw+=v;}}
  if (sw<1e-6) return {x:.5,y:.4};
  return {x:sx/sw/TW, y:sy/sw/TH};
}

function gaussBlurAlpha(alpha,W,H,radius) {
  const sigma=radius*.45+.5, ksize=Math.ceil(radius*2.5)*2+1;
  const kern=[];let ks=0;
  for (let i=0;i<ksize;i++){const x=i-Math.floor(ksize/2);const v=Math.exp(-(x*x)/(2*sigma*sigma));kern.push(v);ks+=v;}
  for (let i=0;i<ksize;i++)kern[i]/=ks;
  const half=Math.floor(ksize/2);
  const tmp=new Float32Array(W*H);
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){let v=0;for(let k=0;k<ksize;k++){const sx=Math.max(0,Math.min(W-1,x+k-half));v+=kern[k]*alpha[y*W+sx];}tmp[y*W+x]=v;}
  const out=new Float32Array(W*H);
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){let v=0;for(let k=0;k<ksize;k++){const sy=Math.max(0,Math.min(H-1,y+k-half));v+=kern[k]*tmp[sy*W+x];}out[y*W+x]=v;}
  return out;
}

// ═══════════════════════════════════════
// LANCZOS-3 UPSCALING with row-level progress
// ═══════════════════════════════════════
function lanczos3(x) {
  if (x===0) return 1; if (Math.abs(x)>=3) return 0;
  const p=Math.PI*x;
  return (Math.sin(p)/p)*(Math.sin(p/3)/(p/3));
}

async function upscale(canvas, factor, method, onProgress) {
  const nW=Math.round(canvas.width*factor), nH=Math.round(canvas.height*factor);
  if (method==='bicubic'||factor<=1) {
    onProgress && onProgress(20);
    const out=document.createElement('canvas'); out.width=nW; out.height=nH;
    const ctx=out.getContext('2d'); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.drawImage(canvas,0,0,nW,nH);
    onProgress && onProgress(100);
    return out;
  }
  const src=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
  const sd=src.data, SW=canvas.width, SH=canvas.height;
  const out=document.createElement('canvas'); out.width=nW; out.height=nH;
  const oc=out.getContext('2d');
  const dst=oc.createImageData(nW,nH); const dd=dst.data;
  const xK=new Array(nW);
  for (let dx=0;dx<nW;dx++){
    const sx=(dx+.5)/factor-.5; const base=Math.floor(sx)-2;
    const w=[];let ws=0;
    for (let k=0;k<6;k++){const v=lanczos3(sx-(base+k));w.push(v);ws+=v;}
    xK[dx]={base,w,ws:ws||1};
  }
  const TILE=48;
  for (let ty=0;ty<nH;ty+=TILE){
    for (let dy=ty;dy<Math.min(ty+TILE,nH);dy++){
      const sy=(dy+.5)/factor-.5; const yb=Math.floor(sy)-2;
      const yw=[];let yws=0;
      for (let k=0;k<6;k++){const v=lanczos3(sy-(yb+k));yw.push(v);yws+=v;}yws=yws||1;
      for (let dx=0;dx<nW;dx++){
        const {base:xb,w:xw,ws:xws}=xK[dx];
        let R=0,G=0,B=0,A=0;
        for (let ky=0;ky<6;ky++){
          const sry=Math.max(0,Math.min(SH-1,yb+ky)); const ywk=yw[ky]/yws;
          for (let kx=0;kx<6;kx++){
            const srx=Math.max(0,Math.min(SW-1,xb+kx));
            const ww=ywk*xw[kx]/xws; const pi=(sry*SW+srx)*4;
            const srcA=sd[pi+3]/255;
            R+=sd[pi]*srcA*ww;G+=sd[pi+1]*srcA*ww;B+=sd[pi+2]*srcA*ww;A+=srcA*ww;
          }
        }
        const pi2=(dy*nW+dx)*4;
        if (A>1e-6){
          dd[pi2]  =clamp((R/A+.5)|0,0,255); dd[pi2+1]=clamp((G/A+.5)|0,0,255);
          dd[pi2+2]=clamp((B/A+.5)|0,0,255); dd[pi2+3]=clamp((A*255+.5)|0,0,255);
        } else {dd[pi2]=dd[pi2+1]=dd[pi2+2]=dd[pi2+3]=0;}
      }
    }
    onProgress && onProgress(Math.min(99, Math.round((ty/nH)*100)));
    await new Promise(r=>setTimeout(r,0));
  }
  oc.putImageData(dst,0,0);
  onProgress && onProgress(100);
  return out;
}

// ═══════════════════════════════════════
// SHOPIFY RESIZE + ENCODERS
// ═══════════════════════════════════════
function shopifyResize(canvas, maxDim) {
  const r=Math.min(maxDim/canvas.width,maxDim/canvas.height,1);
  if (r>=1) return canvas;
  const out=document.createElement('canvas');
  out.width=Math.round(canvas.width*r); out.height=Math.round(canvas.height*r);
  const ctx=out.getContext('2d'); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.drawImage(canvas,0,0,out.width,out.height); return out;
}

function encodeWebP(canvas, quality, maxKB) {
  return new Promise((res, rej) => {
    let q = quality;
    let attempts = 0;
    const maxAttempts = 20;
    const go = () => {
      if (attempts++ > maxAttempts) {
        canvas.toBlob(blob => {
          if (!blob) { rej(new Error('WebP encode failed')); return; }
          const r = new FileReader();
          r.onload = () => res({ blob, dataURL: r.result });
          r.onerror = () => rej(new Error('FileReader failed'));
          r.readAsDataURL(blob);
        }, 'image/webp', q);
        return;
      }
      canvas.toBlob(blob => {
        if (!blob) { rej(new Error('WebP encode produced null blob')); return; }
        if (blob.size > maxKB * 1024 && q > 0.35) {
          q = Math.max(q - 0.05, 0.35);
          go();
        } else {
          const r = new FileReader();
          r.onload = () => res({ blob, dataURL: r.result });
          r.onerror = () => rej(new Error('FileReader failed'));
          r.readAsDataURL(blob);
        }
      }, 'image/webp', q);
    };
    go();
  });
}

function encodePNG(canvas) {
  return new Promise(res=>{
    canvas.toBlob(blob=>{
      const r=new FileReader();r.onload=()=>res({blob,dataURL:r.result});r.readAsDataURL(blob);
    },'image/png');
  });
}

function loadCanvas(file) {
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas');
      c.width=img.width; c.height=img.height;
      c.getContext('2d').drawImage(img,0,0);
      URL.revokeObjectURL(img.src); res(c);
    };
    img.onerror=rej;
    img.src=URL.createObjectURL(file);
  });
}

// ═══════════════════════════════════════
// RESULT CARDS
// ═══════════════════════════════════════
function addResult(r) {
  const s=Math.round((1-r.size/r.orig)*100);
  const card=document.createElement('div');card.className='rc';
  card.innerHTML=`
    <img class="rc-img" src="${r.dataURL}" alt="${r.name}">
    <div class="rc-body">
      <div class="rc-name">${r.name}</div>
      <div class="rc-stats">
        <span class="pill py">${(r.size/1024).toFixed(0)} KB</span>
        <span class="pill ${s>0?'pg':'pr'}">${s>0?'↓':'↑'}${Math.abs(s)}%</span>
        <span class="pill pg">${r.dims}</span>
      </div>
      <button class="dl-btn" onclick="dlOne('${r.id}')">⬇ DOWNLOAD</button>
    </div>`;
  document.getElementById('resGrid').appendChild(card);
  document.getElementById('resultsSection').style.display='block';
}

function dlOne(id) {
  const r=results.find(x=>String(x.id)===String(id));if(!r)return;
  const a=document.createElement('a');a.href=URL.createObjectURL(r.blob);a.download=r.name;a.click();
}

async function downloadAll() {
  if(!results.length)return;
  const zip=new JSZip();
  results.forEach(r=>zip.file(r.name,r.blob));
  const blob=await zip.generateAsync({type:'blob'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='imgflow_pipeline.zip';a.click();
}

// ═══════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════
function applyPreset(p) {
  document.querySelectorAll('.preset-btn').forEach(b=>b.classList.toggle('active',b.dataset.preset===p));
  if (p==='quick') {
    document.getElementById('upscaleMethod').value='bicubic';
    document.getElementById('upscaleFactor').value='2';
    document.getElementById('webpQ').value=75;document.getElementById('qv').textContent=75;
    document.getElementById('maxKB').value=300;
  } else if (p==='balanced') {
    document.getElementById('upscaleMethod').value='lanczos';
    document.getElementById('upscaleFactor').value='2';
    document.getElementById('webpQ').value=85;document.getElementById('qv').textContent=85;
    document.getElementById('maxKB').value=500;
  } else {
    document.getElementById('upscaleMethod').value='lanczos';
    document.getElementById('upscaleFactor').value='3';
    document.getElementById('webpQ').value=95;document.getElementById('qv').textContent=95;
    document.getElementById('maxKB').value=2000;
  }
}

// ═══════════════════════════════════════════════════════════════════
// AI BACKGROUND REMOVAL — @imgly/background-removal with progress
// ═══════════════════════════════════════════════════════════════════
let _bgRemovalMod = null, _modelLoaded = false;
const _fileProgress = {}; let _totalBytes = 0, _loadedBytes = 0;

async function loadAIModule() {
  if (_bgRemovalMod) return _bgRemovalMod;
  log('  → importing @imgly/background-removal@1.7.0...', 'warn');
  showModelOverlay(); updateModelProgress(2, 'Importing module…', '');
  try {
    const mod = await import('https://esm.sh/@imgly/background-removal@1.7.0');
    _bgRemovalMod = mod.removeBackground || mod.default;
    if (!_bgRemovalMod) throw new Error('removeBackground function not found in module');
    log('  ✓ module loaded', 'ok');
    updateModelProgress(5, 'Module ready · fetching model weights…', '');
  } catch(e) { hideModelOverlay(); throw new Error('Failed to load @imgly/background-removal: ' + e.message); }
  return _bgRemovalMod;
}

async function removeBackgroundAI(srcCanvas, featherRadius, modelChoice = 'isnet') {
  const removeBg = await loadAIModule();
  const alphaThreshold = parseInt(document.getElementById('bgSens').value) || 80;
  const W = srcCanvas.width, H = srcCanvas.height;
  Object.keys(_fileProgress).forEach(k => delete _fileProgress[k]);
  _totalBytes = 0; _loadedBytes = 0;
  const srcBlob = await new Promise(res => srcCanvas.toBlob(res, 'image/png'));
  const progressCallback = (key, current, total) => {
    if (total > 0) {
      if (!_fileProgress[key]) { _fileProgress[key]={total,loaded:0}; _totalBytes+=total; }
      const delta = current - _fileProgress[key].loaded;
      _fileProgress[key].loaded = current; _loadedBytes += delta;
      const pct = _totalBytes > 0 ? Math.min(95, 5+(_loadedBytes/_totalBytes)*88) : 5;
      const fileMB=(current/1048576).toFixed(1), totalMB=(total/1048576).toFixed(1);
      const fileName=key.split('/').pop().split('?')[0];
      updateModelProgress(pct, `Downloading model weights…`, `${fileName}  ${fileMB} / ${totalMB} MB`);
    }
  };
  log(`  → running ISNet segmentation on ${W}×${H}px image…`, 'warn');
  let outBlob;
  try {
    outBlob = await removeBg(srcBlob, { model:modelChoice, output:{quality:1,format:'image/png'}, progress:progressCallback, fetchArgs:{cache:'force-cache'} });
  } catch(e) {
    log('  ⚠ progress API unavailable, running without progress…', 'warn');
    updateModelProgress(50, 'Processing… (no progress available)', '');
    outBlob = await removeBg(srcBlob, { model:modelChoice, output:{quality:1,format:'image/png'} });
  }
  updateModelProgress(97, 'Compositing result…', ''); _modelLoaded = true;
  const bmp = await createImageBitmap(outBlob);
  const outCanvas = document.createElement('canvas');
  outCanvas.width=W; outCanvas.height=H;
  const outCtx = outCanvas.getContext('2d');
  outCtx.drawImage(bmp,0,0,W,H); bmp.close();
  { const imgData=outCtx.getImageData(0,0,W,H); const data=imgData.data;
    const lo=alphaThreshold, hi=255-alphaThreshold;
    for (let i=0;i<W*H;i++){const a=data[i*4+3];if(a<=lo)data[i*4+3]=0;else if(a>=hi)data[i*4+3]=255;}
    outCtx.putImageData(imgData,0,0); }
  { const imgData=outCtx.getImageData(0,0,W,H);
    const src=new Uint8Array(W*H); for(let i=0;i<W*H;i++)src[i]=imgData.data[i*4+3];
    const eroded=new Uint8Array(W*H);
    for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
      const c=src[y*W+x]; if(c===0){eroded[y*W+x]=0;continue;}
      const minN=Math.min(src[(y-1)*W+x],src[(y+1)*W+x],src[y*W+(x+1)],src[y*W+(x-1)]);
      eroded[y*W+x]=minN===0?Math.max(0,c-80):c;}
    for(let i=0;i<W*H;i++)imgData.data[i*4+3]=eroded[i];
    outCtx.putImageData(imgData,0,0); }
  if (featherRadius>0) {
    const imgData=outCtx.getImageData(0,0,W,H); const data=imgData.data;
    const a=new Float32Array(W*H); for(let i=0;i<W*H;i++)a[i]=data[i*4+3]/255;
    const blurred=gaussBlurAlpha(a,W,H,featherRadius);
    for(let i=0;i<W*H;i++)data[i*4+3]=Math.round(blurred[i]*255);
    outCtx.putImageData(imgData,0,0); }
  updateModelProgress(100, 'Complete ✓', '');
  setTimeout(hideModelOverlay, 700);
  return { canvas: outCanvas };
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
renderTrack();