/* manus-script.js */
window.addEventListener('load', function() {
  const component = document.getElementById('palpites-component');
  if (!component) return;

  if (!document.getElementById('manus-fab')) {
    const fab = document.createElement('div');
    fab.id = 'manus-fab';
    fab.innerHTML = '🎲';
    document.body.appendChild(fab);

    const pwaBanner = document.createElement('div');
    pwaBanner.id = 'manus-pwa-banner';
    pwaBanner.innerHTML = `
      <div class="manus-pwa-text">Instale nosso aplicativo para acessar os resultados e palpites mais rápido!</div>
      <div class="manus-pwa-buttons">
        <button class="manus-pwa-install-btn" id="manus-pwa-install">Instalar</button>
        <button class="manus-pwa-later-btn" id="manus-pwa-later">Depois</button>
      </div>
    `;
    document.body.appendChild(pwaBanner);

    const overlay = document.createElement('div');
    overlay.id = 'manus-modal-overlay';
    overlay.innerHTML = '<div class="manus-modal" id="manus-modal-body"></div>';
    document.body.appendChild(overlay);

    const toastContainer = document.createElement('div');
    toastContainer.id = 'manus-toast-container';
    toastContainer.innerHTML = `
      <div class="manus-toast">
        <span class="manus-toast-close" onclick="document.getElementById('manus-toast-container').style.display='none'">&times;</span>
        <div class="manus-toast-text">
          Seus palpites foram copiados com sucesso! Agora é só colar ao fazer sua aposta. Boa sorte!
        </div>
        <span class="manus-toast-link" onclick="window.openManusTutorial()">(tutorial) Aprenda como colar os seus palpites ao fazer a sua aposta</span>
      </div>
    `;
    document.body.appendChild(toastContainer);

    const videoOverlay = document.createElement('div');
    videoOverlay.id = 'manus-video-overlay';
    videoOverlay.innerHTML = `
      <div class="manus-video-container">
        <span class="manus-video-close" onclick="window.closeManusTutorial()">&times;</span>
        <div class="manus-video-wrapper">
          <iframe id="manus-video-iframe" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(videoOverlay);
  }

  const fab = document.getElementById('manus-fab');
  const overlay = document.getElementById('manus-modal-overlay');
  const modalBody = document.getElementById('manus-modal-body');
  const pwaBanner = document.getElementById('manus-pwa-banner');
  const pwaInstallBtn = document.getElementById('manus-pwa-install');
  const pwaLaterBtn = document.getElementById('manus-pwa-later');
  
  let deferredPrompt;
  let pwaBannerActive = false;
  let data = {};
  let bancas = [];
  let currentLoteria = null;
  let viewMode = 'milhar';
  let modalState = 'closed';
  let selectedPalpites = new Set();

  function loadData() {
    try {
      const rawData = component.getAttribute('data-payload') || '{}';
      data = JSON.parse(rawData.replace(/&#39;/g, "'"));
      const rawBancas = component.getAttribute('data-bancas') || '[]';
      bancas = JSON.parse(rawBancas.replace(/&#39;/g, "'"));
    } catch(e) {
      console.error("Erro ao carregar dados:", e);
    }
  }

  function updateState(newState, push = true) {
    modalState = newState;
    if (push) {
      history.pushState({ manusState: newState }, "");
    }
  }

  window.addEventListener('popstate', function(event) {
    if (event.state && event.state.manusState) {
      handleNavigation(event.state.manusState, false);
    } else if (modalState !== 'closed') {
      closeModal(false);
    }
  });

  function handleNavigation(target, push = true) {
    switch(target) {
      case 'main': renderMain(push); break;
      case 'loteria': renderLoteria(null, push); break;
      case 'acertos': renderAcertos(push); break;
      case 'closed': closeModal(push); break;
    }
  }

  let isDragging = false;
  let offset = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };

  function onStart(e) {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startPos.x = clientX;
    startPos.y = clientY;
    offset.x = clientX - fab.offsetLeft;
    offset.y = clientY - fab.offsetTop;
    fab.style.transition = 'none';
  }

  function onMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    fab.style.left = (clientX - offset.x) + 'px';
    fab.style.top = (clientY - offset.y) + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  }

  function onEnd() { isDragging = false; }

  fab.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  fab.addEventListener('touchstart', onStart);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isStandalone) showPWABanner();
  });

  function showPWABanner() { pwaBanner.style.display = 'flex'; pwaBannerActive = true; }
  function hidePWABanner() { pwaBanner.style.display = 'none'; pwaBannerActive = false; }

  pwaInstallBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') hidePWABanner();
    deferredPrompt = null;
  });

  pwaLaterBtn.addEventListener('click', hidePWABanner);
  window.addEventListener('appinstalled', () => { hidePWABanner(); deferredPrompt = null; });

  function openModal() {
    loadData();
    renderMain(true);
    if (pwaBannerActive) pwaBanner.style.display = 'none';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
  }

  function closeModal(push = true) {
    overlay.style.display = 'none';
    document.body.style.overflow = ''; 
    if (pwaBannerActive) pwaBanner.style.display = 'flex';
    modalState = 'closed';
    if (push && history.state && history.state.manusState) history.back();
  }

  fab.addEventListener('click', (e) => {
    const dist = Math.sqrt(Math.pow(startPos.x - e.clientX, 2) + Math.pow(startPos.y - e.clientY, 2));
    if (dist < 10) openModal();
  });

  overlay.addEventListener('click', (e) => { if(e.target === overlay) window.closeManusModal(); });

  function renderMain(push = true) {
    updateState('main', push);
    let html = `
      <div class="manus-modal-header">
        <strong>Palpite por Loteria</strong>
        <span onclick="window.closeManusModal()" style="cursor:pointer; font-size:24px">&times;</span>
      </div>
      <div class="manus-modal-content">
        <div style="margin-bottom: 10px; font-size: 12px; color: #666; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Selecione a Loteria</div>`;
    
    Object.keys(data).forEach(id => {
      html += `<div class="manus-list-item" onclick="window.renderLoteria('${id}')">
        <span>${data[id].loterias}</span>
        <span>&rsaquo;</span>
      </div>`;
    });

    if (bancas.length > 0) {
      html += `
        <div style="margin: 20px 0 10px 0; font-size: 12px; color: #666; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Bancas Parceiras</div>
        <div class="manus-bancas-container">`;
      
      bancas.forEach(banca => {
        html += `
          <div class="manus-banca-card">
            <div class="manus-banca-info">
              <strong>${banca.id}</strong>
              <p>${banca.descricao}</p>
            </div>
            <a href="${banca.link}" target="_blank" class="manus-banca-link">Entrar</a>
          </div>`;
      });
      html += `</div>`;
    }
    
    html += '</div>';
    modalBody.innerHTML = html;
  }

  window.renderLoteria = function(id, push = true) {
    if (id) {
      currentLoteria = { ...data[id], id: id };
      selectedPalpites.clear(); // Limpa seleção ao mudar de loteria
    }
    updateState('loteria', push);
    const p = currentLoteria;
    const allPalpites = getFilteredPalpites();
    
    let html = `
      <div class="manus-modal-header">
        <span class="manus-btn-back" onclick="window.renderMain()">&lsaquo; Voltar</span>
        <strong>${p.loterias}</strong>
        <span onclick="window.closeManusModal()" style="cursor:pointer; font-size:24px">&times;</span>
      </div>
      <div class="manus-modal-content">
        <div class="manus-view-modes">
          <button class="manus-mode-btn ${viewMode==='milhar'?'active':''}" onclick="window.setMode('milhar')">Milhar</button>
          <button class="manus-mode-btn ${viewMode==='centena'?'active':''}" onclick="window.setMode('centena')">Centena</button>
          <button class="manus-mode-btn ${viewMode==='dezena'?'active':''}" onclick="window.setMode('dezena')">Dezena</button>
        </div>
        <div class="manus-palpites-grid">`;
    
    if (allPalpites.length > 0) {
      allPalpites.forEach(palp => {
        const isSelected = selectedPalpites.has(palp);
        html += `<div class="manus-palpite-card ${isSelected?'selected':''}" onclick="window.togglePalpite('${palp}')">${palp}</div>`;
      });
    } else {
      html += `<div style="grid-column: span 2; text-align: center; color: #999; padding: 20px;">Nenhum palpite disponível.</div>`;
    }

    const count = selectedPalpites.size;
    const infoText = (count === 0 || count === allPalpites.length) ? 'Copiar todos os palpites' : `${count} palpite${count>1?'s':''} selecionado${count>1?'s':''}`;
    const btnText = (count === 0 || count === allPalpites.length) ? 'Copiar Palpites' : 'Copiar Palpites Selecionados';

    html += `</div>
        <div class="manus-selection-info" id="manus-selection-info">${infoText}</div>
        <button class="manus-btn-copy" id="manus-btn-copy" onclick="window.copyPalpites()">${btnText}</button>
        <div class="manus-update-note">Atualize a página para ver novos palpites.</div>
        <a class="manus-refresh-link" onclick="location.reload()">&#x21bb; Atualizar página</a>
        
        <div class="manus-list-item" style="margin-top:20px; border-top:1px solid #eee" onclick="window.renderAcertos()">
          <strong>Ver acertos anteriores</strong>
          <span>&rsaquo;</span>
        </div>
      </div>`;
    modalBody.innerHTML = html;
  }

  window.togglePalpite = function(palp) {
    if (selectedPalpites.has(palp)) selectedPalpites.delete(palp);
    else selectedPalpites.add(palp);
    window.renderLoteria(null, false);
  }

  window.setMode = function(m) { 
    viewMode = m; 
    selectedPalpites.clear(); // Limpa seleção ao mudar de modo
    window.renderLoteria(null, false); 
  }

  function getFilteredPalpites() {
    if (!currentLoteria || !currentLoteria.palpites) return [];
    const formatted = currentLoteria.palpites.map(p => {
      if (viewMode === 'centena') return p.slice(-3);
      if (viewMode === 'dezena') return p.slice(-2);
      return p;
    });
    return [...new Set(formatted)];
  }

  window.copyPalpites = function() {
    let palpites;
    if (selectedPalpites.size > 0 && selectedPalpites.size < getFilteredPalpites().length) {
      palpites = Array.from(selectedPalpites);
    } else {
      palpites = getFilteredPalpites();
    }

    if (palpites.length === 0) return;
    
    const text = palpites.join(', ');
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    
    const toast = document.getElementById('manus-toast-container');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 8000);
  }

  window.openManusTutorial = function() {
    const overlay = document.getElementById('manus-video-overlay');
    const iframe = document.getElementById('manus-video-iframe');
    const videoId = "xq2sY4Gw5w0"; 
    if (videoId && videoId !== "VIDEO_ID_AQUI") {
      iframe.src = "https://www.youtube.com/embed/" + videoId + "?autoplay=1";
      overlay.style.display = 'flex';
    } else alert("O tutorial em vídeo estará disponível em breve!");
  }

  window.closeManusTutorial = function() {
    const overlay = document.getElementById('manus-video-overlay');
    const iframe = document.getElementById('manus-video-iframe');
    iframe.removeAttribute('src');
    overlay.style.display = 'none';
  }

  window.renderAcertos = function(push = true) {
    updateState('acertos', push);
    let html = `
      <div class="manus-modal-header">
        <span class="manus-btn-back" onclick="window.renderLoteria()">&lsaquo; Voltar</span>
        <strong>Histórico e Auditoria</strong>
        <span onclick="window.closeManusModal()" style="cursor:pointer; font-size:24px">&times;</span>
      </div>
      <div class="manus-modal-content">`;
    
    if (currentLoteria.ultimaAtualizacao) {
      html += `<div style="text-align: center; font-size: 11px; color: #666; margin-bottom: 15px; background: #f0f4f8; padding: 5px; border-radius: 4px;">
        Última atualização: <strong>${currentLoteria.ultimaAtualizacao}</strong>
      </div>`;
    }
    
    const extracoes = currentLoteria.extracoes;
    Object.keys(extracoes).forEach(titulo => {
      const ext = extracoes[titulo];
      if (ext.frases.length > 0 || (ext.palpitesUsados && ext.palpitesUsados.length > 0)) {
        html += `<div style="margin-bottom:20px; padding:12px; background:#f9f9f9; border-radius:8px; border: 1px solid #1e3a8a;">
          <div style="font-weight:bold; color:#1e3a8a; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:4px">${titulo}</div>`;
        
        if (ext.palpitesUsados && ext.palpitesUsados.length > 0) {
          let gridCells = ext.palpitesUsados.map(p => `<div class="manus-auditoria-cell">${p}</div>`).join('');
          html += `
            <div class="manus-auditoria-box" style="margin-bottom:10px; border-left:none; padding:0; background:transparent; border: none; box-shadow: none;">
              <small style="color:#666; font-size:10px; font-weight:bold; text-transform:uppercase">Palpites usados:</small>
              <div class="manus-auditoria-grid">${gridCells}</div>
            </div>`;
        }
        
        if (ext.frases.length > 0) {
          let frasesFormatadas = ext.frases.map(frase => {
            const isHighlight = frase.includes('Milhar') || frase.includes('Centena');
            return `<div style="color: ${isHighlight?'#000000':'#475569'}; font-weight: ${isHighlight?'bold':'normal'}; margin-bottom: 3px;">${frase}</div>`;
          }).join('');
          html += `<div style="font-size:13px; line-height:1.4;">${frasesFormatadas}</div>`;
        } else html += `<div style="font-size:12px; color:#999; font-style:italic">Nenhum acerto nesta extração.</div>`;
        html += `</div>`;
      }
    });
    if (Object.keys(extracoes).length === 0) html += '<p style="text-align:center; color:#999">Nenhum dado de extração disponível.</p>';
    html += '</div>';
    modalBody.innerHTML = html;
  }

  window.renderMain = renderMain;
  window.closeManusModal = function() { closeModal(true); };
});
