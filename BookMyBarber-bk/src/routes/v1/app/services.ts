import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { getSupabaseSecret } from "../../../config/supabase";
import { ApiError } from "../../../lib/errors";
import { assertShopOwner } from "../../../lib/shop";
import { param } from "../../../lib/params";
import {
  createServiceBodySchema,
  updateServiceBodySchema,
} from "../../../schemas/services";

const router = Router({ mergeParams: true });

router.get(
  "/",
  authenticate,
  authorize("customer", "barber"),
  asyncHandler(async (req: Request, res: Response) => {
    const shopId = param(req, "shopId");
    const supabase = getSupabaseSecret();
    const { data, error } = await supabase
      .from("shop_services")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("name");

    if (error) throw new ApiError(500, error.message, "DB_ERROR");
    res.json({ services: data ?? [] });
  })
);

router.post(
  "/",
  authenticate,
  authorize("barber"),
  asyncHandler(async (req: Request, res: Response) => {
    const shopId = param(req, "shopId");
    const parsed = createServiceBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join("; ");
      throw new ApiError(400, message, "VALIDATION_ERROR");
    }
    const { name, description, durationMinutes, pricePkr } = parsed.data;

    await assertShopOwner(shopId, req.user!.id);
    const supabase = getSupabaseSecret();
    const { data, error } = await supabase
      .from("shop_services")
      .insert({
        shop_id: shopId,
        name,
        description,
        duration_minutes: durationMinutes,
        price_pkr: pricePkr,
      })
      .select()
      .single();

    if (error) throw new ApiError(400, error.message, "DB_INSERT_FAILED");
    res.status(201).json({ service: data });
  })
);

router.patch(
  "/:serviceId",
  authenticate,
  authorize("barber"),
  asyncHandler(async (req: Request, res: Response) => {
    const shopId = param(req, "shopId");
    const serviceId = param(req, "serviceId");
    const parsed = updateServiceBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join("; ");
      throw new ApiError(400, message, "VALIDATION_ERROR");
    }
    await assertShopOwner(shopId, req.user!.id);

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      update.description = parsed.data.description;
    if (parsed.data.durationMinutes !== undefined)
      update.duration_minutes = parsed.data.durationMinutes;
    if (parsed.data.pricePkr !== undefined)
      update.price_pkr = parsed.data.pricePkr;
    if (parsed.data.isActive !== undefined)
      update.is_active = parsed.data.isActive;

    const supabase = getSupabaseSecret();
    const { data, error } = await supabase
      .from("shop_services")
      .update(update)
      .eq("id", serviceId)
      .eq("shop_id", shopId)
      .select()
      .single();

    if (error) throw new ApiError(400, error.message, "UPDATE_FAILED");
    res.json({ service: data });
  })
);

router.delete(
  "/:serviceId",
  authenticate,
  authorize("barber"),
  asyncHandler(async (req: Request, res: Response) => {
    const shopId = param(req, "shopId");
    const serviceId = param(req, "serviceId");
    await assertShopOwner(shopId, req.user!.id);

    const supabase = getSupabaseSecret();
    const { error } = await supabase
      .from("shop_services")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", serviceId)
      .eq("shop_id", shopId);

    if (error) throw new ApiError(400, error.message, "DELETE_FAILED");
    res.json({ message: "Service deactivated" });
  })
);

export default router;
