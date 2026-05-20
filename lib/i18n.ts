// All user-facing Hebrew strings live here.
// Tone: yedidutit — friendly, warm, family-grade. No corporate Hebrew.
// Drafted with the hebrew-content-writer skill in mind.

export const strings = {
  appName: 'אדמרקט',

  // Auth — sign-in
  signIn: {
    title: 'ברוכים הבאים',
    subtitle: 'התחברו או צרו חשבון',
    emailLabel: 'כתובת מייל',
    emailPlaceholder: 'name@example.com',
    passwordLabel: 'סיסמה',
    passwordPlaceholder: 'לפחות 6 תווים',
    submitSignIn: 'התחברו',
    submitSignUp: 'צרו חשבון',
    switchToSignUp: 'אין לכם חשבון? הרשמו כאן',
    switchToSignIn: 'יש לכם חשבון? התחברו כאן',
    errorGeneric: 'משהו השתבש, נסו שוב',
    errorInvalidEmail: 'כתובת המייל לא נראית תקינה',
    errorShortPassword: 'הסיסמה חייבת להכיל לפחות 6 תווים',
    errorInvalidCredentials: 'מייל או סיסמה שגויים',
    errorEmailNotConfirmed: 'המייל עדיין לא אושר — אשרו אותו בסופרבייס או כבו את אימות המייל',
  },

  // Auth — household
  household: {
    title: 'משק הבית',
    chooseCreate: 'צרו משק בית חדש',
    chooseJoin: 'הצטרפו עם קוד',
    createName: 'איך נקרא למשק הבית?',
    createNamePlaceholder: 'משפחת כהן',
    createSubmit: 'צרו',
    joinCode: 'קוד הזמנה',
    joinCodePlaceholder: 'למשל BREAD-42',
    joinSubmit: 'הצטרפו',
    inviteCodeLabel: 'קוד ההזמנה שלכם',
    inviteCodeHint: 'שתפו את הקוד עם בני המשפחה',
    inviteCodeCopy: 'העתיקו',
    inviteCodeCopied: 'הועתק',
    errorBadCode: 'הקוד לא נמצא, בדקו שוב',
  },

  // Main list
  list: {
    title: 'רשימת קניות',
    sectionToBuy: 'לקנייה',
    sectionBought: 'נקנה',
    empty: 'הרשימה ריקה — הוסיפו פריט ראשון',
    addPlaceholder: 'הוסיפו פריט…',
    addButton: 'הוסף',
    delete: 'מחקו',
    undo: 'ביטול',
    suggestionsHint: 'מומלץ:',
  },

  // Scan / OCR
  scan: {
    title: 'סריקת רשימה מהמקרר',
    intro: 'צלמו את הרשימה ונחלץ ממנה פריטים',
    capture: 'צלמו רשימה',
    pickFromGallery: 'בחרו מהגלריה',
    processing: 'מזהה פריטים…',
    rateLimited: 'יותר מדי בקשות, נסו שוב בעוד דקה',
    failed: 'לא הצלחנו לזהות פריטים. נסו תמונה ברורה יותר.',
    reviewTitle: 'בדקו ועדכנו לפני הוספה',
    reviewHint: 'סמנו V ליד מה שתרצו להוסיף. ניתן לערוך או למחוק.',
    confirmAdd: 'הוסיפו לרשימה',
    confirmAddCount: (n: number) => `הוסיפו ${n} פריטים`,
    selectAll: 'בחרו הכל',
    deselectAll: 'בטלו בחירה',
    deleteSelected: 'מחקו נבחרים',
    confidenceLow: 'לא בטוח — בדקו',
    cancel: 'בטלו',
  },

  // Settings
  settings: {
    title: 'הגדרות',
    householdName: 'שם משק הבית',
    inviteCode: 'קוד הזמנה',
    signOut: 'התנתקו',
    signOutConfirm: 'להתנתק?',
    members: 'בני הבית',
  },

  // Common
  common: {
    save: 'שמרו',
    cancel: 'בטלו',
    delete: 'מחקו',
    edit: 'ערכו',
    back: 'חזרה',
    loading: 'טוען…',
    retry: 'נסו שוב',
    error: 'שגיאה',
  },

  // Tab labels
  tabs: {
    list: 'רשימה',
    scan: 'סריקה',
    settings: 'הגדרות',
  },
} as const;

export type Strings = typeof strings;
