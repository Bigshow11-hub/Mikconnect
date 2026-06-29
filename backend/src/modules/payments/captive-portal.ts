import { Router, Request, Response } from 'express';
import { prisma } from '../../index';

const router = Router();

router.get('/portal/:hotspotId', async (req: Request, res: Response) => {
  try {
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: req.params.hotspotId },
      include: { plans: { where: { isActive: true } } },
    });
    if (!hotspot) return res.status(404).send('Hotspot not found');

    const plans = hotspot.plans.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      duration: p.duration,
      bandwidth: p.bandwidth,
    }));

    const methods = ['MTN_MOMO', 'WAVE', 'ORANGE_MONEY', 'FEDAPAY'];

    res.send(getPortalHtml(hotspot.name, plans, methods));
  } catch {
    res.status(500).send('Server error');
  }
});

function getPortalHtml(name: string, plans: any[], methods: string[]): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - WiFi</title>
  <script src="https://cdn.fedapay.com/checkout.js?v=1.1.7"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0c8ee7 0%, #16a34a 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; border-radius: 1.5rem; padding: 2rem; max-width: 420px; width: 100%;
      box-shadow: 0 25px 80px rgba(0,0,0,0.3); }
    h1 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.25rem; }
    .sub { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .plan { border: 2px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 0.5rem;
      cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
    .plan.selected { border-color: #0c8ee7; background: #f0f7ff; }
    .plan-name { font-weight: 600; color: #0f172a; }
    .plan-price { color: #0c8ee7; font-weight: 700; font-size: 1.125rem; }
    .plan-dur { font-size: 0.75rem; color: #64748b; }
    .methods { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 1rem 0; }
    .method { padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 0.75rem; text-align: center;
      cursor: pointer; font-size: 0.8rem; font-weight: 500; transition: all 0.2s; }
    .method.selected { border-color: #0c8ee7; background: #f0f7ff; }
    input { width: 100%; padding: 0.875rem 1rem; border: 2px solid #e2e8f0; border-radius: 0.75rem;
      font-size: 1rem; margin-bottom: 1rem; outline: none; transition: border 0.2s; }
    input:focus { border-color: #0c8ee7; }
    .btn { width: 100%; padding: 1rem; background: linear-gradient(135deg, #0c8ee7, #0070c4); color: white;
      border: none; border-radius: 0.75rem; font-size: 1.125rem; font-weight: 600; cursor: pointer;
      transition: all 0.2s; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(12,142,231,0.3); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    #status { text-align: center; padding: 0.75rem; border-radius: 0.75rem; margin-top: 1rem;
      font-size: 0.875rem; display: none; }
    .logo { width: 48px; height: 48px; background: #0c8ee7; border-radius: 12px; display: flex;
      align-items: center; justify-content: center; margin-bottom: 1rem; }
    .logo span { color: white; font-weight: 800; font-size: 1.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><span>M</span></div>
    <h1>${name}</h1>
    <p class="sub">Connectez-vous en quelques clics</p>

    <div id="plans">
      ${plans.map((p: any, i: number) => `
        <div class="plan ${i === 0 ? 'selected' : ''}" data-id="${p.id}" data-price="${p.price}" data-name="${p.name}">
          <div>
            <div class="plan-name">${p.name}</div>
            <div class="plan-dur">${p.duration} min${p.bandwidth ? ' · ' + p.bandwidth : ''}</div>
          </div>
          <div class="plan-price">${p.price} XOF</div>
        </div>
      `).join('')}
    </div>

    <div class="methods">
      ${methods.map((m: string, i: number) => `
        <div class="method ${i === 0 ? 'selected' : ''}" data-method="${m}">
          ${m === 'MTN_MOMO' ? '📱 MTN MoMo' : m === 'WAVE' ? '🌊 Wave' : m === 'ORANGE_MONEY' ? '🍊 Orange' : '💳 Carte'}
        </div>
      `).join('')}
    </div>

    <input type="tel" id="phone" placeholder="Votre numéro (ex: +22997000000)" autocomplete="tel">
    <button class="btn" id="payBtn" onclick="pay()">Payer</button>
    <div id="status"></div>
  </div>

  <script>
    let selectedPlan = document.querySelector('.plan.selected');
    let selectedMethod = document.querySelector('.method.selected');

    document.querySelectorAll('.plan').forEach(el => {
      el.addEventListener('click', function() {
        document.querySelectorAll('.plan').forEach(p => p.classList.remove('selected'));
        this.classList.add('selected'); selectedPlan = this; updateBtn(); }); });
    document.querySelectorAll('.method').forEach(el => {
      el.addEventListener('click', function() {
        document.querySelectorAll('.method').forEach(m => m.classList.remove('selected'));
        this.classList.add('selected'); selectedMethod = this; }); });

    function updateBtn() { if (selectedPlan) document.getElementById('payBtn').textContent = 'Payer ' + selectedPlan.dataset.price + ' XOF'; }
    updateBtn();

    async function pay() {
      const phone = document.getElementById('phone').value;
      if (!phone) { showStatus('Entrez votre numéro', 'error'); return; }
      const btn = document.getElementById('payBtn'); btn.disabled = true;
      showStatus('Paiement en cours...', 'info');
      try {
        const r = await fetch('/api/payments/initiate', { method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            amount: parseInt(selectedPlan.dataset.price),
            method: selectedMethod.dataset.method,
            phoneNumber: phone,
            planId: selectedPlan.dataset.id,
            customerName: '' }) });
        const d = await r.json();
        if (d.success) { showStatus('✅ Paiement accepté ! Connexion WiFi activée.', 'success');
          setTimeout(() => { window.location.href = 'https://www.google.com'; }, 2000); }
        else showStatus('❌ Erreur de paiement', 'error');
      } catch(e) { showStatus('❌ Erreur de connexion', 'error'); }
      btn.disabled = false; updateBtn();
    }

    function showStatus(msg, type) {
      const el = document.getElementById('status');
      el.style.display = 'block';
      el.textContent = msg;
      el.style.background = type === 'success' ? '#dcfce7' : type === 'error' ? '#fef2f2' : '#f0f7ff';
      el.style.color = type === 'success' ? '#166534' : type === 'error' ? '#991b1b' : '#0c8ee7';
    }
  </script>
</body>
</html>`;
}

export default router;
