'use strict';
const $ = (id) => document.getElementById(id);
const API_BASE = 'https://ep-nameless-cherry-bet0ev73.apirest.c-9.us-east-2.aws.neon.tech/qbranch_profiles/rest/v1';
const PROFILE_SLUG = (() => {
  const match = window.location.pathname.match(/\/p\/([a-z0-9-]+)\/?$/i);
  return match ? match[1].toLowerCase() : new URLSearchParams(window.location.search).get('profile');
})();
let profileData = null;
let toastTimer;
function setText(id, value) { if ($(id)) $(id).textContent = value || ''; }
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
}
function toast(message) {
  const node = $('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}
function endLoader() {
  $('loader')?.classList.add('is-hidden');
  document.body.classList.remove('loading');
  $('loader')?.setAttribute('aria-hidden', 'true');
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function typeText(node, text, speed) {
  if (!node) return;
  node.textContent = '';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    node.textContent = text;
    return;
  }
  for (const char of text) {
    node.textContent += char;
    await sleep(char === ' ' ? speed * .55 : speed);
  }
}
async function animateIntro(position, name) {
  const loader = $('loader');
  await sleep(160);
  await typeText($('introRoleText'), position, 48);
  await sleep(210);
  loader.classList.add('is-typing-name');
  await typeText($('introNameText'), name, 54);
  loader.classList.add('is-complete');
  await sleep(450);
  endLoader();
}
function showError(title, message) {
  setText('errorTitle', title);
  setText('errorMessage', message);
  $('profileError').hidden = false;
  $('profile').hidden = true;
  endLoader();
}
function safeUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch { return null; }
}
function linkButton(container, label, href, className, external) {
  const link = element('a', className, label);
  link.href = href;
  if (external) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  container.appendChild(link);
  return link;
}
function createContactRow(label, detail, href, action, external) {
  const row = element('a', 'contact-row');
  row.href = href;
  if (external) { row.target = '_blank'; row.rel = 'noopener noreferrer'; }
  row.appendChild(element('span', 'contact-icon', '↗'));
  const content = element('div');
  content.appendChild(element('small', '', label));
  content.appendChild(element('strong', '', detail));
  row.appendChild(content);
  row.appendChild(element('b', '', action));
  $('contactRows').appendChild(row);
}
function vcardEscape(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
function saveContact() {
  if (!profileData) return;
  const p = profileData;
  const lines = ['BEGIN:VCARD','VERSION:3.0','FN:' + vcardEscape(p.full_name),
    'N:;' + vcardEscape(p.full_name) + ';;;',
    'ORG:' + vcardEscape(p.company.display_name),'TITLE:' + vcardEscape(p.position_title)];
  if (p.phone_e164) lines.push('TEL;TYPE=CELL,VOICE:' + p.phone_e164);
  if (p.whatsapp_e164) lines.push('TEL;TYPE=CELL,WHATSAPP:' + p.whatsapp_e164);
  if (p.email) lines.push('EMAIL;TYPE=INTERNET,WORK:' + p.email);
  if (safeUrl(p.company.website_url)) lines.push('URL:' + p.company.website_url);
  if (p.company.office_address) lines.push('ADR;TYPE=WORK:;;' + vcardEscape(p.company.office_address) + ';;;;');
  lines.push('END:VCARD');
  const blob = new Blob([lines.join('\r\n') + '\r\n'], { type:'text/vcard;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = element('a'); anchor.href = href; anchor.download = p.slug + '.vcf';
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
  toast('Contact card ready');
}
function infoCard(kicker, title, description) {
  const card = element('article','current-card');
  card.appendChild(element('b','',kicker));
  card.appendChild(element('h3','',title));
  card.appendChild(element('p','',description));
  $('experienceSummary').appendChild(card);
}
function renderProfile(p) {
  profileData = p;
  document.title = p.full_name + ' | ' + p.position_title + ' — Qbranch Uganda Limited';
  document.querySelector('meta[name="description"]').content = p.short_intro || ('Connect with ' + p.full_name + ' at Qbranch Uganda Limited.');
  const tokens = p.full_name.trim().split(/\s+/);
  const last = tokens.pop();
  const heroName = $('heroName');
  heroName.appendChild(element('span','',tokens.join(' ')));
  heroName.appendChild(element('em','',last));
  const role = element('span','hero-role',p.position_title);
  const company = element('span','hero-role',p.company.display_name);
  $('heroTitle').append(role,company);
  setText('heroIntro',p.short_intro);
  setText('portraitRole',p.position_title.toUpperCase());
  setText('portraitName',p.full_name);
  const imageUrl = (/^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p.portrait_data||'') ? p.portrait_data : null) || safeUrl(p.portrait_url);
  if (imageUrl) {
    $('portrait').alt = 'Portrait of ' + p.full_name;
    $('portrait').addEventListener('error', () => {
      $('portrait').hidden = true;
      $('portrait').parentElement.classList.add('without-portrait');
    }, {once:true});
    $('portrait').src = imageUrl;
  } else { $('portrait').hidden = true; $('portrait').parentElement.classList.add('without-portrait'); }
  const actions = $('heroActions');
  if (p.phone_e164) linkButton(actions,'Call','tel:' + p.phone_e164,'primary-action',false);
  if (p.whatsapp_e164) linkButton(actions,'WhatsApp','https://wa.me/' + p.whatsapp_e164.replace(/\D/g,''),'secondary-action branded-action',true);
  const save = element('button','secondary-action','Save My Contact');
  save.type = 'button'; save.addEventListener('click',saveContact); actions.appendChild(save);
  setText('aboutText',p.about_me || p.short_intro);
  const skills = [...(p.skills || []),...(p.core_competencies || [])];
  for (const skill of new Set(skills)) $('competencies').appendChild(element('span','',skill));
  if (!skills.length) $('competenciesLabel').hidden = true;
  infoCard('MY ROLE',p.position_title,p.company.display_name);
  infoCard('MY COMPANY',p.company.display_name,'Bringing Life to Technology');
  for (const [index,e] of (p.experience || []).entries()) {
    const item = element('article','career-item');
    item.appendChild(element('b','',String(index + 1).padStart(2,'0')));
    const copy = element('div');
    copy.appendChild(element('h3','',e.position_title || e.organization || 'Professional experience'));
    const period = e.start_year ? String(e.start_year) + '–' + (e.is_current ? 'Present' : (e.end_year || '')) : '';
    const description = [e.position_title ? e.organization : null, period].filter(Boolean).join(' · ');
    if (description) copy.appendChild(element('p','',description));
    item.appendChild(copy); $('careerGrid').appendChild(item);
  }
  const companyUrl = safeUrl(p.company.website_url);
  if (companyUrl) $('companyWebsite').href = companyUrl; else $('companyWebsite').hidden = true;
  setText('connectText','I invite you to reach out to me using the contact details below. I look forward to connecting with you.');
  if (p.phone_e164) createContactRow('MOBILE',p.phone_e164,'tel:' + p.phone_e164,'Call',false);
  if (p.email) createContactRow('EMAIL',p.email,'mailto:' + p.email,'Email',false);
  if (p.whatsapp_e164) createContactRow('WHATSAPP','Direct message','https://wa.me/' + p.whatsapp_e164.replace(/\D/g,''),'Open',true);
  if (companyUrl) createContactRow('WEBSITE',new URL(companyUrl).hostname,companyUrl,'Visit',true);
  if (p.company.office_address) createContactRow('LOCATION',p.company.office_address,'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.company.office_address),'Map',true);
  for (const s of (p.links || [])) {
    const href = safeUrl(s.url);
    if (href) createContactRow(s.platform.toUpperCase(),s.label,href,'Visit',true);
  }
  $('saveContactBottom').addEventListener('click',saveContact);
  $('profile').hidden = false;
  $('profileError').hidden = true;
  animateIntro(p.position_title,p.full_name).catch(endLoader);
}
async function fetchData(path, signal) {
  const response = await fetch(API_BASE + '/' + path, {signal,headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error('The profile service is temporarily unavailable (' + response.status + ').');
  return response.json();
}
async function loadProfile() {
  if (!PROFILE_SLUG) return showError('Qbranch Digital Profiles','Visit the management dashboard to manage Qbranch staff profiles.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(PROFILE_SLUG)) return showError('Invalid profile link','Please check the profile URL.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const people = await fetchData('profiles?slug=eq.' + encodeURIComponent(PROFILE_SLUG) + '&select=id,slug,full_name,position_title,short_intro,about_me,phone_e164,whatsapp_e164,email,portrait_url,portrait_data,skills,core_competencies,company_id&limit=1', controller.signal);
    const p = people?.[0];
    if(!p) return showError('Profile not yet published','This staff profile is being prepared. Please check again after the card is approved.');
    const [companies,experience,links] = await Promise.all([
      fetchData('companies?id=eq.' + encodeURIComponent(p.company_id) + '&select=display_name,website_url,office_address,logo_path,tagline&limit=1',controller.signal),
      fetchData('profile_experience?profile_id=eq.' + encodeURIComponent(p.id) + '&select=organization,position_title,start_year,end_year,is_current&order=display_order.asc',controller.signal),
      fetchData('profile_links?profile_id=eq.' + encodeURIComponent(p.id) + '&select=platform,label,url&order=display_order.asc',controller.signal)
    ]);
    if(!companies?.[0]) throw new Error('The company details are currently unavailable.');
    renderProfile({...p,company:companies[0],experience,links});
  } catch (error) {
    showError('Profile unavailable',error.name === 'AbortError' ? 'The request took too long. Please try again.' : error.message);
  } finally { clearTimeout(timeout); }
}
$('retryButton')?.addEventListener('click',() => window.location.reload());
$('shareBtn')?.addEventListener('click', async () => {
  const url = window.location.href.split('#')[0];
  const title = profileData ? profileData.full_name + ' | Qbranch Uganda Limited' : 'Qbranch Uganda Limited';
  try {
    if (navigator.share) return await navigator.share({title,url});
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url); return toast('Profile link copied'); }
    toast('Use your browser share menu');
  } catch (error) { if (error.name !== 'AbortError') toast('Unable to share right now'); }
});
loadProfile().catch(() => showError('Profile unavailable','Please try again.'));
