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
  const res=await fetch(DATA+'/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
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
async function loadDashboard(){
 const [c,profiles]=await Promise.all([
  api('companies?slug=eq.qbranch&select=id,display_name,office_address,website_url&limit=1'),
  api('profiles?select=id,company_id,slug,full_name,position_title,short_intro,about_me,phone_e164,whatsapp_e164,email,skills,core_competencies,portrait_data,status&order=created_at.asc')
 ]);
 company=c[0]||null;people=profiles||[];if(!company)throw new Error('The Qbranch company database record was not found.');
 showDashboard();render();
}
function render(){
 $('statTotal').textContent=people.length;
 $('statPublished').textContent=people.filter(x=>x.status==='published').length;
 $('statDrafts').textContent=people.filter(x=>x.status==='draft').length;
 $('statPhotos').textContent=people.filter(x=>Boolean(x.portrait_data)).length;
 $('addProfile').disabled=people.length>=5;
 const query=$('search').value.trim().toLowerCase(),list=$('profilesList');list.replaceChildren();
 const filtered=people.filter(p=>(p.full_name+' '+p.position_title).toLowerCase().includes(query));
 $('emptyProfiles').hidden=filtered.length>0;
 for(const p of filtered){
  const row=document.createElement('div');row.className='person-row';
  const ph=document.createElement(p.portrait_data?'img':'div');ph.className='person-photo';
  if(p.portrait_data){ph.src=p.portrait_data;ph.alt='Portrait of '+p.full_name}
  else{ph.textContent=p.full_name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}
  row.appendChild(ph);
  const name=document.createElement('div');name.className='person-name';name.innerHTML='<strong>'+ESC(p.full_name)+'</strong><small>'+(p.portrait_data?'Portrait added':'Portrait pending')+'</small>';row.appendChild(name);
  const title=document.createElement('div');title.className='person-title';title.textContent=p.position_title;row.appendChild(title);
  const status=document.createElement('div');status.innerHTML='<span class="status-badge '+ESC(p.status)+'">'+ESC(p.status==='published'?'Published':'Draft')+'</span>';row.appendChild(status);
  const actions=document.createElement('div');actions.className='person-actions';
  actions.appendChild(btn('Edit','action-btn',()=>openEditor(p.id)));
  const published=p.status==='published';
  const pub=btn(published?'Unpublish':'Publish','action-btn '+(published?'unpublish':'publish'),()=>changePublication(p));pub.disabled=!published&&!p.portrait_data;pub.title=!p.portrait_data?'Upload a portrait before publishing':'';actions.appendChild(pub);
  const live=btn('Live link','action-btn',()=>openLive(p));live.disabled=!published;actions.appendChild(live);
  const qr=btn('QR code','action-btn',()=>openQr(p));qr.disabled=!published;actions.appendChild(qr);
  row.appendChild(actions);list.appendChild(row)
 }
}
function btn(title,className,cb){const node=document.createElement('button');node.type='button';node.className=className;node.textContent=title;node.addEventListener('click',cb);return node}
async function changePublication(p){
 if(p.status!=='published'&&!p.portrait_data)return toast('Upload a portrait before publishing.');
 const next=p.status==='published'?'draft':'published';
 if(!confirm((next==='published'?'Publish':'Unpublish')+' '+p.full_name+'?'))return;
 try{
   await api('profiles?id=eq.'+encodeURIComponent(p.id),{method:'PATCH',body:{status:next}});
   p.status=next;render();toast(next==='published'?'Profile published. Live link is ready.':'Profile moved to draft.');
 }catch(e){toast('Could not update status: '+e.message)}
}
function openLive(p){
 const href=urlFor(p.slug);
 navigator.clipboard?.writeText(href).then(()=>toast('Live profile link copied')).catch(()=>{window.prompt('Copy live profile URL:',href)});
 if(!navigator.clipboard)window.prompt('Copy live profile URL:',href)
}
function openQr(p){
 currentQr=urlFor(p.slug);
 $('qrTitle').textContent=p.full_name;
 $('qrImage').src='https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&format=png&data='+encodeURIComponent(currentQr);
 $('qrLink').textContent=currentQr;$('qrLink').href=currentQr;
 $('downloadQr').href=$('qrImage').src;$('qrDialog').showModal()
}
function normalizePhone(value){let s=String(value||'').trim().replace(/[^\d+]/g,'');if(!s)return null;if(s.startsWith('0'))s='+256'+s.slice(1);else if(s.startsWith('256'))s='+'+s;return s.startsWith('+')?s:'+'+s}
function experienceLines(items){return(items||[]).map(e=>[e.organization||'',e.position_title||'',e.start_year||'',e.is_current?'Present':(e.end_year||'')].join(' | ')).join('\n')}
function linkLines(items){return(items||[]).map(e=>[e.platform,e.label,e.url].join(' | ')).join('\n')}
async function openEditor(id){
 editing=people.find(p=>p.id===id)||null;newPhoto=null;
 $('editForm').reset();msg('editorMessage','');
 const form=$('editForm');$('editorHeading').textContent=editing?'Edit staff profile':'Add staff profile';
 $('photoPreview').innerHTML=editing?.portrait_data?'<img alt="Current portrait" src="'+editing.portrait_data+'">':'<span>QB</span>';
 $('photoInfo').textContent=editing?.portrait_data?'Current photo saved. Select another to replace.':'No photograph added yet';
 if(editing){
   for(const key of ['full_name','position_title','phone_e164','whatsapp_e164','email','short_intro','about_me'])form.elements[key].value=editing[key]||'';
   form.elements.skills.value=(editing.skills||[]).join(', ');
   form.elements.core_competencies.value=(editing.core_competencies||[]).join(', ');
   try{
     const [ex,links]=await Promise.all([
       api('profile_experience?profile_id=eq.'+editing.id+'&select=organization,position_title,start_year,end_year,is_current&order=display_order.asc'),
       api('profile_links?profile_id=eq.'+editing.id+'&select=platform,label,url&order=display_order.asc')
     ]);
     form.elements.experience.value=experienceLines(ex);
     form.elements.links.value=linkLines(links);
   }catch(e){msg('editorMessage','Some supporting data could not be retrieved: '+e.message)}
 }
 $('editDialog').showModal()
}
function toList(s){return s.split(',').map(v=>v.trim()).filter(Boolean)}
function parseExperience(raw){
 return raw.split(/\n/).map(s=>s.trim()).filter(Boolean).map((line,i)=>{
   const a=line.split('|').map(s=>s.trim());
   if(a.length<2)throw new Error('Experience line '+(i+1)+' should include Organization | Job title | Start year | End year.');
   const year=s=>s&&/^\d{4}$/.test(s)?Number(s):null;
   return {organization:a[0]||null,position_title:a[1]||null,start_year:year(a[2]),end_year:/^present$/i.test(a[3]||'')?null:year(a[3]),is_current:/^present$/i.test(a[3]||''),display_order:i+1}
 })
}
function parseLinks(raw){
 return raw.split(/\n/).map(s=>s.trim()).filter(Boolean).map((line,i)=>{
  const a=line.split('|').map(s=>s.trim());
  if(a.length<3||!/^https:\/\//i.test(a[2]))throw new Error('Social link line '+(i+1)+' needs Platform | Label | https://...');
  return {platform:a[0],label:a[1],url:a.slice(2).join('|'),display_order:i+1}
 })
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
 const b=$('saveProfile');b.disabled=true;b.textContent='Saving...';msg('editorMessage','Saving your changes...');
 try{
  const form=$('editForm'),values=Object.fromEntries(new FormData(form).entries());
  const full_name=values.full_name.trim(),position_title=values.position_title.trim();
  if(!full_name||!position_title)throw new Error('Full name and professional title are required.');
  const experiences=parseExperience(values.experience||''),links=parseLinks(values.links||'');
  const details={full_name,position_title,
   phone_e164:normalizePhone(values.phone_e164),whatsapp_e164:normalizePhone(values.whatsapp_e164),
   email:values.email.trim()||null,short_intro:values.short_intro.trim()||null,
   about_me:values.about_me.trim()||null,
   skills:toList(values.skills||''),core_competencies:toList(values.core_competencies||'')};
  if(newPhoto)details.portrait_data=newPhoto;
  let id=editing?.id;
  if(!editing){
   if(people.length>=5)throw new Error('This company package includes five staff profiles.');
   const slug=full_name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   if(!slug)throw new Error('Please enter a name with letters for the profile URL.');
   const created=await api('profiles',{method:'POST',body:{...details,company_id:company.id,slug,status:'draft'}});
   id=created?.[0]?.id;if(!id)throw new Error('New profile could not be confirmed.');
  }else{
   await api('profiles?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:details});
  }
  await api('profile_experience?profile_id=eq.'+encodeURIComponent(id),{method:'DELETE'});
  if(experiences.length)await api('profile_experience',{method:'POST',body:experiences.map(e=>({...e,profile_id:id}))});
  await api('profile_links?profile_id=eq.'+encodeURIComponent(id),{method:'DELETE'});
  if(links.length)await api('profile_links',{method:'POST',body:links.map(l=>({...l,profile_id:id}))});
  $('editDialog').close();await loadDashboard();toast('Profile saved successfully to Neon.');
 }catch(error){msg('editorMessage','Save failed: '+error.message)}
 finally{b.disabled=false;b.textContent='Save changes'}
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
$('addProfile').addEventListener('click',()=>openEditor(null));
$('refresh').addEventListener('click',()=>loadDashboard().catch(e=>toast('Refresh failed: '+e.message)));
$('search').addEventListener('input',render);
$('editForm').addEventListener('submit',saveEditor);
$('closeEditor').addEventListener('click',()=>$('editDialog').close());
$('cancelEditor').addEventListener('click',()=>$('editDialog').close());
$('closeQr').addEventListener('click',()=>$('qrDialog').close());
$('copyQrLink').addEventListener('click',()=>currentQr&&navigator.clipboard.writeText(currentQr).then(()=>toast('Link copied')));
$('photoFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 $('photoInfo').textContent='Optimizing image...';
 try{newPhoto=await createPhotoData(file);$('photoPreview').innerHTML='<img alt="New cropped portrait" src="'+newPhoto+'">';$('photoInfo').textContent='Portrait ready to save · '+Math.round(newPhoto.length*0.75/1024)+' KB';}
 catch(error){newPhoto=null;msg('editorMessage',error.message);$('photoInfo').textContent='Image not accepted.'}
});
begin();
