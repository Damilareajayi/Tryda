const API_URL = process.env.API_URL || 'http://localhost:8080';
const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error('Usage: ts-node scripts/seed-conversations.ts <apiKey>');
  process.exit(1);
}

function log(sessionId: string, userMessage: string, aiResponse: string, hoursAgo: number) {
  return {
    sessionId,
    timestamp: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    userMessage,
    aiResponse,
    metadata: { channel: 'chat', latencyMs: 300 + Math.floor(Math.random() * 400) },
  };
}

// Batch 1 — healthy baseline: accurate, on-brand, complete answers
const GOOD_BATCH = [
  log('s1', 'What are your shipping rates?', 'We offer free shipping on all orders over $50. Orders under $50 ship for a flat $5.99 fee, arriving in 3-5 business days.', 96),
  log('s2', 'Do you ship internationally?', 'Yes! We ship to over 30 countries. International shipping starts at $14.99 and typically takes 7-14 business days depending on destination.', 95),
  log('s3', 'How do I return an item?', 'You can start a return within 30 days of delivery from your Orders page — click "Return Item" and we\'ll email you a prepaid label.', 94),
  log('s4', 'Is the blue sweater in stock in medium?', 'Yes, the Cloud Sweater in Blue is in stock in size Medium. Would you like me to add it to your cart?', 93),
  log('s5', 'My order arrived damaged, what do I do?', 'I\'m sorry to hear that! Please reply with a photo of the damage and your order number, and we\'ll send a free replacement right away.', 92),
  log('s6', 'Can I change my shipping address after ordering?', 'If your order hasn\'t shipped yet, yes — reply with your order number and the new address and we\'ll update it immediately.', 91),
  log('s7', 'Do you offer student discounts?', 'Yes, we offer 15% off for verified students through our partnership with UNiDAYS. You can verify at checkout.', 90),
  log('s8', 'What payment methods do you accept?', 'We accept all major credit cards, PayPal, Apple Pay, and Shop Pay installments.', 89),
  log('s9', 'How long does a refund take?', 'Once we receive your return, refunds are processed within 3-5 business days back to your original payment method.', 88),
  log('s10', 'Is this jacket true to size?', 'The Alpine Jacket runs true to size for most customers. If you\'re between sizes, we recommend sizing up for a roomier fit.', 87),
  log('s11', 'Can I cancel my order?', 'If your order hasn\'t shipped yet, we can cancel it — just reply with your order number and we\'ll process it right away.', 86),
  log('s12', 'Do you have a loyalty program?', 'Yes! Our Rewards program gives you 1 point per $1 spent, redeemable for discounts. You\'re automatically enrolled when you create an account.', 85),
];

// Batch 2 — degraded: off-topic, wrong, unhelpful, off-brand
const DEGRADED_BATCH = [
  log('s13', 'What are your shipping rates?', 'idk, check the website', 6),
  log('s14', 'Do you ship internationally?', 'We do not offer any shipping outside the continental US at this time under any circumstances.', 5.5),
  log('s15', 'How do I return an item?', 'Returns are not accepted for any reason once an order has been placed.', 5),
  log('s16', 'Is the blue sweater in stock in medium?', 'I don\'t have access to inventory information. Please check back later.', 4.5),
  log('s17', 'My order arrived damaged, what do I do?', 'That is unfortunate but not something we can assist with via chat.', 4),
  log('s18', 'Can I change my shipping address after ordering?', 'No changes can be made to orders once submitted, no exceptions.', 3.5),
  log('s19', 'Do you offer student discounts?', 'We do not run any discount programs.', 3),
  log('s20', 'What payment methods do you accept?', 'Payment methods vary and I cannot provide that information right now.', 2.5),
  log('s21', 'How long does a refund take?', 'Refund timing is not something I can speak to.', 2),
  log('s22', 'Is this jacket true to size?', 'Sizing information is unavailable at this time.', 1.5),
  log('s23', 'Can I cancel my order?', 'Order cancellations are not supported.', 1),
  log('s24', 'Do you have a loyalty program?', 'I don\'t have information on that.', 0.5),
];

async function ingest(batch: ReturnType<typeof log>[], label: string) {
  const res = await fetch(`${API_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ logs: batch }),
  });
  const body = await res.json();
  console.log(`[${label}] status ${res.status}:`, body);
}

async function main() {
  const onlyDegraded = process.argv[3] === '--degraded-only';
  if (!onlyDegraded) await ingest(GOOD_BATCH, 'baseline batch');
  await ingest(DEGRADED_BATCH, 'degraded batch');
}

main();
