import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ConversationWindow from '@/components/ConversationWindow'

describe('Conversation overlay', () => {
  test('opens profile overlay on avatar click', async () => {
    const conv = { _id: 'c1', participants: [{ user: { _id: 'u1', email: 'a@b.com', profile: { fullName: 'A' } } }] }
    render(<ConversationWindow conversation={conv} />)
    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    // overlay should appear (dialog role)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
  })
})
