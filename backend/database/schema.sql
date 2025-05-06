CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roadmaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- in days
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE roadmap_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roadmap_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    topic TEXT NOT NULL,
    description TEXT NOT NULL,
    resources TEXT, -- JSON string containing learning resources
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)
);

CREATE TABLE user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    roadmap_id INTEGER NOT NULL,
    current_step INTEGER DEFAULT 1,
    completed_steps TEXT, -- JSON string of completed step IDs
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)
); 