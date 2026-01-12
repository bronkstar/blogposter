document.addEventListener('DOMContentLoaded', () => {
  const fmt = (n) => new Intl.NumberFormat('de-DE').format(n);

  document.querySelectorAll('.itmarket-chart').forEach((el) => {
    const cid = el.dataset.cid;
    const w = parseInt(el.dataset.width || '960', 10);
    const h = parseInt(el.dataset.height || '540', 10);
    const initialType = el.dataset.type || 'aggregate';
    const initialRange = el.dataset.range || 'all';
    const animEnabled = (el.dataset.animation || 'enabled') === 'enabled';
    const data = JSON.parse(el.dataset.json || '{}');

    const svg = el.querySelector(`#modernChart-${cid}`);
    const tooltip = el.querySelector(`#tooltip-${cid}`);
    const legend = el.querySelector(`#legend-${cid}`);

    const margin = { top: 60, right: 40, bottom: 80, left: 80 };
    const width = w - margin.left - margin.right;
    const height = h - margin.top - margin.bottom;

    // Unique IDs for SVG defs to avoid collisions when multiple charts exist
    const ids = {
      gradPrimary: `primaryGradient-${cid}`,
      gradSecondary: `secondaryGradient-${cid}`,
      gradJobs: `jobsGradient-${cid}`,
      gradBg: `bgGradient-${cid}`,
      filterGlow: `glow-${cid}`,
      filterShadow: `shadow-${cid}`,
    };

    // Inject controls IDs
    const typeSel = document.getElementById(`chartType-${cid}`);
    const rangeSel = document.getElementById(`timeRange-${cid}`);
    const animSel = document.getElementById(`animation-${cid}`);
    if (typeSel) typeSel.value = initialType;
    if (rangeSel) rangeSel.value = initialRange;
    if (animSel) animSel.value = animEnabled ? 'enabled' : 'disabled';

    const getFiltered = () => {
      const t = typeSel ? typeSel.value : initialType;
      const r = rangeSel ? rangeSel.value : initialRange;
      let arr = Array.isArray(data[t]) ? [...data[t]] : [];
      if (r !== 'all') arr = arr.slice(-parseInt(r, 10));
      return arr;
    };

    const renderGridAxes = (arr, yMin, yMax) => {
      // defs
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.innerHTML = `
        <defs>
          <linearGradient id="${ids.gradPrimary}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:var(--chart-primary-start)"/>
            <stop offset="100%" style="stop-color:var(--chart-primary-end)"/>
          </linearGradient>
          <linearGradient id="${ids.gradSecondary}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:var(--chart-secondary-start)"/>
            <stop offset="100%" style="stop-color:var(--chart-secondary-end)"/>
          </linearGradient>
          <linearGradient id="${ids.gradJobs}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:var(--chart-jobs-start)"/>
            <stop offset="100%" style="stop-color:var(--chart-jobs-end)"/>
          </linearGradient>
          <linearGradient id="${ids.gradBg}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:var(--chart-bg-start)"/>
            <stop offset="100%" style="stop-color:var(--chart-bg-end)"/>
          </linearGradient>
          <filter id="${ids.filterGlow}">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="${ids.filterShadow}">
            <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
          </filter>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#${ids.gradBg})" rx="20"/>
      `;
      // grid
      const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const comp = getComputedStyle(el);
      for (let i = 0; i <= 5; i++) {
        const y = margin.top + (i * height / 5);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', margin.left);
        line.setAttribute('x2', margin.left + width);
        line.setAttribute('y1', y);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', (i === 5 ? (comp.getPropertyValue('--chart-grid-strong').trim() || 'rgba(102,126,234,0.3)') : (comp.getPropertyValue('--chart-grid').trim() || 'rgba(102,126,234,0.1)')));
        line.setAttribute('stroke-width', '1');
        grid.appendChild(line);
        const val = yMax - (i * (yMax - yMin) / 5);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', margin.left - 12);
        t.setAttribute('y', y + 5);
        t.setAttribute('text-anchor', 'end');
        t.setAttribute('font-size', '12');
        t.setAttribute('fill', comp.getPropertyValue('--chart-axis-text').trim() || '#a0aec0');
        t.textContent = fmt(Math.round(val));
        svg.appendChild(t);
      }
      svg.appendChild(grid);
      // X labels (thin out to avoid overlap)
      const step = Math.max(1, Math.ceil(arr.length / 8));
      arr.forEach((d, i) => {
        if (i % step !== 0 && i !== arr.length - 1) return;
        const x = margin.left + (i * width / (arr.length - 1));
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x);
        t.setAttribute('y', margin.top + height + 25);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '11');
        t.setAttribute('fill', comp.getPropertyValue('--chart-axis-text').trim() || '#a0aec0');
        t.textContent = d.label || d.month;
        svg.appendChild(t);
      });
    };

    const renderLine = (pts, stroke, animated, delay = 0) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', stroke);
      path.setAttribute('stroke-width', '3');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('filter', `url(#${ids.filterGlow})`);
      if (animated) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        path.style.animation = `drawLine 1.5s ease-out ${delay}ms forwards`;
        const style = document.createElement('style');
        style.textContent = '@keyframes drawLine { to { stroke-dashoffset: 0; } }';
        document.head.appendChild(style);
      }
      svg.appendChild(path);
    };

    const renderPoints = (pts, color, animated, delay = 0) => {
      pts.forEach((p, i) => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', p.x);
        c.setAttribute('cy', p.y);
        c.setAttribute('r', '6');
        c.setAttribute('fill', color);
        const comp = getComputedStyle(el);
        const strokeCol = comp.getPropertyValue('--chart-point-stroke').trim() || color;
        const strokeW = parseFloat(comp.getPropertyValue('--chart-point-stroke-width').trim()) || 1.25;
        c.setAttribute('stroke', strokeCol);
        c.setAttribute('stroke-width', String(strokeW));
        c.setAttribute('filter', `url(#${ids.filterShadow})`);
        c.style.cursor = 'pointer';
        if (animated) {
          c.style.opacity = '0';
          c.style.transform = 'scale(0)';
          c.style.transformOrigin = `${p.x}px ${p.y}px`;
          c.style.animation = `pointAppear 0.5s ease-out ${delay + i * 100}ms forwards`;
          const style = document.createElement('style');
          style.textContent = '@keyframes pointAppear { to { opacity: 1; transform: scale(1); } }';
          document.head.appendChild(style);
        }
        c.addEventListener('mouseenter', () => {
          const rect = svg.getBoundingClientRect();
          tooltip.innerHTML = `<strong>${p.label}</strong><br>${fmt(p.value)}`;
          tooltip.style.left = (p.x + rect.left) + 'px';
          tooltip.style.top = (p.y + rect.top) + 'px';
          tooltip.classList.add('show');
          c.setAttribute('r', '8');
        });
        c.addEventListener('mouseleave', () => {
          tooltip.classList.remove('show');
          c.setAttribute('r', '6');
        });
        svg.appendChild(c);
      });
    };

    const render = () => {
      const type = typeSel ? typeSel.value : initialType;
      const arr = getFiltered();
      const animated = animSel ? animSel.value === 'enabled' : animEnabled;

      if (!Array.isArray(arr) || arr.length < 2) {
        svg.innerHTML = '';
        legend.innerHTML = '';
        return;
      }

      if (type === 'jobs') {
        const vals = arr.map((d) => d.it_jobs);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const pad = (max - min) * 0.1;
        const yMin = min - pad;
        const yMax = max + pad;
        renderGridAxes(arr, yMin, yMax);
        const pts = arr.map((d, i) => {
          const x = margin.left + (i * width / (arr.length - 1));
          const y = margin.top + height - ((d.it_jobs - yMin) / (yMax - yMin)) * height;
          return { x, y, value: d.it_jobs, label: d.label || d.month };
        });
        renderLine(pts, `url(#${ids.gradJobs})`, animated);
        renderPoints(pts, 'var(--chart-jobs-point)', animated);
        legend.innerHTML = '<div class="legend-item"><div class="legend-color grad-jobs"></div><span>IT-Jobs</span></div>';
      } else if (type === 'all') {
        const uVals = arr.map((d) => d.unemployed);
        const sVals = arr.map((d) => d.seeking);
        const jVals = arr.map((d) => d.it_jobs);
        const all = uVals.concat(sVals, jVals);
        const min = Math.min(...all);
        const max = Math.max(...all);
        const pad = (max - min) * 0.1;
        const yMin = min - pad;
        const yMax = max + pad;
        renderGridAxes(arr, yMin, yMax);
        const up = arr.map((d, i) => {
          const x = margin.left + (i * width / (arr.length - 1));
          const y = margin.top + height - ((d.unemployed - yMin) / (yMax - yMin)) * height;
          return { x, y, value: d.unemployed, label: d.label || d.month };
        });
        const sp = arr.map((d, i) => {
          const x = margin.left + (i * width / (arr.length - 1));
          const y = margin.top + height - ((d.seeking - yMin) / (yMax - yMin)) * height;
          return { x, y, value: d.seeking, label: d.label || d.month };
        });
        const jp = arr.map((d, i) => {
          const x = margin.left + (i * width / (arr.length - 1));
          const y = margin.top + height - ((d.it_jobs - yMin) / (yMax - yMin)) * height;
          return { x, y, value: d.it_jobs, label: d.label || d.month };
        });
        renderLine(up, `url(#${ids.gradPrimary})`, animated, 0);
        renderLine(sp, `url(#${ids.gradSecondary})`, animated, 200);
        renderLine(jp, `url(#${ids.gradJobs})`, animated, 400);
        renderPoints(up, 'var(--chart-primary-point)', animated, 100);
        renderPoints(sp, 'var(--chart-secondary-point)', animated, 300);
        renderPoints(jp, 'var(--chart-jobs-point)', animated, 500);
        legend.innerHTML = '<div class="legend-item"><div class="legend-color grad-unemployed"></div><span>Arbeitslose</span></div>' +
                           '<div class="legend-item"><div class="legend-color grad-seeking"></div><span>Arbeitssuchende</span></div>' +
                           '<div class="legend-item"><div class="legend-color grad-jobs"></div><span>IT-Jobs</span></div>';
      } else {
        const uVals = arr.map((d) => d.unemployed);
        const sVals = arr.map((d) => d.seeking);
        const all = uVals.concat(sVals);
        const min = Math.min(...all);
        const max = Math.max(...all);
        const pad = (max - min) * 0.1;
        const yMin = min - pad;
        const yMax = max + pad;
        renderGridAxes(arr, yMin, yMax);
        const up = arr.map((d, i) => {
          const x = margin.left + (i * width / (arr.length - 1));
          const y = margin.top + height - ((d.unemployed - yMin) / (yMax - yMin)) * height;
          return { x, y, value: d.unemployed, label: d.label || d.month };
        });
        const sp = arr.map((d, i) => {
          const x = margin.left + (i * width / (arr.length - 1));
          const y = margin.top + height - ((d.seeking - yMin) / (yMax - yMin)) * height;
          return { x, y, value: d.seeking, label: d.label || d.month };
        });
        renderLine(up, `url(#${ids.gradPrimary})`, animated, 0);
        renderLine(sp, `url(#${ids.gradSecondary})`, animated, 200);
        renderPoints(up, 'var(--chart-primary-point)', animated, 100);
        renderPoints(sp, 'var(--chart-secondary-point)', animated, 300);
        legend.innerHTML = '<div class="legend-item"><div class="legend-color grad-unemployed"></div><span>Arbeitslose</span></div>' +
                           '<div class="legend-item"><div class="legend-color grad-seeking"></div><span>Arbeitssuchende</span></div>';
      }
    };

    // Bind events
    if (typeSel) typeSel.addEventListener('change', render);
    if (rangeSel) rangeSel.addEventListener('change', render);
    if (animSel) animSel.addEventListener('change', render);

    // First render
    render();
  });
});
