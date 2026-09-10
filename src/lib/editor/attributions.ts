export type DiscursiveAttribution={author:string;work?:string;locator?:string;text:string};
// Deliberately bounded patterns: these are attribution candidates, not verified sources.
const name=String.raw`\p{Lu}[\p{L}\p{M}'’.-]*(?:\s+(?:(?:il|la|lo|de|di|da|del|della|the|von|van)\s+)?\p{Lu}[\p{L}\p{M}'’.-]*){0,5}`;
const reporting=String.raw`(?:celebra(?:va|no)?|celebrò|scrive(?:va)?|scrisse|afferma(?:va)?|affermò|sostiene|sosteneva|descrive(?:va)?|descrisse|riporta(?:va)?|riportò|ricorda(?:va)?|ricordò|osserva(?:va)?|osservò|racconta(?:va)?|raccontò|documenta(?:va)?|documentò|menziona(?:va)?|menzionò|argomenta|writes|wrote|describes|described|argues|argued|states|stated|notes|noted|observes|observed|reports|reported|celebrates|celebrated)`;
export function detectAttributions(text:string):DiscursiveAttribution[]{
 const result:DiscursiveAttribution[]=[];
 const push=(author:string,work:string|undefined)=>{
   author=author.replace(/^(?:(?:Già|Anche|Come|Secondo|Already|Even)\s+)+/u,"").trim();
   if(!author||/^(?:Il|La|Lo|Un|Una|The|This|Questo|Questa|Nel|Nella)$/u.test(author))return;
   work=work?.replace(/^[«“"']|[»”"']$/g,"").trim();
   const locator=text.match(/\b(?:libro|book|capitolo|chapter|cap\.|pp?\.|sezione|section)\s+(?:\d+(?:[.,:–-]\d+)*|[IVXLCDM]+)\b/iu)?.[0];
   const existing=result.find(item=>item.author===author);
   if(existing){if(work&&!existing.work)existing.work=work;return;}
   result.push({author,...(work?{work}:{}),...(locator?{locator}:{}),text});
 };
 const workBeforeVerb=new RegExp(String.raw`(${name})\s*,?\s+(?:nel|nella|nell[’']|in)\s*(?:(?:suo|sua|sui|suoi|sue|his|her|the)\s+)?([«“"]?\p{Lu}[^,;!?\n]{1,150}?)\s*,?\s+${reporting}\b`,"gu");
 for(const match of text.matchAll(workBeforeVerb))push(match[1],match[2]);
 const verbBeforeWork=new RegExp(String.raw`(${name})\s+${reporting}\s+(?:nel|nella|nell[’']|in)\s*(?:(?:suo|sua|his|her|the)\s+)?([«“"]?\p{Lu}[^,;!?.\n]{1,150}?)(?=\s+(?:che|come|that|how)\b|[,;.!?]|$)`,"gu");
 for(const match of text.matchAll(verbBeforeWork))push(match[1],match[2]);
 const according=new RegExp(String.raw`(?:Secondo|secondo|Come\s+(?:scrive|ricorda|osserva)|come\s+(?:scrive|ricorda|osserva)|According to|according to)\s+(${name})(?=\s*[,;:]|\s+(?:${reporting}|il|la|lo|le|i|gli|the|this)\b|$)`,"gu");
 for(const match of text.matchAll(according))push(match[1],undefined);
 return result;
}
