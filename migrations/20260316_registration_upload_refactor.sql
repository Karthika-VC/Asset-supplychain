ALTER TABLE users
  MODIFY COLUMN proof_url TEXT NULL;

ALTER TABLE uploaded_documents
  ADD COLUMN original_filename VARCHAR(255) NULL AFTER document_type,
  ADD COLUMN stored_filename VARCHAR(255) NULL AFTER original_filename,
  ADD COLUMN size INT NULL AFTER mime_type;
