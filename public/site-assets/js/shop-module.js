/* ============================================================
   SHOP / ORDER MODULE
   Handles shop product selection and order request capture
============================================================ */

const orderState = { productId:'', productName:'', qty:1, mukhi:'', carat:'', name:'', phone:'', address:'', notes:'', submitted:false, orderId:null };

function allShopItems(t){
  return [...t.shopList, ...t.shopList2];
}

function renderShop(){
  const t = T[LANG];
  setText('shopEyebrowEl', t.shopEyebrow); setText('shopTitleEl', t.shopTitle); setText('shopSubEl', t.shopSub);
  const banner = document.getElementById('shopBannerWrap');
  if(banner){
    banner.innerHTML = `
      <div class="disclaimer-box" style="margin-bottom:14px;"><b>${t.originalGuaranteeNote}</b></div>
      <div class="disclaimer-box" style="background:#fdeee0;border-left-color:var(--maroon);">${t.specialOfferBanner}</div>`;
  }
  const grid = document.getElementById('shopGrid');
  if(grid){
    grid.innerHTML = allShopItems(t).map(p=>`
      <div class="service-card">
        <div class="service-icon">${ICONS[p.icon] || ICONS.gem}</div>
        <h4>${p.t}</h4><p>${p.d}</p>
        <div class="service-meta"><span class="price-pill">${t.pricePlaceholder}</span>
        <a href="#" class="btn btn-gold" style="padding:8px 16px;font-size:.8rem;" onclick="openOrder('${p.id}'); return false;">${t.orderNowBtn}</a></div>
      </div>`).join('');
  }
  renderOrderPanel();
}

function openOrder(productId){
  const t = T[LANG];
  const item = allShopItems(t).find(p=>p.id===productId);
  orderState.productId = productId;
  orderState.productName = item ? item.t : productId;
  orderState.mukhi = '';
  orderState.carat = '';
  orderState.submitted = false;
  renderOrderPanel();
  document.getElementById('orderPanelWrap')?.scrollIntoView({behavior:'smooth', block:'center'});
}

function numOptions(min, max, sel){
  let s = '<option value="">--</option>';
  for(let i=min;i<=max;i++){ s += `<option value="${i}" ${String(sel)===String(i)?'selected':''}>${i}</option>`; }
  return s;
}

function renderOrderPanel(){
  const t = T[LANG];
  const panel = document.getElementById('orderPanel');
  if(!panel) return;
  if(orderState.submitted){
    panel.innerHTML = `<div class="confirm-box"><div class="confirm-check">${ICONS.check}</div><h3>${t.orderSuccessTitle}</h3><p>${t.orderSuccessNote}</p>
      <div class="booking-id">${t.orderIdLabel}: ${orderState.orderId}</div>
      <div style="margin-top:16px;"><button class="btn btn-ghost" onclick="resetOrder()">${t.newBooking}</button></div></div>`;
    return;
  }
  if(!orderState.productId){
    panel.innerHTML = `<p style="text-align:center;color:var(--ink-soft);">${t.selectProductFirst}</p>`;
    return;
  }
  const l = t.labels;
  let variantHtml = '';
  if(orderState.productId==='rudraksha'){
    variantHtml = `<div class="field"><label>${t.mukhiLabel}</label><select onchange="orderState.mukhi=this.value">${numOptions(1,14,orderState.mukhi)}</select></div>`;
  } else if(orderState.productId==='navratna'){
    variantHtml = `<div class="field"><label>${t.caratLabel}</label><select onchange="orderState.carat=this.value">${numOptions(1,50,orderState.carat)}</select></div>`;
  }
  panel.innerHTML = `
    <h3>${t.orderPanelTitle}</h3>
    <div class="review-row"><span>${t.orderProductLabel}</span><b>${orderState.productName}</b></div>
    <div class="form-grid cols-2" style="margin-top:14px;">
      ${variantHtml}
      <div class="field"><label>${t.orderQtyLabel}</label><input type="number" min="1" id="orderQty" value="${orderState.qty}" oninput="orderState.qty=this.value"></div>
      <div class="field"><label>${l.name}</label><input type="text" id="orderName" value="${orderState.name}" oninput="orderState.name=this.value"></div>
      <div class="field"><label>${l.phone}</label><input type="text" id="orderPhone" value="${orderState.phone}" oninput="orderState.phone=this.value"></div>
      <div class="field"><label>${t.orderAddressLabel}</label><input type="text" id="orderAddress" value="${orderState.address}" oninput="orderState.address=this.value"></div>
    </div>
    <div class="field" style="margin-top:14px;"><label>${t.orderNotesLabel}</label><textarea rows="3" id="orderNotes" oninput="orderState.notes=this.value">${orderState.notes}</textarea></div>
    <p style="font-size:.82rem;margin-top:10px;">${t.orderNote}</p>
    <button class="btn btn-gold btn-block" style="margin-top:14px;" onclick="submitOrder()">${t.orderSubmitBtn}</button>
  `;
}

async function submitOrder(){
  const t = T[LANG];
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random()*9000+1000));
  orderState.orderId = `JVS-ORD-${year}-${seq}`;
  orderState.submitted = true;
  const storageOk = window.JYOTISH_HELPERS && window.JYOTISH_HELPERS.safeStorageSet;
  if (storageOk) {
    const key = (SITE_CONFIG.storageKeys && SITE_CONFIG.storageKeys.order) || 'order_';
    await window.JYOTISH_HELPERS.safeStorageSet(key + orderState.orderId, JSON.stringify(orderState));
  }
  showToast(t.orderSuccessTitle);
  renderOrderPanel();
}

function resetOrder(){
  Object.assign(orderState, { productId:'', productName:'', qty:1, mukhi:'', carat:'', name:'', phone:'', address:'', notes:'', submitted:false, orderId:null });
  renderOrderPanel();
}
