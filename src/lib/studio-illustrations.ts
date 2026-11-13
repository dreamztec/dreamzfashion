/** Original code-authored Studio geometry. Never use catalogue/customer photos here. */
const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));

export function studioIllustration(label: string, colour = '#a29381'): string {
  const name = label.toLowerCase();
  const colourSafe = /^#[0-9a-f]{3,8}$/i.test(colour) ? colour : '#a29381';
  let shape = '';
  const path = (d: string, fill = 'url(#leather)') => `<path d="${d}" fill="${fill}" stroke="#382f28" stroke-opacity=".35" stroke-width="1.1" stroke-linejoin="round"/>`;
  const line = (d: string) => `<path d="${d}" fill="none" stroke="#f6efe3" stroke-opacity=".65" stroke-width="1.5" stroke-linecap="round"/>`;
  if (/grain|suede|nubuck|smooth|pebbl|waxy|patent|emboss|leather sample/.test(name)) {
    shape = path('M64 71 210 48 266 168 113 201Z', '#5a4a3d') + path('M64 64 210 41 266 161 113 194Z') + `<path d="M64 64 210 41 266 161 113 194Z" fill="url(#${/pebbl|emboss/.test(name) ? 'pebbles' : 'grain'})" opacity=".35"/>` + line('M75 70 204 50 253 156');
  } else if (/sole|commando|chunky/.test(name)) {
    const depth = /chunky|commando/.test(name) ? 18 : /rubber/.test(name) ? 10 : 5;
    const d = 'M58 155C37 127 71 72 115 61c24-5 42 8 64 29 20 20 61 14 77 33 20 26-10 48-41 47-42-2-65 34-104 21-23-7-43-21-53-36Z';
    shape = `<g transform="translate(0 ${depth})">${path(d, '#39342f')}</g>` + path(d, /leather/.test(name) ? 'url(#leather)' : 'url(#dark)') + line('M66 151C48 126 79 82 115 71c25-5 43 18 63 30 23 15 63 10 71 29');
    if (/commando/.test(name)) shape += Array.from({length:7},(_,i)=>path(`M${82+i*23} 174v15l10-2v-15Z`,'#242421')).join('');
  } else if (/^(round|almond|square|pointed)$/.test(name)) {
    const top = name === 'pointed' ? 'M64 180Q105 77 162 41Q228 82 263 152' : name === 'square' ? 'M64 180 82 73 220 49 263 152' : name === 'almond' ? 'M64 180Q84 70 157 49Q233 42 263 152' : 'M64 180Q54 65 155 48Q250 34 263 152';
    shape = path(top + 'Q165 211 64 180Z','#44392f') + path(top + 'Q169 190 64 180Z') + line('M85 161Q109 93 160 69');
  } else if (/heel|stiletto|wedge/.test(name)) {
    shape = path('M99 58 172 44 205 64 125 80Z', 'url(#dark)');
    const d = /stiletto|kitten/.test(name) ? 'M125 80 193 66 168 185 157 189 157 100Z' : /wedge/.test(name) ? 'M125 80 193 66 219 181 81 202Z' : /round|sculpt/.test(name) ? 'M125 80 193 66Q160 124 192 185L130 197Q156 139 125 80Z' : 'M125 80 193 66 185 187 129 198Z';
    shape += path(d) + line('M136 88 140 176');
  } else if (/buckle|turn-lock|hardware/.test(name)) {
    shape = `<g transform="translate(162 120) rotate(-18)"><rect x="-79" y="-43" width="158" height="86" rx="17" fill="none" stroke="#5d4b2f" stroke-width="17"/><rect x="-79" y="-48" width="158" height="86" rx="17" fill="none" stroke="url(#metal)" stroke-width="14"/>${/hook/.test(name) ? '<path d="M-40-30 35 8 63-11" stroke="url(#metal)" stroke-width="10" fill="none"/>' : '<path d="M0-45V27" stroke="url(#metal)" stroke-width="9" stroke-linecap="round"/>'}</g>`;
  } else if (/lace-up/.test(name)) {
    shape = path('M88 63 141 52 160 185 107 195Z') + path('M170 48 220 40 239 172 189 183Z');
    shape += [0,1,2,3,4].map(i=>line(`M${130+i*4} ${72+i*24}L${180+i*4} ${92+i*24}M${180+i*4} ${66+i*24}L${133+i*4} ${99+i*24}`)).join('');
  } else if (/zip/.test(name)) {
    shape = path('M116 42 176 32 213 196 151 207Z');
    shape += Array.from({length:19},(_,i)=>path(`M${140+i*1.8} ${48+i*8}h14v4h-14Z`,'url(#metal)')).join('') + path('M150 54 170 51 177 81 158 85Z','url(#metal)');
  } else if (/stitch|tonal|contrast|edge|burnish/.test(name)) {
    shape = path('M54 87 228 52 273 163 98 199Z') + `<path d="M70 94 220 65 256 157 107 185Z" fill="none" stroke="${/contrast/.test(name)?'#f8f3e6':'#665446'}" stroke-width="2.5" stroke-dasharray="5 5"/>`;
  } else if (/oxford|derby|loafer|mule|footwear|boot|chelsea|slide|sandal|pump|slingback|open toe/.test(name)) {
    const boot = /boot|chelsea/.test(name);
    const open = /slide|sandal/.test(name);
    shape = path('M38 157Q47 145 80 139L241 130Q277 144 279 161L275 178Q172 218 46 182Z','url(#dark)');
    shape += path(boot ? 'M47 152Q49 134 127 117L141 36 209 30 231 127 268 148Q208 190 57 168Z' : open ? 'M48 155Q85 107 151 114L240 137 267 151Q185 188 48 166Z' : 'M47 152Q55 126 124 115L161 73Q199 92 229 91L241 134 268 148Q204 191 57 168Z');
    if (open) shape += path('M116 116Q127 87 184 104L222 148 157 164Q151 137 116 116Z');
    else {
      shape += path(boot ? 'M151 39 198 34 190 47 153 51Z' : 'M166 83Q195 103 223 99L212 114Q180 111 155 101Z','#403831');
      shape += line('M58 153Q77 131 114 132M64 169Q190 193 257 153');
      if (/oxford|derby/.test(name)) shape += [0,1,2,3].map(i=>line(`M${132+i*7} ${118-i*8}l28 8`)).join('');
    }
  } else if (/trouser|pants|skirt/.test(name)) {
    shape = path(/skirt/.test(name)?'M110 40 207 34 236 194 76 204Z':'M106 40 211 31 224 196 176 204 154 114 143 207 96 208Z') + line('M118 53 200 46M155 58 154 113');
  } else if (/jacket|shirt|vest|harness|wearable/.test(name)) {
    shape = path('M117 46 147 34 174 34 207 44 250 107 218 126 202 91 212 204 106 204 112 91 96 126 63 108Z') + path('M147 34 157 75 174 34 181 65 158 88 136 62Z','url(#dark)') + line('M158 89V195M119 158h22M177 158h24');
  } else if (/belt|watch strap|bracelet|cuff|strap/.test(name)) {
    shape = path('M54 113Q110 68 237 92L259 120Q151 96 80 144Z') + path('M80 144 259 120 258 137Q162 115 82 161Z','#685643');
    if (/belt/.test(name)) shape += `<rect x="58" y="111" width="50" height="40" rx="7" fill="none" stroke="url(#metal)" stroke-width="7" transform="rotate(-18 82 130)"/>`;
  } else if (/wallet|card|passport|key holder/.test(name)) {
    shape = path('M73 76 202 49 249 162 117 194Z','#594a3b') + path('M70 69 200 42 247 155 115 187Z') + line('M84 77 193 53 232 150 119 174Z') + line('M139 57 179 169');
  } else if (/bag|tote|briefcase|clutch|purse|pouch|handle|structured|soft|drawstring|flap/.test(name)) {
    shape = path('M75 94 216 66 254 172 110 201Z','#594a3b') + path('M75 85 211 60 223 175 82 198Z') + path('M211 60 243 83 254 172 223 175Z','#76644f') + line('M86 96 199 76 210 164 94 184Z');
    if (!/clutch|pouch/.test(name)) shape += `<path d="M111 84Q105 17 155 30Q181 35 178 71" fill="none" stroke="#514536" stroke-width="9"/><path d="M115 83Q111 25 155 35Q176 39 175 72" fill="none" stroke="${colourSafe}" stroke-width="5"/>`;
  } else {
    shape = path('M87 77 207 52 250 163 126 191Z') + line('M99 86 199 65 235 157 130 177Z');
  }
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="${escapeXml(label)} dimensional illustration"><defs><linearGradient id="leather" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#eee7db"/><stop offset=".32" stop-color="${colourSafe}"/><stop offset="1" stop-color="#463d36"/></linearGradient><linearGradient id="dark" x2=".3" y2="1"><stop stop-color="#716c63"/><stop offset="1" stop-color="#272725"/></linearGradient><linearGradient id="metal" x2=".3" y2="1"><stop stop-color="#f4e7c9"/><stop offset=".35" stop-color="#b89c65"/><stop offset=".6" stop-color="#f1dfb5"/><stop offset="1" stop-color="#735d37"/></linearGradient><radialGradient id="bg"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#e8e3d9"/></radialGradient><filter id="shadow"><feGaussianBlur stdDeviation="7"/></filter><pattern id="grain" width="6" height="7" patternUnits="userSpaceOnUse"><path d="m1 2 1 1m2 2 1-1" stroke="#42372c" stroke-width=".5"/></pattern><pattern id="pebbles" width="12" height="9" patternUnits="userSpaceOnUse"><path d="M1 3Q4-2 9 2L10 6Q4 10 1 3Z" fill="none" stroke="#342d26" stroke-width=".7"/></pattern></defs><rect width="320" height="240" fill="url(#bg)"/><ellipse cx="163" cy="199" rx="104" ry="12" fill="#2c2722" opacity=".16" filter="url(#shadow)"/>${shape}</svg>`);
}
