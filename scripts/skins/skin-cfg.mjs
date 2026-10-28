// Geometria das poses de cada skin (coordenadas do sprite recortado). Ver poses.mjs.
// rel = mão relativa ao ombro J; body = deslocamento do tronco; headShift = cabeça a mais; stride = [pé da frente, pé de trás].
const BODY_DOWN = { 4: [0, 1], 5: [0, 0], 6: [0, 0], 7: [1, 0], 8: [0, 2], 9: [0, 1], 10: [2, 0], 11: [0, 0] };
const BODY_SIDE = { 4: [0, 1], 5: [0, 0], 6: [0, 0], 7: [-1, 0], 8: [2, 1], 9: [1, 0], 10: [-2, 0], 11: [0, 0] };
const BODY_UP = { 4: [0, 1], 5: [0, 0], 6: [0, 0], 7: [0, 0], 8: [0, 0], 9: [0, 0], 10: [-2, 0], 11: [0, 0] };
const REL_DOWN = { 5: [8, 2], 6: [1, -11], 7: [-1, -13], 8: [4, 12], 9: [2, 9] };
const REL_SIDE = { 5: [-8, 2], 6: [-1, -11], 7: [1, -13], 8: [9, 10], 9: [6, 8] };
const REL_UP = { 5: [-8, 2], 6: [-1, -11], 7: [1, -13], 8: [-4, 12], 9: [-2, 9] };

const SW_STYLE = {
  U: 6, L: 6, ru: 3, rf: 2.8, rh: 2.5,
  up: ['#461522', '#6f2b30', '#8d3d2d'],
  fore: ['#5d5b71', '#848697', '#aeb4bd'],
  hand: ['#a7563c', '#d66b3e', '#e8844a'],
  line: '#0b030c'
};
const W_STYLE = {
  U: 6.5, L: 6.5, ru: 1.8, rf: 1.7, rh: 1.7,
  up: ['#a95542', '#d2704e', '#e0845c'],
  fore: ['#642c29', '#844036', '#a95542'],
  hand: ['#a95542', '#d2704e', '#e0845c'],
  line: '#150710'
};

export const SKIN_CFG = {
  swordsman: {
    legs: { down: { hip: 46, x0: 11, x1: 30, mid: 20 }, up: { hip: 46, x0: 8, x1: 27, mid: 18 } },
    down: { J: [9, 30], hang: [8, 37], mask: [5, 34, 11, 42], cover: [5, 25, 12, 33], neckY: 15, outward: -1, style: SW_STYLE, rel: REL_DOWN, body: BODY_DOWN, headShift: { 10: [1, 0] }, eyes: { closed: [[19, 9, '#fdbf79'], [20, 9, '#fdbf79'], [24, 9, '#fdbf79']], squint: [[19, 9, '#fdbf79'], [20, 9, '#fdbf79'], [24, 9, '#fdbf79']] } },
    right: { J: [32, 30], hang: [34, 37], mask: [31, 34, 37, 42], cover: [27, 25, 36, 33], neckY: 15, outward: 1, style: SW_STYLE, rel: REL_SIDE, body: BODY_SIDE, headShift: { 10: [-1, 0] }, stride: { 8: [2, -1] }, eyes: { closed: [[20, 9, '#fdbf79'], [21, 9, '#fdbf79'], [25, 9, '#fdbf79']], squint: [[20, 9, '#fdbf79'], [21, 9, '#fdbf79'], [25, 9, '#fdbf79']] } },
    up: { J: [29, 30], hang: [30, 37], mask: [27, 34, 33, 42], cover: [26, 25, 33, 33], neckY: 15, outward: 1, style: SW_STYLE, rel: REL_UP, body: BODY_UP, headShift: { 10: [-1, 0] } }
  },
  warrior: {
    legs: { down: { hip: 42, x0: 17, x1: 42, mid: 31 }, right: { hip: 44, x0: 12, x1: 47, mid: 29 }, up: { hip: 47, x0: 2, x1: 23, mid: 13 } },
    down: { J: [23, 26], hang: [20, 37], drawHang: true, neckY: 17, outward: -1, style: W_STYLE, rel: REL_DOWN, body: BODY_DOWN, headShift: { 10: [1, 0] }, eyes: { closed: [[30, 11, '#d2704e']], squint: [[30, 11, '#d2704e']] } },
    right: { J: [31, 26], hang: [31, 38], drawHang: true, neckY: 18, outward: 1, style: W_STYLE, rel: REL_SIDE, body: BODY_SIDE, headShift: { 10: [-1, 0] }, stride: { 8: [2, -1] } },
    up: { J: [21, 27], hang: [22, 38], neckY: 14, outward: 1, style: W_STYLE, rel: REL_UP, body: BODY_UP, headShift: { 10: [-1, 0] } }
  }
};
