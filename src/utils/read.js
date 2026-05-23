const {createCRC} = require('../utils/payload.util');
const {HEADER_SIZE} = require('./serializer');
const fs = require('fs');

const procureRecord = (currByte, targetOffset, readLogFd)=>{
    const headerBuffer = Buffer.allocUnsafe(HEADER_SIZE);
    fs.readSync(readLogFd, headerBuffer, 0, HEADER_SIZE, currByte);

    let currOffset = headerBuffer.readBigInt64BE(0);
    const iterations = Number(targetOffset-currOffset);
    const logSize = fs.fstatSync(readLogFd).size;

    if(iterations<0) return null;

    for(let i=0; i<iterations; i++){
        const payLoadLength = headerBuffer.readUInt32BE(8);
        currByte += (HEADER_SIZE + payLoadLength);

        if(currByte>= logSize) return null;

        fs.readSync(readLogFd, headerBuffer, 0, HEADER_SIZE, currByte);
    }

    const finalOffset = headerBuffer.readBigUint64BE(0);
    const payloadLength = headerBuffer.readUInt32BE(8);
    const storedCRC = headerBuffer.readUInt32BE(12);

    if(finalOffset != targetOffset) return null;

    const payloadBuffer = Buffer.allocUnsafe(payloadLength);
    fs.readSync(readLogFd, payloadBuffer, payloadLength, currByte+HEADER_SIZE);

    if(createCRC(payloadBuffer) != storedCRC){
        throw new Error('Data Corruption, CRC mismatch');
    }

    return {
        offset: finalOffset,
        message: payloadBuffer.toString('utf-8')
    }
}


module.exports = {
    procureRecord
}