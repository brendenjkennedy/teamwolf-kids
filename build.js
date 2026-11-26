// Runs on Netlify every time the Cub Hub publishes (see netlify.toml). Nothing to run by hand.
// The whole Cub Hub lives in index.html. For every page address listed in pages.json, this writes a
// copy of index.html into that folder (e.g. play/quiz/index.html) with the page's own title,
// description, canonical address, link-preview tags and structured data already filled in, and with
// the right section showing before any page code runs. Search engines, AI search tools and link
// previews (Facebook, iMessage, Slack) all read these without running the page's code.
// Edit index.html and pages.json only; the copies are made fresh on each publish and never committed.
const fs = require('fs');
const path = require('path');

const SITE = 'https://teamwolf.kids';
const IMG = SITE + '/share-image.jpg';
const IMG_ALT = 'The Team Wolf Cub Hub logo beside Nikai the wolf as a pup, sitting in the grass';
const { pages: P, lessons: L } = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages.json'), 'utf8'));
const src = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const urlOf = k => SITE + (k === 'home' ? '/' : '/' + k + '/');
const viewOf = k => (k === 'home' ? 'home' : k.split('/')[0]);
// a section inside a page (e.g. /play/quiz/) points search engines at its main page; lessons stand on their own
const canonOf = k => (k === 'home' || /^learn\/lesson-\d$/.test(k) || !k.includes('/') ? urlOf(k) : urlOf(k.split('/')[0]));

const ORG = { '@type': 'Organization', '@id': 'https://teamwolf.org/#org', name: 'Team Wolf', url: 'https://teamwolf.org/',
  logo: 'https://teamwolf.org/assets/logos/tw-red.png', email: 'info@teamwolf.org',
  sameAs: ['https://www.instagram.com/teamwolf', 'https://www.facebook.com/teamwolforg', 'https://www.tiktok.com/@teamwolforg', 'https://x.com/teamwolf_org', 'https://bsky.app/profile/team-wolf.bsky.social'] };
const KIDS = { '@type': 'PeopleAudience', suggestedMinAge: 8, suggestedMaxAge: 12 };
const SITE_LD = { '@type': 'WebSite', '@id': SITE + '/#site', name: 'Cub Hub', alternateName: 'Team Wolf Cub Hub', url: SITE + '/',
  description: P.home.desc, inLanguage: 'en-US', publisher: { '@id': ORG['@id'] }, audience: KIDS };
const lessonLD = l => ({ '@type': 'LearningResource', '@id': urlOf('learn/lesson-' + l.id) + '#lesson', name: 'Lesson ' + l.id + ': ' + l.t,
  url: urlOf('learn/lesson-' + l.id), description: l.intro, abstract: l.intro, text: l.f.join(' '), learningResourceType: 'Lesson',
  educationalLevel: 'Ages 8 to 12 (grades 3 to 7)', timeRequired: 'PT10M', audience: KIDS, inLanguage: 'en-US', isAccessibleForFree: true,
  about: { '@type': 'Thing', name: 'Gray Wolf' }, provider: { '@id': ORG['@id'] }, position: l.id,
  isPartOf: { '@id': urlOf('learn') + '#course' } });

function graph(k) {
  const p = P[k], url = urlOf(k), crumbs = [{ name: 'Cub Hub', url: urlOf('home') }];
  if (k !== 'home') {
    const parts = k.split('/');
    if (parts.length > 1) crumbs.push({ name: P[parts[0]].name, url: urlOf(parts[0]) });
    crumbs.push({ name: p.name, url });
  }
  const page = { '@type': k === 'color' || k === 'play' || k === 'videos' ? 'CollectionPage' : 'WebPage', '@id': url + '#page', url, name: p.title,
    description: p.desc, inLanguage: 'en-US', isPartOf: { '@id': SITE_LD['@id'] }, audience: KIDS,
    primaryImageOfPage: { '@type': 'ImageObject', url: IMG }, breadcrumb: { '@id': url + '#crumbs' } };
  const g = [ORG, SITE_LD, page, { '@type': 'BreadcrumbList', '@id': url + '#crumbs',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) }];
  const m = k.match(/^learn\/lesson-(\d)$/);
  if (m) { const l = L.find(x => x.id === +m[1]); page.mainEntity = { '@id': url + '#lesson' }; g.push(lessonLD(l)); }
  if (k === 'learn') g.push({ '@type': 'Course', '@id': url + '#course', name: 'The Rendezvous: wolf lessons for kids', description: p.desc,
    url, provider: { '@id': ORG['@id'] }, audience: KIDS, inLanguage: 'en-US', isAccessibleForFree: true, educationalLevel: 'Ages 8 to 12 (grades 3 to 7)',
    hasPart: L.map(l => ({ '@id': urlOf('learn/lesson-' + l.id) + '#lesson', '@type': 'LearningResource', name: 'Lesson ' + l.id + ': ' + l.t, url: urlOf('learn/lesson-' + l.id) })) });
  return { '@context': 'https://schema.org', '@graph': g };
}

function headFor(k) {
  const p = P[k], canon = canonOf(k);
  return [
    '<title>' + esc(p.title) + '</title>',
    '<meta name="description" content="' + esc(p.desc) + '">',
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<link rel="canonical" href="' + canon + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Cub Hub · Team Wolf for Kids">',
    '<meta property="og:locale" content="en_US">',
    '<meta property="og:url" content="' + urlOf(k) + '">',
    '<meta property="og:title" content="' + esc(p.title) + '">',
    '<meta property="og:description" content="' + esc(p.desc) + '">',
    '<meta property="og:image" content="' + IMG + '">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="' + esc(IMG_ALT) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + esc(p.title) + '">',
    '<meta name="twitter:description" content="' + esc(p.desc) + '">',
    '<meta name="twitter:image" content="' + IMG + '">',
    '<script type="application/ld+json">' + JSON.stringify(graph(k)).replace(/</g, '\\u003c') + '</script>',
    '<script>window.CUB_PAGES=' + JSON.stringify(Object.fromEntries(Object.entries(P).map(([kk, v]) => [kk, [v.title, v.desc, canonOf(kk)]]))).replace(/</g, '\\u003c') + '</script>'
  ].join('\n');
}

// strip the head tags this script owns, so they're never doubled
function clean(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\n?/, '')
    .replace(/<meta name="description"[^>]*>\n?/, '')
    .replace(/<meta name="robots"[^>]*>\n?/, '')
    .replace(/<link rel="canonical"[^>]*>\n?/, '')
    .replace(/<meta property="og:[^"]*"[^>]*>\n?/g, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>\n?/g, '');
}

const base = clean(src);
const anchor = '<base href="/">';
if (!base.includes(anchor)) throw new Error('index.html is missing <base href="/">');
let n = 0;
for (const k of Object.keys(P)) {
  let html = base.replace(anchor, anchor + '\n' + headFor(k));
  const v = viewOf(k);
  html = html.replace('<div class="view" id="v-' + v + '">', '<div class="view on" id="v-' + v + '">');
  const out = k === 'home' ? path.join(__dirname, 'index.html') : path.join(__dirname, k, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  n++;
}
console.log('Cub Hub: wrote ' + n + ' page files');
