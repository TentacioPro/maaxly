export function applyMessageCreated(conversations, payload) {
  const cid = String(payload.conversationId)
  const idx = conversations.findIndex(c => String(c._id) === cid)
  if (idx === -1) return conversations
  const next = [...conversations]
  next[idx] = { ...next[idx], lastMessage: payload.message }
  return next
}

export function applyConversationCreated(conversations, payload) {
  const normalized = { ...payload, _id: String(payload._id || payload.id || payload.conversationId || '') }
  return [normalized, ...conversations]
}

export function applyAck(unreadCounts, payload) {
  const copy = { ...unreadCounts }
  delete copy[String(payload.conversationId)]
  return copy
}
