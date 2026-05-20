const { createCRC } = require('./payload.util');
const fs = require('fs');

const HEADER_SIZE=16;

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

const batchProcess = (messages, baseOffset, appendLogFd, appendIndexFd, currentLogSize)=>{
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
module.exports = {
    HEADER_SIZE,
    serializeRecord,
    batchProcess
}