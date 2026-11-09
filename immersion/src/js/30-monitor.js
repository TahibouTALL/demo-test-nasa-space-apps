/* ================= moniteur du patient (ECG, pléthysmographie, respiration ou CO2) ================= */
class PatientMonitor {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.W = canvas.width; this.H = canvas.height;
    this.waveW = Math.round(this.W * 0.62);
    this.ch = [
      { key: 'ecg', y0: 86, h: 128, color: '#4cf28a', speed: 125, x: 0, last: null, label: 'ECG II' },
      { key: 'pleth', y0: 250, h: 96, color: '#43d5ff', speed: 125, x: 0, last: null, label: 'Pléth' },
      { key: 'resp', y0: 386, h: 96, color: '#ffd84a', speed: 62, x: 0, last: null, label: 'Resp' }
    ];
    this.beatPh = 0; this.tSinceR = 1; this.rr = 0.8; this.plethT = 9; this.wallT = 0;
    this.respPh = 0; this.cprPh = 0; this.vfT = 0; this.flash = 0;
    this.texture = null;
    this.clearAll();
  }
  clearAll() {
    const g = this.g;
    g.fillStyle = '#000'; g.fillRect(0, 0, this.W, this.H);
    this.ch.forEach(c => { c.x = 0; c.last = null; });
  }
  // valeur instantanée de chaque courbe
  ecgValue(v, dt) {
    const g = (x, c, w, a) => a * Math.exp(-(((x - c) / w) ** 2));
    let val = 0;
    if (!v.leads) return 0.02 * Math.sin(this.wallT * 40) * 0;
    const rhythm = v.rhythm;
    if (rhythm === 'fv') {
      this.vfT += dt;
      const t = this.vfT, a = v.vfAmp ?? 0.6;
      val = a * (0.55 * Math.sin(2 * Math.PI * 5.1 * t + 0.4 * Math.sin(1.3 * t)) + 0.35 * Math.sin(2 * Math.PI * 6.7 * t + 1.1) + 0.25 * Math.sin(2 * Math.PI * 3.9 * t + 2.0)) * (0.7 + 0.3 * Math.sin(0.9 * t));
    } else if (rhythm === 'asystolie') {
      val = 0.025 * Math.sin(this.wallT * 0.7) + (Math.random() - 0.5) * 0.012;
    } else {
      const wide = rhythm === 'aesp' || rhythm === 'tv';
      const RR = this.rr;
      const qt = 0.27 * Math.sqrt(RR / 0.8);
      for (const t of [this.tSinceR, this.tSinceR - RR]) {
        if (rhythm !== 'aesp' && rhythm !== 'tv') val += g(t, -0.165, 0.032, 0.11);
        if (wide) {
          val += g(t, 0, 0.045, rhythm === 'tv' ? 0.9 : 0.55) + g(t, 0.09, 0.05, -0.35) + g(t, qt + 0.06, 0.08, -0.18);
        } else {
          val += g(t, -0.032, 0.011, -0.09) + g(t, 0, 0.0135, 1.0) + g(t, 0.034, 0.013, -0.24) + g(t, qt, 0.058, 0.26);
        }
      }
    }
    if (v.cpr) {
      const ph = this.cprPh % 1;
      val += 0.85 * Math.exp(-(((ph - 0.25) / 0.12) ** 2)) - 0.2;
    }
    val += (Math.random() - 0.5) * 0.015;
    return val;
  }
  plethValue(v) {
    if (!v.spo2Probe) return 0;
    let val = 0;
    const t = this.plethT;
    if (v.perf > 0.05 && v.rhythm !== 'fv' && v.rhythm !== 'asystolie') {
      const up = t < 0.11 ? Math.sin(t / 0.11 * Math.PI / 2) : Math.exp(-(t - 0.11) / 0.28);
      const notch = 0.18 * Math.exp(-(((t - 0.36) / 0.05) ** 2));
      val = (up + notch) * clamp(v.perf * 1.2, 0.08, 1);
    }
    if (v.cpr) val += 0.25 * Math.exp(-((((this.cprPh % 1) - 0.3) / 0.15) ** 2));
    return val * 0.9;
  }
  respValue(v) {
    if (v.capno) {
      // capnogramme : plateau à la valeur d'EtCO2 pendant l'expiration
      const ph = this.respPh % 1;
      const k = clamp(v.etco2 / 45, 0, 1.2);
      const shape = ph < 0.42 ? smoothstep(0.02, 0.1, ph) * (0.92 + 0.08 * ph / 0.42) : 1 - smoothstep(0.42, 0.5, ph);
      return shape * k;
    }
    if (!v.leads) return 0;
    return 0.5 + 0.45 * Math.sin(this.respPh * Math.PI * 2) * clamp(v.effort ?? 0.6, 0, 1);
  }
  step(dtWall, v, paused, onBeat) {
    if (paused) return;
    this.wallT += dtWall;
    const N = Math.max(1, Math.ceil(dtWall * 250));
    const h = dtWall / N;
    for (let i = 0; i < N; i++) {
      // horloge cardiaque
      const hr = v.rhythm === 'fv' || v.rhythm === 'asystolie' ? 0 : Math.max(v.hr, 1);
      if (hr > 0) {
        this.rr = 60 / hr;
        this.tSinceR += h;
        if (this.tSinceR >= this.rr) {
          this.tSinceR -= this.rr; this.plethT = -0.2;
          if (onBeat) onBeat();
        }
      }
      this.plethT += h;
      if (v.cpr) this.cprPh += h * (v.cprRate || 110) / 60;
      this.respPh += h * Math.max(v.rr, 0) / 60;
      for (const c of this.ch) {
        let val;
        if (c.key === 'ecg') val = this.ecgValue(v, h);
        else if (c.key === 'pleth') val = this.plethValue(v);
        else val = this.respValue(v);
        const y = c.key === 'ecg' ? c.y0 + c.h * 0.62 - val * c.h * 0.55 : c.y0 + c.h - val * c.h * 0.9;
        const nx = c.x + c.speed * h;
        this.seg(c, nx, y);
      }
    }
  }
  seg(c, nx, y) {
    const g = this.g;
    if (nx >= this.waveW) { c.x = 0; c.last = null; return; }
    g.fillStyle = '#000';
    g.fillRect(Math.floor(c.x) + 1, c.y0 - 4, 16, c.h + 8);
    if (c.last !== null) {
      g.strokeStyle = c.color; g.lineWidth = 3; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(c.x, c.last); g.lineTo(nx, y); g.stroke();
    }
    c.x = nx; c.last = y;
  }
  drawStatic(v, info) {
    const g = this.g, W = this.W, x0 = this.waveW + 14;
    const ff = getComputedStyle(document.body).fontFamily;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, 52); g.fillRect(this.waveW + 2, 52, W - this.waveW - 2, this.H - 52);
    g.textBaseline = 'middle';
    g.font = '600 26px ' + ff; g.fillStyle = '#c9ccd6';
    g.fillText(info.name || '', 14, 26);
    g.textAlign = 'right'; g.fillText(info.clock || '', W - 14, 26); g.textAlign = 'left';
    if (info.alarm) {
      this.flash += 1;
      const on = info.alarm.prio === 'haute' ? (Math.floor(this.flash / 14) % 2 === 0) : true;
      g.font = '700 24px ' + ff;
      const tw = g.measureText(info.alarm.text).width + 36;
      g.fillStyle = info.alarm.prio === 'haute' ? (on ? '#e5493d' : '#5a1914') : '#c9971f';
      g.fillRect(W * 0.42 - tw / 2, 7, tw, 38);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(info.alarm.text, W * 0.42, 27); g.textAlign = 'left';
    }
    g.font = '600 20px ' + ff;
    this.ch.forEach(c => {
      g.fillStyle = '#000'; g.fillRect(0, c.y0 - 24, 96, 24);
      g.fillStyle = c.color; g.fillText(c.key === 'resp' && v.capno ? 'CO₂' : c.label, 8, c.y0 - 12);
    });
    const on = [!!v.leads, !!v.spo2Probe, !!(v.leads || v.capno)];
    this.ch.forEach((c, i) => {
      if (!on[i]) this.noSignal(c, i === 0 ? 'Électrodes non posées' : i === 1 ? 'Capteur au doigt non posé' : '');
      else if (c.off) { g.fillStyle = '#000'; g.fillRect(0, c.y0 - 2, this.waveW, c.h + 4); c.x = 0; c.last = null; }
      c.off = !on[i];
    });
    const lab = (t, y, col) => { g.fillStyle = col; g.font = '600 19px ' + ff; g.textBaseline = 'alphabetic'; g.fillText(t, x0, y); };
    const big = (t, y, col, size) => { g.fillStyle = col; g.font = `700 ${size}px ` + ff; g.textBaseline = 'alphabetic'; g.fillText(t, x0, y); };
    const fv = v.rhythm === 'fv' || v.rhythm === 'asystolie';
    lab('FC /min', 76, '#4cf28a');
    big(v.leads ? (fv || v.cpr ? '---' : String(Math.round(v.hr))) : '', 146, '#4cf28a', 74);
    lab('SpO₂ %', 182, '#43d5ff');
    big(v.spo2Probe ? (v.perf > 0.2 && !fv ? String(Math.round(v.spo2)) : '---') : '', 246, '#43d5ff', 66);
    lab('PNI mmHg', 282, '#ff9e96');
    if (v.nibp) {
      big(`${v.nibp.s}/${v.nibp.d}`, 330, '#ffb3ad', 46);
      g.font = '500 18px ' + ff; g.fillStyle = '#b98e8a'; g.fillText(`moy. ${v.nibp.m} · il y a ${fmtClock(info.now - v.nibp.t)}`, x0, 356);
    } else if (v.cuff) { g.font = '500 19px ' + ff; g.fillStyle = '#b98e8a'; g.fillText(v.nibpBusy ? 'mesure en cours' : 'brassard posé', x0, 326); }
    lab(v.capno ? 'EtCO₂ mmHg' : 'FR /min', 392, '#ffd84a');
    big(v.capno ? String(Math.round(v.etco2)) : (v.leads ? String(Math.round(v.rr)) : ''), 444, '#ffd84a', 50);
    if (v.capno) { g.font = '600 20px ' + ff; g.fillStyle = '#ffd84a'; g.fillText(`FR ${Math.round(v.rr)}`, x0 + 150, 440); }
    if (v.temp) { g.font = '600 22px ' + ff; g.fillStyle = '#e6e6ee'; g.fillText(`T ${nf1(v.temp)} °C`, x0, 486); }
    if (this.texture) this.texture.needsUpdate = true;
  }
  noSignal(c, txt) {
    const g = this.g;
    g.fillStyle = '#000'; g.fillRect(0, c.y0 - 2, this.waveW, c.h + 4);
    if (txt) { g.fillStyle = '#6a6e7a'; g.font = '500 22px ' + getComputedStyle(document.body).fontFamily; g.textBaseline = 'middle'; g.fillText(txt, 24, c.y0 + c.h / 2); }
    c.last = null;
  }
}
