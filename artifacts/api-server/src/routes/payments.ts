// artifacts/api-server/src/routes/payments.ts
// Payment endpoints - Copy this file directly

import { Router, Request, Response, IRouter } from 'express';
import { dodoClient } from '../lib/dodoPayments';
import { logger } from '../lib/logger';

const router: IRouter = Router();

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
    return res.status(400).json({ error: 'doctorId and patientId are required' });
  }

  if (consultationPrice <= 0) {
    return res.status(400).json({ error: 'consultationPrice must be greater than 0' });
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
  } catch (err) {
    logger.error(err, 'Failed to create checkout session');
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { event, transactionId, amount, metadata, status } = req.body;

  try {
    logger.info({ event, transactionId, doctorId: metadata?.doctorId }, 'Processing webhook');

    if (event === 'payment.completed') {
      logger.info(
        { transactionId, doctorId: metadata.doctorId, patientId: metadata.patientId },
        'Payment completed'
      );

      // TODO: Implement these actions:
      // 1. Save payment to database
      // 2. Create consultation session
      // 3. Send notification to doctor
      // 4. Send notification to patient
      // 5. Unlock doctor console for patient's records

      res.json({ success: true });
    } else if (event === 'payment.failed') {
      logger.warn({ transactionId }, 'Payment failed');

      // TODO: Notify patient of failure

      res.json({ success: true });
    } else if (event === 'payment.refunded') {
      logger.info({ transactionId }, 'Payment refunded');

      // TODO: Cancel consultation session

      res.json({ success: true });
    } else {
      logger.info({ event }, 'Unhandled webhook event');
      res.json({ success: true });
    }
  } catch (err) {
    logger.error(err, 'Webhook processing error');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/payments/status/:transactionId
 * Check payment status
 */
router.get('/status/:transactionId', async (req: Request, res: Response) => {
  const { transactionId } = req.params;

  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId required' });
  }

  try {
    const status = await dodoClient.getPaymentStatus(transactionId);
    res.json(status);
  } catch (err) {
    logger.error(err, 'Failed to get payment status');
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

/**
 * GET /api/payments/doctor/:doctorId
 * Get doctor's consultation earnings
 */
router.get('/doctor/:doctorId', async (req: Request, res: Response) => {
  const { doctorId } = req.params;

  if (!doctorId) {
    return res.status(400).json({ error: 'doctorId required' });
  }

  try {
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
  } catch (err) {
    logger.error(err, 'Failed to get doctor payments');
    res.status(500).json({ error: 'Failed to fetch doctor payments' });
  }
});

/**
 * POST /api/payments/refund/:transactionId
 * Refund a payment (admin only - add auth check)
 */
router.post('/refund/:transactionId', async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  const { reason } = req.body;

  // TODO: Add admin authorization check

  if (!transactionId || !reason) {
    return res.status(400).json({ error: 'transactionId and reason required' });
  }

  try {
    const result = await dodoClient.refundPayment(transactionId, reason);
    res.json(result);
  } catch (err) {
    logger.error(err, 'Failed to refund payment');
    res.status(500).json({ error: 'Refund failed' });
  }
});

export default router;
