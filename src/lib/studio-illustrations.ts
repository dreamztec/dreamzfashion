/** Original vector technical construction studies — no reference photos or third-party branding.
 * The selected colour only tints the leather zones in the technical diagram.
 * A separate AI-generated product image is still required for the final design. */
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const COLOUR_SWATCHES: Record<string,string> = {
  black:"#282726", white:"#f8f7f2", cream:"#f5ebd8", oxblood:"#641c32",
  brown:"#70462e", tan:"#b78352", cognac:"#a75e38", navy:"#263b5d",
  blue:"#2559a2", red:"#b52935", green:"#256b4b", "forest green":"#315841",
  emerald:"#17775d", purple:"#683e83", gold:"#c4a057", grey:"#898d91",
  gray:"#898d91", pink:"#cc8d9a", orange:"#df8138", yellow:"#e6bc48",
  beige:"#d8c29d", silver:"#c5c8c9", teal:"#2d7d83",
};
function leatherColour(value?: string): string {
  if (!value) return "#ffffff";
  const raw=value.trim().toLowerCase();
  if (/^#[a-f0-9]{6}$/.test(raw)) return raw;
  if (/^#[a-f0-9]{3}$/.test(raw)) return raw;
  return COLOUR_SWATCHES[raw] || "#ffffff";
}
function partLabels(n: string): string {
  if (/^oxford$/.test(n)) return "CLOSED LACING  /  VAMP  /  OUTSOLE";
  if (/^derby$/.test(n)) return "OPEN LACING  /  QUARTERS  /  OUTSOLE";
  if (/chelsea/.test(n)) return "ELASTIC GORE  /  ANKLE SHAFT  /  SOLE";
  if (/boot/.test(n)) return "SHAFT  /  VAMP  /  OUTSOLE";
  if (/loafer/.test(n)) return "SLIP-ON VAMP  /  APRON  /  SOLE";
  if (/mule/.test(n)) return "OPEN HEEL  /  VAMP  /  SOLE";
  if (/slide|sandal/.test(n)) return "UPPER STRAPS  /  FOOTBED  /  SOLE";
  if (/^heel$|pump|slingback/.test(n)) return "UPPER  /  HEEL  /  OUTSOLE";
  if (/trouser|pants/.test(n)) return "WAISTBAND  /  FLY  /  LEG PANELS";
  if (/skirt/.test(n)) return "WAISTBAND  /  SIDE SEAM  /  HEM";
  if (/jacket/.test(n)) return "COLLAR  /  SLEEVE  /  BODY PANELS";
  if (/t-shirt|shirt/.test(n)) return "NECKLINE  /  SLEEVE  /  FRONT PANEL";
  if (/vest/.test(n)) return "ARMHOLE  /  NECKLINE  /  HEM";
  if (/harness/.test(n)) return "STRAP PATH  /  FASTENING  /  FIT";
  if (/bag|briefcase|tote|clutch|purse|backpack|pouch/.test(n)) return "BODY PANELS  /  OPENING  /  CARRY";
  if (/belt|watch strap|bracelet/.test(n)) return "STRAP  /  FASTENING  /  EDGE";
  if (/wallet|card|passport/.test(n)) return "FOLD  /  POCKETS  /  EDGE";
  return "CONSTRUCTION STUDY  /  PROPORTIONS";
}
export function studioIllustration(label: string, colour?: string): string {
  const n = label.toLowerCase();
  const leatherFill = leatherColour(colour);
  const outline = (d: string) => `<path d="${d}" fill="${leatherFill}" stroke="#171717" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>`;
  const line = (d: string, dash = false) => `<path d="${d}" fill="none" stroke="#161616" stroke-width="${dash ? '.75' : '1.15'}" ${dash ? 'stroke-dasharray="2.2 2.2"' : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
  const neutralOutline = (d: string) => `<path d="${d}" fill="#f9f9f7" stroke="#171717" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>`;
  const circle = (x: number,y: number,r=2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="white" stroke="#161616" stroke-width="1.1"/>`;
  const shoeSole = neutralOutline('M38 170 Q81 174 119 169 Q172 182 259 173 Q278 171 279 180 Q275 190 234 190 L147 190 Q121 190 102 183 L84 183 L83 191 L38 191Z') + line('M41 177 Q82 181 118 176 Q172 188 261 179 M41 187 H80');
  let shape: string;
  if (/^oxford$|^derby$|other leather footwear/.test(n)) {
    shape = shoeSole + outline('M38 169 L43 112 Q59 122 80 117 L115 91 Q125 86 132 97 L153 128 Q168 143 205 149 L253 155 Q278 158 279 173 Q242 184 173 180 Q137 178 118 170 Q79 176 38 169Z');
    // The Oxford's facing edges form a closed V stitched UNDER the vamp.
    // Derby quarters are separate flaps stitched ON TOP of the vamp.
    shape += line('M45 117 Q63 133 89 116 L113 98 M45 137 L44 164 M196 150 Q190 164 196 176');
    if (/derby/.test(n)) {
      shape += outline('M83 122 L112 98 133 103 147 135 119 145 93 137Z');
      shape += line('M94 129 L117 110 L137 135 M101 137 L120 119', true);
    } else {
      shape += line('M89 124 L116 98 L133 116 L144 137 M99 138 L118 115 L142 139');
      shape += line('M116 99 L113 118 L122 132 L140 143');
    }
    // Toe cap and welt remain clean continuous curves.
    shape += line('M204 151 Q191 161 196 176 M47 165 Q80 171 116 165',true);
    for(let i=0;i<4;i++){const x=115+i*5,y=108+i*6;shape+=circle(x,y,1.65)+circle(x-13,y+8,1.65)+line(`M${x-13} ${y+8} L${x+5} ${y+4}`);}
  } else if (/boot|chelsea/.test(n)) {
    shape=shoeSole+outline('M38 170 L43 57 Q70 49 112 56 L117 114 Q130 140 194 149 L253 155 Q278 159 279 173 Q218 187 171 179 L118 170 Q79 175 38 170Z')+line('M49 62 Q76 57 106 62 M48 68 L45 165 M181 148 Q168 162 172 178');
    if(/chelsea/.test(n)){
      shape+=outline('M67 71 L99 68 103 116 Q89 137 69 130Z');
      for(let i=0;i<7;i++)shape+=line(`M${71+i*4} 75 L${72+i*4} 122`);
      shape+=outline('M47 57 L46 43 53 42 56 55Z');
    } else {
      shape+=line('M91 64 L102 115 Q116 140 142 145 L123 156 Q98 138 87 116Z');
      for(let i=0;i<6;i++)shape+=circle(99+i*2,73+i*9,2)+line(`M${101+i*2} ${74+i*9}l12 -2`);
      shape+=line('M111 60 L119 110 131 130 M96 66 L106 114 136 143',true);
    }
  } else if (/loafer|mule/.test(n)) {
    const mule=/mule/.test(n);
    shape=shoeSole+outline(mule?'M38 170 Q56 162 94 168 L110 113 Q125 106 143 121 Q163 143 204 149 L253 155 Q278 159 279 173 Q205 190 118 170 Q79 176 38 170Z':'M38 170 L42 121 Q68 131 94 119 L117 107 Q135 112 148 128 Q165 144 204 149 L253 155 Q278 159 279 173 Q205 190 118 170 Q79 176 38 170Z');
    shape+=line('M119 119 Q142 139 204 155 Q240 158 261 168 Q244 175 196 174 Q148 169 125 148 M121 123 Q148 145 203 159 Q239 163 253 168',true);
    if(!mule)shape+=line('M46 127 Q66 142 96 125 M45 142 L43 164')+outline('M102 121 L113 115 150 137 139 146Z')+line('M119 127 132 136');
    else shape+=line('M106 118 Q127 124 131 148 M47 168 Q75 166 94 169');
  } else if (/slide|sandal/.test(n)) {
    shape=neutralOutline('M39 172 Q73 163 110 167 Q171 171 243 162 Q267 158 278 169 L278 181 Q267 192 219 191 L77 188 Q46 185 39 181Z')+line('M43 177 Q103 186 163 184 L252 178 Q269 176 275 172');
    shape+=outline('M132 170 Q134 124 166 120 Q197 122 214 165 L202 172 Q185 140 165 138 Q148 140 146 173Z')+line('M141 165 Q145 131 166 128 Q190 132 205 163',true);
    if(/sandal/.test(n))shape+=outline('M53 171 L60 125 Q80 115 105 126 L122 169 110 172 99 137 69 136 64 173Z')+outline('M57 127 104 125 107 135 58 137Z')+line('M75 127 75 136');
  } else if (/^heel$|pump|slingback|open toe/.test(n)) {
    shape=outline('M43 74 Q64 95 87 111 Q140 149 197 159 Q238 143 268 161 Q282 169 278 178 L216 184 Q157 183 107 143 L76 119 65 190 57 190 58 117 Q40 103 43 74Z')+line('M48 84 Q64 117 106 140 Q162 182 216 179 L273 174 M61 119 L62 186 M88 114 Q112 97 133 130 L152 153');
  } else if (/heel|stiletto|wedge/.test(n)) {
    shape=outline('M95 57 L186 57 194 70 95 74Z');
    shape+=outline(/wedge/.test(n)?'M95 74 L194 70 Q220 147 259 184 L95 184Z':/stiletto|kitten/.test(n)?'M95 74 184 71 Q136 109 127 183 L116 183 Q119 115 95 74Z':'M95 74 184 71 174 183 104 183Z')+line('M106 179 H171');
  } else if (/briefcase|laptop bag/.test(n)) {
    shape=outline('M43 87 259 87 276 101 276 188 259 201 43 201Z')+outline('M43 87 H259 V201 H43Z')+outline('M43 87 H259 V126 Q153 146 43 126Z')+outline('M122 87 V65 Q122 52 135 52 H170 Q183 52 183 65 V87 H174 V66 Q174 61 169 61 H136 Q131 61 131 66 V87Z')+outline('M139 129 H163 V147 H139Z')+line('M144 138 H158 M52 97 H250 V119 M52 146 V192 H250 V146 M266 105 V186',true);
  } else if (/backpack/.test(n)) {
    shape=outline('M86 197 V93 Q86 57 159 57 Q232 57 232 93 V197Z')+outline('M143 58 V43 H175 V58 H168 V50 H150 V58Z')+line('M97 188 V95 Q97 67 159 67 Q221 67 221 95 V188')+outline('M104 135 Q159 121 214 135 V182 H104Z')+line('M112 143 H207 M204 144 V155 M111 94 H207');
  } else if (/tote|handbag|travel bag|crossbody|bag|clutch|purse|pouch|handle|structured|drawstring|flap/.test(n)) {
    const small=/clutch|purse|pouch/.test(n);
    shape=outline(small?'M63 108 H254 L265 190 H53Z':'M68 88 H249 L264 199 H53Z')+line(small?'M63 118 H254 M64 180 H253':'M77 99 H240 L252 188 H65Z',true);
    if(!small)shape+=outline('M109 92 V64 Q109 36 157 36 Q205 36 205 64 V92 H196 V65 Q196 45 157 45 Q118 45 118 65 V92Z');
    if(/crossbody/.test(n))shape+=line('M70 110 Q45 21 160 24 Q272 26 245 110');
    if(small)shape+=line('M63 119 158 159 254 119')+circle(158,158,3);
  } else if (/sole|commando|chunky/.test(n)) {
    shape=outline('M122 201 Q101 190 108 151 L116 111 Q106 81 111 57 Q122 29 160 29 Q198 29 209 57 Q214 81 204 111 L212 151 Q219 190 198 201Z')+line('M128 190 Q114 181 121 150 L129 110 Q118 77 124 60 Q133 42 160 42 Q187 42 196 60 Q202 77 191 110 L199 150 Q206 181 192 190Z');
    if(/commando|rubber|chunky/.test(n))for(let i=0;i<6;i++)shape+=line(`M132 ${62+i*19} H187 M153 ${54+i*19} V${69+i*19}`);
  } else if (/^(round|almond|square|pointed)$/.test(n)) {
    shape=outline(n==='pointed'?'M101 202 V118 Q102 75 160 28 Q218 75 219 118 V202Z':n==='square'?'M101 202 V75 Q101 51 119 51 H201 Q219 51 219 75 V202Z':n==='almond'?'M101 202 V121 Q101 66 160 36 Q219 66 219 121 V202Z':'M101 202 V111 Q101 42 160 42 Q219 42 219 111 V202Z')+line('M112 191 H208',true);
  } else if (/grain|suede|nubuck|smooth|waxy|patent|emboss|leather sample|pebbl/.test(n)) {
    shape=outline('M75 61 H245 V191 H75Z')+line('M84 70 H236 V182 H84Z',true);
    if(/pebbl|emboss|grain/.test(n))for(let y=85;y<172;y+=15)for(let x=98;x<225;x+=18)shape+=line(`M${x} ${y}q6 -6 11 0q-2 8 -11 0Z`);
    if(/suede|nubuck/.test(n))for(let y=85;y<172;y+=11)for(let x=98;x<225;x+=11)shape+=line(`M${x} ${y}l2 -3`);
  } else if (/buckle|turn-lock|hardware/.test(n)) {
    shape=outline('M89 70 Q79 70 79 80 V163 Q79 173 89 173 H231 Q241 173 241 163 V80 Q241 70 231 70Z')+outline('M92 83 H228 V160 H92Z')+line('M160 76 V160 M160 116 H221')+circle(160,116,3);
  } else if (/lace-up/.test(n)) {
    shape=outline('M111 48 H209 V196 H111Z')+outline('M83 51 H127 V197 H83Z')+outline('M193 51 H237 V197 H193Z');
    for(let i=0;i<6;i++)shape+=circle(116,68+i*22,3)+circle(204,68+i*22,3)+line(`M116 ${68+i*22}L204 ${88+i*22} M204 ${68+i*22}L116 ${88+i*22}`);
  } else if (/zip/.test(n)) {
    shape=outline('M128 40 H192 V202 H128Z');for(let i=0;i<19;i++)shape+=line(`M151 ${47+i*8}h18v4h-18Z`);shape+=outline('M149 53 H171 V80 H149Z')+line('M156 59 V73');
  } else if (/stitch|tonal|contrast|edge|burnish/.test(n)) {
    shape=outline('M58 73 H263 V183 H58Z')+line('M69 84 H252 V172 H69Z',true)+line('M69 94 H252',true);
  } else if (/belt|watch strap|bracelet|cuff|strap/.test(n)) {
    shape=outline('M39 104 H275 L287 122 275 140 H39Z')+outline('M37 99 H85 V145 H37Z')+outline('M44 107 H78 V137 H44Z')+line('M59 102 V141 M59 122 H93');for(let x=202;x<270;x+=14)shape+=circle(x,122,2);
  } else if (/wallet|card|passport|key holder/.test(n)) {
    shape=outline('M70 61 H249 V191 H70Z')+line('M79 70 H240 V182 H79Z',true)+line('M159 62 V190 M86 94 H145 M86 115 H145 M174 89 H233 V157 H174Z');
  } else if (/skirt/.test(n)) {
    shape=outline('M116 44 H204 L235 197 H85Z')+line('M116 56 H204 M160 56 V89 M103 166 L92 190 M217 166 L228 190')+line('M110 191 H211',true);
  } else if (/trouser|pants/.test(n)) {
    shape=outline('M107 42 H212 L229 202 H175 L159 113 L146 202 H91Z')
      +line('M108 55 H211 M159 55 V99 M113 57 L132 57 L124 89 M204 57 H185 L192 89 M111 202 L115 99 M205 99 L211 202')
      +line('M155 56 V93 M142 107 L134 196 M176 106 L186 196',true);
  } else if (/t-shirt/.test(n)) {
    shape=outline('M122 42 L142 33 Q160 49 179 33 L198 42 L250 95 L217 122 L198 101 L199 202 H121 L122 101 L103 122 L70 95Z')
      +line('M142 34 Q160 62 179 34 M122 184 H199 M79 95 L102 115 M220 115 L241 95');
  } else if (/shirt/.test(n)) {
    shape=outline('M121 41 L140 32 H180 L200 41 L249 107 L220 131 L200 101 L207 204 H113 L120 101 L100 131 L71 107Z')
      +line('M140 32 L160 67 L180 32 M160 67 V203 M113 192 H206 M126 124 H148 V144 H126Z M170 124 H191 V144 H170Z');
    for(let y=83;y<177;y+=27)shape+=circle(160,y,1.5);
  } else if (/vest/.test(n)) {
    shape=outline('M114 45 L141 35 Q160 58 179 35 L206 45 221 201 H99Z')
      +line('M141 35 L159 84 L179 35 M159 84 V201 M114 122 H139 V144 H114Z M178 122 H203 V144 H178Z');
    for(let y=107;y<189;y+=28)shape+=circle(160,y,1.5);
  } else if (/harness/.test(n)) {
    shape=outline('M124 40 H143 L164 85 L185 40 H204 L180 123 L202 199 H182 L162 148 L141 199 H120 L144 123Z')
      +line('M144 124 H179 M132 177 H193 M124 40 L141 199 M204 40 L182 199');
  } else if (/jacket|wearable/.test(n)) {
    shape=outline('M123 43 144 35 H176 L197 43 249 111 222 131 201 98 210 204 H110 L119 98 98 131 71 111Z')
      +line('M144 35 160 67 176 35 M160 67 V204 M125 151 H147 V174 H125Z M173 151 H195 V174 H173Z M114 195 H206');
  } else if (/hat/.test(n)) {
    shape=outline('M95 139 112 67 Q159 48 207 67 L225 139Z')+outline('M95 133 Q31 145 51 170 Q160 201 269 170 Q289 145 225 133 L225 145 Q160 162 95 145Z');
  } else {
    // Unspecified options must not imply a made-up buildable component.
    shape=line('M72 68 H108 M72 68 V104 M248 68 H212 M248 68 V104 M72 180 H108 M72 180 V144 M248 180 H212 M248 180 V144')+`<text x="160" y="118" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#161616">Atelier detail</text><text x="160" y="139" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#161616">Confirmed with your maker</text>`;
  }
  // Labels are part of the technical study, never stamped onto a finished render.
  const title = esc(label.length > 33 ? label.slice(0,31)+"…" : label);
  const subtitle = esc(partLabels(n));
  return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 267" role="img" aria-label="${esc(label)} labelled technical sketch">
    <rect width="320" height="267" fill="#ffffff"/>
    <text x="160" y="20" fill="#171717" font-size="12" font-family="Arial,sans-serif" text-anchor="middle" font-weight="700" letter-spacing="0.8">${title}</text>
    <line x1="21" y1="28" x2="299" y2="28" stroke="#dadada" stroke-width="0.8"/>
    ${shape}
    <line x1="21" y1="218" x2="299" y2="218" stroke="#dadada" stroke-width="0.8"/>
    <text x="160" y="235" fill="#171717" font-family="Arial,sans-serif" font-size="9" text-anchor="middle" letter-spacing="0.3">${subtitle}</text>
    <text x="160" y="253" fill="#747474" font-family="Arial,sans-serif" font-size="8" text-anchor="middle">STUDIO COLOUR GUIDE · NOT A FINISHED PRODUCT</text>
  </svg>`);
}
