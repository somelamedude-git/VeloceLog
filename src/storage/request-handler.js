// gonna create a map of userIds mapping to Topic Managers, soon, ouch.

const TopicManager = require('./topicManager');

const proxyMap = new Map(); // a placeholder so vs code doesnt throw errors at me
// whenever a user creates an id, just make a topic manager for them.

const registerUser = (userId)=>{
    const topicManager = new TopicManager(userId);
    proxyMap.set(userId, topicManager);
}

const readMessage = (userId, topicName, targetOffset)=>{
    const topicManagerUser = proxyMap.get(userId);
    const topic = topicManagerUser.fetchTopic(topicName);

    const result = topic.read(targetOffset);
    return {
        status: 0,
        result: result
    };
}

const appendMessage = (userId, topicName, messages)=>{ // messages will be a list, as they will be sent in batches
    const topicManagerUser = proxyMap.get(userId);
    const topic = topicManagerUser.getOrCreate(topicName);

    const baseOffset = topic.getNextOffset();
    topic.write(messages);
    return {
        status: 0,
        baseOffset: baseOffset
    };
}

const handleRequest = (userId, topicName, reqCode, messages=null, targetOffset=null)=>{ // here, reqCode=0 means append, reqCode=1 means read
    if(!proxyMap.has(userId)){
        registerUser(userId);
    }
    if(reqCode==0){
        return appendMessage(userId, topicName, messages);
    }
    else if(reqCode==1){
        return readMessage(userId, topicName, targetOffset);
    }
}

module.exports = {
    handleRequest,
    registerUser
}