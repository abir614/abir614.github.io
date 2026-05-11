// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let flow = 1, queue = [], results = [];
// last loaded image dims for live preview
let _previewSrc = { w: 0, h: 0 };

// ═══════════════════════════════════════
// FLOW UI
// ═══════════════════════════════════════
function selectFlow(n) {
  flow = n;
  document.querySelectorAll('.ftab').forEach((b, i) => b.classList.toggle('active', i === n - 1));

  // Flow 2 only
  document.getElementById('bgSensGroup').classList.toggle('sg-hidden', n !== 2);
  document.getElementById('bgFeatherGroup').classList.toggle('sg-hidden', n !== 2);

  // Flow 3 only — the unified resize panel
  document.querySelectorAll('.resize-setting').forEach(el => el.classList.toggle('sg-hidden', n !== 3));
  document.getElementById('resizeInfo').classList.toggle('sg-hidden', n !== 3);
  document.getElementById('resizePreview').classList.toggle('sg-hidden', n !== 3);

  toggleFillColor();
  onResizeModeChange(); // keep fill options in sync with mode
  renderTrack();
  if (n === 3) updateResizePreview();
}

function onResizeModeChange() {
  if (flow !== 3) return;
  const mode = document.getElementById('resizeMode')?.value;
  // Blend only makes sense for smart-crop-extend (seamless extension)
  const blendGroup = document.getElementById('resizeBlendGroup');
  if (blendGroup) blendGroup.classList.toggle('sg-hidden', mode !== 'smart-crop-extend');
  // Focus only for smart crop
  const focusGroup = document.getElementById('resizeFocusGroup');
  if (focusGroup) focusGroup.classList.toggle('sg-hidden', mode !== 'smart-crop-extend');
  // Fill options differ: proportional gets blur, extend loses blur
  const fillEl = document.getElementById('resizeFill');
  if (!fillEl) return;
  const hasBluryOption = [...fillEl.options].some(o => o.value === 'blur');
  if (mode === 'proportional' && !hasBluryOption) {
    const opt = document.createElement('option');
    opt.value = 'blur'; opt.textContent = 'Blurred Source (cinematic)';
    // insert after 'extend' option
    fillEl.insertBefore(opt, fillEl.options[1]);
  } else if (mode === 'smart-crop-extend' && hasBluryOption) {
    [...fillEl.options].find(o => o.value === 'blur')?.remove();
  }
  updateResizePreview();
}

function renderTrack() {
  let steps;
  if (flow === 1) steps = [['🔎','Lanczos\nUpscale'],['📐','Shopify\nResize'],['🌐','WebP\nEncode']];
  else if (flow === 2) steps = [['✂️','ISNet BG\nRemove'],['🔎','Lanczos\nUpscale'],['📐','Shopify\nResize'],['🌐','WebP\nEncode']];
  else steps = [['🔍','Detect\nAxes'],['🔎','Upscale'],['⚡','Smart\nResize'],['🌐','Encode']];

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

// ═══════════════════════════════════════════════════════════════
// LIVE RESIZE PREVIEW — updates as user types W/H
// Shows per-axis decision (crop / extend / match / fit)
// ═══════════════════════════════════════════════════════════════
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
    const axisDecision = (src, tgt, axis) => {
      if (src > tgt) return { label: `${axis}: ${src}px → crop → ${tgt}px`, cls: 'crop' };
      if (src < tgt) return { label: `${axis}: ${src}px → extend → ${tgt}px`, cls: 'extend' };
      return { label: `${axis}: ${src}px → exact match ✓`, cls: 'match' };
    };
    const dw = axisDecision(_previewSrc.w, tw, 'W');
    const dh = axisDecision(_previewSrc.h, th, 'H');
    if (rpW) { rpW.textContent = dw.label; rpW.className = 'rp-axis ' + dw.cls; }
    if (rpH) { rpH.textContent = dh.label; rpH.className = 'rp-axis ' + dh.cls; }
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
    // Use last-loaded image for the live preview source dims
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
    factor:      parseFloat(document.getElementById('upscaleFactor').value),
    method:      document.getElementById('upscaleMethod').value,
    shopify:     parseInt(document.getElementById('shopifySize').value),
    quality:     parseInt(document.getElementById('webpQ').value) / 100,
    maxKB:       parseInt(document.getElementById('maxKB').value),
    feather:     parseInt(document.getElementById('bgFeather').value),
    // Flow 3 — unified
    resizeW:     parseInt(document.getElementById('resizeW')?.value) || 0,
    resizeH:     parseInt(document.getElementById('resizeH')?.value) || 0,
    resizeMode,
    resizeFocus: document.getElementById('resizeFocus')?.value || 'smart',
    resizeAlign: document.getElementById('resizeAlign')?.value || 'center',
    resizeBlend: parseInt(document.getElementById('resizeBlend')?.value) || 40,
    resizeFill:  document.getElementById('resizeFill')?.value || 'extend',
    fillColor:   document.getElementById('fillColor')?.value || '#ffffff',
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
        canvas = await upscale(canvas, cfg.factor, cfg.method);
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log(`  ✓ upscaled → ${canvas.width}×${canvas.height}`, 'ok');

        pipeStep(step, 'running');
        log(`  → shopify resize (max ${cfg.shopify}px)...`, 'warn');
        canvas = shopifyResize(canvas, cfg.shopify);
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log(`  ✓ resized → ${canvas.width}×${canvas.height}`, 'ok');

        pipeStep(step,'running');
        log('  → encoding WebP...','warn');
        const { blob, dataURL } = await encodeWebP(canvas, cfg.quality, cfg.maxKB);
        pipeStep(step,'done'); setPB(item.id, true, 100);
        const base = item.name.replace(/\.[^.]+$/, '');
        const out = { id: item.id, name: `shopify_${base}.webp`, blob, dataURL, orig: item.size, size: blob.size, dims: `${canvas.width}×${canvas.height}` };
        results.push(out); addResult(out); setQS(item.id,'sd','DONE');
        log(`  ✓ ${out.name} — ${(blob.size/1024).toFixed(0)} KB`, 'ok');

      // ── Flow 2: No Background ──
      } else if (flow === 2) {
        const total = 4;
        pipeStep(step,'running');
        log('  → running ISNet-general segmentation (first run downloads ~45MB)...','warn');
        canvas = await removeBackgroundAI(canvas, cfg.feather);
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log('  ✓ foreground isolated (ISNet)', 'ok');

        pipeStep(step,'running');
        log(`  → upscaling ×${cfg.factor} (${cfg.method})...`,'warn');
        canvas = await upscale(canvas, cfg.factor, cfg.method);
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log(`  ✓ upscaled → ${canvas.width}×${canvas.height}`,'ok');

        pipeStep(step,'running');
        log(`  → shopify resize (max ${cfg.shopify}px)...`,'warn');
        canvas = shopifyResize(canvas, cfg.shopify);
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));
        log(`  ✓ resized → ${canvas.width}×${canvas.height}`,'ok');

        pipeStep(step,'running');
        log('  → encoding WebP...','warn');
        const { blob, dataURL } = await encodeWebP(canvas, cfg.quality, cfg.maxKB);
        pipeStep(step,'done'); setPB(item.id, true, 100);
        const base = item.name.replace(/\.[^.]+$/, '');
        const out = { id: item.id, name: `nobg_${base}.webp`, blob, dataURL, orig: item.size, size: blob.size, dims: `${canvas.width}×${canvas.height}` };
        results.push(out); addResult(out); setQS(item.id,'sd','DONE');
        log(`  ✓ ${out.name} — ${(blob.size/1024).toFixed(0)} KB`,'ok');

      // ── Flow 3: Smart Resize (unified crop + extend + proportional) ──
      } else if (flow === 3) {
        const total = 4;
        const tw = cfg.resizeW, th = cfg.resizeH;
        const sw = canvas.width, sh = canvas.height;

        // Step 0: Detect
        pipeStep(step,'running');
        log(`  → detecting: source ${sw}×${sh} → target ${tw}×${th} (mode: ${cfg.resizeMode})`, 'warn');

        let decisionLog = '';
        if (cfg.resizeMode === 'proportional') {
          const ratio = Math.min(tw / sw, th / sh);
          const fw = Math.round(sw * ratio), fh = Math.round(sh * ratio);
          decisionLog = `proportional fit: scaled to ${fw}×${fh}, padded to ${tw}×${th}`;
        } else {
          const dw = sw > tw ? 'CROP W' : sw < tw ? 'EXTEND W' : 'MATCH W';
          const dh = sh > th ? 'CROP H' : sh < th ? 'EXTEND H' : 'MATCH H';
          decisionLog = `per-axis: [${dw}] [${dh}]`;
        }
        log(`  ✓ decision: ${decisionLog}`, 'ok');
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));

        // Step 1: Upscale
        pipeStep(step,'running');
        log(`  → upscaling ×${cfg.factor} (${cfg.method})...`,'warn');
        canvas = await upscale(canvas, cfg.factor, cfg.method);
        log(`  ✓ upscaled → ${canvas.width}×${canvas.height}`,'ok');
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));

        // Step 2: Resize
        pipeStep(step,'running');
        if (cfg.resizeMode === 'proportional') {
          canvas = proportionalResize(canvas, tw, th, cfg.resizeFill, cfg.resizeAlign, cfg.fillColor);
          log(`  ✓ proportional fit → ${canvas.width}×${canvas.height}`, 'ok');
        } else {
          canvas = await smartResize(canvas, tw, th, cfg.resizeFocus, cfg.resizeAlign, cfg.resizeFill, cfg.fillColor, cfg.resizeBlend);
          log(`  ✓ smart resize → ${canvas.width}×${canvas.height}`, 'ok');
        }
        pipeStep(step,'done'); step++; setPB(item.id, true, Math.round(step/total*100));

        // Step 3: Encode — always WebP
        pipeStep(step,'running');
        log('  → encoding WebP...','warn');
        const { blob, dataURL } = await encodeWebP(canvas, cfg.quality, cfg.maxKB);
        pipeStep(step,'done'); setPB(item.id, true, 100);
        const base = item.name.replace(/\.[^.]+$/, '');
        const prefix = cfg.resizeMode === 'proportional' ? 'fit' : 'resize';
        const out  = { id: item.id, name: `${prefix}_${base}.webp`, blob, dataURL, orig: item.size, size: blob.size, dims: `${canvas.width}×${canvas.height}` };
        results.push(out); addResult(out); setQS(item.id,'sd','DONE');
        log(`  ✓ ${out.name} — ${(blob.size/1024).toFixed(0)} KB`,'ok');
      }

    } catch (err) {
      setQS(item.id,'se','ERROR'); log('  ✗ '+err.message,'err'); console.error(err);
    }
    setPB(item.id, false, 0); resetTrack();
  }

  document.getElementById('statsCount').textContent = results.length;
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('resCount').textContent = results.length + ' file' + (results.length !== 1 ? 's' : '');
  document.getElementById('runBtn').disabled = false;
  log(`Done. ${results.length} file(s) ready.`, 'ok');
}

// ═══════════════════════════════════════════════════════════════════
// PROPORTIONAL FIT
// Fits source into target canvas at natural aspect ratio.
// Never crops. Fills empty space with chosen fill.
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
  // transparent: leave clear

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
// SMART RESIZE — Per-axis auto crop + extend
// ═══════════════════════════════════════════════════════════════════
async function smartResize(srcCanvas, targetW, targetH, focus, align, fillMode, fillColor, blendRadius) {
  const sW = srcCanvas.width, sH = srcCanvas.height;

  let fx = 0.5, fy = 0.4;
  if (focus === 'smart') {
    const pt = await computeObjectCenter(srcCanvas);
    fx = pt.x; fy = pt.y;
  } else {
    const map = { center:[.5,.5], top:[.5,.15], bottom:[.5,.85], left:[.15,.5], right:[.85,.5] };
    [fx, fy] = map[focus] || [.5,.5];
  }

  let srcCropX=0, srcCropY=0, srcCropW=sW, srcCropH=sH;
  if (sW > targetW) {
    const ideal = Math.round(fx*sW - targetW/2);
    srcCropX = Math.max(0, Math.min(sW-targetW, ideal));
    srcCropW = targetW;
  }
  if (sH > targetH) {
    const ideal = Math.round(fy*sH - targetH/2);
    srcCropY = Math.max(0, Math.min(sH-targetH, ideal));
    srcCropH = targetH;
  }

  const croppedW = Math.min(sW, targetW);
  const croppedH = Math.min(sH, targetH);
  const cropped = document.createElement('canvas');
  cropped.width=croppedW; cropped.height=croppedH;
  cropped.getContext('2d').drawImage(srcCanvas, srcCropX, srcCropY, srcCropW, srcCropH, 0, 0, croppedW, croppedH);

  if (croppedW === targetW && croppedH === targetH) return cropped;

  const out = document.createElement('canvas');
  out.width=targetW; out.height=targetH;
  const ctx = out.getContext('2d');
  const { ox, oy } = getAnchorOffset(croppedW, croppedH, targetW, targetH, align);

  if (fillMode === 'extend') {
    fillSeamless(ctx, cropped, ox, oy, targetW, targetH, blendRadius);
  } else if (fillMode === 'blur') {
    drawBlurredBackground(ctx, srcCanvas, targetW, targetH);
    ctx.drawImage(cropped, ox, oy);
  } else {
    applyFill(ctx, targetW, targetH, fillMode, fillColor);
    ctx.drawImage(cropped, ox, oy);
  }
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
// SEAMLESS EXTENSION — Directional gradient strip sampling
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
  for (let y=oy;y<oy+srcH;y++) {
    for (let x=ox;x<ox+srcW;x++) {
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
// OBJECT-AWARE SALIENCY — multi-cue crop center detection
// ═══════════════════════════════════════════════════════════════════
async function computeObjectCenter(canvas) {
  const TW=80, TH=Math.max(1,Math.round(canvas.height/canvas.width*80));
  const tmp=document.createElement('canvas'); tmp.width=TW; tmp.height=TH;
  tmp.getContext('2d').drawImage(canvas,0,0,TW,TH);
  const {data}=tmp.getContext('2d').getImageData(0,0,TW,TH);
  const N=TW*TH;
  const lum=new Float32Array(N);
  const rCh=new Float32Array(N), gCh=new Float32Array(N), bCh=new Float32Array(N);
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
  const norm=arr=>{let mx=0;for (let i=0;i<arr.length;i++)if(arr[i]>mx)mx=arr[i];if(mx<1e-6)return arr;const out=new Float32Array(arr.length);for(let i=0;i<arr.length;i++)out[i]=arr[i]/mx;return out;};
  const nc=norm(colDist),ne=norm(edges),nl=norm(localC);
  const sal=new Float32Array(N);
  for (let i=0;i<N;i++) sal[i]=nc[i]*0.45+ne[i]*0.30+nl[i]*0.25;
  for (let y=0;y<TH;y++) for (let x=0;x<TW;x++){const cx=Math.abs(x/TW-.5)*2,cy=Math.abs(y/TH-.5)*2;sal[y*TW+x]*=(1-Math.max(cx,cy)*0.20);}
  const blurred=gaussBlurAlpha(sal,TW,TH,6);
  let maxV=0;for (let i=0;i<blurred.length;i++)if(blurred[i]>maxV)maxV=blurred[i];
  const thresh=maxV*0.60;
  let sx=0,sy=0,sw=0;
  for (let y=0;y<TH;y++) for (let x=0;x<TW;x++){const v=blurred[y*TW+x];if(v>=thresh){sx+=x*v;sy+=y*v;sw+=v;}}
  if (sw<1e-6) return {x:.5,y:.4};
  return {x:sx/sw/TW,y:sy/sw/TH};
}

function gaussBlurAlpha(alpha,W,H,radius) {
  const sigma=radius*.45+.5;
  const ksize=Math.ceil(radius*2.5)*2+1;
  const kern=[];let ks=0;
  for (let i=0;i<ksize;i++){const x=i-Math.floor(ksize/2);const v=Math.exp(-(x*x)/(2*sigma*sigma));kern.push(v);ks+=v;}
  for (let i=0;i<ksize;i++)kern[i]/=ks;
  const half=Math.floor(ksize/2);
  const tmp=new Float32Array(W*H);
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){let v=0;for (let k=0;k<ksize;k++){const sx=Math.max(0,Math.min(W-1,x+k-half));v+=kern[k]*alpha[y*W+sx];}tmp[y*W+x]=v;}
  const out=new Float32Array(W*H);
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){let v=0;for (let k=0;k<ksize;k++){const sy=Math.max(0,Math.min(H-1,y+k-half));v+=kern[k]*tmp[sy*W+x];}out[y*W+x]=v;}
  return out;
}

// ═══════════════════════════════════════
// LANCZOS-3 UPSCALING
// ═══════════════════════════════════════
function lanczos3(x) {
  if (x===0) return 1; if (Math.abs(x)>=3) return 0;
  const p=Math.PI*x;
  return (Math.sin(p)/p)*(Math.sin(p/3)/(p/3));
}

async function upscale(canvas, factor, method) {
  const nW=Math.round(canvas.width*factor), nH=Math.round(canvas.height*factor);
  if (method==='bicubic'||factor<=1) {
    const out=document.createElement('canvas'); out.width=nW; out.height=nH;
    const ctx=out.getContext('2d'); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.drawImage(canvas,0,0,nW,nH); return out;
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
            const ww=ywk*xw[kx]/xws;
            const pi=(sry*SW+srx)*4;
            const srcA=sd[pi+3]/255;
            R+=sd[pi]*srcA*ww;G+=sd[pi+1]*srcA*ww;B+=sd[pi+2]*srcA*ww;A+=srcA*ww;
          }
        }
        const pi2=(dy*nW+dx)*4;
        if (A>1e-6){
          dd[pi2]  =clamp((R/A+.5)|0,0,255);
          dd[pi2+1]=clamp((G/A+.5)|0,0,255);
          dd[pi2+2]=clamp((B/A+.5)|0,0,255);
          dd[pi2+3]=clamp((A*255+.5)|0,0,255);
        } else {dd[pi2]=dd[pi2+1]=dd[pi2+2]=dd[pi2+3]=0;}
      }
    }
    await new Promise(r=>setTimeout(r,0));
  }
  oc.putImageData(dst,0,0); return out;
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
  return new Promise(res=>{
    let q=quality;
    const go=()=>canvas.toBlob(blob=>{
      if (blob.size>maxKB*1024&&q>0.2){q=Math.max(q-.04,.2);go();}
      else{const r=new FileReader();r.onload=()=>res({blob,dataURL:r.result});r.readAsDataURL(blob);}
    },'image/webp',q);
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
      c.width=img.width;c.height=img.height;
      c.getContext('2d').drawImage(img,0,0);
      URL.revokeObjectURL(img.src);res(c);
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

// ═══════════════════════════════════════
// AI BACKGROUND REMOVAL
// ═══════════════════════════════════════
let imglyRemoveBackground = null;

async function loadAIModel() {
  if (!imglyRemoveBackground) {
    log('  → loading @imgly/background-removal module...','warn');
    const mod=await import('https://esm.sh/@imgly/background-removal@1.7.0');
    imglyRemoveBackground=mod.default||mod.removeBackground;
    log('  ✓ ISNet module ready','ok');
  }
  return imglyRemoveBackground;
}

async function removeBackgroundAI(srcCanvas, featherRadius) {
  const removeBg=await loadAIModel();
  const W=srcCanvas.width, H=srcCanvas.height;
  const alphaThreshold=parseInt(document.getElementById('bgSens').value)||80;
  const srcBlob=await new Promise(res=>srcCanvas.toBlob(res,'image/png'));
  const outBlob=await removeBg(srcBlob,{model:'isnet',output:{quality:1,format:'image/png'}});
  const bmp=await createImageBitmap(outBlob);
  const outCanvas=document.createElement('canvas');
  outCanvas.width=W;outCanvas.height=H;
  const outCtx=outCanvas.getContext('2d');
  outCtx.drawImage(bmp,0,0,W,H);bmp.close();

  {const imgData=outCtx.getImageData(0,0,W,H);const data=imgData.data;
  const lo=alphaThreshold,hi=255-alphaThreshold;
  for (let i=0;i<W*H;i++){const a=data[i*4+3];if(a<=lo)data[i*4+3]=0;else if(a>=hi)data[i*4+3]=255;}
  outCtx.putImageData(imgData,0,0);}

  {const imgData=outCtx.getImageData(0,0,W,H);
  const src=new Uint8Array(W*H);for(let i=0;i<W*H;i++)src[i]=imgData.data[i*4+3];
  const eroded=new Uint8Array(W*H);
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++){
    const c=src[y*W+x];if(c===0){eroded[y*W+x]=0;continue;}
    const minN=Math.min(src[(y-1)*W+x],src[(y+1)*W+x],src[y*W+(x+1)],src[y*W+(x-1)]);
    eroded[y*W+x]=minN===0?Math.max(0,c-80):c;
  }
  for(let i=0;i<W*H;i++)imgData.data[i*4+3]=eroded[i];
  outCtx.putImageData(imgData,0,0);}

  if (featherRadius>0){
    const imgData=outCtx.getImageData(0,0,W,H);const data=imgData.data;
    const a=new Float32Array(W*H);for(let i=0;i<W*H;i++)a[i]=data[i*4+3]/255;
    const blurred=gaussBlurAlpha(a,W,H,featherRadius);
    for(let i=0;i<W*H;i++)data[i*4+3]=Math.round(blurred[i]*255);
    outCtx.putImageData(imgData,0,0);
  }
  return outCanvas;
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
renderTrack();
