-- Migration: Add messages table for candidate-employer communication

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  subject TEXT,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_application_id ON messages(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id);

-- Comments for documentation
COMMENT ON TABLE messages IS 'Stores messages between candidates and employers for specific job applications';
COMMENT ON COLUMN messages.application_id IS 'References the job application this message belongs to';
COMMENT ON COLUMN messages.sender_id IS 'References the user who sent the message (can be candidate or employer)';
COMMENT ON COLUMN messages.subject IS 'Subject line for new message threads (bulk messages, etc.)';
COMMENT ON COLUMN messages.parent_message_id IS 'References the parent message for reply threading. NULL for new message threads';
COMMENT ON COLUMN messages.is_read IS 'Indicates if the recipient has read the message';
