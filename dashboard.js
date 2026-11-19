'use strict';
const AUTH = 'https://ep-nameless-cherry-bet0ev73.neonauth.c-9.us-east-2.aws.neon.tech/qbranch_profiles/auth';
const DATA = 'https://ep-nameless-cherry-bet0ev73.apirest.c-9.us-east-2.aws.neon.tech/qbranch_profiles/rest/v1';
const SITE = 'https://mdanson27.github.io/Qbranch';
const $ = s => document.getElementById(s);
let people=[], company=null, editing=null, newPhoto=null, verifiedSession=null, currentQr=null;
const ESC = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urlFor = slug => SITE + '/p/?profile=' + encodeURIComponent(slug);
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),3000)}
function msg(id,message,success=false){const el=$(id);el.textContent=message;el.classList.toggle('success',success)}
function hideLoading(){ $('loadingState').hidden=true }
function showLogin(message=''){hideLoading();document.body.classList.add('auth-mode');$('dashboard').hidden=true;$('authScreen').hidden=false;$('signOut').hidden=true;$('accountEmail').textContent='';msg('authMessage',message)}
function showDashboard(){hideLoading();document.body.classList.remove('auth-mode');$('dashboard').hidden=false;$('authScreen').hidden=true;$('signOut').hidden=false;$('accountEmail').textContent=verifiedSession?.user?.email||''}
async function authRequest(path,method='GET',body){
  const res=await fetch(AUTH+path,{method,credentials:'include',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  let data;try{data=await res.json()}catch{data=null}
  if(!res.ok)throw new Error(data?.message||data?.error?.message||data?.error||('Sign-in service returned '+res.status));
  return data;
}
async function getToken(){
  const data=await authRequest('/token');
  const token=data?.token||data?.data?.token;
  if(!token)throw new Error('Your session has expired. Please sign in again.');
  return token;
}
async function api(path,{method='GET',body,auth=true}={}){
  const headers={'Accept':'application/json'};
  if(auth)headers.Authorization='Bearer '+await getToken();
  if(body!==undefined){headers['Content-Type']='application/json';headers.Prefer='return=representation'}
  const res=await fetch(DATA+'/'+path,{method,headers,cache:'no-store',body:body===undefined?undefined:JSON.stringify(body)});
  const text=await res.text();let value=null;try{value=text?JSON.parse(text):null}catch{value=text}
  if(!res.ok)throw new Error(value?.message||value?.hint||value?.error||('Database request failed ('+res.status+')'));
  return value;
}
async function begin(){
  try{
    const session=await authRequest('/get-session');
    if(!session?.user?.email)return showLogin();
    verifiedSession=session;
    const allowed=await api('rpc/is_qbranch_admin',{method:'POST',body:{}});
    if(allowed!==true)return showLogin('This account is not authorized. Contact AutoMinds Africa to request access.');
    await loadDashboard();
  }catch(error){showLogin('Sign in to manage Qbranch profiles. '+(error.message||''))}
}
let dashboardRequest=null;
let dashboardLoaded=false;
function showDataIssue(message){
  const panel=$('dataHealth');
  $('dataHealthText').textContent=message;
  panel.hidden=false;
}
function clearDataIssue(){
  $('dataHealth').hidden=true;
}
async function loadDashboard(){
  // A background refresh must never erase a previously successful staff list.
  if(dashboardRequest)return dashboardRequest;
  dashboardRequest=(async()=>{
    let lastError;
    for(let attempt=0;attempt<3;attempt++){
      if(attempt)await new Promise(resolve=>setTimeout(resolve,attempt*650));
      try{
        // Read company and staff together, using one verified server-side admin check.
        // The SECURITY DEFINER RPC explicitly rejects unauthorized sessions rather
        // than allowing RLS to silently return zero rows.
        const result=await api('rpc/qbranch_admin_snapshot',{method:'POST',body:{}});
        const snapshot=Array.isArray(result)?result[0]:result;
        if(!snapshot || !Array.isArray(snapshot.profiles) || !snapshot.company ||
           !Number.isInteger(snapshot.profile_count) ||
           snapshot.profile_count!==snapshot.profiles.length){
          throw new Error('Profile service returned an incomplete response.');
        }
        if(dashboardLoaded && people.length>0 && snapshot.profile_count===0){
          throw new Error('A previously populated directory unexpectedly returned zero profiles.');
        }
        const wasShowing=!$('dashboard').hidden;
        company=snapshot.company;
        people=snapshot.profiles;
        dashboardLoaded=true;
        clearDataIssue();
        showDashboard();
        render();
        if(!wasShowing)setView((location.hash||'#overview').slice(1),false);
        return true;
      }catch(error){
        lastError=error;
      }
    }
    // Don't replace staff data with [] if the connection or session is unstable.
    if(dashboardLoaded){
      showDataIssue('The last refresh did not complete: '+(lastError?.message||'connection error')+
                    '. Your previously loaded staff records are still shown. Select Retry connection.');
      return false;
    }
    throw new Error('Unable to load your staff records: '+(lastError?.message||'connection error')+
                    '. Please sign in again or refresh this page.');
  })();
  try{return await dashboardRequest}
  finally{dashboardRequest=null}
}

const VIEWS=['overview','team','links','archive'];
let currentView='overview';
function setView(name,updateHash=true){
  if(!VIEWS.includes(name))name='overview';
  currentView=name;
  for(const view of VIEWS){
    const section=$(view); if(section)section.hidden=view!==name;
    const nav=$('nav'+view.charAt(0).toUpperCase()+view.slice(1));
    if(nav){nav.classList.toggle('active',view===name); if(view===name)nav.setAttribute('aria-current','page');else nav.removeAttribute('aria-current')}
  }
  const titles={overview:'Overview',team:'Staff profiles',links:'Live links & QR',archive:'Archive & recovery'};
  const crumb=document.querySelector('.breadcrumb strong');if(crumb)crumb.textContent=titles[name];
  if(updateHash && location.hash!=='#'+name)history.replaceState(null,'','#'+name);
  window.scrollTo({top:0,behavior:'auto'});
}
function activeProfiles(){return people.filter(p=>!p.deleted_at&&p.status!=='archived')}
function archivedProfiles(){return people.filter(p=>p.deleted_at||p.status==='archived')}
function viewUrl(p){return urlFor(p.slug)}
function pictureFor(p){
  const el=document.createElement(p.portrait_data?'img':'div');el.className='person-photo';
  if(p.portrait_data){el.src=p.portrait_data;el.alt='Portrait of '+p.full_name}
  else el.textContent=(p.full_name||'QB').split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  return el;
}
function statusFor(p){
  const span=document.createElement('span');
  const status=p.deleted_at?'Removed':p.status==='archived'?'Archived':p.status==='published'?'Published':'Draft';
  span.className='status-badge '+(p.deleted_at?'removed':p.status);
  span.textContent=status;
  return span;
}
function action(label,cb,options={}){
  const button=document.createElement('button');button.type='button';button.className=options.className||'action-btn';
  button.textContent=label;button.disabled=Boolean(options.disabled);
  if(options.title)button.title=options.title;
  button.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();if(button.disabled)return;button.disabled=true;try{await cb()}catch(error){toast('Action failed: '+error.message)}finally{button.disabled=false}});
  return button;
}
function rowFor(p,{archived=false}={}){
 const row=document.createElement('article');row.className='person-row';
 row.appendChild(pictureFor(p));
 const name=document.createElement('div');name.className='person-name';
 const h=document.createElement('strong');h.textContent=p.full_name;name.appendChild(h);
 const sub=document.createElement('small');sub.textContent=p.is_frozen?'Frozen · edits locked':p.portrait_data?'Portrait ready':'Photo needed';name.appendChild(sub);row.appendChild(name);
 const title=document.createElement('div');title.className='person-title';title.textContent=p.position_title;row.appendChild(title);
 const tags=document.createElement('div');tags.className='row-status';tags.appendChild(statusFor(p));if(p.is_frozen){const lock=document.createElement('span');lock.className='freeze-tag';lock.textContent='❄ Frozen';tags.appendChild(lock)}row.appendChild(tags);
 const buttons=document.createElement('div');buttons.className='person-actions';
 if(archived){
   buttons.appendChild(action('Restore to draft',()=>restoreProfile(p),{className:'action-btn publish',disabled:p.is_frozen}));
   if(p.is_frozen)buttons.appendChild(action('Unfreeze',()=>toggleFreeze(p)));
   row.appendChild(buttons);return row;
 }
 buttons.appendChild(action('Edit',()=>openEditor(p.id),{className:'action-btn',disabled:p.is_frozen,title:p.is_frozen?'Unfreeze before editing':''}));
 if(p.status==='published')buttons.appendChild(action('View profile',()=>openLive(p),{className:'action-btn view'}));
 buttons.appendChild(action(p.status==='published'?'Unpublish':'Publish',()=>changePublication(p),{className:'action-btn '+(p.status==='published'?'unpublish':'publish'),disabled:p.is_frozen||(p.status!=='published'&&!p.portrait_data),title:!p.portrait_data?'Add a photo first':''}));
 const more=document.createElement('details');more.className='row-menu';
 const summary=document.createElement('summary');summary.textContent='More';summary.setAttribute('aria-label','More actions for '+p.full_name);more.appendChild(summary);
 const menu=document.createElement('div');menu.className='row-menu-panel';
 menu.appendChild(action(p.is_frozen?'Unfreeze':'Freeze',()=>toggleFreeze(p),{className:'menu-action'}));
 menu.appendChild(action('Archive profile',()=>archiveProfile(p),{className:'menu-action',disabled:p.is_frozen}));
 menu.appendChild(action('Delete profile',()=>removeProfile(p),{className:'menu-action danger',disabled:p.is_frozen}));
 more.appendChild(menu);buttons.appendChild(more);row.appendChild(buttons);return row;
}
function render(){
 const active=activeProfiles(),archived=archivedProfiles();
 $('statTotal').textContent=active.length;
 $('statPublished').textContent=active.filter(p=>p.status==='published').length;
 $('statDrafts').textContent=active.filter(p=>p.status==='draft').length;
 $('statFrozen').textContent=active.filter(p=>p.is_frozen).length;
 for(const id of ['addProfile','overviewAddProfile'])$(id).disabled=active.length>=5;
 const query=$('search').value.trim().toLowerCase();
 const filtered=active.filter(p=>(p.full_name+' '+p.position_title).toLowerCase().includes(query));
 const list=$('profilesList');list.replaceChildren();for(const p of filtered)list.appendChild(rowFor(p));
 const emptyNotice=$('emptyProfiles');
 emptyNotice.hidden=filtered.length>0;
 emptyNotice.textContent=query?'No matching staff found for your search.': 'No active staff profiles have been created. Archived or removed profiles are listed under Archive & recovery.';
 const overview=$('overviewProfiles');overview.replaceChildren();
 for(const p of active.slice().sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,5)){
  const item=document.createElement('div');item.className='overview-person';item.appendChild(pictureFor(p));
  const info=document.createElement('div');info.className='overview-person-label';const strong=document.createElement('strong');strong.textContent=p.full_name;info.appendChild(strong);const small=document.createElement('small');small.textContent=p.position_title;info.appendChild(small);item.appendChild(info);item.appendChild(statusFor(p));
  overview.appendChild(item);
 }
 if(!active.length){overview.textContent='No active staff profiles yet.'}
 const live=$('liveLinksList');live.replaceChildren();
 const published=active.filter(p=>p.status==='published');
 if(!published.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No published profiles yet. Publish a staff profile with a portrait to generate its live link.';live.appendChild(empty)}
 for(const p of published){
  const card=document.createElement('article');card.className='link-card';
  const top=document.createElement('div');top.className='link-top';top.appendChild(pictureFor(p));
  const text=document.createElement('div');text.className='link-profile-text';
  const name=document.createElement('strong');name.textContent=p.full_name;text.appendChild(name);
  const title=document.createElement('small');title.textContent=p.position_title+(p.is_frozen?' · Frozen':'');text.appendChild(title);top.appendChild(text);top.appendChild(statusFor(p));card.appendChild(top);
  const url=document.createElement('div');url.className='link-url';url.textContent=viewUrl(p);card.appendChild(url);
  const actions=document.createElement('div');actions.className='link-actions';
  actions.appendChild(action('↗ View live profile',()=>openLive(p),{className:'primary-btn'}));
  actions.appendChild(action('Copy link',()=>copyLink(p),{className:'ghost-btn'}));
  actions.appendChild(action('QR code',()=>openQr(p),{className:'ghost-btn'}));
  card.appendChild(actions);live.appendChild(card);
 }
 const archiveList=$('archiveList');archiveList.replaceChildren();
 if(!archived.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Nothing in the archive. Profiles you archive or remove will be available for recovery here.';archiveList.appendChild(empty)}
 for(const p of archived)archiveList.appendChild(rowFor(p,{archived:true}));
}
async function showConfirmation({title,message,buttonLabel='Confirm',exactName=''}) {
 const dialog=$('confirmDialog');$('confirmTitle').textContent=title;$('confirmMessage').textContent=message;
 $('confirmAccept').textContent=buttonLabel;$('confirmNameWrap').hidden=!exactName;
 $('confirmNameInput').value='';$('confirmNameInput').placeholder=exactName||'';
 $('confirmAccept').disabled=Boolean(exactName);
 return new Promise(resolve=>{
  let finished=false;
  const finish=ok=>{if(finished)return;finished=true;dialog.close();dialog.oncancel=null;$('confirmCancel').onclick=null;$('confirmAccept').onclick=null;$('confirmNameInput').oninput=null;resolve(ok)};
  $('confirmCancel').onclick=()=>finish(false);
  $('confirmAccept').onclick=()=>finish(true);
  dialog.oncancel=e=>{e.preventDefault();finish(false)};
  $('confirmNameInput').oninput=()=>{$('confirmAccept').disabled=$('confirmNameInput').value.trim()!==exactName};
  dialog.showModal();
  if(exactName)$('confirmNameInput').focus();
 });
}
async function mutateProfile(p,details,feedback){
 await api('profiles?id=eq.'+encodeURIComponent(p.id),{method:'PATCH',body:details});
 await loadDashboard();
 toast(feedback);
}
async function changePublication(p){
 if(p.is_frozen)return toast('Unfreeze the profile before changing its publication.');
 if(p.status!=='published'&&!p.portrait_data)return toast('Upload a portrait before publishing.');
 const publishing=p.status!=='published';
 if(!await showConfirmation({title:publishing?'Publish profile?':'Unpublish profile?',message:publishing?'This card will immediately become available to anyone with its link and QR code.':'The profile will be taken offline and remain in draft.',buttonLabel:publishing?'Publish now':'Unpublish'}))return;
 await mutateProfile(p,{status:publishing?'published':'draft'},publishing?'Profile is now published. View it from Live Links.':'Profile unpublished.');
}
async function toggleFreeze(p){
 const unfreeze=p.is_frozen;
 if(!await showConfirmation({title:unfreeze?'Unfreeze profile?':'Freeze profile?',message:unfreeze?'Authorized admins will be able to edit this profile again.':'This locks profile details and publication state. If already published it will remain online.',buttonLabel:unfreeze?'Unfreeze':'Freeze profile'}))return;
 await mutateProfile(p,{is_frozen:!p.is_frozen},unfreeze?'Profile unfrozen.':'Profile frozen and protected from edits.');
}
async function archiveProfile(p){
 if(p.is_frozen)return toast('Unfreeze this profile before archiving.');
 if(!await showConfirmation({title:'Archive '+p.full_name+'?',message:'The public page will become unavailable. All photos, experience and contacts will be preserved for later restoration.',buttonLabel:'Archive profile'}))return;
 await mutateProfile(p,{status:'archived'},'Profile archived. Restore it from Archive & recovery.');
}
async function removeProfile(p){
 if(p.is_frozen)return toast('Unfreeze this profile before removal.');
 if(!await showConfirmation({title:'Remove '+p.full_name+'?',message:'This removes the live page and hides the profile from active staff. The record will be retained for recovery. Type the exact full name to confirm.',buttonLabel:'Remove profile',exactName:p.full_name}))return;
 await mutateProfile(p,{status:'archived',deleted_at:new Date().toISOString()},'Profile removed and retained for recovery.');
}
async function restoreProfile(p){
 if(p.is_frozen)return toast('Unfreeze this profile before restoring.');
 if(activeProfiles().length>=5)return toast('The five active profile slots are full. Archive another profile first.');
 if(!await showConfirmation({title:'Restore '+p.full_name+'?',message:'The profile will return as a private draft. You can review it and publish again when ready.',buttonLabel:'Restore to draft'}))return;
 await mutateProfile(p,{status:'draft',deleted_at:null},'Profile restored to draft.');
}
function openLive(p){
 const link=document.createElement('a');link.href=viewUrl(p);link.target='_blank';link.rel='noopener noreferrer';document.body.appendChild(link);link.click();link.remove();
}
async function copyLink(p){
 try{await navigator.clipboard.writeText(viewUrl(p));toast('Live profile link copied.')}catch{window.prompt('Copy live profile link:',viewUrl(p))}
}
function openQr(p){
 currentQr=viewUrl(p);
 $('qrTitle').textContent=p.full_name;
 $('qrImage').src='https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&format=png&data='+encodeURIComponent(currentQr);
 $('qrLink').textContent=currentQr;$('qrLink').href=currentQr;
 $('downloadQr').href=$('qrImage').src;$('qrDialog').showModal();
}
function normalizePhone(value){
 let s=String(value||'').trim().replace(/[^\d+]/g,'');if(!s)return null;
 if(s.startsWith('0'))s='+256'+s.slice(1);else if(s.startsWith('256'))s='+'+s;
 return s.startsWith('+')?s:'+'+s;
}
function toList(value){return String(value||'').split(',').map(v=>v.trim()).filter(Boolean)}
const PLATFORMS=['LinkedIn','Instagram','Facebook','TikTok','X','YouTube','Telegram','WhatsApp','Website','Other'];
function addExperienceRow(record={}){
 const row=document.createElement('div');row.className='structured-row experience-row';
 row.innerHTML='<label>Company / organization<input data-field="organization" placeholder="e.g. Qbranch Uganda Limited"></label><label>Position<input data-field="position_title" placeholder="e.g. Procurement Officer"></label><label>Start year<input data-field="start_year" type="number" min="1900" max="2100" placeholder="2024"></label><label>End year<input data-field="end_year" type="number" min="1900" max="2100" placeholder="2026"></label><label class="current-toggle"><input data-field="is_current" type="checkbox"> Current position</label><button type="button" class="row-remove" aria-label="Remove position">×</button>';
 for(const key of ['organization','position_title','start_year','end_year'])row.querySelector('[data-field="'+key+'"]').value=record[key]||'';
 const current=row.querySelector('[data-field=is_current]'),end=row.querySelector('[data-field=end_year]');
 current.checked=Boolean(record.is_current);end.disabled=current.checked;
 current.addEventListener('change',()=>{end.disabled=current.checked;if(current.checked)end.value=''});
 row.querySelector('.row-remove').addEventListener('click',()=>row.remove());
 $('experienceFields').appendChild(row);
}
function addSocialRow(record={}){
 const row=document.createElement('div');row.className='structured-row social-row';
 row.innerHTML='<label>Platform<select data-field="platform"></select></label><label class="social-username">Username, number or profile link<input data-field="account" placeholder="@username or profile URL"></label><button type="button" class="row-remove" aria-label="Remove social account">×</button>';
 const select=row.querySelector('select');for(const p of PLATFORMS){const op=document.createElement('option');op.value=p;op.textContent=p;select.appendChild(op)}
 select.value=PLATFORMS.includes(record.platform)?record.platform:'Other';
 row.querySelector('[data-field=account]').value=record.account||record.url||'';
 const input=row.querySelector('[data-field=account]');
 const updatePlaceholder=()=>{input.placeholder=select.value==='WhatsApp'?'e.g. 0701 000000':select.value==='Website'?'example.com':select.value==='Facebook'?'username or Facebook profile URL':'@username or https://profile-link'};
 select.addEventListener('change',updatePlaceholder);updatePlaceholder();
 row.querySelector('.row-remove').addEventListener('click',()=>row.remove());
 $('socialFields').appendChild(row);
}
function socialURL(platform,raw){
 const input=String(raw||'').trim();if(!input)return null;
 let url;
 if(/^https?:\/\//i.test(input)){url=input.replace(/^http:\/\//i,'https://')}
 else {
  const username=input.replace(/^@/,'').replace(/^\/+|\/+$/g,'');
  if(platform==='WhatsApp'){const phone=normalizePhone(username);if(!phone||!/^\+\d{9,15}$/.test(phone))throw new Error('Enter a valid WhatsApp phone number.');url='https://wa.me/'+phone.replace(/\D/g,'')}
  else if(platform==='Website'){url='https://'+username}
  else if(platform==='Other')throw new Error('Other social accounts need an HTTPS profile link.');
  else{
   if(!/^[a-zA-Z0-9._-]+$/.test(username))throw new Error('For '+platform+', enter a username without spaces or paste the full profile URL.');
   const base={LinkedIn:'https://www.linkedin.com/in/',Instagram:'https://www.instagram.com/',Facebook:'https://www.facebook.com/',TikTok:'https://www.tiktok.com/@',X:'https://x.com/',YouTube:'https://www.youtube.com/@',Telegram:'https://t.me/'}[platform];
   url=base+encodeURIComponent(username);
  }
 }
 const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.includes('.'))throw new Error('Enter a valid HTTPS profile link for '+platform+'.');
 return u.href;
}
function collectExperience(){
 const data=[];
 for(const row of $('experienceFields').querySelectorAll('.experience-row')){
  const get=key=>row.querySelector('[data-field="'+key+'"]');
  const organization=get('organization').value.trim(),position_title=get('position_title').value.trim();
  const start=get('start_year').value,end=get('end_year').value, is_current=get('is_current').checked;
  if(!organization&&!position_title&&!start&&!end)continue;
  const start_year=start?Number(start):null,end_year=(!is_current&&end)?Number(end):null;
  if(start_year&&end_year&&end_year<start_year)throw new Error('An experience end year cannot be before the start year.');
  data.push({organization:organization||null,position_title:position_title||null,start_year,end_year,is_current,display_order:data.length+1});
 }
 return data;
}
function collectSocials(){
 const data=[];
 for(const row of $('socialFields').querySelectorAll('.social-row')){
  const platform=row.querySelector('[data-field=platform]').value,account=row.querySelector('[data-field=account]').value;
  const url=socialURL(platform,account);
  if(!url)continue;
  data.push({platform,label:platform==='Website'?'My website':platform==='Other'?'Profile link':'My '+platform,url,display_order:data.length+1});
 }
 return data;
}
async function openEditor(id){
 editing=people.find(p=>p.id===id)||null;newPhoto=null;
 if(editing&&(editing.is_frozen||editing.deleted_at||editing.status==='archived'))return toast('Unfreeze or restore this profile before editing.');
 const form=$('editForm');form.reset();msg('editorMessage','');
 $('experienceFields').replaceChildren();$('socialFields').replaceChildren();
 $('editorHeading').textContent=editing?'Edit '+editing.full_name:'Add staff profile';
 $('photoPreview').replaceChildren();
 if(editing?.portrait_data){const im=document.createElement('img');im.alt='Current portrait';im.src=editing.portrait_data;$('photoPreview').appendChild(im)}
 else{const initials=document.createElement('span');initials.textContent='QB';$('photoPreview').appendChild(initials)}
 $('photoInfo').textContent=editing?.portrait_data?'Current portrait saved. Choose another to replace.':'No photograph added yet';
 if(editing){
  for(const key of ['full_name','position_title','phone_e164','whatsapp_e164','email','short_intro','about_me'])form.elements[key].value=editing[key]||'';
  form.elements.skills.value=(editing.skills||[]).join(', ');
  form.elements.core_competencies.value=(editing.core_competencies||[]).join(', ');
  try{
   const [ex,links]=await Promise.all([
    api('profile_experience?profile_id=eq.'+editing.id+'&select=organization,position_title,start_year,end_year,is_current&order=display_order.asc'),
    api('profile_links?profile_id=eq.'+editing.id+'&select=platform,label,url&order=display_order.asc')
   ]);
   for(const r of ex)addExperienceRow(r);
   for(const r of links)addSocialRow(r);
  }catch(e){msg('editorMessage','Supporting records could not load: '+e.message);return}
 }
 if(!$('experienceFields').childElementCount)addExperienceRow();
 $('editDialog').showModal();
}
async function createPhotoData(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use a JPG, PNG or WebP portrait.');
 if(file.size>10*1024*1024)throw new Error('Choose an image smaller than 10 MB.');
 const src=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const a=new Image();a.onload=()=>resolve(a);a.onerror=()=>reject(new Error('Unable to read the photograph.'));a.src=src});
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,640,640);
  const scale=Math.max(640/img.naturalWidth,640/img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  ctx.drawImage(img,(640-w)/2,(640-h)/2,w,h);
  let out='';
  for(const quality of [.84,.74,.62,.5]){out=canvas.toDataURL('image/webp',quality);if(out.length<340000)break}
  if(!out.startsWith('data:image/webp;'))out=canvas.toDataURL('image/jpeg',.68);
  if(out.length>340000)throw new Error('Photograph cannot be compressed enough. Try a smaller image.');
  return out;
 }finally{URL.revokeObjectURL(src)}
}
async function saveEditor(event){
 event.preventDefault();
 const button=$('saveProfile');button.disabled=true;button.textContent='Saving...';msg('editorMessage','Saving changes securely to Neon...');
 let saved=false;
 try{
  if(editing?.is_frozen)throw new Error('This profile is frozen. Unfreeze it first.');
  const fields=Object.fromEntries(new FormData($('editForm')).entries());
  const full_name=String(fields.full_name||'').trim(),position_title=String(fields.position_title||'').trim();
  if(!full_name||!position_title)throw new Error('Full name and professional title are required.');
  const activeCount=activeProfiles().length;
  if(!editing&&activeCount>=5)throw new Error('This package contains five active staff profiles. Archive a profile before adding another.');
  const slug=full_name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(!slug)throw new Error('Enter a name containing letters to create the profile URL.');
  const p_fields={
   full_name,position_title,
   phone_e164:normalizePhone(fields.phone_e164),whatsapp_e164:normalizePhone(fields.whatsapp_e164),
   email:String(fields.email||'').trim()||null,
   short_intro:String(fields.short_intro||'').trim()||null,
   about_me:String(fields.about_me||'').trim()||null,
   skills:toList(fields.skills),core_competencies:toList(fields.core_competencies)
  };
  if(newPhoto)p_fields.portrait_data=newPhoto;
  const p_experience=collectExperience(),p_links=collectSocials();
  await api('rpc/qbranch_save_profile',{method:'POST',body:{
   p_id:editing?.id||null,p_slug:editing?.slug||slug,p_company_id:company.id,
   p_fields,p_experience,p_links
  }});
  saved=true;$('editDialog').close();
  await loadDashboard();
  toast('Profile saved. Published pages show the newest details immediately on reload.');
 }catch(error){
  const message='Save failed: '+error.message;
  if(saved){toast('Changes saved, but refreshing the dashboard failed.');}
  else msg('editorMessage',message);
 }finally{button.disabled=false;button.textContent='Save profile';}
}
async function authorizeAndOpen(){
  verifiedSession=await authRequest('/get-session');
  if(!verifiedSession?.user?.email)throw new Error('Sign in could not be confirmed. Please try again.');
  const allowed=await api('rpc/is_qbranch_admin',{method:'POST',body:{}});
  if(allowed!==true)throw new Error('Your account is not an authorized Qbranch administrator. Contact AutoMinds Africa for access.');
  await loadDashboard();
}
$('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=$('loginBtn'), email=$('authEmail').value.trim().toLowerCase(),password=$('authPassword').value;
  if(!email || !password)return msg('authMessage','Enter your email and password.');
  button.disabled=true;
  msg('authMessage','Signing in securely...');
  try{
    await authRequest('/sign-in/email','POST',{email,password});
    await authorizeAndOpen();
  }catch(error){msg('authMessage',error.message)}
  finally{button.disabled=false}
});
$('googleSignIn').addEventListener('click',async()=>{
  const button=$('googleSignIn');
  button.disabled=true;
  msg('authMessage','Connecting to Google...');
  try{
    const result=await authRequest('/sign-in/social','POST',{
      provider:'google',
      callbackURL:SITE+'/'
    });
    const redirect=result?.url||result?.data?.url;
    if(result?.redirect===false){await authorizeAndOpen();return;}
    if(typeof redirect!=='string'||!redirect.startsWith('https://'))throw new Error('Google sign-in could not be started. Check the Google OAuth provider configuration.');
    window.location.assign(redirect);
  }catch(error){msg('authMessage',error.message)}
  finally{button.disabled=false}
});
function paintCodeAtmosphere(){
  const root=$('codeAtmosphere');if(!root)return;
  const snippets=[
    'const profile = await load();','SELECT * FROM profiles;',
    'if (authorized) publish();','{ name, title, contact }',
    'await syncDigitalCard();','function verifyIdentity() {',
    'return secureSession;','<CardProfile verified />',
    'const status = "ACTIVE";','await connectToNeon();',
    'profile.skills.map(render);','if (valid) return true;',
    'const link = new URL(id);','scan → connect → share;',
    'db.query("profiles");','// QBRANCH · TECHNOLOGY',
    'const secure = true;','{ role: "administrator" }'
  ];
  const count=15;
  for(let i=0;i<count;i++){
    const column=document.createElement('div');
    column.className='code-column'+(i%3===0?' up':'');
    column.style.setProperty('--x',((i+.15)*100/count-5).toFixed(2)+'%');
    column.style.setProperty('--duration',(28+(i*7)%21)+'s');
    column.style.setProperty('--delay','-'+((i*11)%36)+'s');
    column.style.setProperty('--opacity',(0.07+((i*3)%6)*0.019).toFixed(3));
    for(let j=0;j<16;j++){
      const line=document.createElement('span');
      line.textContent=snippets[(i*7+j*5)%snippets.length];
      column.appendChild(line);
    }
    root.appendChild(column);
  }
}
paintCodeAtmosphere();
$('signOut').addEventListener('click',async()=>{try{await authRequest('/sign-out','POST',{});}catch{}people=[];verifiedSession=null;showLogin('You have signed out.')});
function navigateTo(view){
 setView(view);
}
for(const view of VIEWS){
 const nav=$('nav'+view.charAt(0).toUpperCase()+view.slice(1));
 nav?.addEventListener('click',event=>{event.preventDefault();navigateTo(view)});
}
window.addEventListener('hashchange',()=>{
 if(!$('dashboard').hidden)setView(location.hash.replace(/^#/,'')||'overview',false);
});
$('addProfile').addEventListener('click',()=>openEditor(null));
$('overviewAddProfile').addEventListener('click',()=>{setView('team');openEditor(null)});
$('manageFromOverview').addEventListener('click',()=>setView('team'));
$('openLinksFromOverview').addEventListener('click',()=>setView('links'));
$('openArchiveFromOverview').addEventListener('click',()=>setView('archive'));
for(const id of ['refresh','refreshLinks','retryData'])$(id).addEventListener('click',()=>loadDashboard().catch(error=>showDataIssue('Unable to refresh: '+error.message)));
$('search').addEventListener('input',render);
$('addExperience').addEventListener('click',()=>addExperienceRow());
$('addSocial').addEventListener('click',()=>addSocialRow({platform:'Instagram'}));
$('editForm').addEventListener('submit',saveEditor);
$('closeEditor').addEventListener('click',()=>$('editDialog').close());
$('cancelEditor').addEventListener('click',()=>$('editDialog').close());
$('closeQr').addEventListener('click',()=>$('qrDialog').close());
$('copyQrLink').addEventListener('click',async()=>{
 if(!currentQr)return;
 try{await navigator.clipboard.writeText(currentQr);toast('Link copied.')}catch{window.prompt('Copy live profile URL:',currentQr)}
});
$('photoFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 $('photoInfo').textContent='Optimizing image...';
 try{
  newPhoto=await createPhotoData(file);
  const preview=$('photoPreview');preview.replaceChildren();
  const img=document.createElement('img');img.alt='New optimized portrait';img.src=newPhoto;preview.appendChild(img);
  $('photoInfo').textContent='Portrait ready · '+Math.round(newPhoto.length*.75/1024)+' KB';
 }catch(error){newPhoto=null;msg('editorMessage',error.message);$('photoInfo').textContent='Image not accepted.'}
});
let lastRefresh=0;
window.addEventListener('focus',()=>{
 if(!$('dashboard').hidden && !document.querySelector('dialog[open]') && Date.now()-lastRefresh>10000){
  lastRefresh=Date.now();loadDashboard().catch(error=>showDataIssue('Automatic refresh failed: '+error.message));
 }
});
begin();
