/* ============================================================
   Elite 3 — DB layer
   Simulates a Firestore-style database using localStorage so the
   whole platform runs standalone, with no server required.
   Swap the functions in this file for real Firebase SDK calls
   when you connect a live Firebase project.
   ============================================================ */
const DB_KEY = "elite3_db_v1";

function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function seedData() {
  const teachers = [
    { id: uid("t"), name: "محمد صلاح", subject: "اللغة العربية", bio: "خبرة أكثر من 15 عامًا في تدريس اللغة العربية لطلاب الثانوية العامة، متخصص في تبسيط النحو والأدب.", color: "#0E7C4A" },
    { id: uid("t"), name: "رضا الفاروق", subject: "اللغة العربية", bio: "معروف بأسلوبه السهل في شرح البلاغة والنصوص، وتحضير الطلاب لأنماط الامتحانات الحديثة.", color: "#1CA35C" },
    { id: uid("t"), name: "خالد صقر", subject: "الكيمياء", bio: "متخصص في الكيمياء العضوية وغير العضوية مع أكبر بنك أسئلة وامتحانات محاكاة.", color: "#2563EB" },
    { id: uid("t"), name: "عبد الجواد", subject: "الكيمياء", bio: "أسلوب مبسط يعتمد على الرسوم التوضيحية والتجارب العملية المصورة.", color: "#5B8CFF" },
    { id: uid("t"), name: "انجلشاوي", subject: "اللغة الإنجليزية", bio: "متخصص في الجرامر والكومبروهنشن مع تدريبات مكثفة على نظام البابل شيت.", color: "#DC2626" },
    { id: uid("t"), name: "محمد عبد المعبود", subject: "الفيزياء", bio: "يبسط قوانين الفيزياء بأمثلة تطبيقية ويركز على حل المسائل خطوة بخطوة.", color: "#0B4A2C" },
    { id: uid("t"), name: "الجوهري", subject: "الأحياء", bio: "شرح تفصيلي مدعوم بالرسومات التشريحية لجميع أبواب منهج الأحياء.", color: "#1CA35C" }
  ];

  const videos = [
    { id: uid("v"), title: "المراجعة النهائية - النحو", subject: "اللغة العربية", teacherId: teachers[0].id, driveUrl: "https://drive.google.com/", order: 1 },
    { id: uid("v"), title: "شرح نص الأدب - الفصل الأول", subject: "اللغة العربية", teacherId: teachers[1].id, driveUrl: "https://drive.google.com/", order: 1 },
    { id: uid("v"), title: "الكيمياء العضوية - الهالوجينات", subject: "الكيمياء", teacherId: teachers[2].id, driveUrl: "https://drive.google.com/", order: 1 },
    { id: uid("v"), title: "الاتزان الكيميائي", subject: "الكيمياء", teacherId: teachers[3].id, driveUrl: "https://drive.google.com/", order: 1 },
    { id: uid("v"), title: "Grammar Revision - Tenses", subject: "اللغة الإنجليزية", teacherId: teachers[4].id, driveUrl: "https://drive.google.com/", order: 1 },
    { id: uid("v"), title: "قوانين نيوتن للحركة", subject: "الفيزياء", teacherId: teachers[5].id, driveUrl: "https://drive.google.com/", order: 1 },
    { id: uid("v"), title: "الجهاز العصبي", subject: "الأحياء", teacherId: teachers[6].id, driveUrl: "https://drive.google.com/", order: 1 }
  ];

  const exams = [
    {
      id: uid("e"), title: "امتحان النحو الشامل", subject: "اللغة العربية", teacherId: teachers[0].id,
      duration: 20, totalGrade: 10,
      questions: [
        { q: "علامة رفع الاسم المفرد هي:", options: ["الضمة", "الفتحة", "الكسرة", "السكون"], correct: 0 },
        { q: "الفعل المضارع يُنصب بـ:", options: ["لم", "لن", "قد", "السين"], correct: 1 },
        { q: "\"إنّ\" من أخوات:", options: ["كان", "كاد", "ظن", "لا النافية للجنس"], correct: 3 },
        { q: "جمع المذكر السالم يُنصب ويُجر بـ:", options: ["الألف", "الياء", "الواو", "النون"], correct: 1 },
        { q: "المبتدأ والخبر يكونان مرفوعين إلا مع:", options: ["كان وأخواتها", "الفعل الماضي", "حروف الجر", "لا شيء"], correct: 0 }
      ]
    },
    {
      id: uid("e"), title: "امتحان الكيمياء العضوية", subject: "الكيمياء", teacherId: teachers[2].id,
      duration: 25, totalGrade: 10,
      questions: [
        { q: "الصيغة العامة للألكانات هي:", options: ["CnH2n", "CnH2n+2", "CnH2n-2", "CnHn"], correct: 1 },
        { q: "أي المركبات التالية أليفاتي؟", options: ["البنزين", "الميثان", "التولوين", "النافثالين"], correct: 1 },
        { q: "تفاعل الاستبدال المميز للألكانات هو:", options: ["الهلجنة", "الأدمة", "البلمرة", "الاختزال"], correct: 0 },
        { q: "عدد ذرات الكربون في البروبان:", options: ["1", "2", "3", "4"], correct: 2 }
      ]
    },
    {
      id: uid("e"), title: "English Grammar Test", subject: "اللغة الإنجليزية", teacherId: teachers[4].id,
      duration: 15, totalGrade: 10,
      questions: [
        { q: "She ____ to school every day.", options: ["go", "goes", "going", "gone"], correct: 1 },
        { q: "They ____ finished their homework yet.", options: ["haven't", "hasn't", "didn't", "don't"], correct: 0 },
        { q: "Choose the correct passive form: 'They built the house.'", options: ["The house built.", "The house was built.", "The house is build.", "The house building."], correct: 1 }
      ]
    }
  ];

  const codes = [
    { id: uid("c"), code: "01222HH", type: "admin", studentName: null, startDate: null, endDate: null, durationMonths: null, status: "active", deviceId: null, studentId: null }
  ];

  return { teachers, videos, exams, codes, students: [], results: [], notifications: [] };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addMonthsISO(iso, months) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / 86400000);
}

const DB = {
  _data: null,

  load() {
    if (this._data) return this._data;
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        this._data = JSON.parse(raw);
      } catch (e) {
        this._data = seedData();
      }
    } else {
      this._data = seedData();
      this.save();
    }
    return this._data;
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this._data));
  },

  reset() {
    localStorage.removeItem(DB_KEY);
    this._data = seedData();
    this.save();
    localStorage.removeItem("elite3_session");
  },

  // ---- generic collection helpers ----
  col(name) {
    return this.load()[name];
  },
  add(name, item) {
    item.id = item.id || uid(name[0]);
    this.load()[name].push(item);
    this.save();
    return item;
  },
  update(name, id, patch) {
    const arr = this.load()[name];
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    arr[idx] = { ...arr[idx], ...patch };
    this.save();
    return arr[idx];
  },
  remove(name, id) {
    const arr = this.load()[name];
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return false;
    arr.splice(idx, 1);
    this.save();
    return true;
  },
  find(name, id) {
    return this.load()[name].find((x) => x.id === id) || null;
  }
};

// ---- session ----
const Session = {
  get() {
    try {
      return JSON.parse(localStorage.getItem("elite3_session"));
    } catch (e) {
      return null;
    }
  },
  set(obj) {
    localStorage.setItem("elite3_session", JSON.stringify(obj));
  },
  clear() {
    localStorage.removeItem("elite3_session");
  }
};

// ---- device fingerprint (simple, local-only) ----
function getDeviceId() {
  let id = localStorage.getItem("elite3_device_id");
  if (!id) {
    id = uid("dev");
    localStorage.setItem("elite3_device_id", id);
  }
  return id;
}
