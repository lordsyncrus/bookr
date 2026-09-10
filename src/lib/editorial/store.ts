import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { EditorialJob, JobControl } from "./types";
const root = () => process.env.BOOKR_JOB_DIR || path.join(process.cwd(), ".bookr-data");
const validId = (id:string) => /^[a-f0-9-]{36}$/.test(id);
export function ownerHash(userId:string) { return createHash("sha256").update(userId).digest("hex"); }
export function sourceHash(value:unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
async function directory() { await fs.mkdir(root(),{recursive:true,mode:0o700}); return root(); }
async function encryptionKey(): Promise<Buffer> {
  const dir=await directory(); const name=path.join(dir,".key");
  try { await fs.writeFile(name,randomBytes(32),{flag:"wx",mode:0o600}); } catch (e) { if ((e as NodeJS.ErrnoException).code!=="EEXIST") throw e; }
  const key=await fs.readFile(name); if(key.length!==32)throw new Error("STORAGE_KEY");return key;
}
async function file(id:string,extension:string) { if(!validId(id))throw new Error("INVALID_JOB_ID");return path.join(/* turbopackIgnore: true */ await directory(),`${id}.${extension}`); }
async function atomicWrite(name:string,data:Buffer|string) { const temp=`${name}.${randomBytes(8).toString("hex")}.tmp`;await fs.writeFile(temp,data,{mode:0o600});await fs.rename(temp,name); }
export async function saveJob(job:EditorialJob) {
  const key=await encryptionKey();const iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",key,iv);const data=Buffer.concat([cipher.update(JSON.stringify(job),"utf8"),cipher.final()]);
  await atomicWrite(await file(job.jobId,"sealed"),Buffer.concat([iv,cipher.getAuthTag(),data]));
}
export async function readJob(id:string):Promise<EditorialJob|null> {
  if(!validId(id))return null;
  try { const key=await encryptionKey();const data=await fs.readFile(await file(id,"sealed"));const decipher=createDecipheriv("aes-256-gcm",key,data.subarray(0,12));decipher.setAuthTag(data.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString("utf8")); }
  catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return null;throw new Error("STORAGE_UNAVAILABLE");}
}
export async function jobIds():Promise<string[]> { return (await fs.readdir(/* turbopackIgnore: true */ await directory())).filter(n=>n.endsWith(".sealed")).map(n=>n.slice(0,-7)); }
export async function setControl(id:string,control:JobControl) { await atomicWrite(await file(id,"control"),JSON.stringify(control)); }
export async function getControl(id:string):Promise<JobControl> { return JSON.parse(await fs.readFile(await file(id,"control"),"utf8")); }
export async function deleteJob(id:string) { await fs.rm(await file(id,"sealed"),{force:true});await fs.rm(await file(id,"control"),{force:true}); }
export async function workerLease():Promise<null|(()=>Promise<void>)> {
  const name=path.join(await directory(),"worker.lock");
  try { const handle=await fs.open(name,"wx",0o600);await handle.writeFile(String(process.pid));await handle.close(); }
  catch(e) {
    if((e as NodeJS.ErrnoException).code!=="EEXIST")return null;
    try { const pid=Number(await fs.readFile(name,"utf8"));if(pid>0)process.kill(pid,0);else if(Date.now()-(await fs.stat(name)).mtimeMs>10000)await fs.rm(name,{force:true});return null; }
    catch(e){if((e as NodeJS.ErrnoException).code==="ESRCH"){await fs.rm(name,{force:true});}return null;}
  }
  return async()=>{await fs.rm(name,{force:true});};
}
