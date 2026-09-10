import { authorize, boundedJson, failure, json } from "@/lib/editorial/http";
import { callEditorialAI, PipelineError } from "@/lib/editorial/openrouter";
import { writingInput, writingOutput, writingPrompt, writingSchema } from "@/lib/editorial/writing";
export const runtime = "nodejs";
const active = new Set<string>();
export async function POST(request: Request) {
  let owner: string | undefined, acquired = false;
  try {
    owner = await authorize(request, true);
    if (active.has(owner)) throw new Error("BUSY");
    active.add(owner); acquired = true;
    const input = writingInput(await boundedJson(request, 500000));
    const result = await callEditorialAI({name:"selected_text",system:writingPrompt,data:input,schema:writingSchema,maxTokens:10000});
    return json({text:writingOutput(result.value),cost:result.usage.cost});
  } catch (error) {
    if (error instanceof PipelineError) return json({error:error.code},502);
    if (error instanceof Error && error.message === "INVALID_RESPONSE") return json({error:"INVALID_RESPONSE"},502);
    return failure(error);
  } finally { if (owner && acquired) active.delete(owner); }
}
