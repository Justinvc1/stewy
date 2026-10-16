import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog, defaultState} from '../public/data.mjs';
import {cities, destinationFor} from '../public/data.mjs';
import {shiftLocalDate, validateDestination} from '../public/world.mjs';
import {MINUTE, bounds, formatTime, itemTiming, localString, planTiming, route, validateTrip, zonedTime} from '../public/planner.mjs';

const examples = catalog('lisbon');
const show = examples.find(item => item.id === 'show');
const local = value => formatTime(value, 'Europe/Lisbon');

test('normal outing preserves preparation and return contingency exactly once', () => {
  const state = defaultState();
  const plan = planTiming(state, examples);
  assert.equal(local(plan.deadline), '22:30');
  assert.equal(local(plan.result.leave), '21:00');
  assert.equal(local(plan.result.arrivalBack), '22:00');
  assert.equal(plan.result.reserve, 30);
  assert.equal(plan.result.status, 'ok');
});

test('traffic moves leave-by earlier and exposes a depleted buffer', () => {
  const state = defaultState();
  state.condition = 'traffic';
  const result = planTiming(state, examples).result;
  assert.equal(local(result.leave), '20:35');
  assert.equal(result.reserve, 5);
  assert.equal(result.status, 'adjust');
});

test('rain accounts for travel, exit and reserve, and detects a late return', () => {
  const state = defaultState();
  state.condition = 'rain';
  const plan = planTiming(state, examples);
  assert.equal(local(plan.result.leave), '20:15');
  assert.equal(local(plan.result.arrivalBack), '22:35');
  assert.equal(plan.result.status, 'late');
  assert.equal(plan.rows[1].depart, plan.rows[0].chosenEnd + 10 * MINUTE);
});

test('an early departure must be accepted before it makes an event feasible', () => {
  const state = defaultState();
  state.condition = 'rain';
  assert.equal(planTiming(state, examples).result.earlyAccepted, false);
  state.early = ['show'];
  const result = planTiming(state, examples).result;
  assert.equal(result.earlyAccepted, true);
  assert.equal(local(result.chosenEnd), '20:15');
  assert.equal(result.reserve, 40);
  assert.equal(result.status, 'ok');
});

test('a late arrival for admission invalidates a fixed-time event', () => {
  const state = defaultState();
  state.trip.availableAt = '2026-10-14T17:00';
  const plan = planTiming(state, examples);
  assert.equal(plan.rows[1].admissionOK, false);
  assert.equal(plan.result.status, 'adjust');
});

test('sports feasibility includes the uncertain finish allowance', () => {
  const timing = itemTiming(examples.find(item => item.id === 'football'), defaultState().trip, 'normal');
  assert.equal(local(timing.end), '21:00');
  assert.equal(local(timing.leave), '20:50');
  assert.equal(timing.fullFits, false);
  assert.equal(timing.earlyPossible, true);
});

test('airport reporting adds access time but does not subtract hotel preparation', () => {
  const trip = {...defaultState().trip, target: 'airport'};
  assert.equal(local(bounds(trip).deadline), '23:00');
  assert.equal(route(show, trip, 'normal').journey, 60);
  assert.equal(local(itemTiming(show, trip, 'normal').leave), '21:10');
});

test('protected rest is honored and cannot consume the whole outing window', () => {
  const trip = {...defaultState().trip, restUntil: '2026-10-14T18:00'};
  assert.equal(local(bounds(trip).available), '18:00');
  trip.restUntil = '2026-10-14T22:30';
  assert.match(validateTrip(trip), /protected rest/);
});

test('destination times are independent of the device zone and reject ambiguous DST times', () => {
  assert.equal(zonedTime('2026-10-14T16:00', 'Asia/Singapore'), Date.parse('2026-10-14T08:00:00Z'));
  assert.equal(zonedTime('2026-10-14T16:00', 'Europe/Lisbon'), Date.parse('2026-10-14T15:00:00Z'));
  assert.ok(Number.isNaN(zonedTime('2026-03-29T01:30', 'Europe/Lisbon')));
  assert.ok(Number.isNaN(zonedTime('2026-10-25T01:30', 'Europe/Lisbon')));
  assert.ok(Number.isNaN(zonedTime('2026-02-30T12:00', 'Europe/Lisbon')));
});

test('events crossing midnight finish on the next destination-local date', () => {
  const trip = {...defaultState().trip, commitmentAt: '2026-10-15T04:00'};
  const timing = itemTiming({...show, start: '23:00', end: '01:00'}, trip, 'normal');
  assert.equal(localString(timing.end, 'Europe/Lisbon'), '2026-10-15T01:00');
  assert.equal(timing.fullFits, true);
});

test('preview clock warns at leave-by and after the return deadline', () => {
  const state = defaultState();
  state.trip.referenceAt = '2026-10-14T21:00';
  assert.equal(planTiming(state, examples).result.status, 'leave');
  state.trip.referenceAt = '2026-10-14T22:30';
  assert.equal(planTiming(state, examples).result.status, 'expired');
});

test('closed venues and invalid duration overrides cannot appear feasible', () => {
  const trip = {...defaultState().trip, availableAt: '2026-10-14T21:00'};
  const cafe = itemTiming(examples.find(item => item.id === 'coffee'), trip, 'normal');
  assert.equal(cafe.fullFits, false);
  assert.match(validateTrip({...trip, returnOverride: -1}), /return journey estimate/);
});

test('all worldwide presets use supported destination time zones and currencies', () => {
  assert.equal(Object.keys(cities).length, 60);
  for(const [key,destination] of Object.entries(cities)){
    assert.equal(validateDestination(destination), '', key);
    const trip={...defaultState().trip,city:key};
    assert.equal(validateTrip(trip), '', key);
    const result=planTiming({...defaultState(),trip},catalog(destination)).result;
    assert.equal(formatTime(result.leave,destination.zone), '21:00', key);
    assert.equal(result.status,'ok',key);
  }
});

test('custom destinations survive saving and use their actual regional offset', () => {
  const trip=JSON.parse(JSON.stringify({...defaultState().trip,city:'custom',destination:{name:'Pokhara',country:'Nepal',zone:'Asia/Kathmandu',currency:'NPR'}}));
  assert.equal(validateTrip(trip),'');
  assert.equal(bounds(trip).available,Date.parse('2026-10-14T10:15:00Z'));
  assert.equal(destinationFor(trip).name,'Pokhara');
  assert.equal(catalog(destinationFor(trip))[0].city,'Pokhara');
});

test('southern-hemisphere daylight saving and quarter-hour zones are respected', () => {
  assert.equal(zonedTime('2026-10-14T16:00','Australia/Sydney'),Date.parse('2026-10-14T05:00:00Z'));
  assert.equal(zonedTime('2026-10-14T16:00','Pacific/Chatham'),Date.parse('2026-10-14T02:15:00Z'));
  assert.equal(zonedTime('2026-10-14T16:00','Pacific/Honolulu'),Date.parse('2026-10-15T02:00:00Z'));
});

test('new airport reporting destinations require an explicit reporting point', () => {
  const trip={...defaultState().trip,city:'new-york',target:'airport'};
  assert.match(validateTrip(trip),/airport and crew reporting point/);
  trip.airport='JFK Terminal 4, crew reporting point';
  assert.equal(validateTrip(trip),'');
});

test('invalid custom time zones fail validation without silently using a fallback', () => {
  const trip={...defaultState().trip,city:'custom',destination:{name:'Test',country:'Test',zone:'Invalid/Zone',currency:'USD'}};
  assert.match(validateTrip(trip),/valid destination time zone/);
});

test('changing outing dates preserves overnight return dates and empty rest fields', () => {
  assert.equal(shiftLocalDate('2026-10-15T04:00','2026-10-14','2026-11-01'),'2026-11-02T04:00');
  assert.equal(shiftLocalDate('2026-10-14T16:00','2026-10-14','2026-11-01'),'2026-11-01T16:00');
  assert.equal(shiftLocalDate('','2026-10-14','2026-11-01'),'');
});
