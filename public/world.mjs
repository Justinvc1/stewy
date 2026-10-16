// Destination presets are navigation aids, not claims of verified local listings.
const rows = [
 ['amsterdam','Amsterdam','Netherlands','Europe/Amsterdam','EUR','Europe'],
 ['athens','Athens','Greece','Europe/Athens','EUR','Europe'],
 ['barcelona','Barcelona','Spain','Europe/Madrid','EUR','Europe'],
 ['berlin','Berlin','Germany','Europe/Berlin','EUR','Europe'],
 ['copenhagen','Copenhagen','Denmark','Europe/Copenhagen','DKK','Europe'],
 ['dublin','Dublin','Ireland','Europe/Dublin','EUR','Europe'],
 ['frankfurt','Frankfurt','Germany','Europe/Berlin','EUR','Europe'],
 ['istanbul','Istanbul','Türkiye','Europe/Istanbul','TRY','Europe'],
 ['madrid','Madrid','Spain','Europe/Madrid','EUR','Europe'],
 ['paris','Paris','France','Europe/Paris','EUR','Europe'],
 ['rome','Rome','Italy','Europe/Rome','EUR','Europe'],
 ['zurich','Zurich','Switzerland','Europe/Zurich','CHF','Europe'],
 ['cairo','Cairo','Egypt','Africa/Cairo','EGP','Africa'],
 ['cape-town','Cape Town','South Africa','Africa/Johannesburg','ZAR','Africa'],
 ['casablanca','Casablanca','Morocco','Africa/Casablanca','MAD','Africa'],
 ['johannesburg','Johannesburg','South Africa','Africa/Johannesburg','ZAR','Africa'],
 ['lagos','Lagos','Nigeria','Africa/Lagos','NGN','Africa'],
 ['nairobi','Nairobi','Kenya','Africa/Nairobi','KES','Africa'],
 ['abu-dhabi','Abu Dhabi','United Arab Emirates','Asia/Dubai','AED','Middle East'],
 ['doha','Doha','Qatar','Asia/Qatar','QAR','Middle East'],
 ['dubai','Dubai','United Arab Emirates','Asia/Dubai','AED','Middle East'],
 ['riyadh','Riyadh','Saudi Arabia','Asia/Riyadh','SAR','Middle East'],
 ['bangkok','Bangkok','Thailand','Asia/Bangkok','THB','Asia'],
 ['beijing','Beijing','China','Asia/Shanghai','CNY','Asia'],
 ['delhi','Delhi','India','Asia/Kolkata','INR','Asia'],
 ['hong-kong','Hong Kong','Hong Kong','Asia/Hong_Kong','HKD','Asia'],
 ['jakarta','Jakarta','Indonesia','Asia/Jakarta','IDR','Asia'],
 ['kathmandu','Kathmandu','Nepal','Asia/Kathmandu','NPR','Asia'],
 ['kuala-lumpur','Kuala Lumpur','Malaysia','Asia/Kuala_Lumpur','MYR','Asia'],
 ['manila','Manila','Philippines','Asia/Manila','PHP','Asia'],
 ['mumbai','Mumbai','India','Asia/Kolkata','INR','Asia'],
 ['seoul','Seoul','South Korea','Asia/Seoul','KRW','Asia'],
 ['shanghai','Shanghai','China','Asia/Shanghai','CNY','Asia'],
 ['taipei','Taipei','Taiwan','Asia/Taipei','TWD','Asia'],
 ['tokyo','Tokyo','Japan','Asia/Tokyo','JPY','Asia'],
 ['atlanta','Atlanta','United States','America/New_York','USD','North America'],
 ['chicago','Chicago','United States','America/Chicago','USD','North America'],
 ['dallas','Dallas','United States','America/Chicago','USD','North America'],
 ['los-angeles','Los Angeles','United States','America/Los_Angeles','USD','North America'],
 ['mexico-city','Mexico City','Mexico','America/Mexico_City','MXN','North America'],
 ['miami','Miami','United States','America/New_York','USD','North America'],
 ['new-york','New York','United States','America/New_York','USD','North America'],
 ['san-francisco','San Francisco','United States','America/Los_Angeles','USD','North America'],
 ['toronto','Toronto','Canada','America/Toronto','CAD','North America'],
 ['vancouver','Vancouver','Canada','America/Vancouver','CAD','North America'],
 ['bogota','Bogotá','Colombia','America/Bogota','COP','South America'],
 ['buenos-aires','Buenos Aires','Argentina','America/Argentina/Buenos_Aires','ARS','South America'],
 ['lima','Lima','Peru','America/Lima','PEN','South America'],
 ['rio','Rio de Janeiro','Brazil','America/Sao_Paulo','BRL','South America'],
 ['santiago','Santiago','Chile','America/Santiago','CLP','South America'],
 ['sao-paulo','São Paulo','Brazil','America/Sao_Paulo','BRL','South America'],
 ['auckland','Auckland','New Zealand','Pacific/Auckland','NZD','Oceania'],
 ['brisbane','Brisbane','Australia','Australia/Brisbane','AUD','Oceania'],
 ['melbourne','Melbourne','Australia','Australia/Melbourne','AUD','Oceania'],
 ['perth','Perth','Australia','Australia/Perth','AUD','Oceania'],
 ['sydney','Sydney','Australia','Australia/Sydney','AUD','Oceania'],
 ['nadi','Nadi','Fiji','Pacific/Fiji','FJD','Oceania']
];

export function globalDestination({name,country,zone,currency,region='Worldwide'}) {
 return {name,country,zone,currency,region,code:'WORLD',symbol:currency+' ',image:'world',area:'City centre',airport:'',temp:null,weather:'Weather not connected',welcome:`A little ${name}.\nA world of possibilities.`,caption:'Make room for a new experience, with a clear plan for your return.',areas:['City centre','Near your hotel','Local neighborhood','Nearby district','Event venue area'],sampleOnly:true};
}

export const worldwideCities=Object.fromEntries(rows.map(([key,name,country,zone,currency,region])=>[key,globalDestination({name,country,zone,currency,region})]));
export const timeZones=(()=>{try{return [...new Set(['UTC',...Intl.supportedValuesOf('timeZone')])].sort();}catch{return [...new Set(['UTC','Europe/Lisbon','Europe/London','Asia/Singapore',...rows.map(r=>r[3])])].sort();}})();

export function validTimeZone(zone){try{new Intl.DateTimeFormat('en',{timeZone:zone}).format(0);return typeof zone==='string'&&!!zone;}catch{return false;}}
export function shiftLocalDate(value,fromDate,toDate){
 if(!value)return '';
 const delta=Date.parse(toDate+'T12:00:00Z')-Date.parse(fromDate+'T12:00:00Z');
 const shifted=Date.parse(value.slice(0,10)+'T12:00:00Z')+delta;
 return Number.isFinite(shifted)?new Date(shifted).toISOString().slice(0,10)+value.slice(10):value;
}
export function validateDestination(destination){
 if(!destination||typeof destination.name!=='string'||!destination.name.trim()||destination.name.length>80)return 'Enter a destination city (up to 80 characters).';
 if(typeof destination.country!=='string'||!destination.country.trim()||destination.country.length>80)return 'Enter its country or territory (up to 80 characters).';
 if(!validTimeZone(destination.zone))return 'Choose a valid destination time zone.';
 if(!/^[A-Z]{3}$/.test(destination.currency||''))return 'Enter a three-letter currency code, such as USD or EUR.';
 return '';
}
