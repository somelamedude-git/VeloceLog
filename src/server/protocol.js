// [frame_length (4B)][reqCode (1B)][user_id_length (4B)][user_id (variable)][topic_length (4B)][topic_name (variable)][number of messages (4B)][[message_size, message]]

const wrapMessage = (userId, topicName, messages, reqCode, offset = null) => {
    const userIdByteLength = Buffer.byteLength(userId, 'utf-8');
    const topicByteLength = Buffer.byteLength(topicName, 'utf-8');

    let frameSize;
    let messageLengths = [];

    if (reqCode === 0) {
        messageLengths = messages.map(m => Buffer.byteLength(m, 'utf-8'));
        const totalMsgBytes = messageLengths.reduce((sum, l) => sum + 4 + l, 0);
        frameSize = 4 + 1 + 4 + userIdByteLength + 4 + topicByteLength + 4 + totalMsgBytes;
    } else {
        frameSize = 4 + 1 + 4 + userIdByteLength + 4 + topicByteLength + 8;
    }

    const frame = Buffer.allocUnsafe(frameSize);
    let cursor = 4;

    frame.writeUInt8(reqCode, cursor);
    cursor += 1;

    frame.writeUInt32BE(userIdByteLength, cursor);
    cursor += 4;
    frame.write(userId, cursor, userIdByteLength, 'utf-8');
    cursor += userIdByteLength;

    frame.writeUInt32BE(topicByteLength, cursor);
    cursor += 4;
    frame.write(topicName, cursor, topicByteLength, 'utf-8');
    cursor += topicByteLength;

    if (reqCode === 0) {
        const len = messages.length;
        frame.writeUInt32BE(len, cursor);
        cursor += 4;

        for (let i = 0; i < len; i++) {
            const msgLen = messageLengths[i];
            frame.writeUInt32BE(msgLen, cursor);
            cursor += 4;
            frame.write(messages[i], cursor, msgLen, 'utf-8');
            cursor += msgLen;
        }
    } else {
        frame.writeBigInt64BE(BigInt(offset), cursor);
        cursor += 8;
    }

    frame.writeUInt32BE(cursor, 0);
    return frame.subarray(0, cursor);
}

const parseMessage = (buffer)=>{
    let cursor = 4;

    const reqCode = buffer.readUInt8(cursor);
    cursor+=1;

    const userIdByteLength = buffer.readUInt32BE(cursor);
    cursor += 4;

    const userId = buffer.toString('utf-8', cursor, cursor+userIdByteLength);
    cursor+= userIdByteLength;

    const topicByteLength = buffer.readUInt32BE(cursor);
    cursor+=4;

    const topicName = buffer.toString('utf-8', cursor, cursor+topicByteLength);
    cursor+=topicByteLength;

    if (reqCode === 0) {
        const numMessages = buffer.readUInt32BE(cursor);
        cursor += 4;

        let messages = [];

        for (let i = 0; i < numMessages; i++) {
            const msgLength = buffer.readUInt32BE(cursor);
            cursor += 4;

            const msg = buffer.toString('utf-8', cursor, cursor + msgLength);
            messages.push(msg);
            cursor += msgLength;
        }

        return { reqCode, userId, topicName, messages };

    } else if (reqCode === 1) {
        const offset = buffer.readBigInt64BE(cursor);
        return { reqCode, userId, topicName, offset };
    }
}

// status will be one byte, offset will be 8, if available.
// also respond to request in batches, but thats a future optimization

const wrapResponse = (status, reqCode, message=null, offset=null)=>{ // the message is for fetch, and the offset is for append
    let size;
    let msgLength = 0;
    if(reqCode === 0){ // APPEND response: status + reqCode + offset
        size = 4 + 1 + 1 + 8;
    }
    else{ // FETCH response: status + reqCode + offset + msgLength + message
        msgLength = Buffer.byteLength(message, 'utf-8');
        size = 4 + 1 + 1 + 8 + 4 + msgLength;
    }

    const buffer = Buffer.allocUnsafe(size);
    let cursor = 0;

    buffer.writeUInt32BE(size, cursor);
    cursor+=4;

    buffer.writeUInt8(status, cursor);
    cursor+=1;

    buffer.writeUInt8(reqCode, cursor);
    cursor+=1;

    buffer.writeBigInt64BE(BigInt(offset), cursor);
    cursor+=8;

    if(reqCode === 1){
        buffer.writeUInt32BE(msgLength, cursor);
        cursor+=4;

        buffer.write(message, cursor, msgLength, 'utf-8');
        cursor+=msgLength;
    }

    return buffer;
}

const killMeNow = (buffer) => {
    let cursor = 4; 
    const status = buffer.readUInt8(cursor);
    cursor += 1;

    if (status !== 0) {
        console.error(`[Protocol Error] Received non-zero status: ${status}`);
        throw Error('ouch');
    }

    const reqCode = buffer.readUInt8(cursor);
    cursor += 1;

    if (reqCode === 0) {
        const offset = buffer.readBigUInt64BE(cursor);
        cursor += 8; 
        return { type: 'append', status, reqCode, offset };
        
    } else { 
        const offset = buffer.readBigUInt64BE(cursor);
        cursor += 8;

        const msgLength = buffer.readUInt32BE(cursor); 
        cursor += 4;
        
        const message = buffer.toString('utf-8', cursor, cursor + msgLength);
        cursor += msgLength;
        
        return { type: 'fetch', status, reqCode, offset, message };
    }
}
module.exports = {
    wrapMessage,
    parseMessage,
    wrapResponse,
    parseResponse:killMeNow
}