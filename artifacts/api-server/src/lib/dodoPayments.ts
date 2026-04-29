// artifacts/api-server/src/lib/dodoPayments.ts
// DODO Payments Integration - Copy this file directly

import fetch from 'node-fetch';
import crypto from 'crypto';
import { logger } from './logger';

export interface DodoCheckoutSession {
  checkoutUrl: string;
  sessionId: string;
  expiresAt: Date;
}

export interface DodoPaymentStatus {
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
}

const DODO_API_BASE = process.env.DODO_API_ENV === 'production'
  ? 'https://api.dodopayments.com/v1'
  : 'https://api.sandbox.dodopayments.com/v1';

export class DodoPaymentsClient {
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    if (!apiKey || !secretKey) {
      throw new Error('DODO_API_KEY and DODO_SECRET_KEY environment variables are required');
    }
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  /**
   * Create checkout session for doctor consultation
   */
  async createConsultationCheckout(
    patientId: string,
    doctorId: string,
    amount: number = 50,
    currency: string = 'USDC',
    consultationDetails?: string
  ): Promise<DodoCheckoutSession> {
    const payload = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: consultationDetails || `Medical consultation with doctor`,
      metadata: {
        patientId,
        doctorId,
        type: 'consultation',
        timestamp: Date.now(),
      },
      successUrl: `${process.env.APP_URL}/consultation/success?session_id={sessionId}`,
      cancelUrl: `${process.env.APP_URL}/consultation/cancelled`,
      webhookUrl: `${process.env.API_URL}/api/payments/webhook`,
      supportedNetworks: ['solana'],
      supportedStablecoins: ['USDC'],
    };

    const signature = this.generateSignature(JSON.stringify(payload));

    try {
      const response = await fetch(`${DODO_API_BASE}/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Signature': signature,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DODO API error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as any;

      logger.info(
        { sessionId: data.session_id, doctorId, amount },
        'DODO checkout session created'
      );

      return {
        checkoutUrl: data.checkout_url,
        sessionId: data.session_id,
        expiresAt: new Date(data.expires_at),
      };
    } catch (error) {
      logger.error(error, 'Failed to create DODO checkout session');
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const computed = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    const isValid = computed === signature;

    if (!isValid) {
      logger.warn('Invalid webhook signature');
    }

    return isValid;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<DodoPaymentStatus> {
    try {
      const response = await fetch(`${DODO_API_BASE}/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get payment status: ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      return {
        status: data.status,
        amount: data.amount / 100,
        currency: data.currency,
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error(error, `Failed to check payment status for ${transactionId}`);
      throw error;
    }
  }

  /**
   * List doctor's payments
   */
  async getDoctorPayments(doctorId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${DODO_API_BASE}/transactions?metadata.doctorId=${doctorId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch doctor payments');
      }

      const data = (await response.json()) as any;
      return data.transactions || [];
    } catch (error) {
      logger.error(error, `Failed to fetch payments for doctor ${doctorId}`);
      throw error;
    }
  }

  /**
   * Refund payment (if within 24 hours)
   */
  async refundPayment(transactionId: string, reason: string): Promise<any> {
    const payload = {
      transactionId,
      reason,
      timestamp: Date.now(),
    };

    const signature = this.generateSignature(JSON.stringify(payload));

    try {
      const response = await fetch(`${DODO_API_BASE}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Signature': signature,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Refund failed: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info({ transactionId }, 'Payment refunded');
      return data;
    } catch (error) {
      logger.error(error, `Failed to refund payment ${transactionId}`);
      throw error;
    }
  }

  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');
  }
}

// Export singleton instance
export const dodoClient = new DodoPaymentsClient(
  process.env.DODO_API_KEY!,
  process.env.DODO_SECRET_KEY!
);
