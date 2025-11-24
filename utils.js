/**
 * ملف الوظائف المساعدة
 * Utility Functions
 */

/**
 * التحقق من صحة تنسيق التاريخ
 * @param {string} dateString - التاريخ بصيغة YYYY-MM-DD
 * @returns {boolean}
 */
function isValidDateFormat(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * حساب الفرق بالأيام بين تاريخين
 * @param {string} startDate - تاريخ البداية
 * @param {string} endDate - تاريخ النهاية
 * @returns {number}
 */
function calculateDaysDifference(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * تنسيق التاريخ للعرض
 * @param {string} dateString - التاريخ
 * @returns {string}
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * التحقق من صلاحيات العضو
 * @param {GuildMember} member - العضو
 * @param {string} roleId - معرف الرتبة المطلوبة
 * @returns {boolean}
 */
function hasRole(member, roleId) {
    return member.roles.cache.has(roleId);
}

/**
 * اختصار النص إذا كان طويلاً
 * @param {string} text - النص
 * @param {number} maxLength - الطول الأقصى
 * @returns {string}
 */
function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * إنشاء معرف فريد
 * @returns {string}
 */
function generateUniqueId() {
    // استخدام crypto.randomUUID إذا كان متاحاً (Node.js 14.17.0+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // بديل: دمج timestamp مع أرقام عشوائية
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}

/**
 * التحقق من أن التاريخ في المستقبل
 * @param {string} dateString - التاريخ
 * @returns {boolean}
 */
function isFutureDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

/**
 * تحويل حالة الطلب إلى رمز تعبيري
 * @param {string} status - الحالة
 * @returns {string}
 */
function statusToEmoji(status) {
    const statusEmojis = {
        'قيد المراجعة': '⏳',
        'مقبول': '✅',
        'مرفوض': '❌'
    };
    return statusEmojis[status] || '❓';
}

/**
 * تحويل حالة الطلب إلى لون
 * @param {string} status - الحالة
 * @returns {string}
 */
function statusToColor(status) {
    const statusColors = {
        'قيد المراجعة': '#ffa500',
        'مقبول': '#00ff00',
        'مرفوض': '#ff0000'
    };
    return statusColors[status] || '#808080';
}

/**
 * التحقق من صحة الرقم الصحيح الموجب
 * @param {string} value - القيمة
 * @returns {boolean}
 */
function isPositiveInteger(value) {
    const num = Number(value);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
}

/**
 * تسجيل خطأ مع تفاصيل
 * @param {string} context - سياق الخطأ
 * @param {Error} error - الخطأ
 */
function logError(context, error) {
    console.error(`❌ [${context}] خطأ:`, error.message);
    if (error.stack) {
        console.error('Stack trace:', error.stack);
    }
}

/**
 * معالجة آمنة للأخطاء مع رسالة للمستخدم
 * @param {Interaction} interaction - التفاعل
 * @param {Error} error - الخطأ
 * @param {string} context - السياق
 */
async function handleInteractionError(interaction, error, context = 'unknown') {
    logError(context, error);
    
    const errorMessage = {
        content: '❌ حدث خطأ غير متوقع. يرجى المحاولة لاحقاً أو التواصل مع الإدارة.',
        ephemeral: true
    };

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    } catch (replyError) {
        console.error('فشل في إرسال رسالة الخطأ:', replyError);
    }
}

module.exports = {
    isValidDateFormat,
    calculateDaysDifference,
    formatDate,
    hasRole,
    truncateText,
    generateUniqueId,
    isFutureDate,
    statusToEmoji,
    statusToColor,
    isPositiveInteger,
    logError,
    handleInteractionError
};
