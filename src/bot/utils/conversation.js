async function setConversationState(user, state) {
  user.conversationState = state;
  await user.save();
}

async function saveConversation(user, state, data = null) {
  user.conversationState = state;
  user.conversationData = data;
  await user.save();
}

async function clearConversation(user) {
  user.conversationState = null;
  user.conversationData = null;
  await user.save();
}

module.exports = {
  setConversationState,
  saveConversation,
  clearConversation,
};
