# VeloceLog

A high-performance message broker built from scratch in Node.js, inspired by Apache Kafka. VeloceLog implements a persistent, append-only log storage engine with a custom binary TCP protocol for producer and consumer communication.

## Architecture

VeloceLog is built around three core layers: a storage engine, a request handling layer, and a TCP network layer.

### Storage Engine

The storage engine is the foundation of the system. Messages are persisted to disk in an append-only log format, organized into segments. Each topic is a named, ordered sequence of messages belonging to a specific user.

**Log Segments** are the physical storage unit. Each segment consists of two files — a `.log` file containing the actual message data and an `.index` file for fast offset lookups. Segments have a configurable maximum size (default 10MB) and automatically roll over when full, creating a new active segment while the old one transitions to read-only mode.

**Message Format** on disk follows a fixed binary layout per record:
```
[8 bytes: offset][4 bytes: payload length][4 bytes: CRC32][N bytes: payload]
```
Each message is assigned a monotonically increasing 64-bit offset (BigInt) that uniquely identifies its position within a topic.

**Sparse Indexing** is used to enable fast seeks without indexing every message. Every 10th message written to a segment gets an entry in the `.index` file mapping its offset to its byte position in the `.log` file. To read a message at a given offset, the system performs a binary search on the index to find the nearest indexed position, then scans forward from there. The index file is memory-mapped using `mmap-io` for efficient reads.

**Batch Writes** are the primary write path. Messages are grouped into batches, serialized into a single pre-allocated buffer, and flushed to disk in one `writeSync` call. CRC32 checksums are computed per message and embedded in the record header for corruption detection on read.

**Topics** manage multiple segments and maintain the current write offset. When a batch is written, the topic checks available space in the active segment and triggers a segment roll if needed. Each topic also maintains an in-memory array of segment metadata for efficient segment lookup during reads.

**TopicManager** provides per-user topic isolation. Each user gets their own directory under `data/` and their own map of topic name to `Topic` instance. Topics are created on demand when a producer first writes to them.

### Network Layer

VeloceLog uses a custom binary TCP protocol over a raw `net.createServer()` TCP server listening on port 8000.

**Frame Format** uses a 4-byte length prefix to handle TCP stream fragmentation. The broker accumulates incoming chunks into a per-connection buffer and only processes a frame once the full payload has arrived.

**Request Frame Layout:**
```
[4 bytes: frame length][1 byte: reqCode][4 bytes: userId length][N bytes: userId]
[4 bytes: topicName length][M bytes: topicName]

Append (reqCode = 0):
  [4 bytes: number of messages]
  for each message: [4 bytes: length][N bytes: payload]

Fetch (reqCode = 1):
  [8 bytes: target offset]
```

**Response Frame Layout:**
```
[4 bytes: frame length][1 byte: status][1 byte: reqCode]

Append response: [8 bytes: new nextOffset]
Fetch response:  [4 bytes: message length][N bytes: message]
```

The protocol is implemented in `src/server/protocol.js` with `wrapMessage`, `parseMessage`, `wrapResponse`, and `parseResponse` functions handling serialization and deserialization on both ends.

### Request Handling

The request handler sits between the broker and the storage layer. It maintains a map of userId to TopicManager instances, auto-registering new users on first request. Incoming parsed frames are routed to either `appendMessage` or `readMessage` based on the `reqCode`.

## Project Structure

```
src/
  server/
    broker.js         — TCP server, connection handling, frame accumulation
    protocol.js       — Binary protocol serialization and deserialization
  storage/
    log-segment.js    — Individual segment file management
    topic.js          — Multi-segment topic with write and read methods
    topicManager.js   — Per-user topic registry
    request-handler.js — Routes requests to storage layer
  utils/
    serializer.js     — Batch message serialization with sparse index writing
    indexing.js       — mmap-based binary search on index files
    binarySearch.js   — Lower bound search for segment lookup
    read.js           — Record deserialization with CRC validation
    payload.util.js   — CRC32 computation
data/                 — Runtime storage for topic segment files
```
