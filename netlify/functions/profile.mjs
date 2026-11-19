import { neon } from '@neondatabase/serverless';

const ORIGINS = new Set([
  'https://mdanson27.github.io',
  'https://qbranch.co.ug',
  'https://www.qbranch.co.ug'
]);
function respond(statusCode, payload, origin) {
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':statusCode===200?'public, max-age=60':'no-store','X-Content-Type-Options':'nosniff'};
  if (ORIGINS.has(origin)) { headers['Access-Control-Allow-Origin']=origin; headers.Vary='Origin'; }
  return {statusCode,headers,body:JSON.stringify(payload)};
}
export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (event.httpMethod !== 'GET') return respond(405,{error:'Method not allowed'},origin);
  const slug = event.queryStringParameters?.slug;
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return respond(400,{error:'Valid profile slug required'},origin);
  if (!process.env.DATABASE_URL) return respond(503,{error:'Profile service not configured'},origin);
  try {
    const sql = neon(process.env.DATABASE_URL);
    const people = await sql.query(
      "SELECT p.id,p.slug,p.full_name,p.position_title,p.short_intro,p.about_me,p.phone_e164,p.whatsapp_e164,p.email,p.portrait_url,p.skills,p.core_competencies,c.display_name AS company_name,c.website_url,c.office_address,c.logo_path,c.tagline FROM public.profiles p JOIN public.companies c ON c.id=p.company_id WHERE p.slug=$1 AND p.status='published' AND p.portrait_url IS NOT NULL LIMIT 1",
      [slug]
    );
    if (!people.length) return respond(404,{error:'Profile not found or not yet published'},origin);
    const p = people[0];
    const [experience,links] = await Promise.all([
      sql.query("SELECT position_title,organization,start_year,end_year,is_current FROM public.profile_experience WHERE profile_id=$1 ORDER BY display_order,id",[p.id]),
      sql.query("SELECT platform,label,url FROM public.profile_links WHERE profile_id=$1 ORDER BY display_order,id",[p.id])
    ]);
    return respond(200,{profile:{
      slug:p.slug,full_name:p.full_name,position_title:p.position_title,
      short_intro:p.short_intro,about_me:p.about_me,phone_e164:p.phone_e164,
      whatsapp_e164:p.whatsapp_e164,email:p.email,portrait_url:p.portrait_url,
      skills:p.skills,core_competencies:p.core_competencies,experience,links,
      company:{display_name:p.company_name,website_url:p.website_url,office_address:p.office_address,logo_path:p.logo_path,tagline:p.tagline}
    }},origin);
  } catch (err) {
    console.error('Profile API read failed',err?.code || 'query_error');
    return respond(500,{error:'Profile service temporarily unavailable'},origin);
  }
}
