// Keep previously shared section URLs useful after the redesign.
const previousSections={work:'projects',baam:'automation',research:'finance',playground:'algorithms'};
const previousSection=location.hash.slice(1);
if(previousSections[previousSection])history.replaceState(null,'','#'+previousSections[previousSection]);
import { projects } from './projects.mjs';
import { openArchitecture } from './architecture-ui.mjs';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('click', event => {
 const trigger = event.target.closest('[data-open-project]');
 if(trigger){event.preventDefault();openArchitecture(trigger.dataset.openProject);}
});
const board = document.querySelector('#chess-board');
// An illustrative position, not a fabricated live engine evaluation.
const position = ['r.bq.rk.','pp..bppp','..np.n..','..p.p...','..B.P...','..NP.N..','PPP..PPP','R.BQ.RK.'];
const glyphs = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
position.forEach((rank, row) => [...rank].forEach((piece, col) => {
  const cell = document.createElement('span'); cell.className = `chess-square${(row + col) % 2 ? ' dark-square' : ''}${piece !== '.' && piece === piece.toUpperCase() ? ' white-piece' : ''}${row === 4 && col === 2 ? ' highlight-square' : ''}`;
  cell.textContent = glyphs[piece.toLowerCase()] || ''; board.append(cell);
}));
const boids = document.querySelector('#boids-art');
for (let i = 0; i < 36; i++) {
  const x = 25 + (i * 47 % 225), y = 23 + (i * 31 % 96), angle = -25 + Math.sin(i * .7) * 25;
  const bird = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bird.setAttribute('d', 'M-4 4 4 0-4-4-1 0Z'); bird.setAttribute('fill', 'currentColor'); bird.setAttribute('opacity', String(.35 + (i % 5) * .13)); bird.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`); boids.append(bird);
}

let atlasScene = null, atlasSelected = 'chess';
const categoryLabels = { automation: 'AUTOMATION & SYSTEMS', ai: 'AI & AGENTS', finance: 'FINANCE & FORECASTING', algorithms: 'ALGORITHMS & SIMULATIONS' };
function selectAtlas(id) {
  const project = projects[id]; if (!project) return;
  atlasSelected = id; atlasScene?.select(id);
  document.querySelector('#atlas-category').textContent = categoryLabels[project.category];
  document.querySelector('#atlas-project-name').textContent = project.name;
  document.querySelector('#atlas-project-summary').textContent = project.summary;
  document.querySelector('#atlas-open').dataset.openProject = id;
  document.querySelectorAll('[data-atlas-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.atlasSelect === id)));
}
Object.entries(projects).forEach(([id, project]) => {
  const button = document.createElement('button');button.dataset.atlasSelect = id;button.textContent = project.name;button.setAttribute('aria-pressed', String(id === atlasSelected));button.addEventListener('click',()=>selectAtlas(id));document.querySelector('.atlas-project-list').append(button);
});
document.querySelector('#reset-atlas').addEventListener('click', () => atlasScene?.reset());
async function initializeAtlas() {
  try {
    await document.fonts.ready;
    const { createAtlas } = await import('./atlas.mjs');
    atlasScene = createAtlas({canvas: document.querySelector('#atlas-canvas'),wrap: document.querySelector('#atlas-stage'),projects,selected: atlasSelected,onSelect:selectAtlas,reducedMotion:reduced.matches});
  } catch (error) {
    document.querySelector('#atlas-stage').dataset.renderer='fallback';
    document.querySelector('#reset-atlas').hidden=true;
    console.warn('Project atlas unavailable. Project navigation remains available.',error.message);
  }
}
initializeAtlas();


reduced.addEventListener('change',()=>atlasScene?.setReducedMotion(reduced.matches));
const categoryNames = {
  all: 'All projects, across four categories.',
  automation: 'Automation & systems — tools that handle the work between people and platforms.',
  ai: 'AI & agents — models connected to software that does something useful.',
  finance: 'Finance & forecasting — time series, markets and decisions under uncertainty.',
  algorithms: 'Algorithms & simulations — search, rules and small things worth understanding.',
};
const projectItems = [...document.querySelectorAll('[data-category]')];
function applyCategory(scroll = false) {
  const hash = location.hash.slice(1);
  const category = Object.hasOwn(categoryNames, hash) ? hash : 'all';
  projectItems.forEach(item => { item.hidden = category !== 'all' && item.dataset.category !== category; });
  document.querySelectorAll('[data-filter]').forEach(link => {
    if (link.dataset.filter === category) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#category-status').textContent = categoryNames[category];
  if (scroll) document.querySelector('#projects').scrollIntoView({ block: 'start' });
}
document.querySelectorAll('[data-filter]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  history.pushState(null, '', link.getAttribute('href'));
  applyCategory(true);
}));
window.addEventListener('hashchange', () => applyCategory(Object.hasOwn(categoryNames, location.hash.slice(1))));
window.addEventListener('popstate', () => applyCategory(Object.hasOwn(categoryNames, location.hash.slice(1))));
applyCategory(Object.hasOwn(categoryNames, location.hash.slice(1)));
