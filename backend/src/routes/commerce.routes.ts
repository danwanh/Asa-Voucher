import { Router } from "express";
import { addCartItem, cancelOrder, checkout, clearCart, createOrder, createPayment, deleteCartItem, deleteOrder, getCart, getCartCount, getOrderController, getOrderItem, getPaymentController, listOrderItems, listOrders, listPayments, paypalCancel, paypalReturn, simulatePaymentFailed, simulatePaymentSuccess, updateCartItem, updateOrder, vnpayReturn } from "../controllers/commerce.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { checkoutSchema, createOrderSchema, createPaymentSchema, cartItemSchema, updateCartItemSchema, updateOrderSchema } from "../validations/commerce.validation.js";
import { idParamSchema, orderIdParamSchema } from "../validations/common.validation.js";

export const commerceRoutes = Router();

// Gateway return URLs are intentionally public; each provider response is verified server-side.
commerceRoutes.get("/payments/vnpay/return", asyncHandler(vnpayReturn));
commerceRoutes.get("/payments/paypal/return", asyncHandler(paypalReturn));
commerceRoutes.get("/payments/paypal/cancel", asyncHandler(paypalCancel));

commerceRoutes.get("/cart", requireAuth, requireRole(["buyer"]), asyncHandler(getCart));
commerceRoutes.get("/cart/count", requireAuth, requireRole(["buyer"]), asyncHandler(getCartCount));
commerceRoutes.post("/cart/items", requireAuth, requireRole(["buyer"]), validateBody(cartItemSchema), asyncHandler(addCartItem));
commerceRoutes.patch("/cart/items/:id", requireAuth, requireRole(["buyer"]), validateParams(idParamSchema), validateBody(updateCartItemSchema), asyncHandler(updateCartItem));
commerceRoutes.delete("/cart/items/:id", requireAuth, requireRole(["buyer"]), validateParams(idParamSchema), asyncHandler(deleteCartItem));
commerceRoutes.delete("/cart/items", requireAuth, requireRole(["buyer"]), asyncHandler(clearCart));
commerceRoutes.post("/cart/checkout", requireAuth, requireRole(["buyer"]), validateBody(checkoutSchema), asyncHandler(checkout));

commerceRoutes.get("/orders", requireAuth, asyncHandler(listOrders));
commerceRoutes.post("/orders", requireAuth, requireRole(["buyer"]), validateBody(createOrderSchema), asyncHandler(createOrder));
commerceRoutes.get("/orders/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getOrderController));
commerceRoutes.patch("/orders/:id", requireAuth, validateParams(idParamSchema), validateBody(updateOrderSchema), asyncHandler(updateOrder));
commerceRoutes.delete("/orders/:id", requireAuth, validateParams(idParamSchema), asyncHandler(deleteOrder));
commerceRoutes.patch("/orders/:id/cancel", requireAuth, validateParams(idParamSchema), asyncHandler(cancelOrder));

commerceRoutes.get("/orders/:orderId/items", requireAuth, validateParams(orderIdParamSchema), asyncHandler(listOrderItems));
commerceRoutes.get("/order-items/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getOrderItem));

commerceRoutes.get("/orders/:orderId/payments", requireAuth, validateParams(orderIdParamSchema), asyncHandler(listPayments));
commerceRoutes.post("/orders/:orderId/payments", requireAuth, validateParams(orderIdParamSchema), validateBody(createPaymentSchema), asyncHandler(createPayment));
commerceRoutes.get("/payments/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getPaymentController));
commerceRoutes.patch("/payments/:id/simulate-success", requireAuth, validateParams(idParamSchema), asyncHandler(simulatePaymentSuccess));
commerceRoutes.patch("/payments/:id/simulate-failed", requireAuth, validateParams(idParamSchema), asyncHandler(simulatePaymentFailed));
