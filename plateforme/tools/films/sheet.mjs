// Planche de contrôle : l'équipage dans ses poses, et les exercices.
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import { R } from './lib.mjs';
const W = 1800, H = 1500, c = createCanvas(W, H), x = c.getContext('2d');
x.fillStyle = '#E9E6DF'; x.fillRect(0, 0, W, H);
const poses = ['walk', 'eat', 'lazy', 'exam', 'carry', 'sad', 'laugh', 'side', 'rubArm', 'tuckhold', 'stretchfloat', 'handstand', 'look', 'worry', 'press', 'mask', 'aim', 'glide', 'cheer', 'rub', 'thumbs', 'point', 'squintRead', 'floatFront'];
const who = ['lucas', 'rafael', 'aminata', 'keiko'];
const t = +(process.argv[2] || 1.3);
poses.forEach((p, i) => {
  const cx = 110 + (i % 12) * 145, cy = 230 + Math.floor(i / 12) * 330;
  R.draw(x, R.P[p](t), { who: who[i % 4], s: 250, x: cx, y: cy, t });
  x.fillStyle = '#333'; x.font = '600 16px Atkinson'; x.textAlign = 'center'; x.fillText(p, cx, cy + 140);
});
const exs = ['squat', 'deadlift', 'calf', 'bench', 'row', 'press', 'run', 'bike', 'plank', 'tuck', 'stretch'];
const HL = { squat: { quads: 1, glutes: 1 }, deadlift: { hams: 1, glutes: 1, lowback: 1 }, calf: { calves: 1 }, bench: { chest: 1, triceps: 1 }, row: { back: 1, biceps: 1 }, press: { shoulders: 1, triceps: 1 }, run: { quads: 0.8, calves: 1 }, bike: { quads: 1 }, plank: { abs: 1 }, tuck: { lowback: 1 }, stretch: { back: 0.8 } };
exs.forEach((k, i) => {
  const cx = 30 + (i % 6) * 295, cy = 800 + Math.floor(i / 6) * 350;
  x.save(); x.translate(cx, cy); x.fillStyle = '#F6F4EF'; x.fillRect(0, 0, 270, 300);
  R.drawExercise(x, k, t, 270, 300, { hl: HL[k], who: who[i % 4] });
  x.restore(); x.fillStyle = '#333'; x.font = '600 16px Atkinson'; x.textAlign = 'center'; x.fillText(k, cx + 135, cy + 320);
});
fs.writeFileSync('sheet.png', c.toBuffer('image/png'));
console.log('ok');
