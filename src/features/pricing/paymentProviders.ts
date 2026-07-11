export type PaymentProviderId = 'fib' | 'fastpay' | 'nass' | 'zaincash' | 'qi';

export type PaymentProvider = {
  id: PaymentProviderId;
  name: string;
  checkoutLabel: string;
  docsUrl: string;
  productionAccountRequired: true;
  accountRequirement: string;
  credentials: readonly string[];
  integrationFlow: readonly string[];
  supportsWebhook: boolean;
  supportsRedirect: boolean;
  supportsRefunds: boolean | 'contract-dependent';
};

export const paymentProviders: readonly PaymentProvider[] = [
  {
    id: 'fib',
    name: 'FIB',
    checkoutLabel: 'Pay with FIB',
    docsUrl: 'https://fib.iq/integrations/web-payments/',
    productionAccountRequired: true,
    accountRequirement:
      'Register for sandbox, then submit the FIB integration request so FIB can issue production client credentials.',
    credentials: ['client_id', 'client_secret'],
    integrationFlow: [
      'Get OAuth2 client-credentials access token',
      'Create an IQD payment session',
      'Show QR, readable code, or app link',
      'Confirm payment from callback or status check',
    ],
    supportsWebhook: true,
    supportsRedirect: false,
    supportsRefunds: false,
  },
  {
    id: 'fastpay',
    name: 'FastPay',
    checkoutLabel: 'Pay with FastPay',
    docsUrl: 'https://fast-pay.iq/integrate-web',
    productionAccountRequired: true,
    accountRequirement:
      'Contact the FastPay Merchant Acquisition Team to create a merchant account and receive generated credentials.',
    credentials: ['storeId', 'storePassword'],
    integrationFlow: [
      'Initiate payment from the merchant backend',
      'Redirect or launch the FastPay payment experience',
      'Validate transaction and amount with the validation API',
      'Receive IPN notifications for final confirmation',
    ],
    supportsWebhook: true,
    supportsRedirect: true,
    supportsRefunds: true,
  },
  {
    id: 'nass',
    name: 'NASS',
    checkoutLabel: 'Pay with NASS',
    docsUrl: 'https://nass.iq/resources/developers',
    productionAccountRequired: true,
    accountRequirement:
      'Become a NASS partner before using payment APIs; NASS reviews the business and follows up with access details.',
    credentials: ['partner-issued API credentials'],
    integrationFlow: [
      'Complete partner onboarding',
      'Choose online or in-person payment integration',
      'Create payments through the NASS API',
      'Handle NASS webhooks for payment and account updates',
    ],
    supportsWebhook: true,
    supportsRedirect: true,
    supportsRefunds: 'contract-dependent',
  },
  {
    id: 'zaincash',
    name: 'ZainCash',
    checkoutLabel: 'Pay with ZainCash',
    docsUrl: 'https://docs.zaincash.iq/',
    productionAccountRequired: true,
    accountRequirement:
      'Submit a business request and complete ZainCash onboarding; production credentials are issued by the business team.',
    credentials: ['client_id', 'client_secret', 'API key'],
    integrationFlow: [
      'Get OAuth2 client-credentials access token',
      'Create transaction with a unique externalReferenceId',
      'Redirect the customer to the returned redirectUrl',
      'Verify JWT redirect/webhook tokens before fulfilling access',
    ],
    supportsWebhook: true,
    supportsRedirect: true,
    supportsRefunds: 'contract-dependent',
  },
  {
    id: 'qi',
    name: 'QiCard',
    checkoutLabel: 'Pay with QiCard',
    docsUrl: 'https://developers-gate.qi.iq/docs/api-endpoints/create-payment',
    productionAccountRequired: true,
    accountRequirement:
      'Obtain a QiCard Merchant Terminal ID and API credentials from the acquirer before creating production payments.',
    credentials: ['X-Terminal-Id', 'API username', 'API password or signing credentials'],
    integrationFlow: [
      'Create an IQD payment with a unique requestId',
      'Redirect web customers to the returned formUrl or use the mobile SDK',
      'Accept card, saved-card token, or enabled SuperQi wallet methods',
      'Verify webhook and payment status before fulfilling access or wallet top-up',
    ],
    supportsWebhook: true,
    supportsRedirect: true,
    supportsRefunds: true,
  },
] as const;

export function paymentProviderById(id: PaymentProviderId) {
  return paymentProviders.find((provider) => provider.id === id) ?? paymentProviders[0];
}
