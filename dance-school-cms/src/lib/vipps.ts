// Vipps configuration and utilities
export const VIPPS_CONFIG = {
  baseUrl: 'https://apitest.vipps.no', // Test environment
  clientId: process.env.VIPPS_CLIENT_ID!,
  clientSecret: process.env.VIPPS_CLIENT_SECRET!,
  subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY!,
  msn: process.env.VIPPS_MSN!,
  currency: 'NOK',
  testPhoneNumber: '4799139625', // Test phone number for Vipps test environment
};

export interface VippsAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface VippsPaymentResponse {
  orderId: string;
  url: string;
}

export interface VippsPaymentDetails {
  orderId: string;
  transactionInfo: {
    amount: number;
    status: string;
    transactionId: string;
    timeStamp: string;
  };
  transactionSummary: {
    capturedAmount: number;
    remainingAmountToCapture: number;
    refundedAmount: number;
    remainingAmountToRefund: number;
  };
  userDetails?: {
    userId: string;
    mobileNumber: string;
  };
}

export async function getVippsAccessToken(): Promise<string> {
  const response = await fetch(`${VIPPS_CONFIG.baseUrl}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client_id': VIPPS_CONFIG.clientId,
      'client_secret': VIPPS_CONFIG.clientSecret,
      'Ocp-Apim-Subscription-Key': VIPPS_CONFIG.subscriptionKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Vipps access token: ${response.status} ${errorText}`);
  }

  const data: VippsAccessTokenResponse = await response.json();
  return data.access_token;
}

export async function createVippsPayment(
  accessToken: string,
  orderId: string,
  amount: number,
  description: string,
  successUrl: string,
  cancelUrl: string,
  userPhone?: string
): Promise<VippsPaymentResponse> {
  const paymentData = {
    customerInfo: {
      mobileNumber: userPhone || VIPPS_CONFIG.testPhoneNumber,
    },
    merchantInfo: {
      merchantSerialNumber: VIPPS_CONFIG.msn,
      callbackPrefix: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/vipps/webhook`,
      fallBack: cancelUrl,
      paymentType: 'eComm Regular Payment',
    },
    transaction: {
      orderId,
      amount: amount * 100, // Convert to øre (smallest currency unit)
      transactionText: description,
      skipLandingPage: false,
    },
  };

  const response = await fetch(`${VIPPS_CONFIG.baseUrl}/ecomm/v2/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': VIPPS_CONFIG.subscriptionKey,
      'X-Request-Id': orderId,
      'X-TimeStamp': new Date().toISOString(),
      'X-Source-Address': '127.0.0.1',
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Vipps payment: ${response.status} ${errorText}`);
  }

  const data: VippsPaymentResponse = await response.json();
  return data;
}

export async function getVippsPaymentDetails(accessToken: string, orderId: string): Promise<VippsPaymentDetails> {
  const response = await fetch(`${VIPPS_CONFIG.baseUrl}/ecomm/v2/payments/${orderId}/details`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': VIPPS_CONFIG.subscriptionKey,
      'X-Request-Id': `details-${orderId}-${Date.now()}`,
      'X-TimeStamp': new Date().toISOString(),
      'X-Source-Address': '127.0.0.1',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Vipps payment details: ${response.status} ${errorText}`);
  }

  return await response.json();
}

export function mapVippsStatusToPaymentStatus(vippsStatus: string): { paymentStatus: string; bookingStatus: string } {
  switch (vippsStatus) {
    case 'SALE':
    case 'CAPTURED':
      return { paymentStatus: 'completed', bookingStatus: 'confirmed' };
    case 'CANCELLED':
    case 'FAILED':
      return { paymentStatus: 'failed', bookingStatus: 'cancelled' };
    case 'RESERVED':
      return { paymentStatus: 'pending', bookingStatus: 'pending' };
    default:
      return { paymentStatus: 'pending', bookingStatus: 'pending' };
  }
}
