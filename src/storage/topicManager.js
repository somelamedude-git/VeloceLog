const Topic = require('./topic');
const path = require('path');
const fs = require('fs');

class TopicManager{ // I keep one topic manager per user
    constructor(userId){
        this.topics = new Map(); // This contains: topic_name:topic_instance
        this.userId = userId;
        this.topicDir = path.join(__dirname, '../../data', userId);

        this.createManageDir();
    }

    createTopic(topicName){
        const pathTopic = path.join(this.topicDir, topicName);
        if(!fs.existsSync(pathTopic)){
            fs.mkdirSync(pathTopic);
        }
        const topic = new Topic(this.userId, topicName, pathTopic);
        this.topics.set(topicName, topic);
    }

    getOrCreate(topicName){
        if(!this.topics.has(topicName)){
            this.createTopic(topicName);
        }
        return this.topics.get(topicName);
    }

    createManageDir(){
        if(!fs.existsSync(this.topicDir)){
            fs.mkdirSync(this.topicDir);
        }
    }
    fetchTopic(topicName){
        return this.topics.get(topicName);
    } 
}

module.exports = TopicManager;