const crc32 = require('buffer-crc32');

const createCRC = (payloadBuf)=>{
    return crc32.unsigned(payloadBuf);
}

module.exports = {
    createCRC
}