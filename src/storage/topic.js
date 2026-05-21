const fs = require('fs');
const LogSegment = require('./log-segment');
const path = require('path');
const {batchProcess, HEADER_SIZE} = require('../utils/serializer');

//check in the api if the topic directory is already existing, so topicDir will essentially be passed form the api if it is not duplicated.

// segment = { (remember this format)
//     appendLogFd: 'x',
//     appendIndexFd: 'x',
//     readLogFd: 'x',
//     readIndexFd: 'x',
//     startingOffset: 'x',
//     indexPath: 'x',
//     logPath: 'x',
//     baseOffset: 'x'
// }

class Topic{
    constructor(userId, topicName, topicDir){
        this.name = topicName;
        this.user = userId;
        this.topicDir = topicDir;
        this.nextOffset = 0n;
        this.activeSegment = new LogSegment(this.topicDir, this.nextOffset);
        this.segments = []; // essentially an array

        this.pushSegArr(0n);
    }

    changeActiveSegment(segment){ // segment will be an object here, lead with apis which trigger appending data, incase new segment gets made
        this.activeSegment = segment;
    }

    pushSegArr(baseOffset){ // this method must only be called during initialization
        const appendDescriptors = this.activeSegment._getAppendDescriptors();
        const readDescriptors = this.activeSegment._getReadDescriptors(); // I write these little comments for amusement :)
        const filePaths = this.activeSegment._getFilePaths();

        this.segments.push({ // the last entry in the array will obviously be the active segment, so i am planning to remove the reducdancy later
            appendLogFd : appendDescriptors[1],
            appendIndexFd: appendDescriptors[0],
            readLogFd: readDescriptors[1],
            readIndexFd: readDescriptors[0],
            indexPath: filePaths[1],
            logPath: filePaths[0],
            baseOffset: baseOffset
        });
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

            this.pushSegArr(this.nextOffset);
        } catch(error){
            console.log(error);
        }
    }

    write(messages){
        // messages will be serialized, so we better take out the size now, before the wrapping, put the array in buffer, and find the number of bytes
        const numMessages = messages.length;
        let totalPayloadBytes = 0;
        for (let i = 0; i < numMessages; i++){
            totalPayloadBytes += Buffer.byteLength(messages[i], 'utf-8');
        }
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
        this.nextOffset += BigInt(numMessages);
    }
}

module.exports = Topic;