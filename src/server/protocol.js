o// [frame_length (4B)][reqCode (1B)][user_id_length (4B)][user_id (variable)][topic_length (4B)][topic_name (variable)][number of messages (4B)][[message_size, message]]


const wrapMessage = (userId, topicName, messages, reqCode)=>{
    const frame = Buffer.allocUnsafe(4096);
    let cursor = 4;
    frame.writeUint8(reqCode, cursor);
    cursor += 1;

    const userIdByteLength = Buffer.byteLength(userId, 'utf-8');
    frame.writeUInt32BE(userIdByteLength, cursor);
    cursor += 4;
    frame.write(userId, cursor, userIdByteLength, 'utf-8');
    cursor += userIdByteLength;

    const topicByteLength = Buffer.byteLength(topicName, 'utf-8');
    frame.writeUInt32BE(topicByteLength, cursor);
    cursor += 4;

    frame.write(topicName, cursor, topicByteLength, 'utf-8');
    cursor += topicByteLength;

    const len = messages.length;
    frame.writeUInt32BE(len, cursor);
    cursor += 4;

    for(const msg of messages){
        const msgLen = Buffer.byteLength(msg, 'utf-8');
        frame.writeUInt32BE(msgLen, cursor);
        cursor += 4;

        frame.write(msg, cursor, msgLen, 'utf-8');
        cursor += msgLen;
    }

    frame.writeUInt32BE(cursor, 0);

    return frame.subarray(0, cursor);
}

module.exports = {
    wrapMessage
}