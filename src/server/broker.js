const net = require('net');
const PORT = 8000;
const { wrapResponse, parseMessage } = require('./protocol');
const { handleRequest } = require('../storage/request-handler');

const server = net.createServer((socket)=>{
    let backlog = Buffer.alloc(0);

    socket.on('data', (chunk)=>{
        backlog = Buffer.concat([backlog, chunk]);

        while(backlog.length>=4){
            const frameLength = backlog.readUInt32BE(0);

            if(backlog.length<frameLength) break;

            const completeFrame = backlog.subarray(0, frameLength);
            try{
                const parsed = parseMessage(completeFrame);

                const result = handleRequest(parsed.userId, parsed.topicName, parsed.reqCode, parsed.messages, parsed.offset);
                const status= result.status;

                let message = null;
                let offset = null;

                if(parsed.reqCode===0){
                    offset=result.baseOffset;
                }
                else{
                    message = result.result.message;
                    offset = result.result.offset;
                }

                const messageBuf = wrapResponse(status, parsed.reqCode, message, offset);
                socket.write(messageBuf);
            }
            catch(error){
                console.error(error);
            }

            backlog = backlog.subarray(frameLength);
        }
    })
});

server.listen(PORT);