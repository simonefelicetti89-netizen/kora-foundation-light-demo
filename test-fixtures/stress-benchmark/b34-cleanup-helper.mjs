// cleanup helper — run from project root
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
for (const line of fs.readFileSync(path.join(ROOT,'.env.local'),'utf-8').split('\n')) {
  const t=line.trim(); if (!t||t.startsWith('#')) continue;
  const eq=t.indexOf('='); if (eq<0) continue;
  const k=t.slice(0,eq).trim(); const v=t.slice(eq+1).trim().replace(/^['"]|['"]$/g,'');
  if (!process.env[k]) process.env[k]=v;
}
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const BUCKET='kora-evidence-attachments';
const { data: tenant } = await db.schema('analytics').from('tenant').select('id').eq('tenant_code','OP-001').maybeSingle();
const tenantId = tenant?.id;
if (!tenantId) { console.log('No OP-001'); process.exit(0); }

// Restore payload_sample — remove b34 test attachments
const { data: batch } = await db.schema('analytics').from('source_batch')
  .select('id,payload_sample').eq('tenant_id',tenantId).order('created_at',{ascending:false}).limit(1).maybeSingle();
if (batch) {
  const ps = batch.payload_sample??{};
  const cleaned = (ps['_b31_attachments']??[]).filter(a=>!String(a?.attachmentId??'').startsWith('att_b34_db_'));
  const { error } = await db.schema('analytics').from('source_batch')
    .update({payload_sample:{...ps,_b31_attachments:cleaned}}).eq('id',batch.id);
  console.log(error?`payload err: ${error.message}`:`payload_sample restored (${cleaned.length} attachments kept)`);
}

// Remove test storage files — list and remove all att_b34_db_ objects under tenant path
const safeTenant = tenantId.replace(/[^a-zA-Z0-9\-_]/g,'_').slice(0,50);
if (batch) {
  const safeBatch = batch.id.replace(/[^a-zA-Z0-9\-_]/g,'_').slice(0,50);
  const attPrefix = `tenant/${safeTenant}/batch/${safeBatch}/attachments`;
  const { data: attFolders } = await db.storage.from(BUCKET).list(attPrefix);
  for (const af of (attFolders??[])) {
    if (!af.name.startsWith('att_b34_db_')) continue;
    const filePrefix = `${attPrefix}/${af.name}`;
    const { data: files } = await db.storage.from(BUCKET).list(filePrefix);
    const paths = (files??[]).map(f=>`${filePrefix}/${f.name}`);
    if (paths.length) {
      const { error } = await db.storage.from(BUCKET).remove(paths);
      console.log(error?`storage err: ${error.message}`:`removed: ${paths[0].slice(0,60)}…`);
    }
  }
}

// Remove test audit events
const { error: auditErr } = await db.schema('audit').from('audit_log').delete().eq('actor_id','b34-runtime-test');
console.log(auditErr?`audit err: ${auditErr.message}`:'audit entries removed');
console.log('Cleanup complete.');
