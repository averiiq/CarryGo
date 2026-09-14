async function testIdempotency() {
  const url = 'http://localhost:4000/trips';
  const payload = JSON.stringify({
    fromCity: 'Delhi',
    toCity: 'Agra',
    date: '2026-09-20',
    time: '09:00',
    vehicleType: 'car',
    availableCapacity: 10,
    pricePerKg: 25,
  });

  const headers = {
    'Authorization': 'Bearer test-user',
    'Idempotency-Key': 'order-test-uuid-999',
    'Content-Type': 'application/json',
    'X-Forwarded-For': '10.0.0.99',
  };

  console.log('Sending Request 1 with Idempotency-Key: order-test-uuid-999');
  const res1 = await fetch(url, { method: 'POST', headers, body: payload });
  const data1 = await res1.json();
  console.log('Response 1 Status:', res1.status);
  console.log('Response 1 Headers:', Object.fromEntries(res1.headers.entries()));
  console.log('Response 1 Body:', data1);

  console.log('\nSending Request 2 (Retry) with same Idempotency-Key and payload:');
  const res2 = await fetch(url, { method: 'POST', headers, body: payload });
  const data2 = await res2.json();
  console.log('Response 2 Status:', res2.status);
  console.log('Response 2 Headers:', Object.fromEntries(res2.headers.entries()));
  console.log('Response 2 Body:', data2);

  const lookupHeader = res2.headers.get('x-cache-lookup');
  if (lookupHeader === 'IDEMPOTENT_REPLAY') {
    console.log('\n✅ PASS: Idempotency Replay confirmed! Request 2 was served from idempotent cache without duplicate execution.');
  } else {
    console.log('\n⚠️ Replay header check:', lookupHeader);
  }
}

testIdempotency().catch(console.error);
