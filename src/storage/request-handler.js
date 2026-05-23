// gonna create a map of userIds mapping to Topic Managers, soon, ouch.

const proxyMap = new Map(); // a placeholder so vs code doesnt throw errors at me
// whenever a user creates an id, just make a topic manager for them.



const readMessage = (userId, topicName, targetOffset)=>{
    const topicManagerUser = proxyMap.get(userId);
    const topic = topicManagerUser.fetchTopic(topicName);

    const result = topic.read(targetOffset);
    return result; // the result contains message and the offset
}

const appendMessage = (userId, topicName, messages)=>{ // messages will be a list, as they will be sent in batches
    const topicManagerUser = proxyMap.get(userId);
    const topic = topicManagerUser.getOrCreate(topicName);

    topic.write(messages);
}

const handleRequest = (userId, topicName, reqCode, messages=null, targetOffset=null)=>{ // here, reqCode=0 means append, reqCode=1 means read
    if(reqCode==0){
        appendMessage(userId, topicName, messages);
    }
    else if(reqCode==1){
        return readMessage(userId, topicName, targetOffset);
    }
}

module.exports = {
    handleRequest
}