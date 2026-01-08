document.addEventListener('DOMContentLoaded', () => {

  const partsList   = document.getElementById('partsList');
  const overlay     = document.getElementById('overlay');
  const matrixImage = document.getElementById('matrixImage');
  const resetBtn    = document.getElementById('resetBtn');
  const shapeSelect = document.getElementById('shapeSelect');

  const WIDTH_FRACTIONS = {
    "inteiro.png": 2,
    "dois.png": 1,
    "tres.png": 1 / 2,
    "quatro.png": 1 / 3,
    "seis.png": 1 / 4,
    "oito.png": 1 / 6
  };

  function getMatrixOffsets() {
    const matrixRect  = matrixImage.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    return {
      left: matrixRect.left - overlayRect.left,
      top: matrixRect.top - overlayRect.top,
      width: matrixRect.width,
      height: matrixRect.height
    };
  }

  /* 🔷 TAMANHO — retângulo tem fator visual 1/2 */
  function calcSize(src){
    const offs = getMatrixOffsets();
    const key  = src.split('/').pop();

    let frac = WIDTH_FRACTIONS[key] || 1;

    // 👉 ajuste visual APENAS para retângulo
    if (shapeSelect.value === 'rect') {
      frac = frac / 2;
    }

    return {
      width: offs.width * frac,
      height: offs.height / 6
    };
  }

  /* 🔷 FORMAS */
  function applyShape(el){
    const shape = shapeSelect.value;

    switch(shape){

      case 'rect':
        el.style.clipPath = 'none';
        break;

      case 'diag-desc': // ↘
        el.style.clipPath = `
          polygon(
            0 0,
            100% 0,
            0 100%
          )
        `;
        break;

      case 'diag-asc': // ↗
        el.style.clipPath = `
          polygon(
            100% 0,
            100% 100%,
            0 100%
          )
        `;
        break;

      case 'horiz': // metade inferior
        el.style.clipPath = `
          polygon(
            0 50%,
            100% 50%,
            100% 100%,
            0 100%
          )
        `;
        break;

      case 'diag-down-left': // ↙
        el.style.clipPath = `
          polygon(
            0 0,
            100% 100%,
            0 100%
          )
        `;
        break;

      case 'diag-up-left': // ↖
        el.style.clipPath = `
          polygon(
            100% 0,
            100% 100%,
            0 0
          )
        `;
        break;
    }
  }

  function createPlacedPiece(imgEl, dx = 0, dy = 0){
    const el = document.createElement('img');
    el.src = imgEl.src;
    el.className = 'placed';
    el.draggable = false;

    const size = calcSize(imgEl.src);
    const offs = getMatrixOffsets();

    el.style.width  = size.width + 'px';
    el.style.height = size.height + 'px';
    el.style.left   = (offs.left + dx) + 'px';
    el.style.top    = (offs.top  + dy) + 'px';

    applyShape(el);
    overlay.appendChild(el);
    makeDraggable(el);
  }

  function makeDraggable(el){
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;
    let dragging = false;

    function bounds(){
      const o = getMatrixOffsets();
      return {
        minX: o.left,
        minY: o.top,
        maxX: o.left + o.width  - el.offsetWidth,
        maxY: o.top  + o.height - el.offsetHeight
      };
    }

    function onDown(e){
      e.preventDefault();
      dragging = true;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);

      startX = e.clientX;
      startY = e.clientY;
      origX  = parseFloat(el.style.left);
      origY  = parseFloat(el.style.top);

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }

    function onMove(e){
      if(!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const b  = bounds();

      el.style.left = Math.max(b.minX, Math.min(b.maxX, origX + dx)) + 'px';
      el.style.top  = Math.max(b.minY, Math.min(b.maxY, origY + dy)) + 'px';
    }

    function onUp(e){
      dragging = false;
      el.classList.remove('dragging');
      try{ el.releasePointerCapture(e.pointerId); }catch{}
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    el.addEventListener('pointerdown', onDown);
  }

  partsList.addEventListener('pointerdown', e => {
    if(e.target.classList.contains('piece')){
      const count = overlay.querySelectorAll('.placed').length;
      createPlacedPiece(e.target, 10, count * 10);
    }
  });

  resetBtn.addEventListener('click', () => {
    overlay.innerHTML = '';
  });

});
