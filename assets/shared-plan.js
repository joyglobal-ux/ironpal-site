// 받은 운동 읽기. 앱의 src/lib/sharePlan.ts와 같은 형식이다.
// 내용은 주소에만 있고 이 사이트는 아무것도 저장하지 않는다. 링크는 믿지 않는다: 값은 범위로 자르고, 화면은 textContent·canvas로만 그린다.
window.IronShare = (function () {
  // 같은 탭에서 다른 링크를 열어도 # 만 바뀌면 페이지가 새로 뜨지 않는다.
  window.addEventListener('hashchange', function () { location.reload(); });
  var LIMIT = { days: 14, exercises: 30, sets: 20 };
  function fromB64(s) {
    if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length > 20000) return null;
    var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  function name(v) { return typeof v === 'string' ? Array.from(v.trim()).slice(0, 60).join('') : ''; }
  function num(v, max) { return typeof v === 'number' && isFinite(v) && v >= 0 && v <= max ? v : null; }
  function setsOf(v) {
    if (!Array.isArray(v) || !v.length) return null;
    if (Array.isArray(v[0])) return v.length > LIMIT.sets ? null : v.map(function (s) { return { w: num(s[0], 1000), r: num(s[1], 3600) }; });
    if (!(v[0] >= 1 && v[0] <= LIMIT.sets)) return null;
    var out = [];
    for (var i = 0; i < v[0]; i++) out.push({ w: num(v[2], 1000), r: num(v[1], 3600) });
    return out;
  }
  function read(encoded) {
    try {
      var wire = JSON.parse(fromB64(encoded));
      if (!Array.isArray(wire) || wire[0] !== 1 || !name(wire[2]) || !Array.isArray(wire[4])) return null;
      if (!wire[4].length || wire[4].length > LIMIT.days) return null;
      var days = wire[4].map(function (d) {
        if (!Array.isArray(d[1]) || !d[1].length || d[1].length > LIMIT.exercises) throw 0;
        return { name: name(d[0]), ex: d[1].map(function (e) {
          var sets = setsOf(e[1]);
          if (!name(e[0]) || !sets) throw 0;
          return { name: name(e[0]), sets: sets, timed: e[4] === 't' || e[4] === 'x' };
        }) };
      });
      return { kind: wire[1], title: name(wire[2]), from: name(wire[3]), days: days };
    } catch (e) { return null; }
  }
  // 카톡 메시지 안에서 # 뒤가 지워질 수 있어 ?d= 도 같이 읽는다.
  function payload() {
    var hash = location.hash.slice(1);
    if (hash) return hash;
    return new URLSearchParams(location.search).get('d') || '';
  }
  function particle(who) {
    var c = who.charCodeAt(who.length - 1) - 0xac00;
    if (c < 0 || c > 11171) return ' 님이';
    return c % 28 ? '이' : '가';
  }
  function fromLine(plan) {
    var what = plan.kind === 'w' ? '운동 결과' : '운동';
    return plan.from ? plan.from + particle(plan.from) + ' 보낸 ' + what : '받은 ' + what;
  }
  function summary(plan) {
    var total = plan.days.reduce(function (n, d) { return n + d.ex.length; }, 0);
    if (plan.days.length > 1) return plan.days.length + '일 · 운동 ' + total + '개';
    return '운동 ' + total + '개 · ' + plan.days[0].ex.reduce(function (n, e) { return n + e.sets.length; }, 0) + '세트';
  }
  function spec(e) {
    var a = e.sets[0];
    var unit = e.timed ? '초' : '회';
    var same = e.sets.every(function (s) { return s.w === a.w && s.r === a.r; });
    if (same) return e.sets.length + '세트' + (a.r ? ' ' + a.r + unit : '') + (a.w ? ' ' + a.w + 'kg' : '');
    var top = Math.max.apply(null, e.sets.map(function (s) { return s.w || 0; }));
    return e.sets.length + '세트' + (top ? ' 최고 ' + top + 'kg' : '');
  }
  return { read: read, payload: payload, fromLine: fromLine, summary: summary, spec: spec };
})();
