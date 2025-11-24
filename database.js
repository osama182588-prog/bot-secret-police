const fs = require('fs');
const path = require('path');

/**
 * مدير قاعدة البيانات - Database Manager
 * يدير جميع عمليات حفظ واسترجاع بيانات طلبات الإجازات
 */
class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'database.json');
        this.data = this.loadData();
    }

    /**
     * تحميل البيانات من الملف
     */
    loadData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('خطأ في تحميل قاعدة البيانات:', error);
        }
        
        return {
            requests: [],
            embedMessages: {}
        };
    }

    /**
     * حفظ البيانات إلى الملف (non-blocking)
     */
    saveData() {
        // استخدام setImmediate لجعل العملية غير معرقلة
        setImmediate(async () => {
            try {
                const fs = require('fs').promises;
                await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
            } catch (error) {
                console.error('خطأ في حفظ قاعدة البيانات:', error);
            }
        });
    }

    /**
     * إضافة طلب جديد
     */
    addRequest(requestData) {
        const request = {
            id: Date.now().toString(),
            userId: requestData.userId,
            username: requestData.username,
            reason: requestData.reason,
            duration: requestData.duration,
            startDate: requestData.startDate,
            endDate: requestData.endDate,
            status: 'قيد المراجعة', // pending
            submittedAt: new Date().toISOString(),
            processedAt: null,
            role: null,
            adminNotes: [],
            managementMessageId: requestData.managementMessageId || null
        };

        this.data.requests.push(request);
        this.saveData();
        return request;
    }

    /**
     * الحصول على طلب بواسطة المعرف
     */
    getRequest(requestId) {
        return this.data.requests.find(r => r.id === requestId);
    }

    /**
     * الحصول على طلب بواسطة معرف رسالة الإدارة
     */
    getRequestByManagementMessage(messageId) {
        return this.data.requests.find(r => r.managementMessageId === messageId);
    }

    /**
     * الحصول على جميع طلبات عضو معين
     */
    getUserRequests(userId) {
        return this.data.requests.filter(r => r.userId === userId);
    }

    /**
     * الحصول على جميع الطلبات
     */
    getAllRequests() {
        return this.data.requests;
    }

    /**
     * تحديث حالة الطلب
     */
    updateRequestStatus(requestId, status, role = null) {
        const request = this.getRequest(requestId);
        if (request) {
            request.status = status;
            request.processedAt = new Date().toISOString();
            if (role) {
                request.role = role;
            }
            this.saveData();
            return request;
        }
        return null;
    }

    /**
     * إضافة ملاحظة إدارية
     */
    addAdminNote(requestId, note, adminId, adminName) {
        const request = this.getRequest(requestId);
        if (request) {
            request.adminNotes.push({
                note: note,
                adminId: adminId,
                adminName: adminName,
                timestamp: new Date().toISOString()
            });
            this.saveData();
            return request;
        }
        return null;
    }

    /**
     * حفظ معرف رسالة الإمبيد الثابت
     */
    saveEmbedMessage(channelId, messageId) {
        this.data.embedMessages[channelId] = messageId;
        this.saveData();
    }

    /**
     * الحصول على معرف رسالة الإمبيد الثابت
     */
    getEmbedMessage(channelId) {
        return this.data.embedMessages[channelId];
    }
}

module.exports = new DatabaseManager();
