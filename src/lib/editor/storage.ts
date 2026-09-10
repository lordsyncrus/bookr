import { mergeLibrary } from "./library-lifecycle";
import type { ManuscriptProject } from "./types";
// Documents stay on this device, partitioned by the authenticated Hexclave user.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("bookr-manuscripts", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("STORAGE_UNAVAILABLE"));
  });
}
export async function loadProjects(
  userId: string,
): Promise<ManuscriptProject[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readonly");
    const request = tx.objectStore("projects").get(userId);
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(new Error("STORAGE_UNAVAILABLE"));
    tx.oncomplete = () => db.close();
  });
}
export async function saveProjects(
  userId: string,
  projects: ManuscriptProject[],
): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    const store = tx.objectStore("projects");
    const current = store.get(userId);
    const deleted = store.get([userId,"deleted"]);
    deleted.onsuccess = () => {
      store.put(mergeLibrary(current.result || [],projects,deleted.result || []), userId);
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(new Error("STORAGE_UNAVAILABLE"));
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("STORAGE_UNAVAILABLE"));
    };
  });
}

/** Lifecycle changes are atomic and never carried by ordinary editor autosaves. */
export async function changeProjectLifecycle(userId:string,id:string,action:"trash"|"restore"|"delete"):Promise<ManuscriptProject[]> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("projects","readwrite");const store=tx.objectStore("projects");
    const current=store.get(userId);const removed=store.get([userId,"deleted"]);let result:ManuscriptProject[]=[];
    removed.onsuccess=()=>{
      const items:ManuscriptProject[]=current.result||[];
      const target=items.find(p=>p.id===id);
      if(!target){result=items;return;}
      if(action==="delete"&&!target.trashedAt){tx.abort();return;}
      const now=Date.now();
      result=action==="delete"?items.filter(p=>p.id!==id):items.map(p=>p.id===id?{...p,trashedAt:action==="trash"?now:undefined,updatedAt:Math.max(now,p.updatedAt+1)}:p);
      if(action==="delete")store.put([...new Set([...(removed.result||[]),id])],[userId,"deleted"]);
      store.put(result,userId);
    };
    tx.oncomplete=()=>{db.close();resolve(result);};
    tx.onerror=tx.onabort=()=>{db.close();reject(new Error("STORAGE_UNAVAILABLE"));};
  });
}
