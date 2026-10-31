import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredLayoutFonts, type ExportFontFace } from '../src/svg-export';
import { FIXTURES } from '../src/fixtures';
import type { TextElement } from '../src/model';
const faces: ExportFontFace[] = [
 {family:'Inter',weight:400,unicodeRange:'U+0-FF',url:'latin'},
 {family:'Inter',weight:400,unicodeRange:'U+41, U+370-3FF',url:'overlap-greek'},
 {family:'Inter',weight:400,unicodeRange:'U+400-4FF',url:'cyrillic'},
 {family:'Inter',weight:700,unicodeRange:'U+0-FF',url:'unused-weight'},
];
function design(text: string) {
 const source=structuredClone(FIXTURES[0]);
 const e=source.elements.find(e=>e.type==='text') as TextElement;
 source.elements=[{...e,text,fontFamily:'Inter',fontWeight:400}]; source.groups=[];
 return source;
}
test('layout selects only used family/weight subsets, preserving overlaps and declaration order',()=>{
 assert.deepEqual(requiredLayoutFonts(design('Ω'),faces),faces.slice(0,2));
 const source=design('AΩ'); const before=JSON.stringify({source,faces});
 assert.deepEqual(requiredLayoutFonts(source,faces),faces.slice(0,2));
 source.elements.push({...source.elements[0],id:'duplicate'});
 assert.deepEqual(requiredLayoutFonts(source,faces),faces.slice(0,2));
 source.elements.pop(); assert.equal(JSON.stringify({source,faces}),before);
});
test('empty, control-only and unsupported text keep matching subsets for fallback metrics',()=>{
 for(const text of ['', '\n\r\t', 'A🐓']) assert.deepEqual(requiredLayoutFonts(design(text),faces),faces.slice(0,3));
});
test('no text needs no fonts; missing used weight still fails even for empty text',()=>{
 const source=design(''); source.elements=[]; assert.deepEqual(requiredLayoutFonts(source,faces),[]);
 assert.throws(()=>requiredLayoutFonts(design(''),[]),/Bundled font unavailable/);
});
