const str = { type: "string" };
const strings = { type: "array", items: str };
function object(properties: Record<string, unknown>) { return { type: "object", additionalProperties: false, required: Object.keys(properties), properties }; }
export const noteSchema = object({ summary: str, style: str, characters: strings, timeline: strings, threads: strings, facts: { type: "array", items: object({ subject: str, claim: str, quote: str, chunkId: str }) } });
export const issuesSchema = object({ issues: { type: "array", items: object({ category: {type:"string",enum:["structure","continuity","chronology","character","transition"]}, title:str, reason:str, suggestion:str, chapterIds:strings, severity:{type:"string",enum:["warning","suggestion"]}, evidence:{ type:"array",items:object({chunkId:str,quote:str})} }) } });
export const editsSchema = object({ findings: { type:"array",items:object({original:str,suggested:str,reason:str,category:{type:"string",enum:["language","style"]}}) } });
export const qualitySchema = object({ acceptedIds: strings });
