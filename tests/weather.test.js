import test from 'node:test';
import assert from 'node:assert/strict';
import { isRaining, weatherAt, WEATHER_ICONS } from '../src/data/weather.js';

test('clima: à noite sempre limpo; de dia segue a região', () => {
  for (let day = 1; day <= 30; day += 1) {
    assert.equal(weatherAt('gelo', { dayCount: day, isNight: true }), 'clear');
    const diurnal = ['vale', 'antiga', 'brejo', 'gelo', 'areia', 'esmeralda', 'brasa', 'mar', 'caverna']
      .map((region) => weatherAt(region, { dayCount: day, isNight: false }));
    // Dia chuvoso: gelo=neve, areia=poeira, brasa=cinzas, demais=chuva; caverna sempre limpa.
    const rainy = diurnal[0] === 'rain';
    assert.equal(diurnal[3], rainy ? 'snow' : 'clear');
    assert.equal(diurnal[4], rainy ? 'dust' : 'clear');
    assert.equal(diurnal[6], rainy ? 'ash' : 'clear');
    assert.equal(diurnal[8], 'clear');
    // isRaining continuatrue só para chuva/neve (compatibilidade com código antigo).
    assert.equal(isRaining({ dayCount: day, isNight: false }), rainy);
  }
});

test('clima: todo tipo tem ícone no HUD', () => {
  for (const kind of ['rain', 'snow', 'dust', 'ash', 'clear']) assert.ok(Object.hasOwn(WEATHER_ICONS, kind));
});
