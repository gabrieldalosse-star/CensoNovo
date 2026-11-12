export const REFERENCE_DATE = '2026-12-31';
export const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const str = v => String(v ?? '').trim();
const num = v => v === null || v === undefined || str(v) === '' ? null : Number(str(v).replace(',', '.'));
export const validCoord = p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && !(p.lat === 0 && p.lng === 0);
export function dateISO(v) {
  if (!v) return '';
  if (v instanceof Date) return isNaN(v) ? '' : v.toISOString().slice(0,10);
  if (typeof v === 'number') return new Date(Date.UTC(1899,11,30) + v*864e5).toISOString().slice(0,10);
  let s = str(v), m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {const b = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (b) m = [b[0],b[3],b[2].padStart(2,'0'),b[1].padStart(2,'0')];}
  if (!m) return '';
  const d=new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
  return !isNaN(d) && d.toISOString().slice(0,10) === `${m[1]}-${m[2]}-${m[3]}` ? d.toISOString().slice(0,10) : '';
}
export function ageAt(dob, fallback, reference=REFERENCE_DATE) {
  const d=dateISO(dob); if(d && d<=reference){const n=+reference.slice(0,4)-+d.slice(0,4)-(reference.slice(5)<d.slice(5)?1:0);return n>=0&&n<=120?n:null;}
  const n=num(fallback); return Number.isInteger(n)&&n>=0&&n<=120?n:null;
}
export const ageBand = age => age===null?'Não informado':age<=11?'0 a 11 anos':age<=17?'12 a 17 anos':age<=29?'18 a 29 anos':age<=59?'30 a 59 anos':'60 anos ou mais';
const canonicalGender=v => ['f','feminino','feminina'].includes(norm(v))?'Feminino':['m','masculino','masculina'].includes(norm(v))?'Masculino':str(v)||'Não informado';
function get(row, ...aliases) {const keys=Object.keys(row); for(const a of aliases){const key=keys.find(k=>norm(k)===norm(a));if(key!==undefined && str(row[key])!=='') return row[key];} return '';}
function tab(tables,aliases){const key=Object.keys(tables).find(k=>aliases.includes(norm(k))); return key?tables[key]:[];}
export function tablesToModel(tables, source='Importação local') {
  const studentRows=tab(tables,['alunos','cadastro de alunos','participantes']);
  if(!studentRows.length) throw new Error('Não encontrei a aba Alunos, Cadastro de Alunos ou Participantes.');
  const participants=[], ignored=[], issues=[], seenIds=new Set();
  for(let i=0;i<studentRows.length;i++) {
    const r=studentRows[i], name=str(get(r,'Nome_Aluno','Nome completo','Nome','Aluno'));
    if(!name){ignored.push({sheet:'Alunos',row:i+2,reason:'Nome vazio'});continue;}
    const id=str(get(r,'ID_Aluno','ID Aluno','Código Aluno','ID'))||`SEM-ID-${i+2}`;
    if(seenIds.has(norm(id))){issues.push({type:'ID de aluno repetido',id,row:i+2});continue;}
    seenIds.add(norm(id));
    const dob=dateISO(get(r,'Data Nascimento','Data de Nascimento','Nascimento'));
    const p={id,name,dob,gender:canonicalGender(get(r,'Sexo','Gênero')),age:ageAt(dob,get(r,'Idade')),ageSource:dob?'Nascimento, referência 31/12/2026':'Idade informada na planilha',
      street:str(get(r,'Rua','Endereço','Logradouro')),number:str(get(r,'Numero','Número')),bairro:str(get(r,'Bairro'))||'Não informado',city:str(get(r,'Cidade'))||'Não informado',cep:str(get(r,'CEP')),
      lat:num(get(r,'Latitude','Lat')),lng:num(get(r,'Longitude','Lng','Lon')),phone:str(get(r,'Telefone','Celular')),pcd:str(get(r,'PCD'))||'Não informado',guardian:str(get(r,'Nome Responsavel','Responsável')),guardianPhone:str(get(r,'Telefone Responsavel')),registered:dateISO(get(r,'Data Cadastro')),source,sourceRow:i+2};
    if(!validCoord(p)){p.lat=null;p.lng=null;}
    participants.push(p);
  }
  if(!participants.length) throw new Error('A aba selecionada não contém participantes com nome. Confira os cabeçalhos.');
  const names=new Map(); participants.forEach(p=>{const key=norm(p.name);names.set(key,[...(names.get(key)||[]),p]);});
  const enrollments=[], seenEnroll=new Set(); let repeatedEnrollments=0;
  const erows=tab(tables,['matriculas']);
  for(let i=0;i<erows.length;i++) {
    const r=erows[i],name=str(get(r,'Aluno','Nome_Aluno','Nome')); if(!name){ignored.push({sheet:'Matriculas',row:i+2,reason:'Aluno vazio'});continue;}
    const classId=str(get(r,'Turma','Codigo Turma')), students=names.get(norm(name))||[];
    const pid=str(get(r,'ID_Aluno','ID Aluno')); const byId=participants.find(p=>p.id===pid);
    const p=byId|| (students.length===1?students[0]:null);
    const e={id:str(get(r,'ID_Matriculas','ID_Matricula','ID'))||`M-SEM-ID-${i+2}`,personId:p?.id||null,name,classId,local:str(get(r,'Local')),activity:str(get(r,'Atividade','Modalidade'))||'Não informada',day:str(get(r,'Dia Semana','Dia_Semana')),start:str(get(r,'Hora_Inicio_Aula','Inicio_Atividade')),end:str(get(r,'Hora _Termino_Aula','Fim_Atividade')),status:str(get(r,'Status matricula','Status'))||'Não informado',sourceRow:i+2};
    const key=[norm(name),norm(classId),norm(e.day),e.start,e.end].join('|');
    if(seenEnroll.has(key)){repeatedEnrollments++;continue;}
    seenEnroll.add(key);enrollments.push(e);
    if(!p)issues.push({type:students.length>1?'Matrícula com nome ambíguo':'Matrícula sem aluno na aba Alunos',name,row:i+2});
    if(!classId)issues.push({type:'Matrícula sem turma',name,row:i+2});
  }
  return {schemaVersion:1,referenceDate:REFERENCE_DATE,source,participants,enrollments,classes:tab(tables,['turmas']),locals:tab(tables,['locais']),activities:tab(tables,['atividades']),audit:{ignored:ignored.length,ignoredStudents:ignored.filter(x=>x.sheet==='Alunos').length,ignoredEnrollments:ignored.filter(x=>x.sheet==='Matriculas').length,repeatedEnrollments,rawEnrollments:erows.filter(r=>str(get(r,'Aluno','Nome_Aluno','Nome'))).length,issues},updatedAt:new Date().toISOString()};
}
export function mergeModels(base,incoming) {
  const participants=[...base.participants], additions=[], duplicates=[], conflicts=[], remap=new Map();
  for(const p of incoming.participants) {
    const byId=participants.find(x=>norm(x.id)===norm(p.id));
    const sameIdentity=x=>norm(x.name)===norm(p.name)&&!(x.dob&&p.dob&&x.dob!==p.dob);
    const byIdentity=participants.filter(x=>norm(x.name)===norm(p.name)&&x.dob&&p.dob&&x.dob===p.dob);
    if(byId&&sameIdentity(byId)){duplicates.push(p);remap.set(p.id,byId.id);continue;}
    if(byIdentity.length===1){duplicates.push(p);remap.set(p.id,byIdentity[0].id);continue;}
    if(byId||participants.some(x=>norm(x.name)===norm(p.name))){conflicts.push({id:p.id,name:p.name,reason:byId?'ID já pertence a outro cadastro':'Homônimo ou nascimento insuficiente'});continue;}
    participants.push(p);additions.push(p);remap.set(p.id,p.id);
  }
  const enrollments=[...base.enrollments], seen=new Set(enrollments.map(e=>[norm(e.name),norm(e.classId),norm(e.day),e.start,e.end].join('|')));
  let newEnrollments=0;
  for(const e of incoming.enrollments){if(e.personId&&!remap.has(e.personId))continue;const key=[norm(e.name),norm(e.classId),norm(e.day),e.start,e.end].join('|');if(seen.has(key))continue;seen.add(key);enrollments.push({...e,personId:e.personId?remap.get(e.personId):null});newEnrollments++;}
  return {model:{...base,participants,enrollments,updatedAt:new Date().toISOString(),audit:{...base.audit,issues:[...(base.audit?.issues||[]),...(incoming.audit?.issues||[])]}},additions,duplicates,conflicts,newEnrollments};
}
export function enrich(model) {
  const byPerson=new Map();for(const e of model.enrollments){if(!e.personId)continue;byPerson.set(e.personId,[...(byPerson.get(e.personId)||[]),e]);}
  return model.participants.map(p=>({...p,ageBand:ageBand(p.age),enrollments:byPerson.get(p.id)||[]}));
}
export function filterPeople(people,f={}) {
 const hasEnrollmentFilter=Boolean(f.activity||f.local||f.classId||f.status);
 return people.filter(p=>(!f.q||norm([p.id,p.name,p.bairro,p.city].join(' ')).includes(norm(f.q)))&&(!f.gender||p.gender===f.gender)&&(!f.ageBand||p.ageBand===f.ageBand)&&(!f.bairro||p.bairro===f.bairro)&&(!f.city||p.city===f.city)&&(!f.pcd||p.pcd===f.pcd)&&(!f.geo||(f.geo==='sim'?validCoord(p):!validCoord(p))))
 .map(p=>hasEnrollmentFilter?{...p,enrollments:p.enrollments.filter(e=>(!f.activity||e.activity===f.activity)&&(!f.local||e.local===f.local)&&(!f.classId||e.classId===f.classId)&&(!f.status||e.status===f.status))}:p)
 .filter(p=>!hasEnrollmentFilter||p.enrollments.length);
}
export function distribution(people,field) {
 const m=new Map();for(const p of people){const vals=field==='activity'?[...new Set(p.enrollments.map(e=>e.activity))]:[p[field]||'Não informado'];for(const v of vals)m.set(v,(m.get(v)||0)+1);}return [...m].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'pt-BR'));
}
export function summarize(model) {
 const people=enrich(model);return {schemaVersion:1,source:model.source,referenceDate:model.referenceDate,updatedAt:model.updatedAt,totals:{participants:people.length,enrollments:model.enrollments.length,mapped:people.filter(validCoord).length,bairros:new Set(people.map(p=>p.bairro).filter(v=>v!=='Não informado')).size,classes:model.classes?.length||new Set(model.enrollments.map(e=>e.classId).filter(Boolean)).size,locals:model.locals?.length||0,unmatched:model.enrollments.filter(e=>!e.personId).length},charts:Object.fromEntries(['gender','ageBand','bairro','city','pcd','activity'].map(field=>[field,distribution(people,field)])),audit:{ignored:model.audit?.ignored||0,ignoredStudents:model.audit?.ignoredStudents||0,ignoredEnrollments:model.audit?.ignoredEnrollments||0,repeatedEnrollments:model.audit?.repeatedEnrollments||0,rawEnrollments:model.audit?.rawEnrollments||0,issueCount:model.audit?.issues?.length||0}};
}
export function csvCell(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
