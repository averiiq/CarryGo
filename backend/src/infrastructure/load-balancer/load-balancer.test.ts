import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LoadBalancer } from './load-balancer';
import { UpstreamTarget } from './types';

describe('Load Balancer Unit Tests', () => {
  let targets: UpstreamTarget[];

  beforeEach(() => {
    targets = [
      { id: 'node-1', host: '10.0.0.1', port: 8080, activeConnections: 0, isHealthy: true, consecutiveFailures: 0 },
      { id: 'node-2', host: '10.0.0.2', port: 8080, activeConnections: 0, isHealthy: true, consecutiveFailures: 0 },
      { id: 'node-3', host: '10.0.0.3', port: 8080, activeConnections: 0, isHealthy: true, consecutiveFailures: 0 },
    ];
  });

  describe('Round Robin Algorithm', () => {
    it('distributes requests sequentially in round-robin order', () => {
      const lb = new LoadBalancer(targets, { algorithm: 'ROUND_ROBIN' });

      assert.equal(lb.selectTarget().id, 'node-1');
      assert.equal(lb.selectTarget().id, 'node-2');
      assert.equal(lb.selectTarget().id, 'node-3');
      assert.equal(lb.selectTarget().id, 'node-1');
      assert.equal(lb.selectTarget().id, 'node-2');
    });

    it('skips unhealthy targets automatically', () => {
      const lb = new LoadBalancer(targets, { algorithm: 'ROUND_ROBIN' });
      lb.reportFailure('node-2');
      lb.reportFailure('node-2');
      lb.reportFailure('node-2'); // threshold reached

      assert.equal(lb.selectTarget().id, 'node-1');
      assert.equal(lb.selectTarget().id, 'node-3');
      assert.equal(lb.selectTarget().id, 'node-1');
      assert.equal(lb.selectTarget().id, 'node-3');
    });
  });

  describe('Least Connections Algorithm', () => {
    it('selects the target with fewest active connections', () => {
      const lb = new LoadBalancer(targets, { algorithm: 'LEAST_CONNECTIONS' });

      // Simulate connections on node-1 and node-3
      lb.acquireConnection('node-1');
      lb.acquireConnection('node-1');
      lb.acquireConnection('node-3');

      // node-2 has 0 connections, should be selected
      const selected = lb.selectTarget();
      assert.equal(selected.id, 'node-2');

      // Add connection to node-2, now node-3 has 1 and node-2 has 1
      lb.acquireConnection('node-2');
      const nextSelected = lb.selectTarget();
      assert.ok(['node-2', 'node-3'].includes(nextSelected.id));

      // Release connection from node-1
      lb.releaseConnection('node-1');
      lb.releaseConnection('node-1');
      // node-1 is down to 0, should be selected next
      assert.equal(lb.selectTarget().id, 'node-1');
    });
  });

  describe('IP Hash Algorithm', () => {
    it('consistently maps the same client IP to the same target', () => {
      const lb = new LoadBalancer(targets, { algorithm: 'IP_HASH' });

      const targetA1 = lb.selectTarget('203.0.113.195');
      const targetA2 = lb.selectTarget('203.0.113.195');
      assert.equal(targetA1.id, targetA2.id);

      const targetB1 = lb.selectTarget('198.51.100.42');
      const targetB2 = lb.selectTarget('198.51.100.42');
      assert.equal(targetB1.id, targetB2.id);
    });
  });

  describe('Connection Draining', () => {
    it('gracefully drains active connections before removing target', () => {
      const lb = new LoadBalancer(targets, { algorithm: 'ROUND_ROBIN' });
      lb.acquireConnection('node-1');

      // Initiate graceful remove
      lb.removeTarget('node-1', false);

      // node-1 should not receive new traffic
      const selected = lb.selectTarget();
      assert.notEqual(selected.id, 'node-1');

      // Target remains until active connections drop to 0
      assert.equal(lb.getTargets().some(t => t.id === 'node-1'), true);

      lb.releaseConnection('node-1');
      // Now fully drained and removed
      assert.equal(lb.getTargets().some(t => t.id === 'node-1'), false);
    });
  });
});
