const fs = require('fs');
const LogSegment = require('./log-segment');
const path = require('path');

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
}