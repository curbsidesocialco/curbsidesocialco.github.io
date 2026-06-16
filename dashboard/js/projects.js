function toggleCheck(el) {
  el.classList.toggle('done');
}

function togglePriceField() {
  const offer = document.getElementById('biz-offer').value;
  const wrap = document.getElementById('price-field-wrap');
  wrap.style.display = (offer === 'none' || offer === 'free_intro') ? 'none' : 'block';
}