// [frame_length (4B)][reqCode (1B)][user_id (4B)][topic_length (2B)][topic_name (variable size, create boundaries)][number of messages (2B)][[message_size, message]]


const wrapMessage = (userId, topicName, userId, messages, reqCode)=>{
    const frame = Buffer.allocUnsafe(4096);
    let cursor = 4;
    frame.writeUint8(reqCode, cursor);
    cursor += 1;
    frame.writeUInt32BE(userId, cursor);
    cursor+=4;

    const topicByteLength = Buffer.byteLength(topicName, 'utf-8');
    frame.writeUint16BE(topicByteLength, cursor);
    cursor +=2;

    frame.write(topicName, cursor, topicByteLength, 'utf-8');
    cursor += topicByteLength;

    const len = messages.length;
    frame.writeUint16BE(len, cursor);
    cursor+=2;

    for(const msg of messages){
        const msgLen = Buffer.byteLength(msg, 'utf-8');
        frame.writeUInt32BE(msgLen, cursor);
        cursor += 4;

        frame.write(msg, cursor, msgLen, 'utf-8');
        cursor+=msgLen;
    }

    frame.writeUInt32BE(cursor, 0);

    return frame.subarray(0, cursor);
}