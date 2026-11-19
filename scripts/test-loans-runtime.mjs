import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// Usa cópia do build em contêiner temporário; não altera o diretório dist local.
for (const flag of ['true','false']) {
  const name=`loans-frontend-runtime-${randomUUID().replaceAll('-','').slice(0,12)}`;
  const run=args => spawnSync('docker',args,{encoding:'utf8',timeout:60000});
  const must=args => { const result=run(args); assert.equal(result.status,0,result.stderr); return result.stdout; };
  let created=false;
  try {
    must(['run','-d','--name',name,'--entrypoint','sleep','nginx:alpine','120']); created=true;
    must(['cp','dist/.',`${name}:/usr/share/nginx/html/`]);
    must(['cp','docker-entrypoint.sh',`${name}:/tmp/loans-entrypoint.sh`]);
    must(['exec','-e',`VITE_LOANS_UI_ENABLED=${flag}`,'-e','VITE_LOANS_API_URL=https://synthetic.example.invalid',name,'sh','/tmp/loans-entrypoint.sh','true']);
    const script=`set -eu; file=$(grep -l 'https://synthetic.example.invalid' /usr/share/nginx/html/assets/*.js); test -n "$file"; grep -Fq '"${flag}".toLowerCase()==="true"' "$file"; ! grep -Fq 'VITE_LOANS_API_URL_PLACEHOLDER' "$file"; ! grep -Fq 'VITE_LOANS_UI_ENABLED_PLACEHOLDER' "$file"`;
    must(['exec',name,'sh','-c',script]);
    console.log(`Runtime de empréstimos validado com flag ${flag}.`);
  } finally { if (created) must(['rm','-f',name]); }
}
