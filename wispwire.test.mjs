// si-didy-loop · wispwire.test.mjs — the wisp wire, every rule falsifiable.
// The field kernel (generative-estate) is imported REAL from the sibling checkout: template
// exams are proven against the actual verify() they will face, not a copy of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { KAPPA, TEMPLATES, nameHash, specFromProposal, specFromGap, redactSpec, promptFor, extractCode } from './wispwire.mjs';

// the field kernel is the SIBLING checkout, same convention as missig and the forge — CI clones
// it next door, and a machine without it cannot honestly run this suite
const estate = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'generative-estate', 'estate.mjs')).href);

const PROPOSAL = () => ({ move: 'soundcheck kiosks licensed per venue for structural surveys', grounds: ['soundcheck', 'the-ear', 'memory:airgap'], proposesOnly: true });

// reference implementations — what a competent wisp should produce; each exam must be PASSABLE
const REFERENCE = {
  bundleQuote: `function NAME(a, b, rate) { if (!Number.isInteger(a) || a < 0 || !Number.isInteger(b) || b < 0 || typeof rate !== 'number' || !isFinite(rate) || rate < 0 || rate > 1) return {ok:false}; var sum = a + b; var discount = Math.round(sum * rate); return {ok:true, sum: sum, discount: discount, price: sum - discount}; }`,
  licenceFee: `function NAME(seats, perSeat, minFee) { if (!Number.isInteger(seats) || seats < 0 || !Number.isInteger(perSeat) || perSeat < 0 || !Number.isInteger(minFee) || minFee < 0) return {ok:false}; return {ok:true, fee: Math.max(seats * perSeat, minFee)}; }`,
  savingsOnce: `function NAME(rentMo, once) { if (!Number.isInteger(rentMo) || rentMo <= 0 || !Number.isInteger(once) || once < 0) return {ok:false}; var rentYr = rentMo * 12; return {ok:true, rentYr: rentYr, saveY1: rentYr - once}; }`,
  escrowSplit: `function NAME(total, parts) { if (!Number.isInteger(total) || total < 0 || !Number.isInteger(parts) || parts <= 0) return {ok:false}; var base = Math.floor(total / parts); var rem = total - base * parts; var shares = []; for (var i = 0; i < parts; i++) shares.push(base + (i < rem ? 1 : 0)); return {ok:true, shares: shares}; }`,
  tierEarn: `function NAME(score) { if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 1) return {ok:false}; return {ok:true, tier: score >= 0.9 ? 'gold' : score >= 0.618 ? 'clean' : 'not-yet'}; }`,
  // ── the ten gap-exam references: the frontier's proof that every didy-mined exam is passable ──
  tierOf: `function NAME(record){ var po=function(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}; if(!po(record)||!Array.isArray(record.runs))return{ok:false}; var runs=record.runs; for(var i=0;i<runs.length;i++){var r=runs[i]; if(!po(r))return{ok:false}; if(typeof r.workflow!=='string'||r.workflow==='')return{ok:false}; if(r.conclusion!=='success'&&r.conclusion!=='failure')return{ok:false}; if(typeof r.mutation!=='boolean')return{ok:false};} var adm=runs.filter(function(r){return r.workflow!=='pages build and deployment';}); var proven=adm.some(function(r){return r.conclusion==='success'&&r.mutation===true;}); var works=adm.some(function(r){return r.conclusion==='success';}); var ev=adm.filter(function(r){return r.conclusion==='success';}).length; return{ok:true,tier:proven?'Proven':(works?'Works':'Prototype'),evidence:ev}; }`,
  conformanceOf: `function NAME(c){ if(c===null||typeof c!=='object'||Array.isArray(c))return{ok:false}; var f=['sigPresent','sigValid','anchorPresent','anchorValid','attPresent','attValid']; for(var i=0;i<6;i++){ if(typeof c[f[i]]!=='boolean')return{ok:false}; } if((c.sigValid&&!c.sigPresent)||(c.anchorValid&&!c.anchorPresent)||(c.attValid&&!c.attPresent))return{ok:false}; var level=0; if(c.sigValid){level=1; if(c.anchorValid){level=2; if(c.attValid)level=3;}} var att=c.attValid?'attested':(c.attPresent?'present-but-invalid':'none'); return{ok:true,level:level,attestation:att}; }`,
  guardBooking: `function NAME(existing,cand){ function vd(s){ if(typeof s!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(s))return false; var y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8,10); if(m<1||m>12||d<1)return false; var L=(y%4===0&&y%100!==0)||y%400===0; return d<=[31,L?29:28,31,30,31,30,31,31,30,31,30,31][m-1]; } function nes(v){return typeof v==='string'&&v.length>0;} if(!Array.isArray(existing))return{ok:false}; if(cand===null||typeof cand!=='object'||Array.isArray(cand))return{ok:false}; if(!nes(cand.unit)||!vd(cand.checkin)||!vd(cand.checkout)||!(cand.checkout>cand.checkin))return{ok:false}; for(var i=0;i<existing.length;i++){ var b=existing[i]; if(b===null||typeof b!=='object'||Array.isArray(b))return{ok:false}; if(!nes(b.id)||!nes(b.unit))return{ok:false}; if(b.status!=='confirmed'&&b.status!=='cancelled')return{ok:false}; if(!vd(b.checkin)||!vd(b.checkout)||!(b.checkout>b.checkin))return{ok:false}; } var ids=[]; for(var j=0;j<existing.length;j++){ var e=existing[j]; if(e.unit===cand.unit&&e.status==='confirmed'&&e.checkin<cand.checkout&&cand.checkin<e.checkout)ids.push(e.id); } return{ok:true,clash:ids.length>0,conflictIds:ids}; }`,
  splitDeposit: `function NAME(total,pct,checkin,days){ function vd(s){ if(typeof s!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(s))return false; var y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8,10); if(m<1||m>12||d<1)return false; var L=(y%4===0&&y%100!==0)||y%400===0; return d<=[31,L?29:28,31,30,31,30,31,31,30,31,30,31][m-1]; } function dfc(y,m,d){ y-=(m<=2?1:0); var era=Math.floor(y/400), yoe=y-era*400, doy=Math.floor((153*(m+(m>2?-3:9))+2)/5)+d-1, doe=yoe*365+Math.floor(yoe/4)-Math.floor(yoe/100)+doy; return era*146097+doe-719468; } function cfd(z){ z+=719468; var era=Math.floor(z/146097), doe=z-era*146097, yoe=Math.floor((doe-Math.floor(doe/1460)+Math.floor(doe/36524)-Math.floor(doe/146096))/365), y=yoe+era*400, doy=doe-(365*yoe+Math.floor(yoe/4)-Math.floor(yoe/100)), mp=Math.floor((5*doy+2)/153), d=doy-Math.floor((153*mp+2)/5)+1, m=(mp<10?mp+3:mp-9); y+=(m<=2?1:0); return [y,m,d]; } function pad(n,w){ n=String(n); while(n.length<w)n='0'+n; return n; } if(!Number.isInteger(total)||total<0)return{ok:false}; if(!Number.isInteger(pct)||pct<0||pct>100)return{ok:false}; if(!vd(checkin))return{ok:false}; if(!Number.isInteger(days)||days<0)return{ok:false}; var dep=Math.floor((total*pct+50)/100); var y=+checkin.slice(0,4),m=+checkin.slice(5,7),d=+checkin.slice(8,10); var t=cfd(dfc(y,m,d)-days); return{ok:true,depositPence:dep,balancePence:total-dep,balanceDue:pad(t[0],4)+'-'+pad(t[1],2)+'-'+pad(t[2],2)}; }`,
  scorecardScore: `function NAME(dims){ if(!Array.isArray(dims)||dims.length===0)return{ok:false}; var names={}; var num=0,den=0,answered=0; for(var i=0;i<dims.length;i++){ var d=dims[i]; if(d===null||typeof d!=='object'||Array.isArray(d))return{ok:false}; if(typeof d.name!=='string'||d.name==='')return{ok:false}; if(names[d.name])return{ok:false}; names[d.name]=1; if(!Number.isInteger(d.weight)||d.weight<1)return{ok:false}; if(d.score===null)continue; if(!Number.isInteger(d.score)||d.score<1||d.score>5)return{ok:false}; answered++; num+=d.weight*d.score; den+=d.weight; } if(answered===0)return{ok:false}; var scaled=100*num; var r=Math.floor(scaled/den), rem=scaled-r*den; var sh=(2*rem>=den)?r+1:r; return{ok:true,scoreHundredths:sh,answered:answered,total:dims.length,partScored:answered<dims.length}; }`,
  panelAgreement: `function NAME(scores){ if(!Array.isArray(scores)||scores.length===0)return{ok:false}; for(var i=0;i<scores.length;i++){ var s=scores[i]; if(typeof s!=='number'||!Number.isInteger(s)||s<100||s>500)return{ok:false}; } if(scores.length===1)return{ok:true,raters:1,spread:null}; return{ok:true,raters:scores.length,spread:Math.max.apply(null,scores)-Math.min.apply(null,scores)}; }`,
  dsarDueDate: `function NAME(received,months,holidays){ function vd(s){ if(typeof s!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(s))return false; var y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8,10); if(m<1||m>12||d<1)return false; var L=(y%4===0&&y%100!==0)||y%400===0; return d<=[31,L?29:28,31,30,31,30,31,31,30,31,30,31][m-1]; } function dim(y,m){ var L=(y%4===0&&y%100!==0)||y%400===0; return [31,L?29:28,31,30,31,30,31,31,30,31,30,31][m-1]; } function dfc(y,m,d){ y-=(m<=2?1:0); var era=Math.floor(y/400), yoe=y-era*400, doy=Math.floor((153*(m+(m>2?-3:9))+2)/5)+d-1, doe=yoe*365+Math.floor(yoe/4)-Math.floor(yoe/100)+doy; return era*146097+doe-719468; } function cfd(z){ z+=719468; var era=Math.floor(z/146097), doe=z-era*146097, yoe=Math.floor((doe-Math.floor(doe/1460)+Math.floor(doe/36524)-Math.floor(doe/146096))/365), y=yoe+era*400, doy=doe-(365*yoe+Math.floor(yoe/4)-Math.floor(yoe/100)), mp=Math.floor((5*doy+2)/153), d=doy-Math.floor((153*mp+2)/5)+1, m=(mp<10?mp+3:mp-9); y+=(m<=2?1:0); return [y,m,d]; } function pad(n,w){ n=String(n); while(n.length<w)n='0'+n; return n; } function fmt(a){ return pad(a[0],4)+'-'+pad(a[1],2)+'-'+pad(a[2],2); } if(!vd(received))return{ok:false}; if(months!==1&&months!==3)return{ok:false}; if(!Array.isArray(holidays))return{ok:false}; for(var i=0;i<holidays.length;i++)if(!vd(holidays[i]))return{ok:false}; var y=+received.slice(0,4),m=+received.slice(5,7),d=+received.slice(8,10); var m2=m+months, y2=y; while(m2>12){m2-=12;y2++;} var d2=Math.min(d,dim(y2,m2)); var z=dfc(y2,m2,d2); for(;;){ var c=cfd(z); var wd=((z+4)%7+7)%7; var str=fmt(c); var isH=false; for(var j=0;j<holidays.length;j++)if(holidays[j]===str)isH=true; if(wd===0||wd===6||isH){z++;continue;} return{ok:true,due:str}; } }`,
  lbaResponseDeadline: `function NAME(sent,wdN,holidays){ function vd(s){ if(typeof s!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(s))return false; var y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8,10); if(m<1||m>12||d<1)return false; var L=(y%4===0&&y%100!==0)||y%400===0; return d<=[31,L?29:28,31,30,31,30,31,31,30,31,30,31][m-1]; } function dfc(y,m,d){ y-=(m<=2?1:0); var era=Math.floor(y/400), yoe=y-era*400, doy=Math.floor((153*(m+(m>2?-3:9))+2)/5)+d-1, doe=yoe*365+Math.floor(yoe/4)-Math.floor(yoe/100)+doy; return era*146097+doe-719468; } function cfd(z){ z+=719468; var era=Math.floor(z/146097), doe=z-era*146097, yoe=Math.floor((doe-Math.floor(doe/1460)+Math.floor(doe/36524)-Math.floor(doe/146096))/365), y=yoe+era*400, doy=doe-(365*yoe+Math.floor(yoe/4)-Math.floor(yoe/100)), mp=Math.floor((5*doy+2)/153), d=doy-Math.floor((153*mp+2)/5)+1, m=(mp<10?mp+3:mp-9); y+=(m<=2?1:0); return [y,m,d]; } function pad(n,w){ n=String(n); while(n.length<w)n='0'+n; return n; } function fmt(a){ return pad(a[0],4)+'-'+pad(a[1],2)+'-'+pad(a[2],2); } if(!vd(sent))return{ok:false}; if(!Number.isInteger(wdN)||wdN<1||wdN>250)return{ok:false}; if(!Array.isArray(holidays))return{ok:false}; for(var i=0;i<holidays.length;i++)if(!vd(holidays[i]))return{ok:false}; var y=+sent.slice(0,4),m=+sent.slice(5,7),d=+sent.slice(8,10); var z=dfc(y,m,d); var count=0; for(;;){ z++; var c=cfd(z); var wd=((z+4)%7+7)%7; var str=fmt(c); if(wd!==0&&wd!==6){ var isH=false; for(var j=0;j<holidays.length;j++)if(holidays[j]===str)isH=true; if(!isH){ count++; if(count===wdN)return{ok:true,deadline:str}; } } } }`,
  invoiceTotals: `function NAME(lines,bp){ if(!Array.isArray(lines)||lines.length===0)return{ok:false}; if(typeof bp!=='number'||!Number.isSafeInteger(bp)||bp<0||bp>10000)return{ok:false}; var lp=[],sub=0; for(var i=0;i<lines.length;i++){ var L=lines[i]; if(L===null||typeof L!=='object'||Array.isArray(L))return{ok:false}; if(typeof L.qty!=='number'||!Number.isSafeInteger(L.qty)||L.qty<1)return{ok:false}; if(typeof L.unitPrice!=='string'||!/^[0-9]+(\\.[0-9]{1,6})?$/.test(L.unitPrice))return{ok:false}; var dot=L.unitPrice.indexOf('.'); var dd=dot<0?0:L.unitPrice.length-dot-1; var P=parseInt(L.unitPrice.replace('.',''),10); var num=L.qty*P*100, den=Math.pow(10,dd); var r=Math.floor(num/den), rem=num-r*den; var pen=(2*rem>=den)?r+1:r; lp.push(pen); sub+=pen; } var vn=sub*bp, vr=Math.floor(vn/10000), vrem=vn-vr*10000; var vat=(2*vrem>=10000)?vr+1:vr; return{ok:true,linePence:lp,subtotalPence:sub,vatPence:vat,totalPence:sub+vat}; }`,
  trialBalance: `function NAME(lines,accounts,base){ function nes(v){return typeof v==='string'&&v.length>0;} if(!Array.isArray(accounts)||accounts.length===0)return{ok:false}; var seen={}; for(var i=0;i<accounts.length;i++){ if(!nes(accounts[i]))return{ok:false}; if(seen[accounts[i]])return{ok:false}; seen[accounts[i]]=1; } if(typeof base!=='string'||!/^[A-Z]{3}$/.test(base))return{ok:false}; if(!Array.isArray(lines)||lines.length===0)return{ok:false}; var D=0,C=0; for(var j=0;j<lines.length;j++){ var L=lines[j]; if(L===null||typeof L!=='object'||Array.isArray(L))return{ok:false}; if(!nes(L.account)||!seen[L.account])return{ok:false}; if(L.side!=='D'&&L.side!=='C')return{ok:false}; if(typeof L.amountMinor!=='number'||!Number.isSafeInteger(L.amountMinor)||L.amountMinor<1)return{ok:false}; if(typeof L.currency!=='string'||!/^[A-Z]{3}$/.test(L.currency))return{ok:false}; var contrib; if(L.currency===base){ if(L.fxPpm!==undefined)return{ok:false}; contrib=L.amountMinor; } else { if(typeof L.fxPpm!=='number'||!Number.isSafeInteger(L.fxPpm)||L.fxPpm<1)return{ok:false}; var num=L.amountMinor*L.fxPpm, r=Math.floor(num/1000000), rem=num-r*1000000; contrib=(2*rem>=1000000)?r+1:r; } if(L.side==='D')D+=contrib; else C+=contrib; } return{ok:true,debitMinor:D,creditMinor:C,balanced:D===C}; }`,
};

test('EVERY TEMPLATE EXAM IS PASSABLE — a competent implementation scores 5/5 on the REAL field verify', () => {
  for (const t of TEMPLATES) {
    const name = t.fn + '_ref00000';
    const spec = { name, description: t.description, inputs: [...t.inputs], verify: t.verify.map(v => ({ in: [...v.in], out: v.out })), threshold: KAPPA };
    const v = estate.verify(spec, REFERENCE[t.fn].replace('NAME', name));
    assert.equal(v.holds, true, `${t.fn}: ${v.detail}`);
    assert.equal(v.score, 1, `${t.fn} must be fully passable, not marginally: ${v.detail}`);
  }
});

test('EVERY TEMPLATE EXAM CAN FAIL — a wrong implementation is held under κ, not waved through', () => {
  for (const t of TEMPLATES) {
    const name = t.fn + '_bad00000';
    const spec = { name, description: t.description, inputs: [...t.inputs], verify: t.verify.map(v => ({ in: [...v.in], out: v.out })), threshold: KAPPA };
    const v = estate.verify(spec, `function ${name}() { return {ok:true, everything: 'fine'}; }`);
    assert.equal(v.holds, false, `${t.fn}: a yes-man implementation must not stand`);
  }
});

test('SPECFROMPROPOSAL: deterministic template choice, the story rides, the exam is the template\'s own', () => {
  const a = specFromProposal(PROPOSAL());
  const b = specFromProposal(PROPOSAL());
  assert.equal(a.ok, true);
  assert.equal(a.spec.name, b.spec.name, 'the same move always specs the same name — no clock, no die');
  assert.match(a.spec.description, /Born of si-didy's proposal: "soundcheck kiosks/);
  assert.match(a.spec.description, /grounds: soundcheck, the-ear, memory:airgap/);
  const base = TEMPLATES.find(t => a.spec.name.startsWith(t.fn + '_'));
  assert.ok(base, 'the spec name carries its template');
  assert.deepEqual(a.spec.verify, base.verify.map(v => ({ in: [...v.in], out: v.out })), 'the exam is the template\'s, untouched by the proposal');
  assert.equal(a.spec.threshold, base.threshold, 'the spec carries its template\'s own bar');
});

test('MONEY EXAMS DEMAND PERFECTION — threshold 1 on every money kernel, κ only for the grader', () => {
  for (const t of TEMPLATES) {
    if (t.fn === 'tierEarn') assert.equal(t.threshold, KAPPA, 'the grader sits at κ');
    else assert.equal(t.threshold, 1, `${t.fn} handles money — a 4/5 money kernel loses pennies and must not stand`);
  }
  // the live run's exact failure: an escrow at 4/5 must be held under its bar by the REAL verify
  const t = TEMPLATES.find(x => x.fn === 'escrowSplit');
  const name = 'escrowSplit_liveslip';
  const spec = { name, description: t.description, inputs: [...t.inputs], verify: t.verify.map(v => ({ in: [...v.in], out: v.out })), threshold: t.threshold };
  const fourOfFive = `function ${name}(total, parts) { if (typeof total !== 'number' || total < 0 || !Number.isInteger(parts) || parts <= 0) return {ok:false}; var base = Math.floor(total / parts); var rem = total - base * parts; var shares = []; for (var i = 0; i < parts; i++) shares.push(base + (i < rem ? 1 : 0)); return {ok:true, shares: shares}; }`;
  const v = estate.verify(spec, fourOfFive);
  assert.equal(v.passed, 4, 'this is the exact live slip: fractional total accepted');
  assert.equal(v.holds, false, 'and under threshold 1 it no longer stands');
});

test('A RETRIED EXAM SHARPENS THE PROMPT, DETERMINISTICALLY — and a first sitting carries no scar', () => {
  const { spec } = specFromProposal(PROPOSAL());
  const first = promptFor(redactSpec(spec));
  const second = promptFor(redactSpec(spec), 1);
  assert.ok(!first.includes('Attempt'), 'the first sitting is clean');
  assert.match(second, /Attempt 2: a previous attempt failed validation/);
  assert.match(second, /Number\.isInteger/);
  assert.equal(promptFor(redactSpec(spec), 0), first, 'zero attempts is a first sitting');
  assert.equal(promptFor(redactSpec(spec), 2.5), first, 'a fractional attempt count is garbage, not a scar');
});

test('THIN PROPOSALS ARE REFUSED WITH THE REASON — a mutter is not a spec, a guess is not grounds', () => {
  assert.match(specFromProposal({ move: 'do a thing', grounds: ['abc', 'def'] }).why, /a mutter, not a proposal/);
  assert.match(specFromProposal({ move: 'a perfectly long and detailed move', grounds: ['x'] }).why, /a guess wearing a name/);
  assert.match(specFromProposal(null).why, /no proposal/);
});

test('THE EXAM STAYS SEALED — redactSpec strips verify and threshold, and the prompt never carries them', () => {
  const { spec } = specFromProposal(PROPOSAL());
  const r = redactSpec(spec);
  assert.deepEqual(Object.keys(r).sort(), ['description', 'inputs', 'name']);
  assert.ok(!('verify' in r) && !('threshold' in r));
  const prompt = promptFor(r);
  // the refusal SHAPE {ok:false} is contract and rightly public — the secrets are the vectors
  assert.ok(!prompt.includes('15300') && !prompt.includes('34, 33, 33') && !prompt.includes('604800') && !prompt.includes('0.95'),
    'no test vector leaks into the prompt');
  assert.match(prompt, /named exactly \w+_[0-9a-f]{8}/);
  assert.match(prompt, /must never throw/);
  assert.match(prompt, /Output ONLY the function declaration/);
});

test('EXTRACTCODE SCREENS REACH — fetch, eval, clocks, dice, and friends are refused before they can run', () => {
  for (const bad of ['fetch("http://x")', 'require("fs")', 'eval("1")', 'process.exit()', 'Math.random()', 'new Date()', 'globalThis.x', 'new Function("1")']) {
    const out = extractCode(`function f_00000000(a) { ${bad}; return {ok:false}; }`, 'f_00000000');
    assert.equal(out.ok, false, bad);
    assert.match(out.why, /pure computation only; refused before it can run/);
  }
});

test('EXTRACTCODE TAKES THE FUNCTION OUT OF THE CHATTER — fences and preamble stripped, wrong name refused', () => {
  const chatty = 'Sure! Here is the function:\n```javascript\nfunction good_12345678(a) { return {ok:false}; }\n```\nHope that helps!';
  const out = extractCode(chatty, 'good_12345678');
  assert.equal(out.ok, true);
  assert.ok(out.code.startsWith('function good_12345678'));
  assert.ok(!out.code.includes('```'));
  assert.match(extractCode(chatty, 'other_name').why, /did not produce a function named other_name/);
  assert.match(extractCode(null, '').why, /\(unnamed\)/);
});

test('THE FULL CIRCUIT AGAINST THE REAL FIELD — define, collapse with a competent wisp, stand; a cheat is discarded', () => {
  const field = estate.newField();
  const { spec } = specFromProposal(PROPOSAL());
  const d = estate.define(field, spec);
  assert.equal(d.ok, true);
  const base = TEMPLATES.find(t => spec.name.startsWith(t.fn + '_'));
  const good = estate.collapse(field, d.id, () => REFERENCE[base.fn].replace('NAME', spec.name), { ts: 1 });
  assert.equal(good.ok, true, good.why);
  assert.equal(good.verify.holds, true);
  assert.equal(estate.collapse(field, d.id, () => { throw new Error('never called'); }, { ts: 2 }).cached, true, 'built once — the second demand is a cache hit');
  // a cheating wisp on a fresh field: discarded, the spec stays possibility
  const field2 = estate.newField();
  const d2 = estate.define(field2, spec);
  const cheat = estate.collapse(field2, d2.id, () => `function ${spec.name}() { return {ok:true, everything: 'fine'}; }`, { ts: 3 });
  assert.equal(cheat.ok, false);
  assert.match(cheat.why, /discarded, the spec stays possibility/);
  assert.equal(estate.isBuilt(field2, d2.id), false);
});

test('TEMPLATES ARE FROZEN TO THE BOTTOM — an exam nobody can bend is the only kind worth sitting', () => {
  assert.throws(() => { TEMPLATES.push({ fn: 'x' }); });
  assert.throws(() => { TEMPLATES[0].verify.push({ in: [], out: { ok: true } }); });
  assert.throws(() => { TEMPLATES[0].verify[0].out.ok = false; });
  assert.throws(() => { TEMPLATES[2].inputs.push('extra'); });
});

// ─── round two: the gate found eight gaps — each dies here ───

test('CONTRACT PROSE AGREES WITH THE EXAM — the tier boundaries are stated INCLUSIVE, verbatim', () => {
  // the description is what the wisp reads; the verify vectors are what it faces. A description
  // saying ">" where the exam tests 0.618 → "clean" would send every honest wisp to a fail.
  const tier = TEMPLATES.find(t => t.fn === 'tierEarn');
  assert.ok(tier.description.includes('score >= 0.9'), 'gold is inclusive at 0.9, and the contract says so');
  assert.ok(tier.description.includes('score >= 0.618'), 'clean is inclusive at κ, and the contract says so');
  assert.ok(tier.verify.some(v => v.in[0] === 0.618 && v.out.tier === 'clean'), 'and the exam tests exactly that boundary');
});

test('THE PROPOSAL FLOORS ARE INCLUSIVE — fifteen characters is a move, two 3-char grounds are grounds', () => {
  const move15 = 'kelp wasp husks';
  assert.equal(move15.length, 15);
  const edge = specFromProposal({ move: move15, grounds: ['abc', 'def'] });
  assert.equal(edge.ok, true, 'exactly-at-floor proposals spec: ' + edge.why);
  assert.match(edge.spec.description, /grounds: abc, def/);
});

test('SHORT GROUNDS AND NON-STRING GROUNDS ARE NOT GROUNDS — however many there are', () => {
  const out = specFromProposal({ move: 'a perfectly long and grounded move', grounds: ['ab', 'cd', 'ee', 7, null] });
  assert.equal(out.ok, false);
  assert.match(out.why, /a guess wearing a name/);
});

test('A FUNCTION IS NOT A PROPOSAL — properties on an impostor do not spec', () => {
  const impostor = Object.assign(function proposal() {}, { move: 'a perfectly long and detailed move', grounds: ['abc', 'def'] });
  assert.match(specFromProposal(impostor).why, /no proposal/);
});

test('SPECFROMGAP: a template examined directly, ground said, name deterministic, exam untouched', () => {
  const g = specFromGap('escrowSplit', 'money-shelf: the invoice column that did not add up to its own subtotal');
  assert.equal(g.ok, true);
  assert.equal(g.spec.name, 'escrowSplit_' + nameHash('gap:escrowSplit'), 'the gap name is stable — same gap, same address');
  assert.match(g.spec.description, /Gap-fill: money-shelf/);
  const base = TEMPLATES.find(t => t.fn === 'escrowSplit');
  assert.deepEqual(g.spec.verify, base.verify.map(v => ({ in: [...v.in], out: v.out })));
  assert.equal(g.spec.threshold, base.threshold, 'a gap-fill sits the template\'s own bar');
  assert.match(specFromGap('notAThing', 'a perfectly good ground').why, /not a template this wire carries/);
  assert.match(specFromGap('escrowSplit', 'short').why, /needs its ground said/);
  assert.match(specFromGap(null, null).why, /"\(unnamed\)"/);
});

test('THE GAP MODULE DEEP-AGREES WITH ITS SOURCE — one kernel, and a bent word in either fails', async () => {
  const { GAP_TEMPLATES } = await import('./gaptemplates.mjs');
  const src = JSON.parse((await import('node:fs')).readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'gap-proposals.json'), 'utf8'));
  assert.equal(GAP_TEMPLATES.length, src.length);
  for (let i = 0; i < src.length; i++) {
    const g = GAP_TEMPLATES[i], p = src[i];
    assert.equal(g.fn, p.fn);
    assert.equal(g.teaches, p.teaches);
    assert.equal(g.description, p.description, g.fn + ': the contract prose is the exam\'s twin — a bent word sends an honest wisp to a fail');
    assert.deepEqual(g.verify, p.verify, g.fn + ': the vectors are the source\'s, exactly');
    assert.deepEqual(g.inputs, p.inputs.map(x => x.split(':')[0].trim()));
    assert.equal(g.threshold, 1);
  }
});

test('AN EXACTLY-TEN-CHARACTER GROUND IS A GROUND — the gap-fill floor is inclusive', () => {
  const ten = 'moneyshelf';
  assert.equal(ten.length, 10);
  assert.equal(specFromGap('escrowSplit', ten).ok, true);
});

test('FUZZ: total on garbage', () => {
  specFromProposal(7); specFromProposal({}); specFromProposal({ move: 42, grounds: 'x' });
  redactSpec(null); redactSpec(7); promptFor(null); promptFor('x');
  extractCode(7, 9); nameHash(null); nameHash(7);
  assert.equal(nameHash('a'), nameHash('a'), 'the hash is stable');
  assert.notEqual(nameHash('a'), nameHash('b'));
  assert.ok(true);
});
