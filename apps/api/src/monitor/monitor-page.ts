import { LOGO_SVG } from '../legal/legal-pages';

// Cùng bảng màu với app mobile (login/register) và các trang legal
const STYLES = `
  :root {
    --bg: #FFF9F5; --surface: #FFFFFF; --border: #F0E8E3; --soft: #FFF0E8;
    --ink: #29232A; --ink-2: #4A4249; --muted: #8B8289; --faint: #A49AA0;
    --brand: #FF6B35; --mark: #E85B28; --grid: #F0E8E3;
    --good: #0ca30c; --good-text: #006300; --warning: #fab219; --warning-text: #8a5a00;
    --critical: #d03b3b;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg); color: var(--ink); line-height: 1.5; -webkit-font-smoothing: antialiased;
  }
  .container { max-width: 1180px; margin: 0 auto; padding: 24px 16px 40px; }
  header.top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 22px; }
  .logo {
    width: 48px; height: 48px; border-radius: 16px; background: var(--brand);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 6px 14px rgba(255, 107, 53, 0.22);
  }
  .logo svg { width: 24px; height: 24px; }
  .title { flex: 1; min-width: 180px; }
  .title h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .title h1 span { color: var(--brand); }
  .title p { font-size: 12px; color: var(--muted); }
  .controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .segmented { display: inline-flex; background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 3px; }
  .segmented button {
    border: 0; background: transparent; font: inherit; font-size: 13px; font-weight: 700;
    color: var(--ink-2); padding: 6px 14px; border-radius: 999px; cursor: pointer;
  }
  .segmented button[aria-pressed="true"] { background: var(--brand); color: #FFFFFF; }
  .btn {
    border: 1px solid var(--border); background: var(--surface); font: inherit; font-size: 13px;
    font-weight: 700; color: var(--ink-2); padding: 7px 14px; border-radius: 999px; cursor: pointer;
  }
  .live { font-size: 12px; color: var(--muted); display: inline-flex; align-items: center; gap: 6px; }
  .live::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--good); }
  .live.stale::before { background: var(--critical); }
  h2.section { font-size: 15px; font-weight: 800; margin: 26px 0 12px; display: flex; align-items: baseline; gap: 8px; }
  h2.section small { font-size: 12px; font-weight: 500; color: var(--muted); }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
  .tile { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 14px 16px; }
  .tile .label { font-size: 12px; font-weight: 600; color: var(--muted); }
  .tile .value { font-size: 26px; font-weight: 800; letter-spacing: -0.6px; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .tile .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .status { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; margin-top: 4px; }
  .status .dot { width: 14px; height: 14px; border-radius: 50%; color: #fff; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; }
  .status.good { color: var(--good-text); } .status.good .dot { background: var(--good); }
  .status.warning { color: var(--warning-text); } .status.warning .dot { background: var(--warning); color: #0b0b0b; }
  .status.critical { color: var(--critical); } .status.critical .dot { background: var(--critical); }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px; min-width: 0; }
  .card h3 { font-size: 14px; font-weight: 700; }
  .card .desc { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
  .chart { position: relative; }
  .chart svg { display: block; width: 100%; height: 200px; overflow: visible; }
  .chart .axis { font-size: 10px; fill: var(--faint); }
  .tooltip {
    position: absolute; pointer-events: none; background: var(--ink); color: #FFFFFF; font-size: 12px;
    border-radius: 10px; padding: 8px 10px; white-space: nowrap; transform: translate(-50%, -100%);
    margin-top: -8px; opacity: 0; transition: opacity .1s; z-index: 2;
  }
  .tooltip strong { display: block; font-size: 11px; color: #D8CFCA; font-weight: 600; margin-bottom: 2px; }
  .barlist { display: grid; gap: 10px; }
  .barlist .row { display: grid; grid-template-columns: 120px 1fr 48px; align-items: center; gap: 10px; font-size: 13px; }
  .barlist .name { color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .barlist .track { height: 10px; background: var(--soft); border-radius: 5px; overflow: hidden; }
  .barlist .fill { height: 100%; background: var(--mark); border-radius: 5px; }
  .barlist .num { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  td { padding: 9px 10px; border-bottom: 1px solid var(--border); color: var(--ink-2); white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.route { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--ink); }
  th.num, td.num { text-align: right; }
  tr:last-child td { border-bottom: 0; }
  .empty { font-size: 13px; color: var(--muted); padding: 12px 0; }
  .alert { background: #FDECEC; border: 1px solid #F5C2C2; color: var(--critical); border-radius: 12px; padding: 10px 14px; font-size: 13px; }
  .sys { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px 16px; font-size: 13px; }
  .sys div span { display: block; font-size: 11px; color: var(--muted); font-weight: 600; }
  .sys div b { font-variant-numeric: tabular-nums; }
  details summary { cursor: pointer; font-size: 12px; color: var(--brand); font-weight: 700; margin-top: 10px; }
  .login {
    max-width: 380px; margin: 8vh auto 0; background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 28px 24px;
  }
  .login .logo { margin: 0 auto 12px; width: 64px; height: 64px; border-radius: 21px; }
  .login .logo svg { width: 30px; height: 30px; }
  .login h1 { text-align: center; font-size: 24px; font-weight: 800; letter-spacing: -0.6px; }
  .login h1 span { color: var(--brand); }
  .login .caption { text-align: center; font-size: 13px; color: var(--muted); margin: 4px 0 20px; }
  .login label { display: block; font-size: 12px; font-weight: 700; color: #393039; margin: 12px 0 6px; }
  .login input {
    width: 100%; height: 48px; border: 1px solid var(--border); border-radius: 14px; padding: 0 14px;
    font: inherit; font-size: 14px; color: var(--ink); background: #FFFFFF;
  }
  .login input:focus { outline: 2px solid var(--brand); outline-offset: 1px; }
  .login button[type=submit] {
    width: 100%; height: 50px; margin-top: 20px; border: 0; border-radius: 15px; background: var(--brand);
    color: #FFFFFF; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
  }
  .login button[disabled] { opacity: .7; cursor: default; }
  .login .alert { margin-top: 14px; }
  [hidden] { display: none !important; }
  footer { text-align: center; font-size: 12px; color: var(--faint); margin-top: 32px; }
  @media (max-width: 520px) {
    .barlist .row { grid-template-columns: 96px 1fr 40px; }
    .tile .value { font-size: 22px; }
  }
`;

const SCRIPT = `
const ROLE_LABELS = { CUSTOMER: 'Khách hàng', RESTAURANT_OWNER: 'Chủ nhà hàng', DRIVER: 'Tài xế' };
const STATUS_LABELS = {
  PENDING: 'Chờ thanh toán', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang nấu', READY: 'Chờ lấy hàng',
  PICKED_UP: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã huỷ',
};
const REFRESH_MS = 15000;
let range = 'hour';
let lastData = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('vi-VN');
const num = (n) => (n == null ? '–' : nf.format(n));
const ms = (n) => (n == null ? '–' : n >= 1000 ? (n / 1000).toFixed(1) + ' s' : n + ' ms');
const pct = (r) => (r * 100).toFixed(r && r < 0.01 ? 2 : 1) + '%';
const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const time = (t) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dateTime = (t) => new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });
const duration = (sec) => {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d ? d + ' ngày ' + h + ' giờ' : h ? h + ' giờ ' + m + ' phút' : m + ' phút';
};

function statusBadge(level, text) {
  const icon = { good: '✓', warning: '!', critical: '✕' }[level];
  return '<div class="status ' + level + '"><span class="dot" aria-hidden="true">' + icon + '</span>' + esc(text) + '</div>';
}

function tile(label, value, sub, extra) {
  return '<div class="tile"><div class="label">' + esc(label) + '</div><div class="value">' + value + '</div>' +
    (sub ? '<div class="sub">' + sub + '</div>' : '') + (extra || '') + '</div>';
}

function niceMax(v) {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

// Biểu đồ cột (1 series) — tooltip khi hover từng cột
function barChart(el, points, opts) {
  const W = el.clientWidth || 600, H = 200, padL = 36, padB = 22, padT = 8;
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const innerW = W - padL, innerH = H - padB - padT;
  const step = innerW / points.length, barW = Math.max(2, step - 2);
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label) + '">';
  for (let i = 0; i <= 4; i++) {
    const y = padT + innerH - (innerH * i) / 4;
    svg += '<line x1="' + padL + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--grid)" stroke-width="1"/>';
    svg += '<text class="axis" x="' + (padL - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + num((max * i) / 4) + '</text>';
  }
  points.forEach((p, i) => {
    const h = max ? (p.value / max) * innerH : 0;
    const x = padL + i * step + 1, y = padT + innerH - h, r = Math.min(4, barW / 2, h);
    if (h > 0) {
      svg += '<path fill="var(--mark)" d="M' + x + ',' + (padT + innerH) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
        'H' + (x + barW - r) + 'Q' + (x + barW) + ',' + y + ' ' + (x + barW) + ',' + (y + r) + 'V' + (padT + innerH) + 'Z"/>';
    }
    svg += '<rect data-i="' + i + '" x="' + (padL + i * step) + '" y="' + padT + '" width="' + step + '" height="' + innerH + '" fill="transparent"/>';
    if (opts.xLabelEvery && i % opts.xLabelEvery === 0) {
      svg += '<text class="axis" x="' + (x + barW / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.label) + '</text>';
    }
  });
  svg += '<line x1="' + padL + '" x2="' + W + '" y1="' + (padT + innerH) + '" y2="' + (padT + innerH) + '" stroke="#D8CFCA"/></svg>';
  el.innerHTML = svg + '<div class="tooltip"></div>';
  attachTooltip(el, points, (i) => padL + i * step + step / 2, (i) => padT + innerH - (max ? (points[i].value / max) * innerH : 0));
}

// Biểu đồ đường (1 series) — khoảng không có dữ liệu thì ngắt nét
function lineChart(el, points, opts) {
  const W = el.clientWidth || 600, H = 200, padL = 44, padB = 22, padT = 8;
  const values = points.map((p) => p.value).filter((v) => v != null);
  const max = niceMax(Math.max(...values, 0));
  const innerW = W - padL, innerH = H - padB - padT;
  const step = innerW / Math.max(1, points.length - 1);
  const X = (i) => padL + i * step, Y = (v) => padT + innerH - (v / max) * innerH;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label) + '">';
  for (let i = 0; i <= 4; i++) {
    const y = padT + innerH - (innerH * i) / 4;
    svg += '<line x1="' + padL + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--grid)"/>';
    svg += '<text class="axis" x="' + (padL - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + ms((max * i) / 4) + '</text>';
  }
  let d = '', pen = false;
  points.forEach((p, i) => {
    if (p.value == null) { pen = false; return; }
    d += (pen ? 'L' : 'M') + X(i) + ',' + Y(p.value);
    pen = true;
  });
  svg += '<path d="' + d + '" fill="none" stroke="var(--mark)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  points.forEach((p, i) => {
    if (p.value != null && (points[i - 1]?.value == null) && (points[i + 1]?.value == null)) {
      svg += '<circle cx="' + X(i) + '" cy="' + Y(p.value) + '" r="4" fill="var(--mark)" stroke="#fff" stroke-width="2"/>';
    }
    if (opts.xLabelEvery && i % opts.xLabelEvery === 0) {
      svg += '<text class="axis" x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.label) + '</text>';
    }
  });
  svg += '<line class="xhair" x1="0" x2="0" y1="' + padT + '" y2="' + (padT + innerH) + '" stroke="#A49AA0" stroke-dasharray="3 3" opacity="0"/>';
  svg += '<circle class="xdot" r="5" fill="var(--mark)" stroke="#fff" stroke-width="2" opacity="0"/>';
  svg += '<rect class="hit" x="' + padL + '" y="' + padT + '" width="' + innerW + '" height="' + innerH + '" fill="transparent"/></svg>';
  el.innerHTML = svg + '<div class="tooltip"></div>';

  const svgEl = el.querySelector('svg'), tip = el.querySelector('.tooltip');
  const xhair = el.querySelector('.xhair'), xdot = el.querySelector('.xdot');
  const hit = el.querySelector('.hit');
  hit.addEventListener('mousemove', (e) => {
    const box = svgEl.getBoundingClientRect();
    const sx = ((e.clientX - box.left) / box.width) * W;
    const i = Math.max(0, Math.min(points.length - 1, Math.round((sx - padL) / step)));
    const p = points[i];
    xhair.setAttribute('x1', X(i)); xhair.setAttribute('x2', X(i)); xhair.setAttribute('opacity', 1);
    if (p.value != null) {
      xdot.setAttribute('cx', X(i)); xdot.setAttribute('cy', Y(p.value)); xdot.setAttribute('opacity', 1);
    } else xdot.setAttribute('opacity', 0);
    showTip(el, tip, (X(i) / W) * box.width, ((p.value != null ? Y(p.value) : padT + innerH) / H) * box.height, p.tooltip);
  });
  hit.addEventListener('mouseleave', () => {
    tip.style.opacity = 0; xhair.setAttribute('opacity', 0); xdot.setAttribute('opacity', 0);
  });
}

function showTip(el, tip, x, y, html) {
  tip.innerHTML = html;
  tip.style.opacity = 1;
  const half = tip.offsetWidth / 2;
  tip.style.left = Math.max(half, Math.min(el.clientWidth - half, x)) + 'px';
  tip.style.top = y + 'px';
}

function attachTooltip(el, points, xOf, yOf) {
  const svgEl = el.querySelector('svg'), tip = el.querySelector('.tooltip');
  const W = svgEl.viewBox.baseVal.width, H = svgEl.viewBox.baseVal.height;
  el.querySelectorAll('rect[data-i]').forEach((r) => {
    r.addEventListener('mouseenter', () => {
      const i = +r.dataset.i, box = svgEl.getBoundingClientRect();
      showTip(el, tip, (xOf(i) / W) * box.width, (yOf(i) / H) * box.height, points[i].tooltip);
    });
    r.addEventListener('mouseleave', () => (tip.style.opacity = 0));
  });
}

function barList(el, entries) {
  const max = Math.max(...entries.map((e) => e.value), 1);
  el.innerHTML = entries.length
    ? entries.map((e) =>
        '<div class="row"><div class="name">' + esc(e.label) + '</div><div class="track"><div class="fill" style="width:' +
        ((e.value / max) * 100).toFixed(1) + '%"></div></div><div class="num">' + num(e.value) + '</div></div>').join('')
    : '<div class="empty">Chưa có dữ liệu</div>';
}

function renderTraffic(t) {
  const r = range === 'hour' ? t.lastHour : t.last24h;
  const rangeText = range === 'hour' ? '60 phút qua' : '24 giờ qua';
  const errLevel = r.errorRate < 0.01 ? 'good' : r.errorRate < 0.05 ? 'warning' : 'critical';
  const errText = { good: 'Ổn định', warning: 'Cần chú ý', critical: 'Nhiều lỗi' }[errLevel];
  const latLevel = r.p95Ms == null || r.p95Ms <= 500 ? 'good' : r.p95Ms <= 1500 ? 'warning' : 'critical';
  const latText = { good: 'Nhanh', warning: 'Hơi chậm', critical: 'Chậm' }[latLevel];

  $('traffic-range').textContent = rangeText;
  $('traffic-tiles').innerHTML =
    tile('Lượt request', num(r.requests), rangeText) +
    tile('Người dùng khác nhau', num(r.uniqueClients), 'theo địa chỉ IP') +
    tile('Tỉ lệ lỗi server (5xx)', pct(r.errorRate), num(r.serverErrors) + ' lỗi · ' + num(r.clientErrors) + ' lỗi 4xx', statusBadge(errLevel, errText)) +
    tile('Thời gian phản hồi p95', ms(r.p95Ms), 'trung bình ' + ms(r.avgMs), statusBadge(latLevel, latText)) +
    tile('Kết nối realtime', num(t.realtime.wsConnections), 'socket đang mở (theo dõi đơn)');

  const hourly = range !== 'hour';
  const pts = r.series.map((b) => {
    const label = time(b.start);
    const tipHead = '<strong>' + (hourly ? label + ' – ' + time(b.start + 3600000) : label) + '</strong>';
    return {
      label, raw: b,
      value: b.requests,
      tooltip: tipHead + num(b.requests) + ' request · ' + num(b.clients) + ' người dùng<br>' +
        num(b.serverErrors) + ' lỗi 5xx · ' + num(b.clientErrors) + ' lỗi 4xx',
    };
  });
  barChart($('chart-requests'), pts, { label: 'Lượt request theo thời gian', xLabelEvery: hourly ? 4 : 10 });
  lineChart($('chart-latency'), r.series.map((b) => ({
    label: time(b.start),
    value: b.p95Ms,
    tooltip: '<strong>' + time(b.start) + '</strong>' + (b.requests ? 'p95 ' + ms(b.p95Ms) + ' · TB ' + ms(b.avgMs) : 'Không có request'),
  })), { label: 'Thời gian phản hồi p95', xLabelEvery: hourly ? 4 : 10 });

  $('table-routes').innerHTML = t.routes.length
    ? '<table><thead><tr><th>Endpoint</th><th class="num">Request</th><th class="num">TB</th><th class="num">p95</th><th class="num">Lỗi 5xx</th><th class="num">Lỗi 4xx</th><th>Gần nhất</th></tr></thead><tbody>' +
      t.routes.slice(0, 20).map((x) =>
        '<tr><td class="route">' + esc(x.route) + '</td><td class="num">' + num(x.requests) + '</td><td class="num">' + ms(x.avgMs) +
        '</td><td class="num">' + ms(x.p95Ms) + '</td><td class="num">' + num(x.serverErrors) + '</td><td class="num">' + num(x.clientErrors) +
        '</td><td>' + dateTime(x.lastSeen) + '</td></tr>').join('') + '</tbody></table>'
    : '<div class="empty">Chưa có request nào</div>';

  const codes = Object.entries(t.statusCodes).sort((a, b) => b[1] - a[1]);
  barList($('list-status'), codes.map(([code, n]) => ({ label: 'HTTP ' + code, value: n })));

  $('table-errors').innerHTML = t.recentErrors.length
    ? '<table><thead><tr><th>Thời gian</th><th>Endpoint</th><th class="num">Mã</th><th class="num">Thời gian xử lý</th></tr></thead><tbody>' +
      t.recentErrors.map((e) => '<tr><td>' + dateTime(e.time) + '</td><td class="route">' + esc(e.route) + '</td><td class="num">' + e.status +
        '</td><td class="num">' + ms(e.ms) + '</td></tr>').join('') + '</tbody></table>'
    : statusBadge('good', 'Không có lỗi server nào gần đây');

  const s = t.system;
  $('system').innerHTML = [
    ['Đã chạy', duration(s.uptimeSec)], ['CPU', s.cpuPercent + '%'], ['RAM (RSS)', s.memoryRssMb + ' MB'],
    ['Heap', s.heapUsedMb + ' / ' + s.heapTotalMb + ' MB'], ['Event loop p99', s.eventLoopP99Ms + ' ms'],
    ['Node.js', s.nodeVersion], ['Tổng request', num(t.totalRequests)], ['Ghi nhận từ', dateTime(t.trackingSince)],
  ].map(([k, v]) => '<div><span>' + k + '</span><b>' + esc(v) + '</b></div>').join('');

  $('data-table').innerHTML = '<table><thead><tr><th>Thời điểm</th><th class="num">Request</th><th class="num">Người dùng</th><th class="num">5xx</th><th class="num">4xx</th><th class="num">TB</th><th class="num">p95</th></tr></thead><tbody>' +
    r.series.slice().reverse().map((b) => '<tr><td>' + time(b.start) + '</td><td class="num">' + num(b.requests) + '</td><td class="num">' + num(b.clients) +
      '</td><td class="num">' + num(b.serverErrors) + '</td><td class="num">' + num(b.clientErrors) + '</td><td class="num">' + ms(b.avgMs) +
      '</td><td class="num">' + ms(b.p95Ms) + '</td></tr>').join('') + '</tbody></table>';
}

function renderBusiness(b) {
  if (!b.ok) {
    $('business').innerHTML = '<div class="alert">Không đọc được dữ liệu từ database: ' + esc(b.error) + '</div>';
    return;
  }
  const r = b.users.byRole;
  $('business-tiles').innerHTML =
    tile('Người dùng', num(b.users.total), '+' + num(b.users.new24h) + ' trong 24 giờ qua') +
    tile('Đăng nhập bằng Google', b.users.googleLinked == null ? '–' : num(b.users.googleLinked),
      b.users.googleLinked == null ? 'chưa chạy migration google_id' : 'tài khoản đã liên kết') +
    tile('Tài xế đang online', num(b.driversOnline), 'trên ' + num(r.DRIVER || 0) + ' tài xế') +
    tile('Nhà hàng đang mở', num(b.restaurants.open), 'trên ' + num(b.restaurants.total) + ' nhà hàng') +
    tile('Đơn đã thanh toán', num(b.orders.paid24h), num(b.orders.paid7d) + ' đơn trong 7 ngày') +
    tile('Doanh thu 24 giờ', usd(b.orders.revenue24h), usd(b.orders.revenue7d) + ' trong 7 ngày · khách đã trả') +
    tile('App bù voucher 24 giờ', usd(b.orders.voucherCost24h), usd(b.orders.voucherCost7d) + ' trong 7 ngày');

  barChart($('chart-orders'), b.orders.perDay.map((d) => {
    const [y, m, dd] = d.day.split('-');
    return { label: dd + '/' + m, value: d.count, tooltip: '<strong>' + dd + '/' + m + '/' + y + '</strong>' + num(d.count) + ' đơn được tạo' };
  }), { label: 'Số đơn mỗi ngày', xLabelEvery: 1 });

  barList($('list-roles'), Object.keys(ROLE_LABELS).map((k) => ({ label: ROLE_LABELS[k], value: r[k] || 0 })));
  barList($('list-orders'), Object.keys(STATUS_LABELS).map((k) => ({ label: STATUS_LABELS[k], value: b.orders.byStatus[k] || 0 })));
}

function render() {
  if (!lastData) return;
  renderTraffic(lastData.traffic);
  renderBusiness(lastData.business);
}

const TOKEN_KEY = 'delifood_monitor_token';
let refreshTimer = null;
const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch {} };

function showLogin(message) {
  clearInterval(refreshTimer);
  setToken(null);
  $('dashboard').hidden = true;
  $('login').hidden = false;
  $('login-error').hidden = !message;
  $('login-error').textContent = message || '';
}

function showDashboard() {
  $('login').hidden = true;
  $('dashboard').hidden = false;
  load();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(load, REFRESH_MS);
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('login-submit');
  btn.disabled = true;
  $('login-error').hidden = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return showLogin(res.status === 403 ? 'Tài khoản đã bị khoá' : 'Email hoặc mật khẩu không đúng');
    if (body.user?.role !== 'ADMIN') return showLogin('Tài khoản này không có quyền admin');
    setToken(body.token);
    $('password').value = '';
    showDashboard();
  } catch {
    showLogin('Không kết nối được tới server');
  } finally {
    btn.disabled = false;
  }
});

$('logout').addEventListener('click', () => showLogin());

async function load() {
  try {
    const res = await fetch('/monitor/data', {
      cache: 'no-store',
      headers: { Authorization: 'Bearer ' + getToken() },
    });
    if (res.status === 401 || res.status === 403) return showLogin('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    lastData = await res.json();
    render();
    $('updated').textContent = 'Cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN');
    $('updated').classList.remove('stale');
  } catch (e) {
    $('updated').textContent = 'Mất kết nối (' + e.message + ')';
    $('updated').classList.add('stale');
  }
}

document.querySelectorAll('[data-range]').forEach((btn) =>
  btn.addEventListener('click', () => {
    range = btn.dataset.range;
    document.querySelectorAll('[data-range]').forEach((b) => b.setAttribute('aria-pressed', b === btn));
    render();
  }));
$('refresh').addEventListener('click', load);
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });

if (getToken()) showDashboard();
else showLogin();
`;

export function monitorPage() {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Monitor · delifood</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="container">
    <section class="login" id="login" hidden>
      <div class="logo">${LOGO_SVG}</div>
      <h1>deli<span>food</span> admin</h1>
      <p class="caption">Đăng nhập bằng tài khoản admin để xem monitor</p>
      <form id="login-form">
        <label for="email">Email</label>
        <input id="email" type="email" autocomplete="username" required placeholder="admin@email.com">
        <label for="password">Mật khẩu</label>
        <input id="password" type="password" autocomplete="current-password" required placeholder="Mật khẩu">
        <button type="submit" id="login-submit">Đăng nhập</button>
        <div class="alert" id="login-error" hidden></div>
      </form>
    </section>

    <div id="dashboard" hidden>
    <header class="top">
      <div class="logo">${LOGO_SVG}</div>
      <div class="title">
        <h1>deli<span>food</span> monitor</h1>
        <p>Theo dõi lượng truy cập, hiệu năng API và hoạt động kinh doanh</p>
      </div>
      <div class="controls">
        <span class="live" id="updated">Đang tải…</span>
        <div class="segmented" role="group" aria-label="Khoảng thời gian">
          <button data-range="hour" aria-pressed="true">1 giờ</button>
          <button data-range="day" aria-pressed="false">24 giờ</button>
        </div>
        <button class="btn" id="refresh">Làm mới</button>
        <button class="btn" id="logout">Đăng xuất</button>
      </div>
    </header>

    <h2 class="section">Lượng truy cập & hiệu năng API <small id="traffic-range"></small></h2>
    <div class="tiles" id="traffic-tiles"></div>
    <div class="grid-2" style="margin-top:12px">
      <div class="card">
        <h3>Lượt request</h3>
        <p class="desc">Số request tới API theo từng mốc thời gian</p>
        <div class="chart" id="chart-requests"></div>
      </div>
      <div class="card">
        <h3>Thời gian phản hồi (p95)</h3>
        <p class="desc">95% request nhanh hơn mức này</p>
        <div class="chart" id="chart-latency"></div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <details>
        <summary>Xem dạng bảng</summary>
        <div class="table-wrap" id="data-table" style="margin-top:10px"></div>
      </details>
    </div>

    <h2 class="section">Hoạt động kinh doanh <small>số liệu trực tiếp từ database</small></h2>
    <div id="business">
      <div class="tiles" id="business-tiles"></div>
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <h3>Số đơn mỗi ngày</h3>
          <p class="desc">7 ngày gần nhất (giờ Việt Nam), tính cả đơn chưa thanh toán và đã huỷ</p>
          <div class="chart" id="chart-orders"></div>
        </div>
        <div class="card">
          <h3>Người dùng theo vai trò</h3>
          <p class="desc">Tổng số tài khoản</p>
          <div class="barlist" id="list-roles"></div>
          <h3 style="margin-top:18px">Đơn hàng theo trạng thái</h3>
          <p class="desc">Tất cả đơn từ trước tới nay</p>
          <div class="barlist" id="list-orders"></div>
        </div>
      </div>
    </div>

    <h2 class="section">Endpoint <small>nhiều request nhất, từ lúc bắt đầu ghi nhận</small></h2>
    <div class="card"><div class="table-wrap" id="table-routes"></div></div>

    <div class="grid-2" style="margin-top:12px">
      <div class="card">
        <h3>Mã phản hồi HTTP</h3>
        <p class="desc">2xx thành công · 4xx lỗi từ phía app · 5xx lỗi server</p>
        <div class="barlist" id="list-status"></div>
      </div>
      <div class="card">
        <h3>Lỗi server gần đây</h3>
        <p class="desc">20 request 5xx mới nhất</p>
        <div class="table-wrap" id="table-errors"></div>
      </div>
    </div>

    <h2 class="section">Server</h2>
    <div class="card"><div class="sys" id="system"></div></div>

    <footer>Tự động làm mới mỗi 15 giây · Số liệu truy cập được lưu vào Redis mỗi phút</footer>
    </div>
  </div>
  <script>${SCRIPT}</script>
</body>
</html>`;
}
