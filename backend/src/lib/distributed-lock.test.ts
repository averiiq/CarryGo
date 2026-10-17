import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DistributedLock } from './distributed-lock';

describe('Distributed Lock Unit Tests', () => {
  it('acquires and releases a lock successfully', async () => {
    const lock = new DistributedLock();
    const resource = 'test-resource-1';

    const token = await lock.acquire(resource, { ttlSeconds: 2 });
    assert.ok(token, 'Lock token should be returned');

    // Attempting to acquire again immediately should fail
    const secondToken = await lock.acquire(resource, { ttlSeconds: 2, retryAttempts: 0 });
    assert.strictEqual(secondToken, null, 'Concurrent lock acquisition must be rejected');

    // Releasing the lock
    const released = await lock.release(resource, token);
    assert.strictEqual(released, true, 'Lock should release cleanly');

    // After release, acquisition should succeed
    const thirdToken = await lock.acquire(resource, { ttlSeconds: 2 });
    assert.ok(thirdToken, 'Resource must be acquirable after release');
    await lock.release(resource, thirdToken);
  });

  it('automatically executes and releases with withLock helper', async () => {
    const lock = new DistributedLock();
    const resource = 'test-resource-2';

    let executed = false;
    const result = await lock.withLock(resource, async () => {
      executed = true;
      return 42;
    });

    assert.strictEqual(executed, true);
    assert.strictEqual(result, 42);

    // Resource should now be free
    const token = await lock.acquire(resource);
    assert.ok(token);
    await lock.release(resource, token);
  });

  it('rejects release if token does not match', async () => {
    const lock = new DistributedLock();
    const resource = 'test-resource-3';

    const token = await lock.acquire(resource, { ttlSeconds: 2 });
    assert.ok(token);

    const released = await lock.release(resource, 'fake-token-123');
    assert.strictEqual(released, false, 'Invalid token must not release the lock');

    // Valid release
    const validRelease = await lock.release(resource, token);
    assert.strictEqual(validRelease, true);
  });
});
