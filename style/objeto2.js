document.addEventListener('DOMContentLoaded', () => {

  const partsList    = document.getElementById('partsList');
  const overlay      = document.getElementById('overlay');
  const matrixImage  = document.getElementById('matrixImage');
  const resetBtn     = document.getElementById('resetBtn');
  const removeOneBtn = document.getElementById('removeOneBtn');
  const shapeSelect  = document.getElementById('shapeSelect');
  const rowLabels    = document.getElementById('rowLabels');

  /* ------------------------------------------------------------------
   * AJUSTE DA GRADE (em pixels da imagem da matriz, tamanho original 333x450)
   * Se sobrar ou faltar espaço nas bordas, mexa só nestes números:
   *   GRID_X0 / GRID_X1 = borda esquerda / direita da grade
   *   ROW_Y             = linhas horizontais (topo da F1, divisões, base da F8)
   * ------------------------------------------------------------------ */
  const REF_W = 333, REF_H = 450;
  const GRID_X0 = 2.2, GRID_X1 = 330.8;
  const ROW_Y = [3.0, 58.45, 113.8, 169.25, 224.7, 280.05, 338.3, 393.75, 449.15];

  const GX0 = GRID_X0 / REF_W;
  const GW  = (GRID_X1 - GRID_X0) / REF_W;
  const ROWS = ROW_Y.slice(0, -1).map((y, i) => ({
    top: y / REF_H,
    h:  (ROW_Y[i + 1] - y) / REF_H
  }));

  // Faixa em que cada peça da paleta nasce
  const ROW_BY_FRACTION = {
    'inteiro.png': 0, 'dois.png': 1, 'terco.png': 2, 'quatro.png': 3,
    'seis.png': 4, 'oito.png': 5, '12.png': 6, '24.png': 7
  };

  /* ------------------------------------------------------------------
   * TAMANHO = peça da paleta + tipo da forma escolhida.
   * Cada peça da paleta vale uma fração f de uma faixa. Tamanhos (largura
   * em fração da matriz, altura em fração da faixa):
   *   Retangular   -> f   x 1      (área f)
   *   Ret.Reduzido -> 2f  x 1/2    (área f)
   *   Triângulo e Trapézio -> 2f x 1  (metade da caixa = área f)
   * A inclinação (◤ ◢ ◣ ◥, diagonal ╲ ou ╱, esquerdo/direito) NÃO muda o tamanho.
   * Isso reproduz a matriz: F2 triângulo 1x1, F3 retângulo 1/3 e trapézio 2/3,
   * F4 triângulo 1/2, F5 retângulo 1/6 e triângulo 1/3, F6 triângulo 1/4 e
   * retângulo reduzido 1/4 x 1/2, F7 triângulo 1/6, F8 reduzido 1/12 x 1/2.
   * ------------------------------------------------------------------ */
  const FRACTION_VALUE = {
    'inteiro.png': 1, 'dois.png': 1 / 2, 'terco.png': 1 / 3, 'quatro.png': 1 / 4,
    'seis.png': 1 / 6, 'oito.png': 1 / 8, '12.png': 1 / 12, '24.png': 1 / 24
  };

  const SHAPE_KIND = {
    'rect': 'rect', 'horiz': 'reduced',
    'diag-desc': 'tri', 'diag-asc': 'tri', 'diag-down-left': 'tri', 'diag-up-left': 'tri',
    'trap-esq-desc': 'tri', 'trap-dir-desc': 'tri', 'trap-esq-asc': 'tri', 'trap-dir-asc': 'tri'
  };

  const keyOf = (src) => decodeURIComponent(src.split('/').pop());

  // retorna [largura (fração da matriz), altura (fração da faixa)]
  function boxFor(key, shape) {
    const f = FRACTION_VALUE[key] ?? 1;
    switch (SHAPE_KIND[shape]) {
      case 'reduced': return [Math.min(1, 2 * f), 1 / 2];
      case 'tri':     return [Math.min(1, 2 * f), 1];
      default:        return [f, 1];
    }
  }

  /* Recortes dentro da caixa (não mudam o tamanho) */
  const CLIPS = {
    'rect':           'none',
    'horiz':          'none',
    'diag-desc':      'polygon(0 0,100% 0,0 100%)',
    'diag-asc':       'polygon(100% 0,100% 100%,0 100%)',
    'diag-down-left': 'polygon(0 0,100% 100%,0 100%)',
    'diag-up-left':   'polygon(0 0,100% 0,100% 100%)',

    // Faixa 1/3: a diagonal vai de 1/2 a 5/6 da matriz, ou seja, de 25% a 75% da caixa de 2/3
    'trap-esq-desc': 'polygon(0 0,25% 0,75% 100%,0 100%)',
    'trap-dir-desc': 'polygon(25% 0,100% 0,100% 100%,75% 100%)',
    'trap-esq-asc':  'polygon(0 0,75% 0,25% 100%,0 100%)',
    'trap-dir-asc':  'polygon(75% 0,100% 0,100% 100%,25% 100%)'
  };

  const pieces = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function render(p) {
    const W = matrixImage.clientWidth, H = matrixImage.clientHeight;
    p.el.style.width  = (p.nw * W) + 'px';
    p.el.style.height = (p.nh * H) + 'px';
    p.el.style.left   = (p.nx * W) + 'px';
    p.el.style.top    = (p.ny * H) + 'px';
  }

  function createPlacedPiece(imgEl) {
    const key = keyOf(imgEl.src);
    const rowIndex = ROW_BY_FRACTION[key] ?? 0;
    const [wFrac, hFrac] = boxFor(key, shapeSelect.value);
    const nw = GW * wFrac;
    const nh = ROWS[rowIndex].h * hFrac;

    const el = document.createElement('img');
    el.src = imgEl.src;
    el.className = 'placed';
    el.draggable = false;
    el.style.clipPath = CLIPS[shapeSelect.value] || 'none';

    const p = { el, nw, nh, nx: GX0, ny: ROWS[rowIndex].top };
    render(p);
    overlay.appendChild(el);
    makeDraggable(p);
    pieces.push(p);
  }

  // Movimento livre, limitado à matriz
  function makeDraggable(p) {
    const el = p.el;
    let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;

    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      dragging = true;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      origX = p.nx; origY = p.ny;
    });

    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      const W = matrixImage.clientWidth, H = matrixImage.clientHeight;
      p.nx = clamp(origX + (e.clientX - startX) / W, 0, 1 - p.nw);
      p.ny = clamp(origY + (e.clientY - startY) / H, 0, 1 - p.nh);
      render(p);
    });

    const end = e => {
      dragging = false;
      el.classList.remove('dragging');
      try { el.releasePointerCapture(e.pointerId); } catch {}
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  partsList.addEventListener('pointerdown', e => {
    if (e.target.classList.contains('piece')) createPlacedPiece(e.target);
  });

  resetBtn.addEventListener('click', () => {
    pieces.forEach(p => p.el.remove());
    pieces.length = 0;
  });

  removeOneBtn.addEventListener('click', () => {
    const p = pieces.pop();
    if (p) p.el.remove();
  });

  // Rótulos F1..F8 alinhados às faixas
  function createRowLabels() {
    rowLabels.innerHTML = '';
    const spacer = document.createElement('span');
    spacer.style.flex = `0 0 ${ROWS[0].top * 100}%`;
    rowLabels.appendChild(spacer);
    ROWS.forEach((r, i) => {
      const label = document.createElement('span');
      label.textContent = 'F' + (i + 1);
      label.style.flex = `0 0 ${r.h * 100}%`;
      rowLabels.appendChild(label);
    });
  }

  function syncOverlayToImage() {
    const m = matrixImage.getBoundingClientRect();
    const c = overlay.parentElement.getBoundingClientRect();
    overlay.style.left   = (m.left - c.left) + 'px';
    overlay.style.top    = (m.top  - c.top)  + 'px';
    overlay.style.width  = m.width  + 'px';
    overlay.style.height = m.height + 'px';
    pieces.forEach(render);
  }

  createRowLabels();
  window.addEventListener('resize', syncOverlayToImage);
  matrixImage.addEventListener('load', syncOverlayToImage);
  if (window.ResizeObserver) new ResizeObserver(syncOverlayToImage).observe(matrixImage);
  syncOverlayToImage();
});
