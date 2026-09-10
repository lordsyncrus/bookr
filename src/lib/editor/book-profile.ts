import type { ManuscriptProject } from "./types";
export const PROFILE_FIELDS = ["description","purpose","audience","workType","genre","tone","register","pointOfView","tense","rhythm","vocabulary","consistency"] as const;
export type ProfileField = typeof PROFILE_FIELDS[number];
export type BookProfile = Record<ProfileField,string>;
export function bookProfile(project: ManuscriptProject): BookProfile {
  const profile=Object.fromEntries(PROFILE_FIELDS.map(key=>[key,""])) as BookProfile;
  profile.description=project.analysis?.memory?.summary || "";
  profile.tone=project.analysis?.memory?.style || "";
  return {...profile,...project.analysis?.inferredProfile,...project.metadata?.editorialProfile};
}
export function validateProfile(input:unknown): Partial<BookProfile> {
  if(input===undefined)return {};
  if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("INVALID_REQUEST");
  const result:Partial<BookProfile>={};
  for(const key of PROFILE_FIELDS){const value=(input as Record<string,unknown>)[key];if(value!==undefined){if(typeof value!=="string"||value.length>6000)throw new Error("INVALID_REQUEST");result[key]=value;}}
  return result;
}
export const profileSchema={type:"object",properties:Object.fromEntries(PROFILE_FIELDS.map(key=>[key,{type:"string"}])),required:[...PROFILE_FIELDS],additionalProperties:false};
