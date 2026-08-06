-- =========================================================
-- EXPERT SCIENTIFIC JOURNAL PLATFORM
-- ENTERPRISE 3NF DATABASE SCHEMA
-- =========================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  orcid TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- 3. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- 4. ROLE_PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 5. USER_ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 6. JOURNALS
CREATE TABLE IF NOT EXISTS journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  issn_print TEXT DEFAULT '2181-1415',
  issn_online TEXT DEFAULT '2181-1423',
  publisher_name TEXT DEFAULT 'Expert Scientific Press',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. JOURNAL_SETTINGS
CREATE TABLE IF NOT EXISTS journal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  peer_review_mode TEXT DEFAULT 'DOUBLE_BLIND',
  max_review_days INT DEFAULT 14,
  allow_open_access BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. VOLUMES
CREATE TABLE IF NOT EXISTS volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  volume_number INT NOT NULL,
  year INT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(journal_id, volume_number, year)
);

-- 9. ISSUES
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id UUID REFERENCES volumes(id) ON DELETE CASCADE,
  issue_number INT NOT NULL,
  year INT NOT NULL,
  status TEXT CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')) DEFAULT 'DRAFT',
  description TEXT,
  publication_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CATEGORIES / SCIENTIFIC FIELDS
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE
);

-- 11. LICENSES
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  spdx_id TEXT UNIQUE NOT NULL,
  url TEXT
);

-- 12. FILES
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'expert-journal-publications',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  checksum_sha256 TEXT NOT NULL DEFAULT 'sha256_mock_hash',
  size_bytes BIGINT NOT NULL DEFAULT 1048576,
  version INT DEFAULT 1,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ARTICLES
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  article_type TEXT DEFAULT 'Original Research',
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  language TEXT DEFAULT 'Русский',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  doi TEXT,
  submission_date DATE DEFAULT CURRENT_DATE,
  last_updated DATE DEFAULT CURRENT_DATE,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ARTICLE_VERSIONS
CREATE TABLE IF NOT EXISTS article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, version_number)
);

-- 15. AUTHORS
CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  orcid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. AFFILIATIONS
CREATE TABLE IF NOT EXISTS affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT UNIQUE NOT NULL,
  city TEXT,
  country TEXT
);

-- 17. ARTICLE_AUTHORS (RELATION)
CREATE TABLE IF NOT EXISTS article_authors (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  author_id UUID REFERENCES authors(id) ON DELETE CASCADE,
  affiliation_id UUID REFERENCES affiliations(id) ON DELETE SET NULL,
  author_order INT NOT NULL DEFAULT 1,
  is_corresponding BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (article_id, author_id)
);

-- 18. KEYWORDS
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

-- 19. ARTICLE_KEYWORDS (RELATION)
CREATE TABLE IF NOT EXISTS article_keywords (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, keyword_id)
);

-- 20. REVIEW_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS review_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('INVITED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'EXPIRED')) DEFAULT 'INVITED',
  deadline TIMESTAMPTZ NOT NULL,
  review_mode TEXT DEFAULT 'DOUBLE_BLIND',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. REVIEWS & REVIEWER_COMMENTS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES review_assignments(id) ON DELETE CASCADE,
  recommendation TEXT CHECK (recommendation IN ('ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT')),
  comments_for_author TEXT,
  comments_for_editor TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. AUDIT_LOGS & ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. EMAIL_VERIFICATION_TOKENS
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. PASSWORD_RESET_TOKENS
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. USER_SESSIONS
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- 27. FULL-TEXT SEARCH & PERFORMANCE INDEXES
-- =========================================================

-- Generated TSVector column for Full-Text Search
ALTER TABLE articles ADD COLUMN IF NOT EXISTS fts_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(abstract, ''))
  ) STORED;

-- GIN Index for Full-Text Search
CREATE INDEX IF NOT EXISTS idx_articles_fts ON articles USING GIN(fts_vector);

-- B-Tree Performance Indexes
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_issue_id ON articles(issue_id);
CREATE INDEX IF NOT EXISTS idx_articles_submission_date ON articles(submission_date);
CREATE INDEX IF NOT EXISTS idx_articles_doi ON articles(doi);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_year ON issues(year);

