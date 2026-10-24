import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Design Your Dream workspace RPCs. Every selection is validated against
 * the design template on the server (src/lib/design-templates.ts).
 */

const SelectionSchema = z.object({
  parts: z.record(z.string().max(40), z.string().max(40)),
  materials: z.record(z.string().max(40), z.string().max(40)),
  components: z.record(z.string().max(40), z.string().max(80)),
  size: z.string().max(8).nullable(),
});

export const saveCustomDesign = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      designId: z.string().regex(/^DZD-[A-Z0-9]{8}$/).nullable().optional(),
      editToken: z.string().regex(/^[A-Z0-9]{24}$/).nullable().optional(),
      productId: z.number().int().positive(),
      selection: SelectionSchema,
      referenceIds: z.array(z.string().regex(/^ref_[A-Z0-9]{20}$/)).max(4),
      notes: z.string().max(1000).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const { saveDesign } = await import("./designs.server");
    return saveDesign(data);
  });

export const getCustomDesign = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({ designId: z.string().regex(/^DZD-[A-Z0-9]{8}$/), editToken: z.string().regex(/^[A-Z0-9]{24}$/) }),
  )
  .handler(async ({ data }) => {
    const { loadDesign } = await import("./designs.server");
    const design = await loadDesign(data.designId, data.editToken);
    return design ? { found: true as const, design } : { found: false as const };
  });
