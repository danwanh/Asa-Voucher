import type { Request, Response } from "express";
import * as commerceService from "../services/commerce.service.js";
import { created, noContent, ok } from "../utils/response.js";

export async function getCart(req: Request, res: Response) {
  ok(res, await commerceService.getCart(req.user!.id), "Cart retrieved");
}

export async function getCartCount(req: Request, res: Response) {
  ok(res, await commerceService.getCartCount(req.user!.id), "Cart count retrieved");
}

export async function addCartItem(req: Request, res: Response) {
  const result = await commerceService.addCartItem(req.user!.id, req.body);
  if (result.created) created(res, result.item, "Cart item added");
  else ok(res, result.item, "Cart item updated");
}

export async function updateCartItem(req: Request, res: Response) {
  ok(res, await commerceService.updateCartItem(req.user!.id, req.params.id, req.body.quantity), "Cart item updated");
}

export async function deleteCartItem(req: Request, res: Response) {
  await commerceService.deleteCartItem(req.user!.id, req.params.id);
  noContent(res);
}

export async function clearCart(req: Request, res: Response) {
  await commerceService.clearCart(req.user!.id);
  noContent(res);
}

export async function checkout(req: Request, res: Response) {
  created(res, await commerceService.checkout(req.user!.id, req.body), "Checkout completed");
}

export async function createOrder(req: Request, res: Response) {
  created(res, await commerceService.createOrder(req.user!.id, req.body), "Order created");
}

export async function listOrders(req: Request, res: Response) {
  ok(res, await commerceService.listOrders({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.query as { status?: string; search?: string }));
}

export async function getOrderController(req: Request, res: Response) {
  ok(res, await commerceService.getOrderById({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id));
}

export async function updateOrder(req: Request, res: Response) {
  ok(res, await commerceService.updateOrder({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id, req.body), "Order updated");
}

export async function cancelOrder(req: Request, res: Response) {
  try {
    ok(res, await commerceService.cancelOrder({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id), "Order cancelled");
  } catch (err) {
    console.error("CANCEL ORDER ERROR:", err);
    throw err;
  }
}

export async function deleteOrder(req: Request, res: Response) {
  ok(res, await commerceService.cancelOrder({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id), "Order cancelled");
}

export async function listOrderItems(req: Request, res: Response) {
  ok(res, await commerceService.listOrderItems({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.orderId));
}

export async function getOrderItem(req: Request, res: Response) {
  ok(res, await commerceService.getOrderItem({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id));
}

export async function listPayments(req: Request, res: Response) {
  ok(res, await commerceService.listPayments({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.orderId));
}

export async function createPayment(req: Request, res: Response) {
  created(res, await commerceService.createPayment({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.orderId, req.body.method), "Payment created");
}

export async function getPaymentController(req: Request, res: Response) {
  ok(res, await commerceService.getPaymentById({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id));
}

export async function simulatePaymentSuccess(req: Request, res: Response) {
  ok(res, await commerceService.simulatePaymentSuccess({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id), "Payment succeeded");
}

export async function simulatePaymentFailed(req: Request, res: Response) {
  ok(res, await commerceService.simulatePaymentFailed({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id), "Payment failed");
}

export async function vnpayReturn(req: Request, res: Response) {
  res.redirect(await commerceService.handleVnpayReturn(req.query as Record<string, unknown>));
}

export async function paypalReturn(req: Request, res: Response) {
  res.redirect(await commerceService.handlePayPalReturn(String(req.query.token ?? "")));
}

export async function paypalCancel(req: Request, res: Response) {
  res.redirect(await commerceService.handlePayPalCancel(req.query.token ? String(req.query.token) : undefined));
}

export async function refundOrder(req: Request, res: Response) {
  ok(res, await commerceService.refundOrder({ ...req.user!, partnerId: req.user!.partnerId ?? undefined }, req.params.id, req.body.note ?? req.body.reason), "Order refunded");
}
