// 画面写真に「朱の書き込み」を重ねる（ブラウザー内で実行）。
// 枠＝朱 bold（3px）の直角枠＝注目する場所。番号＝白地・朱 thin（2px）輪郭の円に墨の数字（検図の印）。
// 塗りの朱は使わない（Shu to Sumi: 朱は線・記号として置く）。
(function (marks) {
  var SHU = '#FD5B0B', SUMI = '#1D252D', PAPER = '#FFFFFF';
  var layer = document.createElement('div');
  layer.id = '__annotations';
  layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483647;font-family:"BIZ UDPGothic","Hiragino Sans",sans-serif;';
  document.body.appendChild(layer);
  marks.forEach(function (m) {
    var target = typeof m.sel === 'string' ? document.querySelector(m.sel) : m.sel;
    if (!target) { console.warn('annotate: not found ' + m.sel); return; }
    var r = target.getBoundingClientRect();
    if (m.union) {
      var u = document.querySelector(m.union);
      if (u) { var r2 = u.getBoundingClientRect(); r = { left: Math.min(r.left, r2.left), top: Math.min(r.top, r2.top), right: Math.max(r.right, r2.right), bottom: Math.max(r.bottom, r2.bottom) }; }
    }
    var pad = m.pad === undefined ? 4 : m.pad;
    var x = r.left + window.scrollX - pad, y = r.top + window.scrollY - pad;
    var w = (r.right - r.left) + pad * 2, h = (r.bottom - r.top) + pad * 2;
    if (m.frame !== false) {
      var f = document.createElement('div');
      f.style.cssText = 'position:absolute;box-sizing:border-box;border:3px solid ' + SHU + ';left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;';
      layer.appendChild(f);
    }
    var n = document.createElement('div');
    var size = 28;
    var at = m.at || 'tl';
    var nx = at.indexOf('r') >= 0 ? x + w : x;
    var ny = at.indexOf('b') >= 0 ? y + h : y;
    if (at === 'l') { nx = x; ny = y + h / 2; }
    if (at === 'r') { nx = x + w; ny = y + h / 2; }
    n.textContent = String(m.n);
    n.style.cssText = 'position:absolute;box-sizing:border-box;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + PAPER + ';border:2px solid ' + SHU + ';color:' + SUMI + ';font-weight:700;font-size:15px;line-height:' + (size - 4) + 'px;text-align:center;left:' + (nx - size / 2) + 'px;top:' + (ny - size / 2) + 'px;';
    layer.appendChild(n);
  });
})
