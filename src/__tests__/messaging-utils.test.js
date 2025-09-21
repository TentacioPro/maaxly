const { applyMessageCreated, applyConversationCreated, applyAck } = require('../providers/messaging-utils')

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed') }

// applyMessageCreated
const convs = [{ _id: 'c1', lastMessage: null }, { _id: 'c2', lastMessage: null }]
const payload = { conversationId: 'c2', message: { _id: 'm1', text: 'hi' } }
const res = applyMessageCreated(convs, payload)
assert(res[1].lastMessage && res[1].lastMessage._id === 'm1', 'message applied')

// applyConversationCreated
const newConv = { _id: 'c3' }
const res2 = applyConversationCreated(convs, newConv)
assert(res2[0]._id === 'c3', 'conversation prepended')

// applyAck
const unread = { c1: 2, c2: 1 }
const res3 = applyAck(unread, { conversationId: 'c2' })
assert(!res3.c2 && res3.c1 === 2, 'ack removed unread for c2')

console.log('All tests passed')
