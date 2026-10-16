import {validateDestination} from './world.mjs';
import {destinationFor,conditions} from './data.mjs';
export const MINUTE=60000;
export function localString(epoch,zone){const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(epoch);const v=Object.fromEntries(p.map(p=>[p.type,p.value]));return `${v.year}-${v.month}-${v.day}T${v.hour}:${v.minute}`;}
export function zonedTime(value,zone){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||''))return NaN;
  const rough=Date.parse(value+'Z');if(!Number.isFinite(rough))return NaN;
  const offsets=new Set([-36,-12,0,12,36].map(h=>{const t=rough+h*3600000;return Date.parse(localString(t,zone)+'Z')-t;}));
  const possible=[...offsets].map(o=>rough-o).filter(t=>localString(t,zone)===value);
  return possible.length===1?possible[0]:NaN;
}
export function formatTime(epoch,zone){return Number.isFinite(epoch)?new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(epoch):'—';}
export function durationLabel(min){if(!Number.isFinite(min)||min<0)return '0 min';const n=Math.round(min),h=Math.floor(n/60),m=n%60;return h?`${h}h${m?' '+m+'m':''}`:`${m} min`;}
export function leaveBy(deadline,journey,exit,buffer){return deadline-(journey+exit+buffer)*MINUTE;}
export function bounds(trip){const zone=destinationFor(trip).zone;const available=zonedTime(trip.availableAt,zone),commitment=zonedTime(trip.commitmentAt,zone),rest=trip.restUntil?zonedTime(trip.restUntil,zone):available;return {zone,available:Math.max(available,rest),commitment,deadline:commitment-(trip.target==='hotel'?Number(trip.preparation):0)*MINUTE,reference:zonedTime(trip.referenceAt,zone)};}
export function validateTrip(trip){const destination=destinationFor(trip);const destinationError=validateDestination(destination);if(destinationError)return destinationError;if(!/^\d{4}-\d{2}-\d{2}$/.test(trip.date||'')||!Number.isFinite(zonedTime(trip.date+'T12:00',destination.zone)))return 'Choose a valid outing date.';if(trip.target==='airport'&&!String(trip.airport||destination.airport||'').trim())return 'Enter your airport and crew reporting point.';const b=bounds(trip);if(![b.available,b.commitment,b.deadline,b.reference].every(Number.isFinite))return 'Choose valid local dates and times. Repeated or skipped daylight-saving times need a different time.';if(b.deadline<=b.available)return 'Your return deadline must be after your free time and protected rest.';for(const k of ['preparation','buffer','airportAccess'])if(!Number.isFinite(Number(trip[k]))||Number(trip[k])<0||Number(trip[k])>240)return 'Time allowances must be between 0 and 240 minutes.';if(trip.returnOverride!==null&&(!Number.isFinite(Number(trip.returnOverride))||Number(trip.returnOverride)<1||Number(trip.returnOverride)>360))return 'The return journey estimate must be between 1 and 360 minutes.';if(!String(trip.hotel||'').trim())return 'Enter a hotel or neighborhood to start from.';return ''}
export function route(item,trip,condition){const c=conditions[condition]||conditions.normal;const walking=item.mode==='walk';let journey=Number(trip.returnOverride??item.travel);journey+=walking?(condition==='rain'?10:0):c.delay;if(trip.target==='airport')journey+=Number(trip.airportAccess);return {journey,exit:(item.exit||0)+c.extraExit,buffer:Number(trip.buffer)+c.extraBuffer,base:Number(trip.returnOverride??item.travel)};}
export function itemTiming(item,trip,condition,departAt=null,previous=null){
 const b=bounds(trip),c=conditions[condition]||conditions.normal;const r=route(item,trip,condition);const leave=leaveBy(b.deadline,r.journey,r.exit,r.buffer);
 const depart=departAt??b.available;const travel=(previous?20:item.travel)+(item.mode==='walk'?(condition==='rain'?10:0):c.delay);const arrival=depart+travel*MINUTE;
 let start,end,entryStart;
 if(item.category==='event'){start=zonedTime(trip.date+'T'+item.start,b.zone);end=zonedTime(trip.date+'T'+item.end,b.zone);if(end<=start){const nd=new Date(Date.parse(trip.date+'T00:00:00Z')+86400000).toISOString().slice(0,10);end=zonedTime(nd+'T'+item.end,b.zone);}end+=(item.uncertainty||0)*MINUTE;entryStart=start-(item.entry||0)*MINUTE;}
 else {const open=zonedTime(trip.date+'T'+item.hours.split('–')[0],b.zone);start=Math.max(arrival+(item.entry||0)*MINUTE,open);end=start+item.duration*MINUTE;entryStart=start-(item.entry||0)*MINUTE;}
 const admissionOK=arrival<=entryStart;
 const closing=item.category==='event'?Infinity:zonedTime(trip.date+'T'+item.hours.split('–')[1],b.zone);
 const fullFits=admissionOK&&end<=leave&&end<=closing;
 const earlyPossible=item.category==='event'&&admissionOK&&leave>start+15*MINUTE&&leave<end;
 const predictedArrival=end+(r.exit+r.journey)*MINUTE;
 return {...r,depart,travel,arrival,entryStart,start,end,leave,admissionOK,fullFits,earlyPossible,closing,predictedArrival,margin:Math.round((leave-end)/MINUTE),reserve:Math.round((b.deadline-predictedArrival)/MINUTE),total:Math.round((end-depart)/MINUTE)+r.exit+r.journey+r.buffer};
}
export function planTiming(state,items){const trip=state.trip,b=bounds(trip);let cursor=b.available,previous=null;const rows=[];for(const id of state.plan){const item=items.find(i=>i.id===id);if(!item)continue;const m=itemTiming(item,trip,state.condition,cursor,previous);const earlyAccepted=state.early.includes(id)&&m.earlyPossible;const chosenEnd=earlyAccepted?m.leave:m.end;const actualArrival=chosenEnd+(m.exit+m.journey)*MINUTE;const ok=m.admissionOK&&(chosenEnd<=m.leave)&&(chosenEnd<=m.closing);rows.push({item,...m,chosenEnd,earlyAccepted,ok,actualArrival});cursor=chosenEnd+m.exit*MINUTE;previous=item;}
 const last=rows.at(-1);let result=last?{...last,arrivalBack:last.actualArrival,reserve:Math.round((b.deadline-last.actualArrival)/MINUTE)}:null;
 if(result){const invalidBefore=rows.some(r=>!r.ok);result.status=result.arrivalBack>b.deadline?'late':invalidBefore?'adjust':'ok';if(b.reference>=b.deadline)result.status='expired';else if(b.reference>=result.leave&&result.status!=='late')result.status='leave';}
 return {rows,result,...b};}
