import { Router } from "express";
import { addCartItem, cancelOrder, checkout, clearCart, createOrder, createPayment, deleteCartItem, deleteOrder, getCart, getOrderController, getOrderItem, getPaymentController, listOrderItems, listOrders, listPayments, paypalCancel, paypalReturn, refundOrder, simulatePaymentFailed, simulatePaymentSuccess, updateCartItem, updateOrder, vnpayReturn } from "../controllers/commerce.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { checkoutSchema, createOrderSchema, createPaymentSchema, cartItemSchema, listOrdersQuerySchema, refundOrderSchema, updateCartItemSchema, updateOrderSchema } from "../validations/commerce.validation.js";
import { idParamSchema, orderIdParamSchema } from "../validations/common.validation.js";

export const commerceRoutes = Router();

commerceRoutes.get("/cart", requireAuth, requireRole("buyer"), asyncHandler(getCart));
commerceRoutes.post("/cart/items", requireAuth, requireRole("buyer"), validateBody(cartItemSchema), asyncHandler(addCartItem));
commerceRoutes.patch("/cart/items/:id", requireAuth, requireRole("buyer"), validateParams(idParamSchema), validateBody(updateCartItemSchema), asyncHandler(updateCartItem));
commerceRoutes.delete("/cart/items/:id", requireAuth, requireRole("buyer"), validateParams(idParamSchema), asyncHandler(deleteCartItem));
commerceRoutes.delete("/cart/items", requireAuth, requireRole("buyer"), asyncHandler(clearCart));
commerceRoutes.post("/cart/checkout", requireAuth, requireRole("buyer"), validateBody(checkoutSchema), asyncHandler(checkout));

commerceRoutes.get("/orders", requireAuth, validateQuery(listOrdersQuerySchema), asyncHandler(listOrders));
commerceRoutes.post("/orders", requireAuth, requireRole("buyer"), validateBody(createOrderSchema), asyncHandler(createOrder));
commerceRoutes.get("/orders/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getOrderController));
commerceRoutes.patch("/orders/:id", requireAuth, validateParams(idParamSchema), validateBody(updateOrderSchema), asyncHandler(updateOrder));
commerceRoutes.delete("/orders/:id", requireAuth, validateParams(idParamSchema), asyncHandler(deleteOrder));
commerceRoutes.patch("/orders/:id/cancel", requireAuth, validateParams(idParamSchema), asyncHandler(cancelOrder));
commerceRoutes.patch("/orders/:id/refund", requireAuth, requireRole("admin_operations", "partner_owner", "partner_voucher_staff"), validateParams(idParamSchema), validateBody(refundOrderSchema), asyncHandler(refundOrder));

commerceRoutes.get("/orders/:orderId/items", requireAuth, validateParams(orderIdParamSchema), asyncHandler(listOrderItems));
commerceRoutes.get("/order-items/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getOrderItem));

commerceRoutes.get("/orders/:orderId/payments", requireAuth, validateParams(orderIdParamSchema), asyncHandler(listPayments));
commerceRoutes.post("/orders/:orderId/payments", requireAuth, validateParams(orderIdParamSchema), validateBody(createPaymentSchema), asyncHandler(createPayment));
commerceRoutes.get("/payments/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getPaymentController));
commerceRoutes.patch("/payments/:id/simulate-success", requireAuth, validateParams(idParamSchema), asyncHandler(simulatePaymentSuccess));
commerceRoutes.patch("/payments/:id/simulate-failed", requireAuth, validateParams(idParamSchema), asyncHandler(simulatePaymentFailed));
