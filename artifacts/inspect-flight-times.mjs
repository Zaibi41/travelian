import { readFileSync } from 'node:fs';
const env = JSON.parse(readFileSync('C:/Users/admin2/Downloads/Travelian-Private.postman_environment.json', 'utf8'));
const key = env.values.find(v => v.key === 'travelianApiKey').value;
const date = new Date(); date.setUTCDate(date.getUTCDate() + 30);
const result = await fetch('https://api.travelian.pk/sooperfare/raw', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-travelian-api-key': key },
  body: JSON.stringify({ origin: 'LHE', destination: 'DXB', departureDate: date.toISOString().slice(0, 10), passengers: { adults: 1, children: 0, infants: 0 } }),
});
const payload = await result.json();
let count = 0;
function walk(value, path = '') {
  if (count >= 35) return;
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
  } else if (/(arrival|departure|timezone|time_zone)/i.test(path)) {
    console.log(JSON.stringify({ path, value })); count++;
  }
}
console.log(JSON.stringify({ status: result.status })); walk(payload);
