// Server only. Secrets are never included in responses or logs.
const buckets=new Map();
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(message,status)=>Object.assign(new Error(message),{status});
function text(value,max=240){if(typeof value!=='string'||!value.trim()||value.length>max)throw fail('Enter a valid location or search.',400);return value.trim()}
function number(value,min,max){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw fail('Check your times and allowances.',400);return value}
export function timing({departure,outboundSeconds,returnSeconds,visitMinutes,exitMinutes,bufferMinutes,airportMinutes,deadline}){
 const arrival=departure+outboundSeconds*1000;
 const end=arrival+visitMinutes*60000;
 const leaveBy=deadline-returnSeconds*1000-(exitMinutes+bufferMinutes+airportMinutes)*60000;
 return {arrival,end,leaveBy,arrivalBack:end+returnSeconds*1000+(exitMinutes+airportMinutes)*60000,fits:end<=leaveBy,marginMinutes:Math.floor((leaveBy-end)/60000)};
}
async function google(url,body,mask,key,fetcher){
 let response;
 try{response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':mask},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)})}catch{throw fail('Google could not be reached. Try again; timing is not verified.',503)}
 if(!response.ok)throw fail(response.status===429?'Google usage limit reached. Try later.':response.status===403?'Google access is not ready. The owner needs to check billing, enabled APIs and key restrictions.':'Google could not calculate this request. Check the addresses and try again.',response.status===429?429:502);
 return response.json();
}
function waypoint(value){return value.placeId?{placeId:text(value.placeId,256)}:{address:text(value.address)}}
export async function handleGoogle(request,env,fetcher=fetch,now=Date.now()){
 const action=new URL(request.url).pathname.split('/').pop();
 const key=env.GOOGLE_MAPS_API_KEY;
 if(action==='status'&&request.method==='GET')return json({configured:!!key,signedIn:!!request.headers.get('oai-authenticated-user-id')});
 if(!['places','outing'].includes(action))return json({error:'Not found'},404);
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!key)return json({error:'Google connection is awaiting activation. Sample planning is still available.'},503);
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'Sign in to use Google places and route estimates.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request origin not allowed.'},403);
 // Burst protection per isolate; configure provider quotas for a project-wide cost cap.
 const bucket=buckets.get(user);if(bucket&&now-bucket.start<60000&&bucket.count>=12)return json({error:'Please wait a minute before trying again.'},429);
 if(!bucket||now-bucket.start>=60000)buckets.set(user,{start:now,count:1});else bucket.count++;
 if(buckets.size>5000)for(const [id,b] of buckets)if(now-b.start>60000)buckets.delete(id);
 try{
  if(Number(request.headers.get('content-length'))>4096)throw fail('Request too large.',413);
  const raw=await request.text();if(raw.length>4096)throw fail('Request too large.',413);
  let body;try{body=JSON.parse(raw)}catch{throw fail('Invalid request.',400)}
  if(action==='places'){
   const query=text(body.query,180),location=text(body.location,180);
   const data=await google('https://places.googleapis.com/v1/places:searchText',{textQuery:`${query} in ${location}`,pageSize:8},'places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.attributions',key,fetcher);
   return json({places:(data.places||[]).map(p=>({id:p.id,name:p.displayName?.text||'Place',address:p.formattedAddress||'',mapsUrl:p.googleMapsUri,attributions:p.attributions||[]})),checkedAt:now});
  }
  const origin=waypoint(body.origin||{}),place=waypoint({placeId:body.placeId}),destination=waypoint(body.destination||{});
  const deadline=number(body.deadline,now+60000,now+7*86400000);
  const departure=Math.max(now+10000,number(body.departure,now-86400000,deadline));
  const visitMinutes=number(body.visitMinutes,15,480),exitMinutes=number(body.exitMinutes,0,120),bufferMinutes=number(body.bufferMinutes,5,240),airportMinutes=number(body.airportMinutes,0,240);
  const travelMode=['DRIVE','WALK'].includes(body.mode)?body.mode:'DRIVE';
  const leg=async(from,to,time)=>{
   const options={origin:from,destination:to,travelMode,...(travelMode==='DRIVE'?{routingPreference:'TRAFFIC_AWARE',departureTime:new Date(time).toISOString()}:{})};
   const d=await google('https://routes.googleapis.com/directions/v2:computeRoutes',options,'routes.duration,routes.distanceMeters,routes.warnings',key,fetcher);
   const route=d.routes?.[0],seconds=Number(route?.duration?.replace(/s$/,''));
   if(!route||!Number.isFinite(seconds)||seconds<=0)throw fail('No usable route found. Try another location or travel mode.',422);
   return {seconds,distanceMeters:route.distanceMeters,warnings:route.warnings||[]};
  };
  const outbound=await leg(origin,place,departure);
  const returnDeparture=departure+outbound.seconds*1000+(visitMinutes+exitMinutes)*60000;
  const back=await leg(place,destination,returnDeparture);
  return json({...timing({departure,outboundSeconds:outbound.seconds,returnSeconds:back.seconds,visitMinutes,exitMinutes,bufferMinutes,airportMinutes,deadline}),departure,deadline,outbound,back,checkedAt:now,mode:travelMode});
 }catch(error){return json({error:error.status?error.message:'Unable to complete the request. Please check your inputs.'},error.status||500)}
}
