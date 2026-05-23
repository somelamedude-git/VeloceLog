const Topic = require('./topic');

class TopicManager{ // I keep one topic manager per user
    constructor(userId){
        this.topics = new Map(); // This contains: topic_name:topic_instance
        this.userId = userId,
        this.topicDir = '../data'
    }

    createTopic(topicName){
        const topic = new Topic(this.userId, topicName, this.topicDir);
        this.topics.set(topicName, topic);
    }

    fetchTopic(topicName){
        return this.topics.get(topicName);
    }
}

module.exports = TopicManager;