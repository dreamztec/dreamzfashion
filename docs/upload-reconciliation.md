# 17 recent product uploads: reconciliation record (2026-10-24)

## Where I looked

- The repository, including every file under `public/` (searched by exact filename and for any `.png`).
- The Netlify Blobs `dfk-media` store. It holds one object, `design-references/1792588693295-m98fkx.png`, which is a customer design reference, not a product upload.
- The `media_assets` and `product_images` database tables. Neither references any of these filenames.

## Result

**None of the 17 files is in this project.** They were most likely uploaded only to ChatGPT, which this project can't reach. I couldn't open any of them, so none was visually inspected, named, categorised or published. Nothing was guessed from the filenames.

Each upload already has a catalogue draft, `DFK-DFT-150` to `DFK-DFT-166`. They were staged earlier from the filenames. Every draft is in this state:

- price ₦0, no price source
- `checkout_ready = false`
- status `draft`, so it isn't public, isn't in search and has no working public URL
- no images, no variants

The 2026-10-24 migration moved two drafts into the agreed structure: the wrist pouch to Bags → Wrist Pouches, and the briefcase to Bags → Briefcases.

| # | Filename | Actual image | Draft product (ID · SKU) | Category (draft) | Collection | Gallery | Price source | Status | Public URL |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ascension Blue and Black Oxford-3.png | Not accessible | 5903 · DFK-DFT-150 | Footwear → Shoes (Oxford) | Unresolved (needs image) | none | none | draft | none |
| 2 | Brown woven loafers with lightning straps-4.png | Not accessible | 5904 · DFK-DFT-151 | Footwear → Loafers | Unresolved | none | none | draft | none |
| 3 | Cream and Brown Buckle Slides-6.png | Not accessible | 5905 · DFK-DFT-152 | Footwear → Slides | Unresolved | none | none | draft | none |
| 4 | Emerald Regent button boots-4.png | Not accessible | 5906 · DFK-DFT-153 | Footwear → Boots (button boot) | Unresolved | none | none | draft | none |
| 5 | Forest green leather wrist pouch-9.png | Not accessible | 5907 · DFK-DFT-154 | Bags → Wrist Pouches | Unresolved | none | none | draft | none |
| 6 | Frontier Fur multicolour crocodile boots-7.png | Not accessible | 5908 · DFK-DFT-155 | Footwear → Boots | Unresolved | none | none | draft | none |
| 7 | Heritage Brown Leather Briefcase Views-3.png | Not accessible | 5909 · DFK-DFT-156 | Bags → Briefcases | Unresolved | none | none | draft | none |
| 8 | Heritage harness brown crocodile boots-2.png | Not accessible | 5910 · DFK-DFT-157 | Footwear → Boots (harness boot) | Unresolved | none | none | draft | none |
| 9 | Midnight Vow Black Oxford with Red Sole-2.png | Not accessible | 5911 · DFK-DFT-158 | Footwear → Shoes (Oxford) | Unresolved | none | none | draft | none |
| 10 | Navy and cognac Chelsea boots, four views-8.png | Not accessible | 5912 · DFK-DFT-159 | Footwear → Boots (Chelsea) | Unresolved | none | none | draft | none |
| 11 | Signature hook black belt with rainbow hook-1.png | Not accessible | 5913 · DFK-DFT-160 | Accessories → Belts | Unresolved | none | none | draft | none |
| 12 | Voltage double-strap boots in oxblood and black-10.png | Not accessible | 5914 · DFK-DFT-161 | Footwear → Boots | Unresolved | none | none | draft | none |
| 13 | Black chunky Derby shoe with detail crops-10.png | Not accessible | 5915 · DFK-DFT-162 | Footwear → Shoes (Derby) | Unresolved | none | none | draft | none |
| 14 | Tan and forest green loafers-9.png | Not accessible | 5916 · DFK-DFT-163 | Footwear → Loafers | Unresolved | none | none | draft | none |
| 15 | Brown patchwork slides with close-up details-8.png | Not accessible | 5917 · DFK-DFT-164 | Footwear → Slides | Unresolved | none | none | draft | none |
| 16 | Three black belts with colorful linings-3.png | Not accessible | 5918 · DFK-DFT-165 | Accessories → Belts | Unresolved (may be 3 variants or 3 listings; needs the image) | none | none | draft | none |
| 17 | Blue crocodile-texture and black slides-2.png | Not accessible | 5919 · DFK-DFT-166 | Footwear → Slides | Unresolved | none | none | draft | none |

The IDs come from the preview database branch, which mirrors production. The categories are the drafts' provisional ones. The product type and the collection (Essentials for one or two design colours, Essentials Pro for three or more) have to be confirmed against each actual image.

## To publish them

1. Upload each original file in Admin → Media. It is stored in Netlify Blobs and served from `/api/media/…`. Several views of one product go into that product's gallery.
2. Open the matching draft in Admin → Products. Check the title and type against the photo, set the collection by counting design colours, and enter the verified ₦ price, sizes and stock (or set it to made to order).
3. Tick **Checkout approved** and **Publish**. If a price can't be verified, publish without approving checkout. The listing then shows "Request a Quote" and direct purchase stays disabled.
