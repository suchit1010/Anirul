// artifacts/api-server/src/routes/payments.ts
// Payment endpoints - Copy this file directly

import { Router, Request, Response, IRouter } from 'express';
import { db, paymentsTable } from '@workspace/db';
import { desc, eq } from 'drizzle-orm';
import { dodoClient } from '../lib/dodoPayments';
import { logger } from '../lib/logger';

const router: IRouter = Router();

function toPaymentAmount(amount: unknown): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(value)) return '0.00';
  return (value / 100).toFixed(2);
}

async function upsertPaymentFromWebhook(params: {
  transactionId: string;
  amount: unknown;
  currency?: string;
  status: string;
  metadata?: Record<string, unknown>;
  notes?: string;
}) {
  const doctorId = typeof params.metadata?.doctorId === 'string' ? params.metadata.doctorId : null;
  const patientId = typeof params.metadata?.patientId === 'string' ? params.metadata.patientId : null;

  if (!doctorId || !patientId) {
    throw new Error('Webhook metadata missing doctorId or patientId');
  }

  await db
    .insert(paymentsTable)
    .values({
      transactionId: params.transactionId,
      doctorId,
      patientId,
      amount: toPaymentAmount(params.amount),
      currency: params.currency || 'USDC',
      status: params.status,
      metadata: params.metadata || {},
      notes: params.notes ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: paymentsTable.transactionId,
      set: {
        doctorId,
        patientId,
        amount: toPaymentAmount(params.amount),
        currency: params.currency || 'USDC',
        status: params.status,
        metadata: params.metadata || {},
        notes: params.notes ?? null,
        updatedAt: new Date(),
      },
    });
}

/**
 * POST /api/payments/checkout
 * Create a checkout session for doctor consultation
 * 
 * Body:
 * {
 *   "doctorId": "uuid",
 *   "patientId": "uuid",
 *   "consultationPrice": 50,
 *   "currency": "USDC"
 * }
 */
router.post('/checkout', async (req: Request, res: Response) => {
  const { doctorId, patientId, consultationPrice = 50, currency = 'USDC' } = req.body;

  if (!doctorId || !patientId) {
    res.status(400).json({ error: 'doctorId and patientId are required' });
    return;
  }

  if (consultationPrice <= 0) {
    res.status(400).json({ error: 'consultationPrice must be greater than 0' });
    return;
  }

  try {
    const session = await dodoClient.createConsultationCheckout(
      patientId,
      doctorId,
      consultationPrice,
      currency
    );

    res.json({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
    });
    return;
  } catch (err) {
    logger.error(err, 'Failed to create checkout session');
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
    return;
  }
});

/**
 * POST /api/payments/webhook
 * Handle DODO payment webhooks
 * 
 * IMPORTANT: Verify webhook signature before processing
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-signature'] as string;
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  if (!dodoClient.verifyWebhookSignature(payload, signature)) {
    logger.warn('Webhook verification failed - invalid signature');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { event, transactionId, amount, metadata, status } = req.body;

  try {
    logger.info({ event, transactionId, doctorId: metadata?.doctorId }, 'Processing webhook');

    if (event === 'payment.completed') {
      logger.info(
        { transactionId, doctorId: metadata.doctorId, patientId: metadata.patientId },
        'Payment completed'
      );

      await upsertPaymentFromWebhook({
        transactionId,
        amount,
        currency: req.body?.currency,
        status: 'completed',
        metadata,
        notes: 'Payment completed via DODO webhook',
      });

      res.json({ success: true });
      return;
    } else if (event === 'payment.failed') {
      logger.warn({ transactionId }, 'Payment failed');

      await upsertPaymentFromWebhook({
        transactionId,
        amount,
        currency: req.body?.currency,
        status: 'failed',
        metadata,
        notes: 'Payment failed via DODO webhook',
      });

      res.json({ success: true });
      return;
    } else if (event === 'payment.refunded') {
      logger.info({ transactionId }, 'Payment refunded');

      await upsertPaymentFromWebhook({
        transactionId,
        amount,
        currency: req.body?.currency,
        status: 'refunded',
        metadata,
        notes: 'Payment refunded via DODO webhook',
      });

      res.json({ success: true });
      return;
    } else {
      logger.info({ event }, 'Unhandled webhook event');
      res.json({ success: true });
      return;
    }
  } catch (err) {
    logger.error(err, 'Webhook processing error');
    res.status(500).json({ error: 'Webhook processing failed' });
    return;
  }
});

/**
 * GET /api/payments/status/:transactionId
 * Check payment status
 */
router.get('/status/:transactionId', async (req: Request, res: Response) => {
  const txParam = req.params['transactionId'];
  const transactionId = Array.isArray(txParam) ? txParam[0] : txParam;

  if (!transactionId) {
    res.status(400).json({ error: 'transactionId required' });
    return;
  }

  try {
    const status = await dodoClient.getPaymentStatus(transactionId);
    res.json(status);
    return;
  } catch (err) {
    logger.error(err, 'Failed to get payment status');
    res.status(500).json({ error: 'Failed to check payment status' });
    return;
  }
});

/**
 * GET /api/payments/doctor/:doctorId
 * Get doctor's consultation earnings
 */
router.get('/doctor/:doctorId', async (req: Request, res: Response) => {
  const doctorParam = req.params['doctorId'];
  const doctorId = Array.isArray(doctorParam) ? doctorParam[0] : doctorParam;

  if (!doctorId) {
    res.status(400).json({ error: 'doctorId required' });
    return;
  }

  try {
    const persistedPayments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.doctorId, doctorId))
      .orderBy(desc(paymentsTable.createdAt));

    const completedPersisted = persistedPayments.filter((p) => p.status === 'completed');
    if (completedPersisted.length > 0) {
      const totalEarnings = completedPersisted.reduce((sum, payment) => sum + Number(payment.amount), 0);

      res.json({
        totalEarnings: totalEarnings.toFixed(2),
        transactionCount: completedPersisted.length,
        currency: 'USDC',
        network: 'Solana',
        transactions: completedPersisted.map((p) => ({
          id: p.id,
          amount: Number(p.amount).toFixed(2),
          date: p.createdAt,
          status: p.status,
          metadata: p.metadata,
        })),
      });
      return;
    }

    const payments = await dodoClient.getDoctorPayments(doctorId);

    const completedPayments = payments.filter((p: any) => p.status === 'completed');
    const totalEarnings = completedPayments.reduce((sum: number, p: any) => sum + (p.amount / 100), 0);

    res.json({
      totalEarnings: totalEarnings.toFixed(2),
      transactionCount: completedPayments.length,
      currency: 'USDC',
      network: 'Solana',
      transactions: completedPayments.map((p: any) => ({
        id: p.id,
        amount: (p.amount / 100).toFixed(2),
        date: p.createdAt,
        status: p.status,
        metadata: p.metadata,
      })),
    });
    return;
  } catch (err) {
    logger.error(err, 'Failed to get doctor payments');
    res.status(500).json({ error: 'Failed to fetch doctor payments' });
    return;
  }
});

/**
 * POST /api/payments/refund/:transactionId
 * Refund a payment (admin only - add auth check)
 */
router.post('/refund/:transactionId', async (req: Request, res: Response) => {
  const txParam = req.params['transactionId'];
  const transactionId = Array.isArray(txParam) ? txParam[0] : txParam;
  const { reason } = req.body;

  // TODO: Add admin authorization check

  if (!transactionId || !reason) {
    res.status(400).json({ error: 'transactionId and reason required' });
    return;
  }

  try {
    const result = await dodoClient.refundPayment(transactionId, reason);
    res.json(result);
    return;
  } catch (err) {
    logger.error(err, 'Failed to refund payment');
    res.status(500).json({ error: 'Refund failed' });
    return;
  }
});

export default router;
