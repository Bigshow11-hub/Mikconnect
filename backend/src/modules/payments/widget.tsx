// Ce fichier fournit un template HTML pour le widget de paiement mobile money
// à intégrer dans le portail captif MikroTik

export function getPaymentWidget(hotspotName: string, amount: number, plans: any[]): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement - ${hotspotName}</title>
  <script src="https://cdn.fedapay.com/checkout.js?v=1.1.7"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: linear-gradient(135deg, #0c8ee7, #16a34a);
           min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; border-radius: 1rem; padding: 2rem; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    h1 { font-size: 1.5rem; color: #1a1a2e; margin-bottom: 0.5rem; }
    .subtitle { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .price { font-size: 2.5rem; font-weight: 700; color: #0c8ee7; margin-bottom: 1.5rem; }
    .btn { width: 100%; padding: 0.875rem; background: #0c8ee7; color: white; border: none;
           border-radius: 0.75rem; font-size: 1rem; font-weight: 600; cursor: pointer;
           transition: background 0.2s; }
    .btn:hover { background: #0070c4; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .methods { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1.5rem; }
    .method { padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 0.75rem; text-align: center;
              cursor: pointer; transition: all 0.2s; font-size: 0.875rem; font-weight: 500; }
    .method.selected { border-color: #0c8ee7; background: #f0f7ff; }
    .method img { width: 32px; height: 32px; object-fit: contain; margin-bottom: 0.25rem; }
    .plans { margin-bottom: 1.5rem; }
    .plan { padding: 1rem; border: 2px solid #e2e8f0; border-radius: 0.75rem; margin-bottom: 0.5rem;
            cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
    .plan.selected { border-color: #0c8ee7; background: #f0f7ff; }
    .plan-name { font-weight: 600; }
    .plan-price { color: #0c8ee7; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🌐 ${hotspotName}</h1>
    <p class="subtitle">Choisissez votre offre et payez en toute simplicité</p>

    <div class="plans" id="plans">
      ${plans.map((p: any, i: number) => `
        <div class="plan ${i === 0 ? 'selected' : ''}" data-price="${p.price}" data-plan="${p.name}" data-id="${p.id}">
          <div>
            <div class="plan-name">${p.name}</div>
            <div style="font-size:0.75rem;color:#64748b">${p.duration} min</div>
          </div>
          <div class="plan-price">${p.price} XOF</div>
        </div>
      `).join('')}
    </div>

    <div class="methods">
      <div class="method selected" data-method="MTN_MOMO">
        <div>MTN</div>
        <div style="font-size:0.75rem">Mobile Money</div>
      </div>
      <div class="method" data-method="WAVE">
        <div>Wave</div>
        <div style="font-size:0.75rem">Wave</div>
      </div>
      <div class="method" data-method="ORANGE_MONEY">
        <div>Orange</div>
        <div style="font-size:0.75rem">Money</div>
      </div>
      <div class="method" data-method="FEDAPAY">
        <div>💳</div>
        <div style="font-size:0.75rem">Carte</div>
      </div>
    </div>

    <div class="price" id="price">${amount} XOF</div>
    <input type="tel" id="phone" placeholder="Votre numéro (ex: +22997000000)"
           style="width:100%;padding:0.875rem;border:2px solid #e2e8f0;border-radius:0.75rem;margin-bottom:1rem;font-size:1rem" />
    <button class="btn" id="payBtn" onclick="pay()">Payer ${amount} XOF</button>
    <div id="status" style="margin-top:1rem;text-align:center;font-size:0.875rem;color:#64748b"></div>
  </div>

  <script>
    let selectedPlan = document.querySelector('.plan.selected');
    let selectedMethod = document.querySelector('.method.selected');

    // Plan selection
    document.querySelectorAll('.plan').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.plan').forEach(p => p.classList.remove('selected'));
        el.classList.add('selected');
        selectedPlan = el;
        updatePrice();
      });
    });

    // Method selection
    document.querySelectorAll('.method').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.method').forEach(m => m.classList.remove('selected'));
        el.classList.add('selected');
        selectedMethod = el;
      });
    });

    function updatePrice() {
      if (selectedPlan) {
        const price = selectedPlan.dataset.price;
        document.getElementById('price').textContent = price + ' XOF';
        document.getElementById('payBtn').textContent = 'Payer ' + price + ' XOF';
      }
    }

    async function pay() {
      const phone = document.getElementById('phone').value;
      if (!phone) { alert('Entrez votre numéro de téléphone'); return; }

      const btn = document.getElementById('payBtn');
      btn.disabled = true;
      btn.textContent = 'Traitement...';
      document.getElementById('status').textContent = '';

      try {
        const res = await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseInt(selectedPlan.dataset.price),
            method: selectedMethod.dataset.method,
            phoneNumber: phone,
            planId: selectedPlan.dataset.id,
            hotspotId: '${hotspotName}',
          }),
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('status').textContent = '✅ Paiement en cours...';
          setTimeout(() => {
            document.getElementById('status').textContent = '🎉 WiFi activé ! Vous pouvez vous connecter.';
          }, 3000);
        } else {
          document.getElementById('status').textContent = '❌ Erreur de paiement';
        }
      } catch (err) {
        document.getElementById('status').textContent = '❌ Erreur de connexion';
      }
      btn.disabled = false;
      btn.textContent = 'Payer ' + selectedPlan.dataset.price + ' XOF';
    }
  </script>
</body>
</html>`;
}
