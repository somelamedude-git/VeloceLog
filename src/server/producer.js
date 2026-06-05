const net = require('net');
const PORT = 8000;
const { wrapMessage, parseMessage, parseResponse } = require('./protocol');

class Producer{
    constructor(userId, host, port=PORT){
        this.userId = userId;
        this.socket = null;
        this.host = host;
        this.port = port;
        this.buffer = Buffer.alloc(0);
        this.pendingResolve = null;
    }

    connect(){
        this.socket = net.connect(this.port, this.host);

        this.socket.on('data', (chunk)=>{
              this.buffer = Buffer.concat([this.buffer, chunk]);
              while(this.buffer.length>4){
                const frameLength = this.buffer.readUInt32BE(0);
                if(this.buffer.length<frameLength) break;

                const completeFrame = this.buffer.subarray(0, frameLength);
                this.buffer = this.buffer.subarray(frameLength);

                if(this.pendingResolve){
                    const parsed = parseResponse(completeFrame);
                    this.pendingResolve(parsed);
                    this.pendingResolve = null;
                }
              }
        })
    }

    send(topicName, mesages){
        return new Promise((resolve)=>{
            this.pendingResolve = resolve;
            const frame = wrapMessage(this.userId, topicName, messages, 0);
            this.socket.write(frame);
        })
    }

    disconnect(){
        this.socket.destroy();
    }
}
