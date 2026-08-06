"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "RU" | "UZ" | "EN";

export interface Translations {
  // Navigation & Header
  home: string;
  journal: string;
  archive: string;
  about: string;
  login: string;
  register: string;
  authorCabinet: string;
  editorCabinet: string;

  // Buttons & Navigation
  back: string;
  backToJournal: string;
  backToArchives: string;

  // Author Dashboard
  dashboard: string;
  myArticles: string;
  submitArticle: string;
  messages: string;
  settings: string;
  currentIssue: string;
  viewIssue: string;
  welcomeBack: string;
  welcomeSubtitle: string;
  submitNewArticle: string;
  underReview: string;
  revisionRequired: string;
  published: string;
  drafts: string;

  // Article Submission Form
  submissionTitle: string;
  submissionSubtitle: string;
  stepStart: string;
  stepDetails: string;
  stepCoAuthors: string;
  stepReview: string;
  articleType: string;
  manuscriptTitle: string;
  abstract: string;
  keywords: string;
  dragDrop: string;
  or: string;
  browseFiles: string;
  saveDraft: string;
  cancel: string;
  saveContinue: string;
  submitToEditorial: string;

  // Sidebar Guidelines
  submissionGuidelines: string;
  guidelinesText: string;
  downloadGuidelines: string;
  requiredFiles: string;
  tipsForAuthors: string;
  needHelp: string;

  // Profile & Settings
  profileSettings: string;
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
  orcid: string;
  uploadPhoto: string;
  saveChanges: string;
  logout: string;

  // Article Detail Page
  openAccess: string;
  peerReviewed: string;
  publishedOn: string;
  authorRole: string;
  coAuthorRole: string;
  pages: string;
  articleInfo: string;
  files: string;
  download: string;
  downloadPdf: string;
  howToCite: string;
  copied: string;
  pdfPreview: string;
  metrics: string;
  views: string;
  downloads: string;
  citations: string;
  updated: string;
  share: string;

  // Public Journal Page
  articlesInThisIssue: string;
  journalInfo: string;
  aimsAndScope: string;
  editorialBoard: string;
  peerReviewProcess: string;
  publicationEthics: string;
  openAccessPolicy: string;
  copyrightNotice: string;
  indexingAndAbstracting: string;
  moreAboutJournal: string;

  // Additional Panel & Revision Translations
  reviewerCabinet: string;
  editDraft: string;
  resubmitArticle: string;
  editorNotes: string;
  fileRequiredError: string;
  totalIssues: string;
  archiveSubtitle: string;

  // Home Page Specific Translations
  heroEyebrow: string;
  heroTitle1: string;
  heroTitleHighlight: string;
  heroTitle2: string;
  heroSubtitle: string;
  submitArticleBtn: string;
  currentIssueEyebrow: string;
  allIssuesLink: string;
  articlesCountInIssue: string;
  noIssuesTitle: string;
  noIssuesDesc: string;
  noIssuesWait: string;
  noArticlesDesc: string;
  recentArticlesEyebrow: string;
  recentArticlesHeading: string;
  readMore: string;
  aboutEyebrow: string;
  aboutTitle1: string;
  aboutTitle2: string;
  aboutDesc: string;
  aboutPolicyLink: string;
  publishedArticlesStat: string;
  journalIssuesStat: string;
  partnersEyebrow: string;
  partnersHeading: string;
  supportEyebrow: string;
  supportHeading: string;
  supportDesc: string;
  contactUsBtn: string;
  footerJournalGroup: string;
  footerAuthorsGroup: string;
  footerServicesGroup: string;
  allRightsReserved: string;
  privacyPolicy: string;
  termsOfUse: string;

  // Editor Panel Specific Translations
  editorDashboard: string;
  editorNewArticles: string;
  editorJournalIssues: string;
  editorAuthors: string;
  editorUsers: string;
  editorStatistics: string;
  editorMessages: string;
  editorSettings: string;
  editorPanelTitle: string;
  editorSearchPlaceholder: string;
  overallOverview: string;
  totalSubmissions: string;
  recentSubmissions: string;
  createIssueBtn: string;
}

const translations: Record<Language, Translations> = {
  RU: {
    home: "Главная",
    journal: "Текущий выпуск",
    archive: "Архив выпусков",
    about: "О журнале",
    login: "Войти",
    register: "Регистрация",
    authorCabinet: "Кабинет автора",
    editorCabinet: "Кабинет редактора",

    back: "← Назад",
    backToJournal: "← Назад к журналу",
    backToArchives: "← Назад к архиву",

    dashboard: "Главная",
    myArticles: "Мои статьи",
    submitArticle: "Подать статью",
    messages: "Сообщения",
    settings: "Настройки",
    currentIssue: "ТЕКУЩИЙ ВЫПУСК",
    viewIssue: "Перейти к выпуску",
    welcomeBack: "Рады видеть вас",
    welcomeSubtitle: "Управляйте публикациями, отслеживайте статус статей и общайтесь с редакцией в одном месте.",
    submitNewArticle: "↗ Подать новую статью",
    underReview: "На рассмотрении",
    revisionRequired: "Требуют доработки",
    published: "Опубликовано",
    drafts: "Черновики",

    submissionTitle: "Подача новой статьи",
    submissionSubtitle: "Следуйте шагам ниже, чтобы отправить рукопись в редакцию",
    stepStart: "Начало",
    stepDetails: "Детали",
    stepCoAuthors: "Соавторы",
    stepReview: "Проверка и отправка",
    articleType: "Тип статьи",
    manuscriptTitle: "Название рукописи",
    abstract: "Аннотация",
    keywords: "Ключевые слова",
    dragDrop: "Перетащите файлы сюда",
    or: "или",
    browseFiles: "Выбрать файлы",
    saveDraft: "Сохранить как черновик",
    cancel: "Отмена",
    saveContinue: "Сохранить и продолжить →",
    submitToEditorial: "↗ Подать статью в редакцию",

    submissionGuidelines: "Руководство по подаче",
    guidelinesText: "Перед отправкой убедитесь, что ваша рукопись соответствует руководству автора.",
    downloadGuidelines: "📥 Скачать руководство",
    requiredFiles: "Обязательные файлы",
    tipsForAuthors: "Советы для авторов",
    needHelp: "Нужна помощь?",

    profileSettings: "Настройки Профиля Автора",
    firstName: "Имя",
    lastName: "Фамилия",
    email: "Email пользователя",
    institution: "Организация / Место работы",
    orcid: "Идентификатор ORCID",
    uploadPhoto: "📷 Загрузить фото",
    saveChanges: "💾 Сохранить изменения профиля",
    logout: "⇥ Выйти из системы",

    openAccess: "Open Access",
    peerReviewed: "Рецензируемая статья",
    publishedOn: "Опубликовано:",
    authorRole: "Автор публикации",
    coAuthorRole: "Соавтор публикации",
    pages: "Страницы:",
    articleInfo: "Информация о статье",
    files: "Файлы",
    download: "Скачать",
    downloadPdf: "Скачать PDF",
    howToCite: "Как цитировать",
    copied: "✓ Скопировано",
    pdfPreview: "Просмотр PDF",
    metrics: "Метрики статьи",
    views: "Просмотры",
    downloads: "Скачивания",
    citations: "Цитирования",
    updated: "Обновлено",
    share: "Поделиться",

    articlesInThisIssue: "Статьи в этом выпуске",
    journalInfo: "Информация о журнале",
    aimsAndScope: "Цели и область исследований",
    editorialBoard: "Редакционная коллегия",
    peerReviewProcess: "Процесс рецензирования",
    publicationEthics: "Этика публикаций",
    openAccessPolicy: "Политика открытого доступа",
    copyrightNotice: "Авторские права",
    indexingAndAbstracting: "Индексация и базы данных",
    moreAboutJournal: "Подробнее о журнале",

    reviewerCabinet: "Кабинет рецензента",
    editDraft: "✏️ Редактировать",
    resubmitArticle: "🔄 Исправить и отправить",
    editorNotes: "Замечания редактора:",
    fileRequiredError: "Загрузка файла рукописи (DOCX или PDF) обязательна!",
    totalIssues: "Всего выпусков:",
    archiveSubtitle: "Полный реестр всех опубликованных номеров журнала",

    heroEyebrow: "Международный научный журнал · Open Access",
    heroTitle1: "Знания, которые",
    heroTitleHighlight: "двигают",
    heroTitle2: "науку вперёд.",
    heroSubtitle: "«Expert» публикует независимые исследования в области права и правовых исследований — для академического сообщества и практиков.",
    submitArticleBtn: "Подать статью",
    currentIssueEyebrow: "АКТУАЛЬНЫЙ НОМЕР",
    allIssuesLink: "Все выпуски",
    articlesCountInIssue: "статей в номере",
    noIssuesTitle: "На данный момент нет опубликованных выпусков журнала",
    noIssuesDesc: "Все новые номера журнала будут доступны сразу после публикации в панели редактора.",
    noIssuesWait: "Ожидание публикации",
    noArticlesDesc: "Опубликованные статьи пока отсутствуют.",
    recentArticlesEyebrow: "ИССЛЕДОВАНИЯ",
    recentArticlesHeading: "Новые публикации",
    readMore: "Читать",
    aboutEyebrow: "О ЖУРНАЛЕ",
    aboutTitle1: "Наука, понятная",
    aboutTitle2: "и доступная миру.",
    aboutDesc: "«Expert» — независимая площадка для качественного научного диалога. Мы объединяем исследователей, профессиональное сообщество и новые идеи.",
    aboutPolicyLink: "Узнать о редакционной политике",
    publishedArticlesStat: "опубликованных статей",
    journalIssuesStat: "выпусков журнала",
    partnersEyebrow: "НАШИ ПАРТНЁРЫ И ИНДЕКСАЦИЯ",
    partnersHeading: "Представлены в международных базах",
    supportEyebrow: "ПОДДЕРЖКА",
    supportHeading: "Частые вопросы",
    supportDesc: "Не нашли ответ? Напишите редакции — мы обычно отвечаем в течение одного рабочего дня.",
    contactUsBtn: "Связаться с нами",
    footerJournalGroup: "Журнал",
    footerAuthorsGroup: "Авторам",
    footerServicesGroup: "Сервисы",
    allRightsReserved: "Все права защищены",
    privacyPolicy: "Политика конфиденциальности",
    termsOfUse: "Условия использования",

    editorDashboard: "Дашборд",
    editorNewArticles: "Новые статьи",
    editorJournalIssues: "Выпуски журнала",
    editorAuthors: "Авторы",
    editorUsers: "Пользователи",
    editorStatistics: "Статистика",
    editorMessages: "Сообщения",
    editorSettings: "Настройки",
    editorPanelTitle: "Редакционная панель",
    editorSearchPlaceholder: "Поиск статей, авторов, DOI...",
    overallOverview: "Общий обзор",
    totalSubmissions: "Всего рукописей",
    recentSubmissions: "Недавние рукописи",
    createIssueBtn: "Создать выпуск",
  },
  UZ: {
    home: "Bosh sahifa",
    journal: "Joriy nashr",
    archive: "Nashrlar arxivi",
    about: "Jurnal haqida",
    login: "Kirish",
    register: "Ro'yxatdan o me'yorlash",
    authorCabinet: "Muallif kabineti",
    editorCabinet: "Muharrir kabineti",

    back: "← Orqaga",
    backToJournal: "← Jurnalga qaytish",
    backToArchives: "← Arxivga qaytish",

    dashboard: "Bosh sahifa",
    myArticles: "Mening maqolalarim",
    submitArticle: "Maqola topshirish",
    messages: "Xabarlar",
    settings: "Sozlamalar",
    currentIssue: "JORIY NASHR",
    viewIssue: "Nashrga o'tish",
    welcomeBack: "Xush kelibsiz",
    welcomeSubtitle: "Nashrlaringizni boshqaring, maqola holatini kuzating va tahririyat bilan bog'laning.",
    submitNewArticle: "↗ Yangi maqola topshirish",
    underReview: "Ko'rib chiqilmoqda",
    revisionRequired: "Qayta ishlash talab etiladi",
    published: "Nashr etildi",
    drafts: "Qoralamalar",

    submissionTitle: "Yangi maqola topshirish",
    submissionSubtitle: "Qo'lyozmani tahririyatga yuborish uchun quyidagi bosqichlarni bajaring",
    stepStart: "Boshlanishi",
    stepDetails: "Tafsilotlar",
    stepCoAuthors: "Hammualliflar",
    stepReview: "Tekshirish va yuborish",
    articleType: "Maqola turi",
    manuscriptTitle: "Qo'lyozma sarlavhasi",
    abstract: "Annotatsiya",
    keywords: "Kalit so'zlar",
    dragDrop: "Fayllarni shu yerga tashlang",
    or: "yoki",
    browseFiles: "Fayllarni tanlash",
    saveDraft: "Qoralama sifatida saqlash",
    cancel: "Bekor qilish",
    saveContinue: "Saqlash va davom etish →",
    submitToEditorial: "↗ Tahririyatga yuborish",

    submissionGuidelines: "Topshirish bo'yicha yo'riqnoma",
    guidelinesText: "Yuborishdan oldin qo'lyozmangiz muallif yo'riqnomasiga mos kelishiga ishonch hosil qiling.",
    downloadGuidelines: "📥 Yo'riqnomani yuklab olish",
    requiredFiles: "Majburiy fayllar",
    tipsForAuthors: "Mualliflar uchun maslahatlar",
    needHelp: "Yordam kerakmi?",

    profileSettings: "Muallif profili sozlamalari",
    firstName: "Ism",
    lastName: "Familiya",
    email: "Foydalanuvchi elektron pochtasi",
    institution: "Tashkilot / Ish joyi",
    orcid: "ORCID identifikatori",
    uploadPhoto: "📷 Rasm yuklash",
    saveChanges: "💾 Profil o'zgarishlarini saqlash",
    logout: "⇥ Tizimdan chiqish",

    openAccess: "Ochiq kirish",
    peerReviewed: "Taqrizdan o'tgan maqola",
    publishedOn: "Nashr etilgan:",
    authorRole: "Maqola muallifi",
    coAuthorRole: "Hammuallif",
    pages: "Sahifalar:",
    articleInfo: "Maqola haqida ma'lumot",
    files: "Fayllar",
    download: "Yuklab olish",
    downloadPdf: "PDF yuklab olish",
    howToCite: "Iqtibos keltirish",
    copied: "✓ Nusxalandi",
    pdfPreview: "PDF ko'rish",
    metrics: "Maqola ko'rsatkichlari",
    views: "Ko'rishlar",
    downloads: "Yuklashlar",
    citations: "Iqtiboslar",
    updated: "Yangilangan",
    share: "Ulashish",

    articlesInThisIssue: "Ushbu sondagi maqolalar",
    journalInfo: "Jurnal haqida ma'lumot",
    aimsAndScope: "Maqsad va qamrov",
    editorialBoard: "Tahririyat hay'ati",
    peerReviewProcess: "Taqrizdan o'tkazish jarayoni",
    publicationEthics: "Nashr etish odob-axloqi",
    openAccessPolicy: "Ochiq kirish siyosati",
    copyrightNotice: "Mualliflik huquqi",
    indexingAndAbstracting: "Indeksatsiya va ma'lumotlar bazasi",
    moreAboutJournal: "Jurnal haqida batafsil",

    reviewerCabinet: "Taqrizchi kabineti",
    editDraft: "✏️ Tahrirlash",
    resubmitArticle: "🔄 Tuzatib qayta yuborish",
    editorNotes: "Muharrir mulohazalari:",
    fileRequiredError: "Qo'lyozma faylini yuklash (DOCX yoki PDF) majburiy!",
    totalIssues: "Jami nashrlar:",
    archiveSubtitle: "Jurnalning barcha nashr etilgan sonlari reestri",

    heroEyebrow: "Xalqaro ilmiy jurnal · Open Access",
    heroTitle1: "Ilm-fanni",
    heroTitleHighlight: "olg'a boshlaydigan",
    heroTitle2: "bilimlar.",
    heroSubtitle: "«Expert» huquq va yuridik fanlar sohasida mustaqil tadqiqotlarni akademiya va amaliyotchilar uchun nashr etadi.",
    submitArticleBtn: "Maqola topshirish",
    currentIssueEyebrow: "JORIY NASHR",
    allIssuesLink: "Barcha sonlar",
    articlesCountInIssue: "sonidagi maqolalar",
    noIssuesTitle: "Hozirgi vaqtda nashr etilgan jurnal sonlari mavjud emas",
    noIssuesDesc: "Barcha yangi sonlar tahririyat panelida nashr etilgandan so'ng darhol ushbu sahifada ko'rinadi.",
    noIssuesWait: "Nashr etilish kutilmoqda",
    noArticlesDesc: "Nashr etilgan maqolalar hali mavjud emas.",
    recentArticlesEyebrow: "TADQIQOTLAR",
    recentArticlesHeading: "Yangi nashrlar",
    readMore: "O'qish",
    aboutEyebrow: "JURNAL HAQIDA",
    aboutTitle1: "Dunyo uchun tushunarli",
    aboutTitle2: "va ochiq ilmiy platforma.",
    aboutDesc: "«Expert» — sifatli ilmiy muloqot uchun mustaqil maydon. Biz tadqiqotchilar, professional hamjamiyat va yangi g'oyalarni birilashtiramiz.",
    aboutPolicyLink: "Tahririyat siyosati haqida ma'lumot",
    publishedArticlesStat: "nashr etilgan maqolalar",
    journalIssuesStat: "jurnal sonlari",
    partnersEyebrow: "HAMKORLARIMIZ VA INDEKSATSIYA",
    partnersHeading: "Xalqaro ma'lumotlar bazalarida indekslangan",
    supportEyebrow: "YORDAM",
    supportHeading: "Ko'p beriladigan savollar",
    supportDesc: "Savolingizga javob topmadingizmi? Tahririyatga yozing — biz bir ish kuni ichida javob beramiz.",
    contactUsBtn: "Biz bilan bog'lanish",
    footerJournalGroup: "Jurnal",
    footerAuthorsGroup: "Mualliflarga",
    footerServicesGroup: "Xizmatlar",
    allRightsReserved: "Barcha huquqlar himoyalangan",
    privacyPolicy: "Maxfiylik siyosati",
    termsOfUse: "Foydalanish shartlari",

    editorDashboard: "Boshqaruv paneli",
    editorNewArticles: "Yangi maqolalar",
    editorJournalIssues: "Jurnal sonlari",
    editorAuthors: "Mualliflar",
    editorUsers: "Foydalanuvchilar",
    editorStatistics: "Statistika",
    editorMessages: "Xabarlar",
    editorSettings: "Sozlamalar",
    editorPanelTitle: "Tahririyat paneli",
    editorSearchPlaceholder: "Maqolalar, mualliflar, DOI qidiruvi...",
    overallOverview: "Umumiy sharh",
    totalSubmissions: "Jami topshirilganlar",
    recentSubmissions: "Yangi topshirilganlar",
    createIssueBtn: "Nashr yaratish",
  },
  EN: {
    home: "Home",
    journal: "Current Issue",
    archive: "Archives",
    about: "About Journal",
    login: "Sign In",
    register: "Register",
    authorCabinet: "Author Portal",
    editorCabinet: "Editor Portal",

    back: "← Back",
    backToJournal: "← Back to Journal",
    backToArchives: "← Back to Archives",

    dashboard: "Dashboard",
    myArticles: "My Articles",
    submitArticle: "Submit Article",
    messages: "Messages",
    settings: "Settings",
    currentIssue: "CURRENT ISSUE",
    viewIssue: "View Issue",
    welcomeBack: "Welcome back",
    welcomeSubtitle: "Manage your submissions, track peer-review status, and communicate with the editorial office.",
    submitNewArticle: "↗ Submit New Article",
    underReview: "Under Review",
    revisionRequired: "Revision Required",
    published: "Published",
    drafts: "Drafts",

    submissionTitle: "Submit a New Article",
    submissionSubtitle: "Follow the steps below to submit your manuscript to the editorial office",
    stepStart: "Start",
    stepDetails: "Details",
    stepCoAuthors: "Co-Authors",
    stepReview: "Review & Submit",
    articleType: "Article Type",
    manuscriptTitle: "Manuscript Title",
    abstract: "Abstract",
    keywords: "Keywords",
    dragDrop: "Drag & drop your files here",
    or: "or",
    browseFiles: "Browse Files",
    saveDraft: "Save as Draft",
    saveContinue: "Save & Continue →",
    submitToEditorial: "↗ Submit to Editorial",
    cancel: "Cancel",

    submissionGuidelines: "Submission Guidelines",
    guidelinesText: "Before submitting, please make sure your manuscript complies with Author Guidelines.",
    downloadGuidelines: "📥 Download Guidelines",
    requiredFiles: "Required Files",
    tipsForAuthors: "Tips for Authors",
    needHelp: "Need Help?",

    profileSettings: "Author Profile Settings",
    firstName: "First Name",
    lastName: "Last Name",
    email: "User Email",
    institution: "Affiliation / Institution",
    orcid: "ORCID iD",
    uploadPhoto: "📷 Upload Photo",
    saveChanges: "💾 Save Profile Changes",
    logout: "Sign Out",

    openAccess: "Open Access",
    peerReviewed: "Peer-Reviewed Article",
    publishedOn: "Published on:",
    authorRole: "Author",
    coAuthorRole: "Co-Author",
    pages: "Pages:",
    articleInfo: "Article Information",
    files: "Files",
    download: "Download",
    downloadPdf: "Download PDF",
    howToCite: "How to Cite",
    copied: "✓ Copied",
    pdfPreview: "PDF Preview",
    metrics: "Article Metrics",
    views: "Views",
    downloads: "Downloads",
    citations: "Citations",
    updated: "Updated",
    share: "Share",

    articlesInThisIssue: "Articles in this Issue",
    journalInfo: "Journal Information",
    aimsAndScope: "Aims and Scope",
    editorialBoard: "Editorial Board",
    peerReviewProcess: "Peer Review Process",
    publicationEthics: "Publication Ethics",
    openAccessPolicy: "Open Access Policy",
    copyrightNotice: "Copyright Notice",
    indexingAndAbstracting: "Indexing & Abstracting",
    moreAboutJournal: "More About the Journal",

    reviewerCabinet: "Reviewer Portal",
    editDraft: "✏️ Edit Draft",
    resubmitArticle: "🔄 Revise & Resubmit",
    editorNotes: "Editor's Revision Notes:",
    fileRequiredError: "Manuscript file upload (DOCX or PDF) is mandatory!",
    totalIssues: "Total Issues:",
    archiveSubtitle: "Complete archive registry of all published journal issues",

    heroEyebrow: "International Scientific Journal · Open Access",
    heroTitle1: "Knowledge that",
    heroTitleHighlight: "drives",
    heroTitle2: "science forward.",
    heroSubtitle: "«Expert» publishes independent research in law and legal studies for the academic community and practitioners.",
    submitArticleBtn: "Submit Article",
    currentIssueEyebrow: "CURRENT ISSUE",
    allIssuesLink: "All Issues",
    articlesCountInIssue: "articles in issue",
    noIssuesTitle: "There are currently no published journal issues",
    noIssuesDesc: "New issues will be available on this page immediately after publication by the editorial board.",
    noIssuesWait: "Awaiting Publication",
    noArticlesDesc: "No published articles available yet.",
    recentArticlesEyebrow: "RESEARCH",
    recentArticlesHeading: "Recent Publications",
    readMore: "Read",
    aboutEyebrow: "ABOUT THE JOURNAL",
    aboutTitle1: "Science that is accessible",
    aboutTitle2: "and clear to the world.",
    aboutDesc: "«Expert» is an independent platform for high-quality scientific dialogue connecting researchers, professionals, and new ideas.",
    aboutPolicyLink: "Learn about Editorial Policy",
    publishedArticlesStat: "published articles",
    journalIssuesStat: "journal issues",
    partnersEyebrow: "OUR PARTNERS & INDEXING",
    partnersHeading: "Represented in International Databases",
    supportEyebrow: "SUPPORT",
    supportHeading: "Frequently Asked Questions",
    supportDesc: "Didn't find an answer? Write to the editorial office — we usually respond within one business day.",
    contactUsBtn: "Contact Us",
    footerJournalGroup: "Journal",
    footerAuthorsGroup: "Authors",
    footerServicesGroup: "Services",
    allRightsReserved: "All rights reserved",
    privacyPolicy: "Privacy Policy",
    termsOfUse: "Terms of Use",

    editorDashboard: "Dashboard",
    editorNewArticles: "New Articles",
    editorJournalIssues: "Journal Issues",
    editorAuthors: "Authors",
    editorUsers: "Users",
    editorStatistics: "Statistics",
    editorMessages: "Messages",
    editorSettings: "Settings",
    editorPanelTitle: "Editorial Platform",
    editorSearchPlaceholder: "Search articles, authors, DOI...",
    overallOverview: "Overall Overview",
    totalSubmissions: "Total Submissions",
    recentSubmissions: "Recent Submissions",
    createIssueBtn: "Create Issue",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("RU");

  useEffect(() => {
    const syncLang = () => {
      try {
        const savedLang = localStorage.getItem("expert_lang") as Language;
        if (savedLang && (savedLang === "RU" || savedLang === "UZ" || savedLang === "EN")) {
          setLanguageState(savedLang);
        }
      } catch (e) {}
    };

    syncLang();
    window.addEventListener("storage", syncLang);
    window.addEventListener("languageChange", syncLang);
    return () => {
      window.removeEventListener("storage", syncLang);
      window.removeEventListener("languageChange", syncLang);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("expert_lang", lang);
      window.dispatchEvent(new Event("languageChange"));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  const t = translations[language] || translations.RU;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
