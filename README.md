# 🚔 نظام إجازات الشرطة - Police Leave Management Bot

نظام احترافي لإدارة إجازات قسم الشرطة داخل ديسكورد، مبني باستخدام Discord.js v14.

A professional police department leave management system for Discord, built with Discord.js v14.

## ✨ المميزات / Features

### الميزات الأساسية / Core Features
- 📝 تقديم طلبات إجازة عبر نموذج Modal
- ✅ قبول/رفض الطلبات من قبل الإدارة
- 🏷️ إنشاء وإعطاء رتب الإجازة تلقائياً
- 📊 نظام إحصائيات شامل
- 📋 سجل كامل لجميع الطلبات
- 🔔 إشعارات للطلبات الجديدة وتغييرات الحالة
- 📝 نظام ملاحظات داخلية للإدارة

### الميزات المتقدمة / Advanced Features
- 🔒 قفل/فتح نظام الإجازات
- 📤 تصدير البيانات (CSV/JSON)
- 🌐 دعم اللغتين (العربية/الإنجليزية)
- 🛡️ نظام صلاحيات متكامل
- ⚠️ حماية من السبام
- 📅 التحقق من صحة التواريخ
- 🔄 منع تداخل الإجازات
- ⏰ تذكيرات انتهاء الإجازة

## 📦 المتطلبات / Requirements

- Node.js 16.9.0 أو أحدث
- npm أو yarn
- Discord Bot Token

## 🚀 التثبيت / Installation

1. **استنساخ المستودع / Clone the repository**
   ```bash
   git clone https://github.com/your-repo/police-leave-bot.git
   cd police-leave-bot
   ```

2. **تثبيت التبعيات / Install dependencies**
   ```bash
   npm install
   ```

3. **إعداد ملف البيئة / Setup environment file**
   ```bash
   cp .env.example .env
   ```

4. **تعديل ملف .env / Edit .env file**
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   LEAVE_REQUEST_CHANNEL_ID=channel_id_for_leave_requests
   LEAVE_REVIEW_CHANNEL_ID=channel_id_for_police_administration
   LEAVE_LOG_CHANNEL_ID=channel_id_for_logs
   NOTIFICATION_CHANNEL_ID=channel_id_for_notifications
   ADMIN_ROLE_ID=admin_role_id_for_leave_management
   NOTIFICATION_ROLE_ID=role_id_to_mention_on_new_requests
   REJECTED_LEAVE_ROLE_ID=role_id_for_rejected_leave
   DEFAULT_LANGUAGE=ar
   MAX_LEAVE_REQUESTS_PER_WEEK=2
   REMINDER_HOURS_BEFORE_END=24
   ```

5. **نشر الأوامر / Deploy commands**
   ```bash
   npm run deploy-commands
   ```

6. **تشغيل البوت / Start the bot**
   ```bash
   npm start
   ```

## 📋 الأوامر / Commands

| الأمر / Command | الوصف / Description |
|----------------|---------------------|
| `/deploy-embed` | نشر إمبيد طلب الإجازة / Deploy leave request embed |
| `/my-requests` | عرض طلباتي السابقة / View my previous requests |
| `/search-request` | البحث عن طلب / Search for a request |
| `/leave-statistics` | عرض الإحصائيات / View statistics |
| `/cancel-leave` | إلغاء إجازة / Cancel a leave |
| `/export-leaves` | تصدير البيانات / Export data |
| `/lock-leaves` | قفل النظام / Lock the system |
| `/unlock-leaves` | فتح النظام / Unlock the system |
| `/set-language` | تغيير اللغة / Change language |
| `/add-note` | إضافة ملاحظة / Add a note |

## 📁 هيكل المشروع / Project Structure

```
police-leave-bot/
├── src/
│   ├── commands/          # أوامر السلاش
│   ├── events/            # أحداث ديسكورد
│   ├── handlers/          # معالجات التفاعلات
│   ├── utils/             # أدوات مساعدة
│   ├── database/          # قاعدة البيانات
│   ├── config.js          # الإعدادات
│   ├── index.js           # نقطة البداية
│   └── deploy-commands.js # نشر الأوامر
├── lang/                  # ملفات اللغة
│   ├── ar.json
│   └── en.json
├── data/                  # قاعدة البيانات (تُنشأ تلقائياً)
├── package.json
├── .env.example
└── README.md
```

## 🔧 الإعدادات / Configuration

### حدود مدة الإجازة حسب الرتبة / Role Duration Limits
يمكنك تحديد الحد الأقصى لمدة الإجازة لكل رتبة في ملف `src/config.js`:

```javascript
roleDurationLimits: {
    'role_id_1': 7,  // ضابط: 7 أيام
    'role_id_2': 10, // ملازم: 10 أيام
    'role_id_3': 30  // قائد: 30 يوم
}
```

### تفعيل الموافقة الثنائية / Enable Two-Step Approval
```javascript
twoStepApproval: true
```

## 🗄️ قاعدة البيانات / Database

يستخدم البوت SQLite لتخزين البيانات. تُنشأ قاعدة البيانات تلقائياً في مجلد `data/`.

### الجداول / Tables
- `leaves` - طلبات الإجازة
- `notes` - الملاحظات الإدارية
- `settings` - إعدادات النظام
- `status_history` - سجل تغييرات الحالة

## 📝 حالات الطلب / Request Statuses

| الحالة / Status | الوصف / Description |
|----------------|---------------------|
| `pending` | قيد المراجعة / Pending Review |
| `approved` | مقبول / Approved |
| `rejected` | مرفوض / Rejected |
| `cancelled` | ملغى / Cancelled |

## 🔐 الصلاحيات / Permissions

يحتاج البوت إلى الصلاحيات التالية:
- Manage Roles
- Send Messages
- Embed Links
- Read Message History
- Use Application Commands

### ⚠️ Privileged Gateway Intents / النوايا المميزة

يجب تفعيل النوايا التالية في بوابة مطوري Discord:
You must enable the following intents in the Discord Developer Portal:

1. انتقل إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. اختر تطبيقك / Select your application
3. اذهب إلى **Bot** > **Privileged Gateway Intents**
4. فعّل **SERVER MEMBERS INTENT** / Enable **SERVER MEMBERS INTENT**

> ⚠️ بدون تفعيل هذه النية، سيفشل البوت في تسجيل الدخول مع خطأ "Used disallowed intents"
>
> ⚠️ Without enabling this intent, the bot will fail to login with "Used disallowed intents" error

## 📞 الدعم / Support

إذا واجهت أي مشاكل، يرجى فتح Issue في المستودع.

## 📄 الرخصة / License

MIT License
