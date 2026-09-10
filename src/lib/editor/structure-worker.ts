import { getSchema } from "@tiptap/core";
import { editorExtensions } from "./extensions";
import { detectContents } from "./detect-contents";
import { detectReferences } from "./references";
const schema = getSchema(editorExtensions());
self.onmessage = event => {
  try {
    const doc = schema.nodeFromJSON(event.data);
    self.postMessage({contents:detectContents(doc),references:detectReferences(doc)});
  } catch { self.postMessage({error:true}); }
};
