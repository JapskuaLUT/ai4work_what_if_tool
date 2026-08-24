// Reproduces the numbers in design.md §3. Run with: bun run specifications/education_stress/probe_model.ts
// Standalone implementation of the requested course_stress_prediction v1.0 equations (request.md §4).

const BL=(x:number,s:number,e:number,m:number)=> x<=s?0: x>=e?m: m*(x-s)/(e-s);
const soft=(R:number)=>90*(1-Math.exp(-0.82*R/90));
function week(L:number,B:number,H:number,A:number,E:number,prev:number){
  const W=L+B+H+A+E, T=L+B;
  const c={base:BL(W,5,30,34),teach:BL(T,3,14,10),home:BL(H,2,16,12),
    assign:BL(A,1,14,18),exam:E===0?0:12+Math.min(2.5*E,18),
    over:W<=32?0:Math.min(1.3*Math.pow(W-32,1.15),14),fat:0.07*Math.max(0,Math.min(90,prev))};
  const R=Object.values(c).reduce((a,b)=>a+b,0);
  return {...c,W,R,S:Math.max(0,Math.min(90,soft(R)))};
}
console.log("--- theoretical component maxima ---");
console.log("base 34 teach 10 home 12 assign 18 exam 30 over 14 => 118 + fatigue");
let s=0; for(let i=0;i<50;i++){ s=soft(118+0.07*s); }
console.log("fixed-point MAX schedule stress:", s.toFixed(3));
console.log("max with calibration bias +12:", Math.min(90,s+12).toFixed(3));
console.log("max with observed blend O=90 :", (0.45*90+0.55*s).toFixed(3));

console.log("\n--- realistic weeks (L,B,H,A,E) ---");
const cases: [string,number,number,number,number,number,number][] = [
 ["light 1h",1,0,0,0,0,0],
 ["normal  3,2,8,3",3,2,8,3,0,20],
 ["hw-heavy 3,2,16,0",3,2,16,0,0,30],
 ["assign-heavy 3,2,4,14",3,2,4,14,0,30],
 ["exam wk d=3 3,2,10,8,E6",3,2,10,8,6,30],
 ["exam wk d=5 3,2,12,12,E10",3,2,12,12,10,40],
 ["absurd 10,10,20,20,E10",10,10,20,20,10,60],
];
for(const [n,L,B,H,A,E,p] of cases){
  const r=week(L,B,H,A,E,p);
  console.log(n.padEnd(28), "W="+r.W.toString().padStart(3), "R="+r.R.toFixed(1).padStart(6), "S="+r.S.toFixed(2).padStart(6),
    "| base",r.base.toFixed(1),"teach",r.teach.toFixed(1),"home",r.home.toFixed(1),"assign",r.assign.toFixed(1),"exam",r.exam.toFixed(1),"over",r.over.toFixed(1));
}

console.log("\n--- homework skew, H_total=100, N=12 ---");
const N=12; const q=[...Array(N)].map((_,i)=>Math.pow((i+1)/N,2.5)); const sum=q.reduce((a,b)=>a+b,0);
console.log(q.map(x=>(100*x/sum).toFixed(2)).join("  "));
console.log("\n--- assignment skew, 20h over 4 weeks ---");
const n=4; const qa=[...Array(n)].map((_,i)=>Math.pow((i+1)/n,2.5)); const sa=qa.reduce((a,b)=>a+b,0);
console.log(qa.map(x=>(20*x/sa).toFixed(2)).join("  "));
