# Deep-Dive Notes — Let’s Handle 1 Million Requests per Second, It’s Scarier Than You Think!

## Source

**Video:** Let’s Handle 1 Million Requests per Second, It’s Scarier Than You Think!  
**Channel:** Cododev  
**Video ID:** `W4EwfEU8CGA`  
**Published:** February 5, 2026  
**Approx. duration:** 2h 40m  

> These notes are a structured engineering study guide based on the public video description/chapter information and multiple detailed public summaries of the video. They are intentionally focused on the architecture, bottlenecks, benchmarks, and the parts that are useful for implementing a scalable backend. They are **not a verbatim transcript**.

---

# 1. Executive Summary

The video is a practical experiment in pushing an HTTP backend from a normal Node.js application toward **1,000,000+ requests per second (1M RPS)**.

The creator starts with a simple server and progressively changes:

1. Runtime/framework
2. CPU utilization
3. Number of processes
4. AWS instance size
5. Database architecture
6. Storage strategy
7. Redis usage
8. Redis clustering
9. JSON parsing
10. Programming language for the hottest route
11. Load-testing infrastructure

The most important lesson is:

> **High-scale performance is not solved by simply adding bigger servers. You identify the current bottleneck, measure it, remove it, and then repeat.**

The experiment uses:

- Node.js
- Express
- Fastify
- Cpeak
- PM2
- PostgreSQL
- Redis
- Redis Cluster
- C++
- Drogon
- RapidJSON
- AWS EC2
- AWS RDS
- AWS networking
- AutoCannon
- CloudWatch/system-level monitoring

The video ultimately demonstrates that a very optimized C++/Drogon/RapidJSON server can cross the 1M RPS range on extremely powerful AWS infrastructure, while Node.js is highly capable but reaches a practical ceiling earlier for the particular CPU-heavy, large-payload benchmark.

---

# 2. Important Context: 1M RPS Is NOT a Normal Production Target

1M RPS sounds like:

```text
1,000,000 requests
        |
        v
     every second
```

That means:

```text
60,000,000 requests/minute
3,600,000,000 requests/hour
86,400,000,000 requests/day
```

At this scale, tiny inefficiencies become enormous.

For example, if every response is only 1 KB larger:

```text
1,000,000 requests/sec
× 1 KB
= ~1 GB/sec additional traffic
```

That is:

```text
~86.4 TB/day
```

So at extreme scale:

- payload size matters
- serialization matters
- JSON parsing matters
- network bandwidth matters
- CPU cycles matter
- database I/O matters
- algorithmic complexity matters
- cloud pricing matters

The video is therefore less about "how to get 1M RPS" and more about **how to think when building high-throughput systems**.

---

# 3. The Core Mental Model

A request travels through multiple resources:

```text
Client
   |
   v
Network
   |
   v
Load Balancer
   |
   v
Application Server
   |
   +------> CPU
   |
   +------> Memory
   |
   +------> Network
   |
   +------> Database
   |
   +------> Cache
   |
   +------> External services
```

At any point, one resource becomes the bottleneck.

For example:

```text
CPU-bound
```

means CPU is limiting throughput.

```text
Network-bound
```

means the network interface is saturated.

```text
Database-bound
```

means database processing/I/O is limiting throughput.

```text
Lock/contention-bound
```

means threads/processes are waiting for shared resources.

```text
Framework-bound
```

means application/framework overhead is consuming too much CPU.

The workflow is:

```text
Measure
  ↓
Find bottleneck
  ↓
Optimize bottleneck
  ↓
Measure again
  ↓
New bottleneck appears
  ↓
Optimize again
```

This loop is the central engineering lesson.

---

# 4. Video Chapters

| Timestamp | Topic |
|---|---|
| 00:00 | Introduction |
| 08:23 | CPU Utilization & Threads |
| 16:32 | Getting Started |
| 20:30 | More on AutoCannon |
| 24:01 | Utilizing More CPU with Clustering |
| 34:24 | Moving to AWS |
| 1:01:50 | Adding a Storage-Based Database |
| 1:24:10 | Speeding Up with a Memory-Based Database |
| 1:36:18 | Redis Cluster Mode |
| 1:51:52 | C++ with Drogon and RapidJSON |
| 2:09:01 | Final Colossal Tests |
| 2:35:18 | Outro |

---

# 5. Phase 1 — Understand CPU Utilization

## 5.1 CPU cores

Modern machines have multiple CPU cores.

A simplified model:

```text
8-core CPU

Core 1
Core 2
Core 3
Core 4
Core 5
Core 6
Core 7
Core 8
```

A traditional single-threaded application may primarily use one core for its main execution path.

Therefore:

```text
8 cores available
+
application effectively using 1 core
=
large amount of unused compute
```

This is one of the first problems the video investigates.

---

# 6. Node.js and the Event Loop

Node.js uses an event-driven architecture.

A simplified model:

```text
Incoming Requests
       |
       v
Node.js Event Loop
       |
       +--> Request A
       +--> Request B
       +--> Request C
       +--> Request D
```

This is excellent for I/O-heavy workloads.

However, CPU-heavy work can become a limitation because JavaScript execution is concentrated around the main event-loop thread.

For example:

```js
app.get("/data", (req, res) => {
    // CPU-heavy work
    // JSON serialization
    // string manipulation
    // calculations

    res.json(data);
});
```

If CPU work becomes expensive, the event loop becomes the bottleneck.

---

# 7. Threads vs Processes

At scale you can use multiple processes:

```text
CPU
├── Core 1 → Node process
├── Core 2 → Node process
├── Core 3 → Node process
├── Core 4 → Node process
├── Core 5 → Node process
└── ...
```

This is why process clustering becomes important.

The video uses **PM2** to spawn multiple Node processes.

Conceptually:

```text
                    Load
                     |
                     v
                  PM2
           / / / / | \ \ \ \
          v v v v  v  v v v
         Node Node Node Node ...
```

Now multiple cores can execute requests.

---

# 8. Phase 2 — Benchmarking

The video uses **AutoCannon** for HTTP load testing.

The basic idea:

```text
Load Generator
      |
      | millions of requests
      v
HTTP Server
```

You measure:

- requests/second
- latency
- throughput
- errors
- CPU usage
- memory
- network traffic

A benchmark is meaningless if the load generator itself is the bottleneck.

Therefore, high-scale testing requires the tester to be powerful enough to generate the intended load.

---

# 9. Framework Comparison

The experiment compares different Node.js approaches.

A simplified progression is:

```text
Express
   ↓
Fastify
   ↓
Cpeak / minimal server
```

Representative results reported by public summaries include roughly:

```text
Express    ≈ 14k–20k RPS
Fastify    ≈ 66k–77k RPS
Cpeak      ≈ 73k RPS
```

These numbers are **benchmark-specific**, not universal framework limits.

The important lesson:

> Framework abstraction has a runtime cost.

Express provides a huge ecosystem and excellent developer productivity.

Fastify reduces some overhead.

A minimal custom server can reduce more overhead.

But that does NOT mean every production application should use a custom framework.

---

# 10. Framework Trade-off

You should think in terms of:

```text
Developer productivity
        ↕
Runtime overhead
```

For most applications:

```text
Express / Fastify / NestJS
```

is more practical than writing a custom HTTP framework.

Only extremely hot paths justify extreme optimization.

---

# 11. Phase 3 — Moving to AWS

The experiment moves from local hardware to AWS.

The architecture becomes approximately:

```text
                    AWS
                     |
              ┌──────┴──────┐
              |             |
           Tester         Server
              |             |
              |             |
          AutoCannon     Node.js
                            |
                         Database
```

AWS makes it possible to provision machines with enormous:

- CPU
- RAM
- network bandwidth
- I/O
- storage

But the cost rises rapidly.

---

# 12. Vertical Scaling

The video heavily demonstrates **vertical scaling**.

Vertical scaling means:

```text
Small machine
     ↓
Bigger machine
     ↓
Much bigger machine
     ↓
Huge machine
```

Example:

```text
4 CPU
   ↓
16 CPU
   ↓
64 CPU
   ↓
128 CPU
   ↓
192 CPU
```

This can dramatically improve performance.

But it eventually reaches physical and economic limits.

---

# 13. Horizontal Scaling

Horizontal scaling means:

```text
1 server
   ↓
10 servers
   ↓
100 servers
   ↓
1000 servers
```

with a load balancer:

```text
                 Load Balancer
                 /     |     \
                /      |      \
               v       v       v
             API 1   API 2   API 3
               |       |       |
               +-------+-------+
                       |
                    Database
```

This is the architecture you generally want for a real production system.

The video's huge single-machine experiment is mainly educational and demonstrates the limits of vertical scaling.

---

# 14. Network Bandwidth Becomes a Bottleneck

Suppose:

```text
1,000,000 requests/sec
```

and every response is:

```text
30 KB
```

Then:

```text
1,000,000 × 30 KB
≈ 30 GB/sec
```

That is:

```text
≈ 240 Gbps
```

before considering protocol overhead.

Therefore:

> A server can have enough CPU but still fail because its network interface cannot move enough data.

This is one of the most important lessons in the entire video.

---

# 15. The Network Wall

At extreme throughput:

```text
CPU
 ↓
████████████████
80%

Network
 ↓
████████████████
100%
```

Adding CPU does nothing.

You need:

- higher network bandwidth
- smaller payloads
- compression where appropriate
- more servers
- better routing
- better architecture

---

# 16. Phase 4 — PostgreSQL

The next major problem is the database.

A naive architecture looks like:

```text
1M requests/sec
       |
       v
Node.js
       |
       v
PostgreSQL
```

This does not automatically mean PostgreSQL can perform 1M operations/sec.

A database has to deal with:

- CPU
- memory
- disk
- WAL
- indexes
- locks
- transactions
- checkpoints
- network
- connection management

---

# 17. Database Writes Are Expensive

Suppose every request performs:

```sql
INSERT INTO requests (...)
VALUES (...);
```

At huge throughput:

```text
Application
    |
    v
1,000,000 writes/sec
    |
    v
PostgreSQL
    |
    +--> CPU
    +--> WAL
    +--> Disk
    +--> Indexes
    +--> Locks
```

The database becomes the bottleneck.

Public summaries of the experiment report PostgreSQL write throughput in the tens of thousands of inserts/sec, with high-end configurations reaching higher values depending on the workload.

The exact number is workload and hardware dependent.

The important conclusion is:

> A durable relational database should not necessarily sit synchronously in the hottest possible request path.

---

# 18. Why Increasing RDS Size Isn't Enough

You can increase:

- CPU
- RAM
- IOPS
- throughput

But cost increases.

Eventually:

```text
More infrastructure
      ↓
Higher cost
      ↓
Only small performance gain
```

This is the point where architecture becomes more important than hardware.

---

# 19. Bad SQL Can Destroy Scalability

One of the strongest lessons from the experiment is algorithmic complexity.

Consider:

```sql
SELECT *
FROM users
ORDER BY RANDOM()
LIMIT 1;
```

This can require evaluating many rows.

If the table contains:

```text
10 rows
```

it is fine.

If it contains:

```text
10 million rows
```

the operation can become extremely expensive.

Conceptually:

```text
O(N)
```

Instead, scalable systems try to use:

```text
O(1)
O(log N)
```

approaches where appropriate.

---

# 20. Avoid COUNT(*) on the Hot Path

Another problematic pattern:

```sql
SELECT COUNT(*)
FROM huge_table;
```

If executed constantly against a massive table, this can become expensive.

Better approaches can include:

- cached counters
- materialized aggregates
- precomputed statistics
- approximate counts
- separate analytics pipelines

The principle is:

> Don't repeatedly calculate information that can be maintained incrementally.

---

# 21. Database Reads Need Indexes

A query like:

```sql
SELECT *
FROM users
WHERE id = $1;
```

with a proper index is fundamentally different from:

```sql
SELECT *
FROM users
WHERE some_function(column) = ...
```

or:

```sql
ORDER BY RANDOM()
```

The database design must support the access pattern.

---

# 22. Phase 5 — Redis

The video then introduces an in-memory database/cache.

The key idea:

```text
PostgreSQL
   |
   | durable
   | disk-backed
   v

Redis
   |
   | memory
   | extremely fast
   v
Hot data
```

Redis is much faster for many workloads because data is primarily served from RAM.

---

# 23. Redis as a Hot Data Layer

Instead of:

```text
Request
   ↓
PostgreSQL
   ↓
Response
```

use:

```text
Request
   ↓
Redis
   ↓
Response
```

For hot data:

```text
Redis HIT
   ↓
Fast response
```

Only when necessary:

```text
Redis MISS
   ↓
PostgreSQL
   ↓
Redis SET
   ↓
Response
```

This dramatically reduces database pressure.

---

# 24. Redis as a Write Buffer

One of the most useful patterns demonstrated by the experiment is:

```text
Client
  |
  v
API
  |
  v
Redis
  |
  | fast
  v
Background worker
  |
  v
PostgreSQL
```

Instead of making the client wait for durable database storage:

```text
Request
 ↓
DB write
 ↓
Response
```

you can sometimes:

```text
Request
 ↓
Redis / queue
 ↓
Immediate response
```

and later:

```text
Redis
 ↓
Batch
 ↓
PostgreSQL
```

This is **asynchronous persistence**.

---

# 25. IMPORTANT: Redis Is Not a Universal PostgreSQL Replacement

Do NOT simply replace every database with Redis.

PostgreSQL provides:

- transactions
- relational queries
- durability
- constraints
- complex filtering
- joins
- mature indexing

Redis is excellent for:

- caching
- counters
- sessions
- hot data
- queues
- rate limiting
- temporary state
- high-speed ingestion

Use both where appropriate.

---

# 26. Phase 6 — Redis Cluster

A single Redis instance eventually becomes a bottleneck.

Conceptually:

```text
                 Redis
                   |
            single machine
                   |
             throughput cap
```

Redis Cluster distributes data:

```text
              Redis Cluster
          /        |        \
         /         |         \
      Master 1   Master 2   Master 3
         |          |          |
      Replica     Replica    Replica
```

More nodes provide:

- more CPU
- more memory
- more network capacity
- more parallelism

---

# 27. Sharding

Redis Cluster uses partitioning/sharding.

Conceptually:

```text
Key A → Shard 1
Key B → Shard 2
Key C → Shard 3
Key D → Shard 1
```

This spreads work.

The general scaling equation becomes:

```text
Single node capacity × number of effective shards
```

subject to:

- network
- hot keys
- skew
- coordination
- cluster overhead

---

# 28. Avoid Hot Keys

Suppose all requests access:

```text
counter:global
```

Then one key may become extremely hot.

Even if the cluster has 30 nodes:

```text
30 nodes available
1 hot key
1 shard receives most traffic
```

You have created a bottleneck.

Better designs distribute work.

---

# 29. UUIDs and Contention

The experiment uses UUID-like identifiers for high-throughput operations.

Why?

Sequential/global counters can create contention:

```text
Request 1 → ID generator
Request 2 → same generator
Request 3 → same generator
...
```

A distributed identifier:

```text
UUID A
UUID B
UUID C
UUID D
```

can be generated independently.

This removes a central synchronization point.

---

# 30. UUID Collision Consideration

For sufficiently large random UUID spaces, collision probability is extremely low.

At extreme scale, however, ID generation should still be designed carefully.

The lesson is not:

> "Always use UUIDs."

The lesson is:

> Avoid unnecessary centralized coordination in the hottest part of a distributed system.

---

# 31. Phase 7 — Node.js Hits a CPU/Framework Ceiling

After optimizing infrastructure, the application itself becomes the bottleneck.

The video investigates:

```text
Express
Fastify
Cpeak
PM2 cluster
```

At extreme throughput, every tiny operation matters:

- routing
- middleware
- JSON parsing
- JSON serialization
- process coordination
- memory allocation
- object creation
- string processing

At ordinary traffic levels these costs are insignificant.

At 1M RPS they become massive.

---

# 32. Cpeak

Cpeak is a lightweight Node.js framework used in the experiment.

The goal is to remove unnecessary abstraction.

Conceptually:

```text
Express
  ↓
Many layers

Fastify
  ↓
Fewer layers

Cpeak
  ↓
Minimal overhead
```

The lesson is:

> Benchmark the actual workload rather than assuming a framework is fast or slow.

---

# 33. The Extreme Case: C++

For the final CPU-heavy benchmark, the application is rewritten in C++.

Why?

C++ provides:

- native compilation
- predictable memory behavior
- efficient multithreading
- low-level control
- high raw CPU performance

The video uses:

- C++
- Drogon
- RapidJSON

---

# 34. Drogon

Drogon is a high-performance C++ HTTP framework.

The architecture becomes:

```text
Incoming Requests
       |
       v
Drogon
       |
       +--> worker threads
       |
       +--> request processing
       |
       v
JSON response
```

Unlike the Node clustering model, Drogon can efficiently use multiple threads within a process.

---

# 35. RapidJSON

JSON processing itself can become a bottleneck.

The video therefore uses RapidJSON.

This demonstrates an important principle:

> Serialization/deserialization is computation.

If you process:

```text
1,000,000 JSON payloads/sec
```

then even a tiny amount of CPU spent per payload becomes enormous.

---

# 36. Why C++ Wins the Extreme Benchmark

At this point the bottleneck is primarily:

```text
CPU
+
JSON processing
+
routing
+
large payload
```

A compiled native implementation reduces overhead.

The reported final benchmark reaches approximately:

```text
~1M–1.2M RPS
```

under extremely powerful AWS hardware and a very specific benchmark workload.

This should NOT be interpreted as:

```text
C++ = always 10x faster than Node
```

Instead:

```text
Extreme CPU-bound workload
+
very optimized implementation
+
huge hardware
=
C++ becomes advantageous
```

---

# 37. The "Beast" AWS Instance

The final experiment uses very large AWS instances.

Public summaries describe an AWS C8gn.48xlarge-class machine with approximately:

```text
192 CPU cores
384 GB RAM
~600 Gbps networking
```

This is not ordinary application infrastructure.

It is experimental high-performance infrastructure.

---

# 38. Final 1M+ RPS Result

The optimized C++ server reaches approximately:

```text
1,000,000+
requests/sec
```

with reported peaks around:

```text
~1.2M RPS
```

and very large network throughput.

The key point:

```text
Application optimization
+
network capacity
+
CPU capacity
+
optimized parser
+
high-end hardware
=
1M+ RPS
```

---

# 39. Final Massive Stress Test

The creator then uses many tester machines.

Conceptually:

```text
Tester 1 ─┐
Tester 2 ─┤
Tester 3 ─┤
Tester 4 ─┤
...        ├──> Beast Server
Tester 60 ─┘
```

The public summaries report approximately:

```text
60 tester instances
~30 minutes
~2 billion requests
~60 TB traffic
~40 timeouts
```

This demonstrates that the final system can sustain enormous traffic for an extended test.

Again, these numbers belong to the specific experiment and should not be treated as universal infrastructure guarantees.

---

# 40. The Most Important Bottlenecks

The video effectively demonstrates this sequence:

```text
1. Single CPU core
       ↓
2. Node/framework overhead
       ↓
3. CPU utilization
       ↓
4. Network bandwidth
       ↓
5. PostgreSQL write capacity
       ↓
6. Database query complexity
       ↓
7. Redis single-node limit
       ↓
8. Redis clustering/sharding
       ↓
9. JSON parsing
       ↓
10. Node process overhead
       ↓
11. C++ native performance
```

The important insight is:

> Once you remove one bottleneck, another bottleneck appears.

---

# 41. Architecture You Should Take From the Video

Do NOT blindly copy the video's final architecture.

Instead, extract the principles.

A production architecture should generally look more like:

```text
                       Internet
                           |
                           v
                    CloudFront / CDN
                           |
                           v
                 Load Balancer / API Edge
                           |
              +------------+------------+
              |            |            |
              v            v            v
           API 1        API 2        API 3
              |            |            |
              +------------+------------+
                           |
              +------------+------------+
              |                         |
              v                         v
            Redis                   PostgreSQL
              |                         |
              |                         |
              v                         v
           Workers                  Read replicas
              |
              v
          Object storage
```

Add queues:

```text
API
 |
 +----> Redis/cache
 |
 +----> Queue
          |
          +----> Worker 1
          +----> Worker 2
          +----> Worker 3
```

---

# 42. Recommended AWS Architecture for Your Project

If your project is a typical Node.js/TypeScript production application, do NOT immediately deploy C++.

Start with:

```text
                    Users
                      |
                      v
                 CloudFront
                      |
                      v
               Application Load
                  Balancer
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
        EC2         EC2         EC2
       Node.js     Node.js     Node.js
          |           |           |
          +-----------+-----------+
                      |
              +-------+-------+
              |               |
              v               v
            Redis          PostgreSQL
              |               |
              |               |
              v               v
           Workers       Read replicas
```

For AWS-only infrastructure, suitable services can include:

- EC2
- Application Load Balancer
- ElastiCache for Redis
- RDS PostgreSQL / Aurora PostgreSQL
- S3
- CloudFront
- SQS
- CloudWatch
- IAM
- Auto Scaling

---

# 43. What Should Go Into Redis?

Good Redis candidates:

### Cache

```text
popular products
popular routes
frequently requested profiles
configuration
temporary API responses
```

### Sessions

```text
session:user:123
```

### Rate limiting

```text
rate:user:123
```

### Counters

```text
views:product:123
```

### Temporary state

```text
booking:abc123
otp:abc123
```

### Queues / streams

Depending on the design:

```text
Redis Streams
```

or preferably a dedicated durable queue such as:

```text
SQS
```

for many AWS-native production workflows.

---

# 44. What Should Stay in PostgreSQL?

Use PostgreSQL for durable business state:

```text
users
accounts
orders
payments
bookings
transactions
permissions
reviews
audit records
```

Example:

```text
users
orders
payments
deliveries
ratings
```

Redis should not become your system of record for critical financial/business data unless you have deliberately designed the durability model.

---

# 45. Use SQS for Asynchronous Work

A scalable pattern:

```text
API
 |
 +--> PostgreSQL
 |
 +--> SQS
        |
        +--> Worker 1
        +--> Worker 2
        +--> Worker 3
```

Examples:

```text
Send notification
Process image
Generate document
AI processing
Email
Analytics
Search indexing
Fraud checking
```

The user should not wait for every background task.

---

# 46. Use S3 for Large Objects

Do not send large files through Node.js unnecessarily.

Bad:

```text
Client
 ↓
Node.js
 ↓
Node memory
 ↓
S3
```

Better:

```text
Client
   |
   | presigned URL
   v
S3
```

Your API only generates authorization.

This reduces:

- CPU
- memory
- network load
- server bandwidth

---

# 47. CloudFront

For static and cacheable content:

```text
User
 ↓
CloudFront Edge
 ↓
S3 / Origin
```

Instead of:

```text
User
 ↓
Node.js
 ↓
S3
```

This dramatically reduces origin traffic.

---

# 48. Cache Strategy

A basic strategy:

```text
Request
  |
  v
Redis?
 /   \
Yes   No
 |     |
 v     v
Return PostgreSQL
       |
       v
     Redis
       |
       v
     Return
```

For public content:

```text
Browser
   ↓
CloudFront
   ↓
Redis
   ↓
PostgreSQL
```

depending on the API architecture.

---

# 49. Cache Invalidation

Caching introduces a new problem:

> How do we know when cached data is stale?

Possible strategies:

### TTL

```text
cache.set(key, value, 300)
```

### Write-through

```text
DB update
 ↓
Redis update
```

### Cache-aside

```text
Read Redis
 ↓
Miss
 ↓
DB
 ↓
Redis
```

### Event-based invalidation

```text
DB change
 ↓
Event
 ↓
Invalidate cache
```

For most applications, start with cache-aside + sensible TTLs.

---

# 50. Avoid Cache Stampede

Imagine:

```text
Popular key expires
       |
       v
1,000 requests simultaneously
       |
       v
All hit PostgreSQL
```

Your cache has accidentally caused a database spike.

Solutions:

- locking
- request coalescing
- stale-while-revalidate
- randomized TTL
- background refresh

---

# 51. Database Scaling Strategy

Start:

```text
1 PostgreSQL
```

Then:

```text
Primary
 |
 +--> Read Replica 1
 +--> Read Replica 2
```

Eventually:

```text
Application
   |
   +---- writes ---> Primary
   |
   +---- reads ----> Replicas
```

For very large systems:

- partitioning
- sharding
- separate read models
- event-driven pipelines

may be required.

Do not introduce them prematurely.

---

# 52. Database Connection Pooling

Never allow every incoming request to create a new database connection.

Bad:

```text
1M requests
1M DB connections
```

Instead:

```text
API servers
     |
     v
Connection Pool
     |
     v
PostgreSQL
```

Use a bounded pool.

The exact pool size depends on:

- DB CPU
- query latency
- number of API instances
- workload
- DB max connections

More connections do not automatically mean more performance.

---

# 53. API Design Rules Learned From the Video

For high throughput:

### 1. Keep responses small

Instead of:

```json
{
  "user": "...",
  "unusedData": "...",
  "hugeNestedObject": "..."
}
```

return only what the client needs.

### 2. Paginate

Never return millions of rows.

### 3. Use indexes

Every hot query should have a deliberate access path.

### 4. Avoid N+1 queries

Bad:

```text
1 request
+
100 database queries
```

Better:

```text
1 request
+
1–few optimized queries
```

### 5. Avoid unnecessary JSON transformation

Serialization is CPU work.

---

# 54. Big-O Rules

At high scale:

```text
O(1)        excellent
O(log N)    generally excellent
O(N)        potentially expensive
O(N log N)  expensive
O(N²)       dangerous
```

Example:

```text
100 records → O(N) is fine
1,000,000 records → O(N) may be catastrophic
```

Always ask:

> What is the complexity of this operation as data grows?

---

# 55. Avoid Global Locks

A centralized lock can become:

```text
1M requests
     |
     v
Global lock
     |
     v
Only one proceeds
```

This destroys concurrency.

Prefer:

- partitioned locks
- atomic operations
- sharding
- optimistic concurrency
- lock-free structures where appropriate

---

# 56. Rate Limiting

At scale you must protect the system.

Architecture:

```text
User
 |
 v
Rate Limiter
 |
 +---- allowed ---> API
 |
 +---- blocked ---> 429
```

Redis is commonly useful:

```text
user:123:rate
```

Algorithms include:

- token bucket
- leaky bucket
- fixed window
- sliding window

---

# 57. Backpressure

If downstream capacity is:

```text
50k/sec
```

but incoming traffic is:

```text
100k/sec
```

you cannot process everything immediately.

Use:

```text
API
 |
 v
Queue
 |
 v
Workers
 |
 v
Database
```

The queue absorbs bursts.

This is one of the most important production lessons from the video.

---

# 58. Observability

At high traffic, logs alone are insufficient.

Track:

### Application

- RPS
- p50 latency
- p95 latency
- p99 latency
- error rate
- timeout rate

### CPU

- total CPU
- per-core CPU

### Memory

- heap
- RSS
- GC activity

### Network

- inbound bytes
- outbound bytes
- packets
- connection count

### Database

- query latency
- connection utilization
- CPU
- IOPS
- locks
- cache hit ratio

### Redis

- ops/sec
- memory
- evictions
- hit/miss ratio
- latency
- hot keys

---

# 59. p50 / p95 / p99

Average latency can hide problems.

Example:

```text
Requests:

95% → 20ms
4%  → 100ms
1%  → 5 seconds
```

Average may look acceptable.

But p99 is:

```text
5 seconds
```

Therefore monitor:

```text
p50
p95
p99
```

---

# 60. Failure Handling

At scale, failure is normal.

Assume:

```text
EC2 can fail
Redis can fail
DB can slow down
Network can fail
AWS service can degrade
```

Use:

- retries
- timeouts
- circuit breakers
- health checks
- failover
- replication
- dead-letter queues
- idempotency
- graceful degradation

---

# 61. Retry Storms

A dangerous pattern:

```text
Service A
  |
  v
Service B
  X fails

1000 requests retry
  |
  v
Service B
  X fails again

10,000 retries
  |
  v
Service B
  X collapses completely
```

Use:

```text
exponential backoff
+
jitter
+
retry limits
```

---

# 62. Idempotency

Important for payments, bookings, deliveries, etc.

Example:

```text
POST /payment
```

Client times out.

Client retries.

Without idempotency:

```text
Payment 1
Payment 2
```

With idempotency:

```text
Idempotency-Key: abc123
```

Server recognizes:

```text
abc123 already processed
```

and returns the previous result.

---

# 63. Why This Matters for Your Project

Do not copy:

```text
192 CPU machine
C++
30 Redis nodes
60 load generators
```

unless your traffic actually demands it.

Instead copy the **architecture principles**.

Start with:

```text
Node.js/TypeScript
+
PostgreSQL
+
Redis
+
S3
+
SQS
+
CloudFront
+
ALB
+
CloudWatch
```

Then measure.

Only optimize the hot path after profiling proves it is necessary.

---

# 64. Recommended Project Architecture

For a modern AWS-backed application:

```text
                        USERS
                          |
                          v
                    CloudFront
                          |
                          v
                    API Gateway
                    /          \
                   /            \
                  v              v
             Public APIs      Auth APIs
                  |
                  v
             Load Balancer
                  |
       +----------+----------+
       |          |          |
       v          v          v
     API-1      API-2      API-3
   Node.js     Node.js    Node.js
       |          |          |
       +----------+----------+
                  |
       +----------+----------+
       |                     |
       v                     v
     Redis               PostgreSQL
       |                     |
       |                     +--> Read Replica
       |
       v
      SQS
       |
   +---+---+---+
   |   |   |   |
   v   v   v   v
 Worker Worker Worker
       |
       v
      S3
```

---

# 65. AWS Service Mapping

| Requirement | AWS Service |
|---|---|
| Compute | EC2 |
| Containerized compute | ECS/Fargate |
| Load balancing | ALB/NLB |
| CDN | CloudFront |
| Object storage | S3 |
| PostgreSQL | RDS/Aurora PostgreSQL |
| Redis | ElastiCache for Redis |
| Queue | SQS |
| Pub/Sub/eventing | SNS/EventBridge |
| Monitoring | CloudWatch |
| Metrics | CloudWatch |
| IAM | IAM |
| Secrets | Secrets Manager |
| DNS | Route 53 |
| TLS | ACM |
| Serverless functions | Lambda |

---

# 66. What to Implement First

Do NOT begin with 1M RPS architecture.

### Stage 1 — Correctness

Build:

```text
API
 ↓
PostgreSQL
```

Make sure:

- authentication works
- business logic works
- database schema is correct
- transactions are correct
- validation is correct

---

# 67. Stage 2 — Basic Performance

Add:

```text
Redis
```

Use it for:

- sessions
- frequently accessed data
- rate limits
- temporary state

Add database indexes.

Measure API latency.

---

# 68. Stage 3 — Async Processing

Add:

```text
SQS
 ↓
Workers
```

Move heavy work out of synchronous requests.

Examples:

```text
emails
notifications
AI jobs
image processing
analytics
document generation
```

---

# 69. Stage 4 — Horizontal Scaling

Deploy:

```text
API 1
API 2
API 3
```

behind:

```text
ALB
```

Make the API stateless.

Avoid storing local session state on individual EC2 instances.

---

# 70. Stage 5 — CDN/Object Storage

Move large/static assets to:

```text
S3 + CloudFront
```

Use:

```text
presigned URLs
```

for uploads.

---

# 71. Stage 6 — Observability

Before attempting extreme optimization:

Install:

```text
CloudWatch
structured logs
metrics
alarms
tracing
```

Track:

```text
RPS
p95
p99
CPU
memory
DB latency
Redis latency
queue depth
errors
```

---

# 72. Stage 7 — Load Testing

Use:

```text
AutoCannon
k6
Artillery
JMeter
```

A simple progression:

```text
100 RPS
 ↓
500 RPS
 ↓
1,000 RPS
 ↓
5,000 RPS
 ↓
10,000 RPS
 ↓
50,000 RPS
```

At every stage:

```text
Measure
↓
Find bottleneck
↓
Fix
↓
Repeat
```

---

# 73. Do Not Load-Test Production

Use:

```text
Development
       ↓
Staging
       ↓
Dedicated performance environment
```

High-volume load tests can:

- destroy caches
- overload DBs
- trigger alerts
- generate huge AWS bills
- affect real users
- exhaust quotas

---

# 74. Cost Engineering

The video strongly demonstrates that performance has a price.

At extreme scale:

```text
More CPU
+
More RAM
+
More IOPS
+
More network
+
More instances
=
Huge cloud bill
```

Therefore optimize:

```text
requests
payload
queries
cache
network
CPU
storage
```

before simply increasing infrastructure.

---

# 75. Cost Calculation Mindset

Always calculate:

```text
Requests/sec
×
Average payload
=
Network/sec
```

and:

```text
Requests/sec
×
DB operations/request
=
DB operations/sec
```

Example:

```text
10,000 RPS
× 5 DB queries
=
50,000 DB queries/sec
```

A seemingly small API can create a huge database workload.

---

# 76. The Most Important Formula

Think about every request as a budget:

```text
Request
 ├── CPU budget
 ├── Memory budget
 ├── Network budget
 ├── Database budget
 ├── Cache budget
 └── Latency budget
```

For example:

```text
Target latency = 100ms

API processing = 10ms
Redis = 2ms
DB = 20ms
External API = 50ms
Network = 10ms

Total = 92ms
```

You have almost no remaining budget.

---

# 77. Back-of-the-Envelope Capacity Planning

Before deploying:

```text
Expected RPS
×
Requests per user
×
Users
```

Example:

```text
100,000 users
× 10 requests/minute
=
1,000,000 requests/minute
```

Then:

```text
1,000,000 / 60
≈ 16,667 RPS
```

Now design for peak traffic, not average traffic.

If peak is 5× average:

```text
≈ 83,000 RPS
```

That is a meaningful engineering target.

---

# 78. Real-World Production Target

For most startups, the goal should not be:

```text
1M RPS
```

The goal should be:

```text
Required traffic
+
acceptable latency
+
high availability
+
reasonable cost
```

For example:

```text
20k RPS
99.9% availability
p95 < 150ms
```

may be far more valuable than:

```text
1M RPS
but $30k+/month
```

---

# 79. What I Would NOT Implement From the Video

Do not immediately implement:

- C++
- custom HTTP framework
- 30-node Redis cluster
- giant EC2 instances
- custom JSON parser
- dozens of load-test servers
- custom database engine

unless your measurements justify them.

---

# 80. What I WOULD Implement

Implement these principles:

### High priority

- Stateless APIs
- Horizontal scaling
- Redis caching
- PostgreSQL indexing
- Connection pooling
- SQS asynchronous processing
- S3 for files
- CloudFront CDN
- Rate limiting
- Idempotency
- Timeouts
- Retries with backoff
- Monitoring
- Load testing

### Later

- Redis Cluster
- Read replicas
- database partitioning
- sharding
- multi-region deployment
- service decomposition
- native-language hot paths

---

# 81. Golden Architecture Principle

Do not optimize everything.

Optimize:

```text
The hottest path
```

For example:

```text
100 API endpoints

99 endpoints → 100 RPS
1 endpoint  → 100,000 RPS
```

The 100,000 RPS endpoint deserves most of the optimization effort.

---

# 82. Bottleneck Decision Tree

Use this during development:

```text
Is CPU > 80–90%?
        |
       YES
        |
        v
Profile CPU
        |
        +--> framework overhead?
        +--> JSON?
        +--> serialization?
        +--> algorithm?
        +--> GC?
```

If CPU is fine:

```text
Is network saturated?
        |
       YES
        |
        v
Reduce payload
or add network capacity
```

If network is fine:

```text
Is DB slow?
        |
       YES
        |
        v
Indexes
query optimization
Redis
read replicas
batching
```

If DB is fine:

```text
Is Redis saturated?
        |
       YES
        |
        v
Cluster/shard
remove hot keys
```

If everything is fine:

```text
Load generator may be the bottleneck.
```

---

# 83. Important Testing Rule

Never say:

> "Our API can handle 100k RPS."

without defining:

- endpoint
- payload size
- response size
- concurrency
- latency target
- error rate
- hardware
- database state
- cache state
- network
- test duration

A benchmark number without context is almost meaningless.

---

# 84. Reproduction Stack From the Video

The public video description references source repositories for:

### Node.js

`agile8118/node-1m-rps`

### C++

`agile8118/cpp-1m-rps`

### Tester

`agile8118/1m-rps-tester`

The experiment also uses:

- AutoCannon
- Fastify
- Cpeak
- PM2
- AWS EC2
- AWS RDS
- Redis
- Drogon
- RapidJSON

---

# 85. Suggested Folder Structure for Your Own Project

```text
project/
│
├── apps/
│   ├── api/
│   ├── worker/
│   └── scheduler/
│
├── packages/
│   ├── config/
│   ├── database/
│   ├── redis/
│   ├── queue/
│   ├── auth/
│   └── shared/
│
├── infrastructure/
│   ├── terraform/
│   ├── docker/
│   ├── nginx/
│   └── monitoring/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/
│
└── docs/
    ├── architecture/
    ├── api/
    └── performance/
```

---

# 86. Recommended Backend Flow

```text
HTTP Request
     |
     v
Validation
     |
     v
Authentication
     |
     v
Rate Limit
     |
     v
Cache Check
     |
     +------ HIT ------> Response
     |
    MISS
     |
     v
Business Logic
     |
     +------ async work ------> SQS
     |
     v
PostgreSQL
     |
     v
Update Cache
     |
     v
Response
```

---

# 87. Recommended Async Flow

```text
API
 |
 v
SQS
 |
 +---- Worker 1
 |
 +---- Worker 2
 |
 +---- Worker 3
 |
 v
Database / S3 / External API
```

Use a Dead Letter Queue:

```text
SQS
 |
 +---- successful ---> processed
 |
 +---- failed -------> retry
                         |
                         v
                       DLQ
```

---

# 88. Production Reliability Checklist

## API

- [ ] Stateless
- [ ] Input validation
- [ ] Authentication
- [ ] Authorization
- [ ] Rate limiting
- [ ] Request timeout
- [ ] Response timeout
- [ ] Idempotency where required

## Database

- [ ] Indexes
- [ ] Connection pool
- [ ] Slow query monitoring
- [ ] Backups
- [ ] Multi-AZ
- [ ] Read replicas if needed
- [ ] Query plans reviewed

## Redis

- [ ] TTLs
- [ ] Memory limits
- [ ] Eviction policy
- [ ] Hit/miss monitoring
- [ ] Hot-key monitoring
- [ ] Cluster only when required

## Queue

- [ ] Visibility timeout
- [ ] Retry policy
- [ ] DLQ
- [ ] Consumer scaling
- [ ] Queue depth monitoring

## AWS

- [ ] IAM least privilege
- [ ] VPC
- [ ] Private subnets
- [ ] Security groups
- [ ] CloudWatch
- [ ] Autoscaling
- [ ] Budget alarms

---

# 89. Performance Checklist

Before optimizing:

```text
[ ] Define target RPS
[ ] Define p95/p99 latency
[ ] Define payload size
[ ] Define error budget
[ ] Define availability target
```

Then:

```text
[ ] Load test
[ ] CPU profile
[ ] Check network
[ ] Check database
[ ] Check Redis
[ ] Check GC
[ ] Check connection pools
[ ] Check query plans
```

---

# 90. Core Lessons From the Video

## Lesson 1

**Measure before optimizing.**

---

## Lesson 2

**The bottleneck moves.**

Fix CPU and network becomes the bottleneck.

Fix network and database becomes the bottleneck.

Fix database and serialization may become the bottleneck.

---

## Lesson 3

**Database operations are expensive.**

Avoid unnecessary DB work.

---

## Lesson 4

**Memory is extremely valuable for hot data.**

Redis can dramatically reduce database pressure.

---

## Lesson 5

**Caching is one of the biggest scalability tools.**

The fastest query is often the query you never execute.

---

## Lesson 6

**Algorithmic complexity matters.**

A bad O(N) operation can destroy an otherwise powerful system.

---

## Lesson 7

**Framework overhead matters at extreme scale.**

But developer productivity usually matters more at normal scale.

---

## Lesson 8

**Network bandwidth is a real bottleneck.**

Large responses multiply traffic requirements.

---

## Lesson 9

**Async processing protects the request path.**

Use queues/workers for expensive non-critical work.

---

## Lesson 10

**Horizontal scaling is the production answer.**

A giant server is useful for experiments but creates a large blast radius.

---

# 91. Practical Implementation Roadmap

## Phase A — Baseline

```text
Node.js
PostgreSQL
```

Measure:

```text
RPS
p50
p95
p99
CPU
memory
DB latency
```

---

## Phase B — Database Optimization

Implement:

```text
Indexes
Query optimization
Connection pooling
Pagination
Batch operations
```

---

## Phase C — Redis

Add:

```text
Cache
Sessions
Rate limiting
Counters
Temporary state
```

---

## Phase D — Async

Add:

```text
SQS
Workers
DLQ
Retry policies
```

---

## Phase E — Horizontal Scaling

Deploy:

```text
ALB
 |
 +--> API 1
 +--> API 2
 +--> API 3
```

---

## Phase F — CDN/Object Storage

Add:

```text
S3
CloudFront
Presigned URLs
```

---

## Phase G — Observability

Add:

```text
CloudWatch
Metrics
Logs
Alarms
Tracing
```

---

## Phase H — Performance Testing

Test:

```text
1k
5k
10k
25k
50k
100k
```

and find the real bottleneck.

---

## Phase I — Advanced Scaling

Only if necessary:

```text
Redis Cluster
Read replicas
DB partitioning
Sharding
Multi-region
Native hot-path service
```

---

# 92. Final Architecture Philosophy

The video's most valuable architecture is not:

```text
C++
+
192 cores
+
30 Redis nodes
+
60 testers
```

The valuable architecture philosophy is:

```text
                 SCALE
                   |
       +-----------+-----------+
       |           |           |
      CPU       NETWORK       DATA
       |           |           |
       v           v           v
   optimize     optimize    optimize
       |           |           |
       +-----------+-----------+
                   |
             MEASURE AGAIN
```

The engineering cycle is:

```text
Build
 ↓
Measure
 ↓
Profile
 ↓
Identify bottleneck
 ↓
Optimize
 ↓
Load test
 ↓
Measure again
```

---

# 93. One-Line Takeaway

> **Don't build for 1 million requests per second because a video did it. Build the simplest architecture that meets your real traffic target, then scale each bottleneck independently as measurements demand it.**

---

# 94. Source / Further Study

Primary video:

**Cododev — Let’s Handle 1 Million Requests per Second, It’s Scarier Than You Think!**

Publicly referenced repositories:

- Node.js experiment: `github.com/agile8118/node-1m-rps`
- C++ experiment: `github.com/agile8118/cpp-1m-rps`
- Load tester: `github.com/agile8118/1m-rps-tester`

Important tools/technologies:

- AutoCannon
- Fastify
- Cpeak
- PM2
- AWS EC2
- AWS RDS
- Redis
- Redis Cluster
- Drogon
- RapidJSON

---

# 95. Implementation Rule for Your Project

Before adding any infrastructure from this document, answer:

```text
1. What is my expected average RPS?
2. What is my expected peak RPS?
3. What is my target p95 latency?
4. What is my average request size?
5. What is my average response size?
6. How many DB queries happen per request?
7. Which operations can be cached?
8. Which operations can be asynchronous?
9. Which data must be strongly durable?
10. Which component is currently the bottleneck?
```

Then implement only what the measurements justify.

---

## Final Mental Model

```text
                    USER
                      |
                      v
                  CDN / EDGE
                      |
                      v
                LOAD BALANCER
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
        API-1       API-2       API-3
          |           |           |
          +-----------+-----------+
                      |
          +-----------+-----------+
          |                       |
          v                       v
        REDIS                POSTGRESQL
          |                       |
          |                       +--> READ REPLICAS
          |
          v
        QUEUE
          |
     +----+----+
     |    |    |
     v    v    v
   WORKERS / BACKGROUND JOBS
          |
     +----+----+
     |         |
     v         v
    S3     External Services


          OBSERVABILITY
                |
                v
       CloudWatch / Metrics
```

**This is the production-oriented interpretation of the video: cache aggressively where safe, keep the synchronous request path small, move expensive work to queues, keep durable state in a proper database, scale horizontally, and use profiling rather than assumptions to decide when deeper optimizations are necessary.**
