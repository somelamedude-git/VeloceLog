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

const batchProcess = (messages, baseOffset, appendLogFd, appendIndexFd, currentLogSize)=>{ // here baseOffser is how much upto the brim it has been filled
    let position = currentLogSize;

    for(let i=0; i<messages.length; i++){
        let offset = baseOffset + BigInt(i);
        const wrappedMessageBuf = serializeRecord(messages[i], offset);
        if(i%10==0){
            const indexEntry = Buffer.allocUnsafe(12);
            indexEntry.writeBigInt64BE(offset, 0);
            indexEntry.writeUInt32BE(position, 8);
            fs.writeSync(appendIndexFd, indexEntry, 0, indexEntry.length, null);
        }

        fs.writeSync(appendLogFd, wrappedMessageBuf, 0, wrappedMessageBuf.length, null);
        position += wrappedMessageBuf.length;
    }
    return position-currentLogSize;
}


const batchProcessFaster = (messages, baseOffset, appendLogFd, appendIndexFd, currentLogSize)=>{
    const numMessages = messages.length;
    let totalPayloadBytes = 0;
    const lengths = new Int32Array(numMessages);

    for(let i=0; i<numMessages; i++){
        const len = Buffer.byteLength(messages[i], 'utf-8');
        lengths[i] = len;
        totalPayloadBytes += Buffer.byteLength(messages[i], 'utf-8');
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
            indexLogBuffer.writeUInt32BE(payLoadLength, indexCursor+8);
            indexCursor += ENTRY_SIZE;
        }

        batchLogBuffer.writeBigInt64BE(offset, logCursor);
        batchLogBuffer.writeUInt32BE(payLoadLength, logCursor+8);
        batchLogBuffer.write(messages[i], logCursor+16, payLoadLength, 'utf-8');

        const payloadSlice = batchLogBuffer.subarray(logCursor + 16, logCursor + 16 + payloadLength);
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
    batchProcess
}