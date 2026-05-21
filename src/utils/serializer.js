const { createCRC } = require('./payload.util');
const fs = require('fs');

const HEADER_SIZE=16;
const ENTRY_SIZE = 12;

const serializeRecord = (message, offset)=>{
    const payLoadBuf = Buffer.from(message, 'utf-8');
    const bufferLength = payLoadBuf.length;

    const frame = Buffer.allocUnsafe(bufferLength+HEADER_SIZE);
    let cursor = 0;

    const crc = createCRC(payLoadBuf);

    frame.writeBigInt64BE(BigInt(offset), cursor);
    cursor+=8;

    frame.writeUInt32BE(bufferLength, cursor);
    cursor+=4;

    frame.writeUInt32BE(crc, cursor);
    cursor+=4;

    payLoadBuf.copy(frame, cursor);
    return frame;
}


const batchProcessFaster = (messages, baseOffset, appendLogFd, appendIndexFd, currentLogSize)=>{
    const numMessages = messages.length;
    let totalPayloadBytes = 0;
    const lengths = new Int32Array(numMessages);

    for(let i=0; i<numMessages; i++){
        const len = Buffer.byteLength(messages[i], 'utf-8');
        lengths[i] = len;
        totalPayloadBytes += len;
    }

    const totalLogBufferSize = (HEADER_SIZE*numMessages)+totalPayloadBytes;
    const numIndexEntries = Math.ceil(numMessages/10);

    const batchLogBuffer = Buffer.allocUnsafe(totalLogBufferSize);
    const indexLogBuffer = Buffer.allocUnsafe(numIndexEntries*ENTRY_SIZE);

    let logCursor = 0;
    let indexCursor = 0;
    let currentPosition = currentLogSize;

    for(let i=0; i<numMessages; i++){
        const offset = baseOffset + BigInt(i);
        const payLoadLength = lengths[i];

        if(i%10==0){
            indexLogBuffer.writeBigInt64BE(offset, indexCursor);
            indexLogBuffer.writeUInt32BE(currentPosition, indexCursor+8);
            indexCursor += ENTRY_SIZE;
        }

        batchLogBuffer.writeBigInt64BE(offset, logCursor);
        batchLogBuffer.writeUInt32BE(payLoadLength, logCursor+8);
        batchLogBuffer.write(messages[i], logCursor+16, payLoadLength, 'utf-8');

        const payloadSlice = batchLogBuffer.subarray(logCursor + 16, logCursor + 16 + payLoadLength);
        const crc = createCRC(payloadSlice);

        batchLogBuffer.writeUInt32BE(crc, logCursor+12);

        const frameSize = payLoadLength + HEADER_SIZE;
        logCursor += frameSize;
        currentPosition+= frameSize;
    }

    if(indexCursor>0){
        fs.writeSync(appendIndexFd, indexLogBuffer, 0, indexCursor, null);
    }
    fs.writeSync(appendLogFd, batchLogBuffer, 0, logCursor, null);
    return logCursor;
}

module.exports = {
    HEADER_SIZE,
    serializeRecord,
    batchProcess: batchProcessFaster
}