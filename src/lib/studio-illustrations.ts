/** Original code-authored Studio geometry. Never use catalogue/customer photos here. */
const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));

export function studioIllustration(label: string, _colour = '#a29381'): string {
  const name = label.toLowerCase();
  const colourSafe = '#ffffff';
  let shape = '';
  const path = (d: string, _fill = '#fff') => `<path d="${d}" fill="#fff" stroke="#111" stroke-width="1.7" stroke-linejoin="round"/>`;
  const line = (d: string) => `<path d="${d}" fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>`;
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
  } else if (/stiletto|wedge|kitten|block heel|sculpt.*heel|round heel/.test(name)) {
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
  } else if (/oxford|derby|loafer|mule|footwear|boot|chelsea|slide|sandal|pump|slingback|open toe|^heel$/.test(name)) {
    // Side/three-quarter construction study: sole, vamp, quarters and opening are separate contours.
    const sole = path('M27 173Q30 165 58 160L147 151 276 152 286 164 284 181 245 190 206 187 191 181Q114 198 43 189L27 181Z');
    if (/^heel$|pump|slingback/.test(name)) {
      shape = path('M29 177Q47 162 81 155Q119 147 144 117L215 73 270 78 276 103Q238 117 219 156L210 190 202 190 207 144Q155 177 105 184L40 187Z') + line('M42 179Q128 178 174 137L219 91Q242 108 270 84M217 154 219 190M34 185Q140 189 206 148');
    } else if (/slide|sandal/.test(name)) {
      shape = sole + path('M31 169Q50 137 103 126Q150 115 201 135L273 154 282 166Q205 195 43 181Z') + path('M86 135Q119 91 166 111L191 147Q152 160 119 163Q112 141 86 135Z') + line('M96 132Q126 106 160 119M127 156 180 143');
      if (/sandal/.test(name)) shape += path('M208 139 216 97 247 93 262 152 251 155 238 108 228 111 223 143Z') + line('M219 106 241 103');
    } else if (/boot|chelsea/.test(name)) {
      shape = sole + path('M29 171Q35 148 105 139L151 119 155 45Q189 34 242 43L254 140 277 158 280 168Q218 191 193 172Q116 192 36 181Z') + line('M159 52Q201 42 237 50M154 62 153 118Q174 143 198 166M244 60 250 144M36 173Q105 181 185 165');
      shape += /chelsea/.test(name) ? path('M178 65 226 62 231 127 198 141 177 118Z') + line('M185 72 185 116M193 70 194 126M202 68 203 130M212 67 214 129M222 66 224 124') : path('M147 63 177 58 191 131 161 141Z') + [0,1,2,3,4].map(i=>line(`M${152+i*2} ${72+i*13}l29 8m-29-2 26-7`)).join('');
    } else {
      const mule = /mule/.test(name);
      shape = sole + path(mule ? 'M29 171Q36 145 99 134Q122 124 146 97L198 110 203 153 274 158 281 167Q211 190 189 172Q113 194 36 181Z' : 'M29 171Q36 145 99 134Q128 121 153 91L187 88Q208 114 261 101L275 155 281 168Q218 189 191 173Q112 194 36 181Z');
      shape += line('M36 174Q101 185 188 166M204 174 270 164M82 139Q108 147 109 179');
      if (/oxford|derby|footwear/.test(name)) {
        shape += path('M142 108 158 81Q170 77 180 86L200 130 173 143Z') + line('M184 99Q218 120 257 106L261 115Q229 128 201 113');
        shape += path(/derby/.test(name) ? 'M117 127 147 100 179 138 161 151Z' : 'M123 130 147 109 175 141 158 153Z');
        shape += path('M181 98 199 110 224 160 193 170 174 142 196 131Z');
        shape += [0,1,2,3].map(i=>line(`M${150+i*6} ${108+i*9}l${34-i*3} -7m-${31-i*3} 3l${31-i*3} 7`)).join('');
        shape += line('M200 145 211 165M128 132 157 154');
      } else {
        shape += path('M77 145Q114 119 145 110L186 124 196 153Q123 175 90 164Z') + line('M84 145Q117 126 145 118L180 131 188 149Q128 166 97 160');
        if (/loafer/.test(name)) shape += path('M122 124 145 115 178 132 160 141Z') + line('M144 125 157 130');
        if (!mule) shape += line('M184 101Q211 121 258 108M243 118 251 159');
      }
    }
  } else if (/briefcase|laptop bag/.test(name)) {
    shape = path('M54 79 247 67 275 86 275 191 84 206 54 188Z') + path('M54 79 247 67 247 184 54 196Z') + path('M247 67 275 86 275 191 247 184Z') + path('M54 79 247 67 245 113 55 126Z') + line('M63 88 237 77 235 105 64 117M63 134 63 186 237 175 237 123M255 86 265 92 265 181');
    shape += path('M113 75 113 51Q113 38 128 38L174 35Q189 35 189 49L189 70 180 71 180 50Q180 45 174 45L128 48Q123 48 123 54L123 74Z') + path('M139 113 160 111 160 129 139 131Z') + line('M144 121 154 120');
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
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="${escapeXml(label)} black-and-white construction sketch"><defs><pattern id="grain" width="6" height="7" patternUnits="userSpaceOnUse"><path d="m1 2 1 1m2 2 1-1" stroke="#111" stroke-width=".5"/></pattern><pattern id="pebbles" width="12" height="9" patternUnits="userSpaceOnUse"><path d="M1 3Q4-2 9 2L10 6Q4 10 1 3Z" fill="none" stroke="#111" stroke-width=".7"/></pattern></defs><rect width="320" height="240" fill="#fff"/>${shape.replace(/url\(#(?:metal|dark|leather)\)/g, '#111').replace(/#[0-9a-f]{6}/gi, c => c === '#ffffff' ? '#fff' : '#111')}</svg>`);
}
