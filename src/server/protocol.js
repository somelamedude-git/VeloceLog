// [frame_length (4B)][reqCode (1B)][user_id_length (4B)][user_id (variable)][topic_length (4B)][topic_name (variable)][number of messages (4B)][[message_size, message]]

const wrapMessage = (userId, topicName, messages, reqCode) => {
    const userIdByteLength = Buffer.byteLength(userId, 'utf-8');
    const topicByteLength = Buffer.byteLength(topicName, 'utf-8');

    const messageLengths = messages.map(m => Buffer.byteLength(m, 'utf-8'));
    const totalMsgBytes = messageLengths.reduce((sum, l) => sum + 4 + l, 0);

 
    const frameSize = 4 + 1 + 4 + userIdByteLength + 4 + topicByteLength + 4 + totalMsgBytes;
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

    const len = messages.length;
    frame.writeUInt32BE(len, cursor);
    cursor += 4;

    for (let i = 0; i < len; i++) {
        const msg = messages[i];
        const msgLen = messageLengths[i]; 
        
        frame.writeUInt32BE(msgLen, cursor);
        cursor += 4;

        frame.write(msg, cursor, msgLen, 'utf-8');
        cursor += msgLen;
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

    const numMessages = buffer.readUInt32BE(cursor);
    cursor+=4;

    let messages = [];

    for(let i=0; i<numMessages; i++){
        const msgLength = buffer.readUInt32BE(cursor);
        cursor+=4;

        const msg = buffer.toString('utf-8', cursor, cursor+msgLength);
        messages.push(msg);
        cursor+= msgLength;
    }

    return {
        reqCode: reqCode,
        userId: userId,
        topicName: topicName,
        messages: messages
    }
}

module.exports = {
    wrapMessage,
    parseMessage
}