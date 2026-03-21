ALTER TABLE users
  ADD COLUMN account_status ENUM('pending', 'approved', 'rejected', 'active', 'disabled')
    NOT NULL DEFAULT 'pending'
    AFTER is_approved;

UPDATE users
SET account_status = CASE
  WHEN role = 'customer' THEN 'active'
  WHEN role = 'admin' THEN 'active'
  WHEN is_approved = 1 THEN 'approved'
  ELSE 'pending'
END;
