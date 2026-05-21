const fs = require('fs');
const LogSegment = require('./log-segment');
const path = require('path');
const {batchProcess} = require('../utils/serializer');
const {HEADER_SIZE} = require('../utils/serializer');

//check in the api if the topic directory is already existing, so topicDir will essentially be passed form the api if it is not duplicated.

class Topic{
    constructor(userId, topicName, topicDir){
        this.name = topicName;
        this.user = userId;
        this.topicDir = topicDir;
        this.nextOffset = 0n;
        this.activeSegment = new LogSegment(this.topicDir, this.nextOffset);
    }

    changeActiveSegment(segment){ // segment will be an object here, lead with apis which trigger appending data, incase new segment gets made
        this.activeSegment = segment;
    }

    getNextOffset(){
        return this.nextOffset;
    }

    incrementNextOffset(){
        this.nextOffset+=1n;
    }
    
    rolling(){
        try{
            const newLog = new LogSegment(this.topicDir, this.nextOffset);
            this.activeSegment.switchToReadMode();
            this.activeSegment = newLog;
        } catch(error){
            console.log(error);
        }
    }

    write(messages){
        // messages will be serialized, so we better take out the size now, before the wrapping, put the array in buffer, and find the number of bytes
        const numMessages = messages.length;
        const totalPayloadBytes = Buffer.byteLength(messages, 'utf-8');
        const totalSize = (numMessages*HEADER_SIZE) + totalPayloadBytes;

        const spaceLeft = this.activeSegment._getCurrentSpace();
        
        if(spaceLeft<totalSize){
            this.rolling();
        }

        const currentLogSize = this.activeSegment._getCurrentBytes();
        const descriptors = this.activeSegment._getAppendDescriptors();
        const baseOffset = this.nextOffset;

        const sizeAdded = BigInt(batchProcess(messages, baseOffset, descriptors[1], descriptors[0], currentLogSize));

        this.activeSegment._incrementCurrentBytes(sizeAdded);
        this.nextOffset += sizeAdded;
    }
}

module.exports = Topic;