const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(__dirname, '../../data/leaves.db'));

// Initialize database tables
function initDatabase() {
    // Create leaves table
    db.exec(`
        CREATE TABLE IF NOT EXISTS leaves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            reason TEXT NOT NULL,
            duration INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            role_id TEXT,
            message_id TEXT,
            channel_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            processed_by TEXT,
            processed_at TEXT,
            rejection_reason TEXT
        )
    `);

    // Create notes table
    db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT NOT NULL,
            admin_id TEXT NOT NULL,
            admin_name TEXT NOT NULL,
            note TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES leaves(request_id)
        )
    `);

    // Create settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `);

    // Create status history table
    db.exec(`
        CREATE TABLE IF NOT EXISTS status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT NOT NULL,
            old_status TEXT,
            new_status TEXT NOT NULL,
            changed_by TEXT NOT NULL,
            changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES leaves(request_id)
        )
    `);

    // Initialize system locked setting if not exists
    const lockedSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('system_locked');
    if (!lockedSetting) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('system_locked', 'false');
    }

    // Initialize language setting if not exists
    const langSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('language');
    if (!langSetting) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('language', 'ar');
    }

    // Initialize request counter
    const counterSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('request_counter');
    if (!counterSetting) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('request_counter', '0');
    }
}

// Generate unique request ID
function generateRequestId() {
    const counter = db.prepare('SELECT value FROM settings WHERE key = ?').get('request_counter');
    const newCounter = parseInt(counter.value) + 1;
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(newCounter.toString(), 'request_counter');
    return `PL-${String(newCounter).padStart(4, '0')}`;
}

// Create new leave request
function createLeaveRequest(userId, username, reason, duration, startDate, endDate) {
    const requestId = generateRequestId();
    const stmt = db.prepare(`
        INSERT INTO leaves (request_id, user_id, username, reason, duration, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(requestId, userId, username, reason, duration, startDate, endDate);
    return requestId;
}

// Get leave request by ID
function getLeaveRequest(requestId) {
    return db.prepare('SELECT * FROM leaves WHERE request_id = ?').get(requestId);
}

// Get leave request by message ID
function getLeaveRequestByMessage(messageId) {
    return db.prepare('SELECT * FROM leaves WHERE message_id = ?').get(messageId);
}

// Update leave request status
function updateLeaveStatus(requestId, status, processedBy, rejectionReason = null) {
    const oldRequest = getLeaveRequest(requestId);
    const oldStatus = oldRequest ? oldRequest.status : null;

    const stmt = db.prepare(`
        UPDATE leaves 
        SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP, rejection_reason = ?
        WHERE request_id = ?
    `);
    stmt.run(status, processedBy, rejectionReason, requestId);

    // Record status change in history
    db.prepare(`
        INSERT INTO status_history (request_id, old_status, new_status, changed_by)
        VALUES (?, ?, ?, ?)
    `).run(requestId, oldStatus, status, processedBy);

    return getLeaveRequest(requestId);
}

// Update leave message info
function updateLeaveMessage(requestId, messageId, channelId) {
    db.prepare('UPDATE leaves SET message_id = ?, channel_id = ? WHERE request_id = ?')
        .run(messageId, channelId, requestId);
}

// Update leave role
function updateLeaveRole(requestId, roleId) {
    db.prepare('UPDATE leaves SET role_id = ? WHERE request_id = ?').run(roleId, requestId);
}

// Get user's leave requests
function getUserLeaves(userId, page = 1, limit = 5) {
    const offset = (page - 1) * limit;
    const leaves = db.prepare(`
        SELECT * FROM leaves WHERE user_id = ? 
        ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM leaves WHERE user_id = ?').get(userId);
    return {
        leaves,
        total: total.count,
        pages: Math.ceil(total.count / limit),
        currentPage: page
    };
}

// Get pending leaves
function getPendingLeaves() {
    return db.prepare("SELECT * FROM leaves WHERE status = 'pending' ORDER BY created_at ASC").all();
}

// Get approved leaves (active)
function getApprovedLeaves() {
    const today = new Date().toISOString().split('T')[0];
    return db.prepare(`
        SELECT * FROM leaves 
        WHERE status = 'approved' AND end_date >= ?
        ORDER BY end_date ASC
    `).all(today);
}

// Check for overlapping leaves
function checkOverlappingLeave(userId, startDate, endDate) {
    return db.prepare(`
        SELECT * FROM leaves 
        WHERE user_id = ? 
        AND status = 'approved'
        AND (
            (start_date <= ? AND end_date >= ?)
            OR (start_date <= ? AND end_date >= ?)
            OR (start_date >= ? AND end_date <= ?)
        )
    `).get(userId, startDate, startDate, endDate, endDate, startDate, endDate);
}

// Get leaves ending soon
function getLeavesEndingSoon(hoursBeforeEnd) {
    const now = new Date();
    const future = new Date(now.getTime() + hoursBeforeEnd * 60 * 60 * 1000);
    const futureDate = future.toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    return db.prepare(`
        SELECT * FROM leaves 
        WHERE status = 'approved' 
        AND end_date >= ? 
        AND end_date <= ?
    `).all(today, futureDate);
}

// Get recent requests count for spam protection
function getRecentRequestsCount(userId, days = 7) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const dateStr = daysAgo.toISOString().split('T')[0];

    const result = db.prepare(`
        SELECT COUNT(*) as count FROM leaves 
        WHERE user_id = ? AND created_at >= ?
    `).get(userId, dateStr);

    return result.count;
}

// Add note to leave request
function addNote(requestId, adminId, adminName, note) {
    db.prepare(`
        INSERT INTO notes (request_id, admin_id, admin_name, note)
        VALUES (?, ?, ?, ?)
    `).run(requestId, adminId, adminName, note);
}

// Get notes for leave request
function getNotes(requestId) {
    return db.prepare(`
        SELECT * FROM notes WHERE request_id = ? ORDER BY created_at DESC
    `).all(requestId);
}

// Search leaves
function searchLeaves(options = {}) {
    let query = 'SELECT * FROM leaves WHERE 1=1';
    const params = [];

    if (options.requestId) {
        query += ' AND request_id = ?';
        params.push(options.requestId);
    }
    if (options.userId) {
        query += ' AND user_id = ?';
        params.push(options.userId);
    }
    if (options.status) {
        query += ' AND status = ?';
        params.push(options.status);
    }
    if (options.startDateFrom) {
        query += ' AND start_date >= ?';
        params.push(options.startDateFrom);
    }
    if (options.startDateTo) {
        query += ' AND start_date <= ?';
        params.push(options.startDateTo);
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }
    }

    return db.prepare(query).all(...params);
}

// Get statistics
function getStatistics(startDate = null, endDate = null) {
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
        dateFilter = ' AND created_at >= ? AND created_at <= ?';
        params.push(startDate, endDate);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM leaves WHERE 1=1${dateFilter}`).get(...params);
    const approved = db.prepare(`SELECT COUNT(*) as count FROM leaves WHERE status = 'approved'${dateFilter}`).get(...params);
    const rejected = db.prepare(`SELECT COUNT(*) as count FROM leaves WHERE status = 'rejected'${dateFilter}`).get(...params);
    const pending = db.prepare(`SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'${dateFilter}`).get(...params);
    const cancelled = db.prepare(`SELECT COUNT(*) as count FROM leaves WHERE status = 'cancelled'${dateFilter}`).get(...params);

    const avgDuration = db.prepare(`
        SELECT AVG(duration) as avg FROM leaves WHERE status = 'approved'${dateFilter}
    `).get(...params);

    const topMembers = db.prepare(`
        SELECT user_id, username, COUNT(*) as count 
        FROM leaves 
        WHERE status = 'approved'${dateFilter}
        GROUP BY user_id 
        ORDER BY count DESC 
        LIMIT 5
    `).all(...params);

    return {
        total: total.count,
        approved: approved.count,
        rejected: rejected.count,
        pending: pending.count,
        cancelled: cancelled.count,
        averageDuration: avgDuration.avg ? Math.round(avgDuration.avg * 10) / 10 : 0,
        topMembers
    };
}

// Get all leaves for export
function getAllLeaves(startDate = null, endDate = null) {
    let query = 'SELECT * FROM leaves';
    const params = [];

    if (startDate && endDate) {
        query += ' WHERE created_at >= ? AND created_at <= ?';
        params.push(startDate, endDate);
    }

    query += ' ORDER BY created_at DESC';
    return db.prepare(query).all(...params);
}

// Settings functions
function getSetting(key) {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return result ? result.value : null;
}

function setSetting(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

function isSystemLocked() {
    return getSetting('system_locked') === 'true';
}

function setSystemLocked(locked) {
    setSetting('system_locked', locked ? 'true' : 'false');
}

function getLanguage() {
    return getSetting('language') || 'ar';
}

function setLanguage(lang) {
    setSetting('language', lang);
}

// Get status history for a request
function getStatusHistory(requestId) {
    return db.prepare(`
        SELECT * FROM status_history WHERE request_id = ? ORDER BY changed_at DESC
    `).all(requestId);
}

// Initialize database
initDatabase();

module.exports = {
    db,
    initDatabase,
    generateRequestId,
    createLeaveRequest,
    getLeaveRequest,
    getLeaveRequestByMessage,
    updateLeaveStatus,
    updateLeaveMessage,
    updateLeaveRole,
    getUserLeaves,
    getPendingLeaves,
    getApprovedLeaves,
    checkOverlappingLeave,
    getLeavesEndingSoon,
    getRecentRequestsCount,
    addNote,
    getNotes,
    searchLeaves,
    getStatistics,
    getAllLeaves,
    getSetting,
    setSetting,
    isSystemLocked,
    setSystemLocked,
    getLanguage,
    setLanguage,
    getStatusHistory
};
