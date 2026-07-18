/* ============================================================
   Elite 3 — application logic
   ============================================================ */

/* ---------------- THEME ---------------- */
function initTheme() {
  const saved = localStorage.getItem("elite3_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("elite3_theme", next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme) {
  document.querySelectorAll(".theme-icon").forEach((el) => {
    el.textContent = theme === "dark" ? "☀️" : "🌙";
  });
}

/* ---------------- TOASTS ---------------- */
function toast(msg, type = "green") {
  const wrap = document.getElementById("toastWrap");
  const el = document.createElement("div");
  el.className = "toast";
  const colors = { green: "✅", red: "⛔", blue: "ℹ️" };
  el.innerHTML = `<span>${colors[type] || "✅"}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

/* ---------------- PWA INSTALL ---------------- */
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.querySelectorAll(".install-btn").forEach((b) => (b.style.display = "inline-flex"));
});
function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(() => (deferredInstallPrompt = null));
  } else {
    toast("لتثبيت التطبيق: افتح قائمة المتصفح واختر «إضافة إلى الشاشة الرئيسية»", "blue");
  }
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

/* ---------------- ROUTER ---------------- */
function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  const session = Session.get();

  // Guard: admin/student areas require session
  if (parts[0] === "admin" && (!session || session.role !== "admin")) {
    location.hash = "#/login";
    return;
  }
  if (parts[0] === "student" && (!session || session.role !== "student")) {
    location.hash = "#/login";
    return;
  }

  document.getElementById("publicShell").classList.remove("active");
  document.getElementById("appShell").classList.remove("active");
  document.getElementById("authShell").classList.remove("active");

  if (parts[0] === "login") {
    document.getElementById("authShell").classList.add("active");
    renderLogin();
  } else if (parts[0] === "register") {
    document.getElementById("authShell").classList.add("active");
    renderRegister();
  } else if (parts[0] === "student") {
    document.getElementById("appShell").classList.add("active");
    renderStudentArea(parts.slice(1));
  } else if (parts[0] === "admin") {
    document.getElementById("appShell").classList.add("active");
    renderAdminArea(parts.slice(1));
  } else {
    document.getElementById("publicShell").classList.add("active");
    renderLanding();
  }
  window.scrollTo({ top: 0 });
  closeMobileSidebar();
}
window.addEventListener("hashchange", route);

/* ================================================================
   PUBLIC LANDING PAGE
   ================================================================ */
function renderLanding() {
  const teachers = DB.col("teachers");
  const bySubject = {};
  teachers.forEach((t) => {
    bySubject[t.subject] = bySubject[t.subject] || [];
    bySubject[t.subject].push(t);
  });

  document.getElementById("teachersGrid").innerHTML = teachers
    .map(
      (t) => `
    <div class="card teacher-card" onclick="openTeacherPreview('${t.id}')">
      <div class="teacher-avatar" style="background:linear-gradient(155deg, ${t.color}, var(--blue-600))">${initials(t.name)}</div>
      <h3>${t.name}</h3>
      <div class="subject">${t.subject}</div>
    </div>`
    )
    .join("");
}
function initials(name) {
  return name.trim().split(" ")[0].slice(0, 2);
}
function openTeacherPreview(id) {
  const t = DB.find("teachers", id);
  if (!t) return;
  openModal(`
    <div class="flex items-center gap-12 mb-16">
      <div class="teacher-avatar" style="margin:0;width:60px;height:60px;font-size:19px;background:linear-gradient(155deg, ${t.color}, var(--blue-600))">${initials(t.name)}</div>
      <div><h3 style="margin-bottom:2px">${t.name}</h3><div style="color:var(--green-700);font-weight:700;font-size:13px">${t.subject}</div></div>
    </div>
    <p>${t.bio}</p>
    <div class="modal-close-row">
      <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
      <button class="btn btn-primary" onclick="closeModal(); location.hash='#/login'">سجّل دخولك لمشاهدة محاضراته</button>
    </div>
  `);
}
function toggleFaq(el) {
  el.parentElement.classList.toggle("open");
}

/* ================================================================
   AUTH: LOGIN + REGISTER
   ================================================================ */
function renderLogin() {
  document.getElementById("authContent").innerHTML = `
    <div class="auth-card">
      <div class="mark brand" style="justify-content:center;width:52px;height:52px;font-size:19px;margin:0 auto 16px;border-radius:16px"><img src="icons/icon-192.png" alt="Elite 3" /></div>
      <h2>تسجيل الدخول</h2>
      <p class="sub">أدخل كود الاشتراك الخاص بك للمتابعة</p>
      <div class="field">
        <label>الكود</label>
        <input id="loginCode" placeholder="اكتب الكود هنا" autocomplete="off" style="text-align:center;letter-spacing:2px;font-weight:800" />
      </div>
      <button class="btn btn-primary btn-block" onclick="doLogin()">دخول</button>
      <a href="#/" class="btn btn-ghost btn-block mt-10">العودة للصفحة الرئيسية</a>
    </div>
  `;
  setTimeout(() => {
    const inp = document.getElementById("loginCode");
    if (inp) inp.addEventListener("keydown", (e) => e.key === "Enter" && doLogin());
  }, 0);
}

function doLogin() {
  const raw = (document.getElementById("loginCode").value || "").trim().toUpperCase();
  if (!raw) return toast("من فضلك أدخل الكود", "red");
  const code = DB.col("codes").find((c) => c.code.toUpperCase() === raw);
  if (!code) return toast("الكود غير صحيح", "red");
  if (code.status !== "active") return toast("هذا الكود موقوف. تواصل مع الإدارة عبر واتساب", "red");

  if (code.type === "admin") {
    Session.set({ role: "admin", codeId: code.id });
    toast("مرحبًا بك في لوحة التحكم");
    location.hash = "#/admin";
    return;
  }

  // student code
  if (code.endDate && daysBetween(todayISO(), code.endDate) < 0) {
    DB.update("codes", code.id, { status: "expired" });
    return toast("انتهت مدة هذا الاشتراك. تواصل معنا عبر واتساب للتجديد", "red");
  }

  const device = getDeviceId();
  if (code.deviceId && code.deviceId !== device) {
    return toast("هذا الكود مستخدم بالفعل على جهاز آخر. تواصل مع الأدمن لفك الربط", "red");
  }
  if (!code.deviceId) {
    DB.update("codes", code.id, { deviceId: device });
  }

  if (!code.studentId) {
    Session.set({ role: "pending_register", codeId: code.id });
    location.hash = "#/register";
    return;
  }

  Session.set({ role: "student", codeId: code.id, studentId: code.studentId });
  toast("تم تسجيل الدخول بنجاح");
  location.hash = "#/student";
}

function renderRegister() {
  const session = Session.get();
  if (!session || session.role !== "pending_register") {
    location.hash = "#/login";
    return;
  }
  document.getElementById("authContent").innerHTML = `
    <div class="auth-card" style="max-width:560px">
      <h2>بيانات الطالب</h2>
      <p class="sub">أول مرة تسجّل دخول — أكمل بياناتك للمتابعة</p>
      <div class="form-grid">
        <div class="field"><label>الاسم بالكامل *</label><input id="rName" /></div>
        <div class="field"><label>رقم الهاتف *</label><input id="rPhone" type="tel" /></div>
        <div class="field"><label>رقم ولي الأمر *</label><input id="rParentPhone" type="tel" /></div>
        <div class="field"><label>المدرسة *</label><input id="rSchool" /></div>
        <div class="field"><label>المحافظة *</label><input id="rGov" /></div>
        <div class="field">
          <label>الشعبة *</label>
          <select id="rTrack">
            <option value="علمي علوم">علمي علوم</option>
            <option value="علمي رياضة">علمي رياضة</option>
            <option value="أدبي">أدبي</option>
          </select>
        </div>
        <div class="field"><label>البريد الإلكتروني (اختياري)</label><input id="rEmail" type="email" /></div>
      </div>
      <button class="btn btn-primary btn-block mt-10" onclick="completeRegister()">حفظ ومتابعة</button>
    </div>
  `;
}

function completeRegister() {
  const name = val("rName"), phone = val("rPhone"), parentPhone = val("rParentPhone");
  const school = val("rSchool"), gov = val("rGov"), track = val("rTrack"), email = val("rEmail");
  if (!name || !phone || !parentPhone || !school || !gov) {
    return toast("من فضلك أكمل كل الحقول المطلوبة", "red");
  }
  const session = Session.get();
  const code = DB.find("codes", session.codeId);
  const student = DB.add("students", {
    name, phone, parentPhone, school, governorate: gov, track, email,
    codeId: code.id, deviceId: getDeviceId(), avatar: null, createdAt: todayISO(),
    videosWatched: [], examsCompleted: []
  });
  DB.update("codes", code.id, { studentId: student.id, studentName: name });
  Session.set({ role: "student", codeId: code.id, studentId: student.id });
  toast("تم إنشاء حسابك بنجاح 🎉");
  location.hash = "#/student";
}
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function logout() {
  Session.clear();
  location.hash = "#/";
  toast("تم تسجيل الخروج", "blue");
}

/* ================================================================
   SHARED APP SHELL (sidebar + topbar)
   ================================================================ */
function currentStudent() {
  const s = Session.get();
  return s ? DB.find("students", s.studentId) : null;
}
function studentAvgAndRank(studentId) {
  const results = DB.col("results").filter((r) => r.studentId === studentId);
  const avg = results.length ? results.reduce((a, r) => a + (r.score / r.total) * 100, 0) / results.length : 0;
  return { avg, count: results.length };
}
function leaderboard() {
  const students = DB.col("students");
  const rows = students.map((st) => {
    const { avg, count } = studentAvgAndRank(st.id);
    return { id: st.id, name: st.name, avg, count };
  });
  rows.sort((a, b) => b.avg - a.avg || b.count - a.count);
  return rows;
}

function sidebarHTML(role, activeKey) {
  const items = role === "student"
    ? [
        ["student", "🏠", "الرئيسية"],
        ["student/ranking", "🏆", "الترتيب"],
        ["student/notifications", "🔔", "الإشعارات"],
        ["student/profile", "👤", "حسابي"]
      ]
    : [
        ["admin", "📊", "الإحصائيات"],
        ["admin/students", "🎓", "الطلاب"],
        ["admin/codes", "🔑", "الأكواد"],
        ["admin/teachers", "🧑‍🏫", "المدرسون"],
        ["admin/videos", "🎬", "الفيديوهات"],
        ["admin/exams", "📝", "الامتحانات"],
        ["admin/notifications", "🔔", "الإشعارات"]
      ];
  const st = role === "student" ? currentStudent() : null;
  return `
    <div class="brand"><div class="mark"><img src="icons/icon-192.png" alt="Elite 3" /></div> Elite 3</div>
    ${items
      .map(
        ([path, icon, label]) =>
          `<a class="side-link ${activeKey === path ? "active" : ""}" href="#/${path}"><span class="em">${icon}</span> ${label}</a>`
      )
      .join("")}
    <div class="spacer"></div>
    ${
      st
        ? `<div class="side-userbox"><b>${st.name}</b><span style="color:var(--muted)">${st.track}</span></div>`
        : role === "admin"
        ? `<div class="side-userbox"><b>لوحة تحكم الأدمن</b><span style="color:var(--muted)">صلاحية كاملة</span></div>`
        : ""
    }
    <button class="btn btn-outline btn-block mt-10" onclick="logout()">🚪 تسجيل الخروج</button>
  `;
}
function renderShell(role, activeKey, title, crumb, bodyHTML) {
  document.getElementById("sidebar").innerHTML = sidebarHTML(role, activeKey);
  document.getElementById("mainArea").innerHTML = `
    <div class="topbar">
      <div>
        <div class="crumb">${crumb}</div>
        <h1>${title}</h1>
      </div>
      <div class="flex gap-8">
        <button class="icon-btn theme-icon-btn" onclick="toggleTheme()"><span class="theme-icon">🌙</span></button>
        <button class="icon-btn" onclick="toggleMobileSidebar()">☰</button>
      </div>
    </div>
    <div id="pageBody">${bodyHTML}</div>
  `;
  updateThemeIcon(document.documentElement.getAttribute("data-theme"));
}
function toggleMobileSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}
function closeMobileSidebar() {
  const sb = document.getElementById("sidebar");
  if (sb) sb.classList.remove("open");
}

/* ================================================================
   STUDENT AREA
   ================================================================ */
function renderStudentArea(parts) {
  const student = currentStudent();
  if (!student) return logout();

  if (parts[0] === "teacher" && parts[1]) return renderStudentTeacherPage(student, parts[1]);
  if (parts[0] === "exam" && parts[1] && parts[2] === "result") return renderExamResult(student, parts[1]);
  if (parts[0] === "exam" && parts[1]) return renderExamTake(student, parts[1]);
  if (parts[0] === "ranking") return renderStudentRanking(student);
  if (parts[0] === "notifications") return renderStudentNotifications(student);
  if (parts[0] === "profile") return renderStudentProfile(student);
  return renderStudentHome(student);
}

function subscriptionInfo(student) {
  const code = DB.find("codes", student.codeId);
  const daysLeft = code && code.endDate ? Math.max(0, daysBetween(todayISO(), code.endDate)) : 0;
  return { code, daysLeft };
}

function renderStudentHome(student) {
  const { daysLeft } = subscriptionInfo(student);
  const videosWatched = student.videosWatched?.length || 0;
  const results = DB.col("results").filter((r) => r.studentId === student.id);
  const examsCount = results.length;
  const avg = examsCount ? (results.reduce((a, r) => a + (r.score / r.total) * 100, 0) / examsCount) : 0;
  const rank = leaderboard();
  const myRank = rank.findIndex((r) => r.id === student.id) + 1;

  const teachers = DB.col("teachers");

  renderShell(
    "student",
    "student",
    `أهلًا، ${student.name.split(" ")[0]} 👋`,
    "لوحة الطالب",
    `
    <div class="grid grid-4 mb-16">
      ${statCard("⏳", daysLeft + " يوم", "الاشتراك المتبقي", "var(--green-700)", "#0E7C4A18")}
      ${statCard("🎬", videosWatched, "محاضرة تمت مشاهدتها", "var(--blue-600)", "#2563EB18")}
      ${statCard("📝", examsCount, "امتحان تم إنجازه", "var(--red-600)", "#DC262618")}
      ${statCard("📈", avg.toFixed(0) + "%", "متوسط الدرجات", "var(--green-700)", "#0E7C4A18")}
    </div>

    <div class="card mb-16 flex items-center justify-between" style="flex-wrap:wrap;gap:14px">
      <div class="flex items-center gap-12">
        <div class="ring-wrap">${ringSVG(myRank && rank.length ? Math.max(8, 100 - (myRank / rank.length) * 100) : 0, "var(--green-700)")}</div>
        <div>
          <b style="font-family:var(--font-display);font-size:17px">ترتيبك الحالي: ${myRank || "—"} ${rank.length ? "من " + rank.length : ""}</b>
          <p style="margin-top:4px">استمر في أداء الامتحانات لتحسين ترتيبك بين زملائك</p>
        </div>
      </div>
      <a href="#/student/ranking" class="btn btn-outline btn-sm">عرض الترتيب الكامل</a>
    </div>

    <div class="section-head" style="margin-bottom:18px">
      <h2 style="font-size:20px">مدرسوك</h2>
      <p>اختر مدرسًا لمشاهدة محاضراته وأداء امتحاناته</p>
    </div>
    <div class="grid grid-4">
      ${teachers
        .map((t) => {
          const prog = teacherProgress(student, t.id);
          return `
          <div class="card teacher-card" onclick="location.hash='#/student/teacher/${t.id}'">
            <div class="teacher-avatar" style="background:linear-gradient(155deg, ${t.color}, var(--blue-600))">${initials(t.name)}</div>
            <h3>${t.name}</h3>
            <div class="subject mb-16">${t.subject}</div>
            <div class="progressbar"><i style="width:${prog.pct}%"></i></div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:6px">إنجاز ${prog.pct}%</div>
          </div>`;
        })
        .join("")}
    </div>
  `
  );
}

function statCard(icon, val, label, color, bg) {
  return `<div class="card stat-card"><div class="ico" style="background:${bg};color:${color}">${icon}</div><div><div class="v">${val}</div><div class="l">${label}</div></div></div>`;
}
function ringSVG(pct, color) {
  const r = 30, c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return `<svg width="70" height="70" viewBox="0 0 70 70">
    <circle cx="35" cy="35" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="7"/>
    <circle cx="35" cy="35" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" />
  </svg><div class="val">${pct.toFixed(0)}%</div>`;
}
function teacherProgress(student, teacherId) {
  const videos = DB.col("videos").filter((v) => v.teacherId === teacherId);
  const exams = DB.col("exams").filter((e) => e.teacherId === teacherId);
  const total = videos.length + exams.length || 1;
  const done =
    videos.filter((v) => (student.videosWatched || []).includes(v.id)).length +
    exams.filter((e) => (student.examsCompleted || []).includes(e.id)).length;
  return { pct: Math.round((done / total) * 100), done, total };
}

function renderStudentTeacherPage(student, teacherId) {
  const t = DB.find("teachers", teacherId);
  if (!t) return (location.hash = "#/student");
  const videos = DB.col("videos").filter((v) => v.teacherId === teacherId).sort((a, b) => a.order - b.order);
  const exams = DB.col("exams").filter((e) => e.teacherId === teacherId);
  const prog = teacherProgress(student, teacherId);

  renderShell(
    "student",
    "student",
    t.name,
    `المدرسون / ${t.subject}`,
    `
    <div class="card mb-16 flex items-center gap-12" style="flex-wrap:wrap">
      <div class="teacher-avatar" style="margin:0;background:linear-gradient(155deg, ${t.color}, var(--blue-600))">${initials(t.name)}</div>
      <div style="flex:1;min-width:200px">
        <h3 style="margin-bottom:4px">${t.name}</h3>
        <p>${t.bio}</p>
      </div>
      <div style="text-align:center">
        <div class="ring-wrap">${ringSVG(prog.pct, t.color)}</div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:4px">نسبة الإنجاز</div>
      </div>
    </div>

    <div class="tab-row">
      <div class="tab active" onclick="switchTab(this,'panelVideos')">المحاضرات (${videos.length})</div>
      <div class="tab" onclick="switchTab(this,'panelExams')">الامتحانات (${exams.length})</div>
    </div>

    <div id="panelVideos">
      ${
        videos.length
          ? videos
              .map(
                (v, i) => `
          <div class="video-item">
            <div class="num">${i + 1}</div>
            <div class="meta"><b>${v.title}</b><span>${v.subject}${(student.videosWatched || []).includes(v.id) ? " · تمت المشاهدة ✓" : ""}</span></div>
            <button class="btn btn-primary btn-sm" onclick="watchVideo('${v.id}','${v.driveUrl}')">مشاهدة</button>
          </div>`
              )
              .join("")
          : emptyState("🎬", "لا توجد محاضرات مضافة بعد")
      }
    </div>
    <div id="panelExams" class="hidden">
      ${
        exams.length
          ? exams
              .map(
                (e) => `
          <div class="exam-item">
            <div class="num">📝</div>
            <div class="meta"><b>${e.title}</b><span>${e.questions.length} سؤال · ${e.duration} دقيقة${(student.examsCompleted || []).includes(e.id) ? " · تم الحل ✓" : ""}</span></div>
            <button class="btn ${(student.examsCompleted || []).includes(e.id) ? "btn-outline" : "btn-red"} btn-sm" onclick="location.hash='#/student/exam/${e.id}'">
              ${(student.examsCompleted || []).includes(e.id) ? "عرض النتيجة" : "ابدأ الامتحان"}
            </button>
          </div>`
              )
              .join("")
          : emptyState("📝", "لا توجد امتحانات مضافة بعد")
      }
    </div>
  `
  );
}
function switchTab(el, panelId) {
  el.parentElement.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  el.closest("#pageBody").querySelectorAll('[id^="panel"]').forEach((p) => p.classList.add("hidden"));
  document.getElementById(panelId).classList.remove("hidden");
}
function emptyState(icon, msg) {
  return `<div class="empty-state"><div class="ico">${icon}</div><p>${msg}</p></div>`;
}
function watchVideo(videoId, url) {
  const student = currentStudent();
  if (!(student.videosWatched || []).includes(videoId)) {
    const list = student.videosWatched || [];
    list.push(videoId);
    DB.update("students", student.id, { videosWatched: list });
  }
  window.open(url, "_blank");
  route();
}

/* ---------- exam taking ---------- */
let examSession = null; // { examId, answers: {}, timeLeft }
let examTimerHandle = null;

function renderExamTake(student, examId) {
  const exam = DB.find("exams", examId);
  if (!exam) return (location.hash = "#/student");

  if ((student.examsCompleted || []).includes(examId)) {
    location.hash = `#/student/exam/${examId}/result`;
    return;
  }

  if (!examSession || examSession.examId !== examId) {
    examSession = { examId, answers: {}, timeLeft: exam.duration * 60 };
  }

  renderShell(
    "student",
    "student",
    exam.title,
    `امتحان · ${exam.subject}`,
    `
    <div class="card mb-16 flex items-center justify-between" style="position:sticky;top:82px;z-index:5">
      <div>عدد الأسئلة: <b>${exam.questions.length}</b> · الدرجة الكلية: <b>${exam.totalGrade}</b></div>
      <div class="badge badge-red" id="examTimer" style="font-size:14px;padding:8px 16px">⏱ ${formatTime(examSession.timeLeft)}</div>
    </div>
    <div class="card">
      ${exam.questions
        .map(
          (q, qi) => `
        <div class="exam-question">
          <div class="qtitle"><span class="bubble-dot filled" style="width:22px;height:22px;background:var(--green-700);border:none"></span> ${qi + 1}. ${q.q}</div>
          ${q.options
            .map(
              (opt, oi) => `
            <div class="opt-row ${examSession.answers[qi] === oi ? "selected" : ""}" onclick="selectAnswer(${qi},${oi})">
              <span class="bubble-dot ${examSession.answers[qi] === oi ? "filled" : ""}"></span>
              <span>${opt}</span>
            </div>`
            )
            .join("")}
        </div>`
        )
        .join("")}
      <button class="btn btn-primary btn-block" onclick="submitExam()">تسليم الامتحان</button>
    </div>
  `
  );

  clearInterval(examTimerHandle);
  examTimerHandle = setInterval(() => {
    examSession.timeLeft--;
    const el = document.getElementById("examTimer");
    if (el) el.textContent = "⏱ " + formatTime(examSession.timeLeft);
    if (examSession.timeLeft <= 0) {
      clearInterval(examTimerHandle);
      submitExam(true);
    }
  }, 1000);
}
function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function selectAnswer(qi, oi) {
  examSession.answers[qi] = oi;
  route();
}
function submitExam(auto = false) {
  clearInterval(examTimerHandle);
  const exam = DB.find("exams", examSession.examId);
  const student = currentStudent();
  let correct = 0;
  exam.questions.forEach((q, qi) => {
    if (examSession.answers[qi] === q.correct) correct++;
  });
  const score = Math.round((correct / exam.questions.length) * exam.totalGrade * 100) / 100;

  DB.add("results", {
    studentId: student.id,
    examId: exam.id,
    score,
    total: exam.totalGrade,
    correctCount: correct,
    totalQuestions: exam.questions.length,
    date: new Date().toISOString(),
    answers: examSession.answers
  });
  const completed = student.examsCompleted || [];
  completed.push(exam.id);
  DB.update("students", student.id, { examsCompleted: completed });

  toast(auto ? "انتهى الوقت! تم تسليم الامتحان تلقائيًا" : "تم تسليم الامتحان بنجاح 🎉");
  examSession = null;
  location.hash = `#/student/exam/${exam.id}/result`;
}
function renderExamResult(student, examId) {
  const exam = DB.find("exams", examId);
  const result = DB.col("results").filter((r) => r.studentId === student.id && r.examId === examId).pop();
  if (!exam || !result) return (location.hash = "#/student");

  const allResults = DB.col("results").filter((r) => r.examId === examId);
  const scores = allResults.map((r) => r.score);
  const classAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const highest = Math.max(...scores);
  const sortedDesc = [...allResults].sort((a, b) => b.score - a.score);
  const myRank = sortedDesc.findIndex((r) => r.studentId === student.id) + 1;
  const betterThanPct = Math.round(((allResults.length - myRank) / Math.max(1, allResults.length - 1 || 1)) * 100);
  const pct = (result.score / result.total) * 100;

  renderShell(
    "student",
    "student",
    "نتيجة الامتحان",
    exam.title,
    `
    <div class="grid grid-2 mb-16" style="gap:22px">
      <div class="card" style="text-align:center;padding:34px">
        <div class="ring-wrap" style="width:120px;height:120px;margin:0 auto 14px">
          ${ringSVG(pct, pct >= 50 ? "var(--green-700)" : "var(--red-600)").replace('width="70" height="70" viewBox="0 0 70 70"', 'width="120" height="120" viewBox="0 0 70 70"')}
        </div>
        <h2 style="font-size:26px">${result.score} / ${result.total}</h2>
        <p>${result.correctCount} إجابة صحيحة من ${result.totalQuestions}</p>
      </div>
      <div class="card">
        <h3 class="mb-16">مقارنة أدائك</h3>
        <div class="flex justify-between mt-10"><span>درجتك</span><b>${result.score}</b></div>
        <div class="flex justify-between mt-10"><span>متوسط الطلاب</span><b>${classAvg.toFixed(1)}</b></div>
        <div class="flex justify-between mt-10"><span>أعلى درجة</span><b>${highest}</b></div>
        <div class="flex justify-between mt-10"><span>ترتيبك في هذا الامتحان</span><b>${myRank} من ${allResults.length}</b></div>
        <div class="flex justify-between mt-10"><span>تفوقت على</span><b>${betterThanPct}% من الطلاب</b></div>
      </div>
    </div>
    <a href="#/student/teacher/${exam.teacherId}" class="btn btn-outline">العودة لصفحة المدرس</a>
  `
  );
}

function renderStudentRanking(student) {
  const rows = leaderboard().slice(0, 20);
  renderShell(
    "student",
    "student/ranking",
    "الترتيب العام",
    "أفضل 20 طالبًا",
    `
    <div class="card">
      ${
        rows.length
          ? rows
              .map(
                (r, i) => `
        <div class="rank-row ${r.id === student.id ? "me" : ""}">
          <div class="rank-num ${i < 3 ? "top" : ""}">${i + 1}</div>
          <div style="flex:1"><b>${r.name}</b>${r.id === student.id ? " <span style='color:var(--green-700);font-size:12px'>(أنت)</span>" : ""}</div>
          <div style="font-size:13px;color:var(--muted)">${r.count} امتحان</div>
          <div style="font-family:var(--font-display);font-weight:800">${r.avg.toFixed(1)}%</div>
        </div>`
              )
              .join("")
          : emptyState("🏆", "لا توجد نتائج بعد")
      }
    </div>
  `
  );
}

function renderStudentNotifications(student) {
  const notifs = DB.col("notifications")
    .filter((n) => n.target === "all" || n.target === student.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  renderShell(
    "student",
    "student/notifications",
    "الإشعارات",
    "آخر تحديثات المنصة",
    `<div class="card">
      ${
        notifs.length
          ? notifs
              .map(
                (n) => `<div class="video-item"><div class="num">🔔</div><div class="meta"><b>${n.title}</b><span>${n.body}</span></div></div>`
              )
              .join("")
          : emptyState("🔔", "لا توجد إشعارات حاليًا")
      }
    </div>`
  );
}

function renderStudentProfile(student) {
  const { code, daysLeft } = subscriptionInfo(student);
  renderShell(
    "student",
    "student/profile",
    "حسابي",
    "البيانات الشخصية",
    `
    <div class="card grid grid-2">
      <div><label style="font-size:12.5px;color:var(--muted)">الاسم</label><p style="color:var(--text);font-weight:700">${student.name}</p></div>
      <div><label style="font-size:12.5px;color:var(--muted)">رقم الهاتف</label><p style="color:var(--text);font-weight:700">${student.phone}</p></div>
      <div><label style="font-size:12.5px;color:var(--muted)">رقم ولي الأمر</label><p style="color:var(--text);font-weight:700">${student.parentPhone}</p></div>
      <div><label style="font-size:12.5px;color:var(--muted)">المدرسة</label><p style="color:var(--text);font-weight:700">${student.school}</p></div>
      <div><label style="font-size:12.5px;color:var(--muted)">المحافظة</label><p style="color:var(--text);font-weight:700">${student.governorate}</p></div>
      <div><label style="font-size:12.5px;color:var(--muted)">الشعبة</label><p style="color:var(--text);font-weight:700">${student.track}</p></div>
      <div><label style="font-size:12.5px;color:var(--muted)">الكود</label><p style="color:var(--text);font-weight:700">${code.code}</p></div>
      <div><label style="font-size:12.5px;color:var(--muted)">الاشتراك متبقٍ</label><p style="color:var(--text);font-weight:700">${daysLeft} يوم</p></div>
    </div>
  `
  );
}

/* ================================================================
   ADMIN AREA
   ================================================================ */
function renderAdminArea(parts) {
  if (parts[0] === "students") return renderAdminStudents();
  if (parts[0] === "codes") return renderAdminCodes();
  if (parts[0] === "teachers") return renderAdminTeachers();
  if (parts[0] === "videos") return renderAdminVideos();
  if (parts[0] === "exams" && parts[1] === "builder" && parts[2]) return renderExamBuilder(parts[2]);
  if (parts[0] === "exams") return renderAdminExams();
  if (parts[0] === "notifications") return renderAdminNotifications();
  return renderAdminDashboard();
}

function renderAdminDashboard() {
  const students = DB.col("students");
  const codes = DB.col("codes").filter((c) => c.type === "student");
  const active = codes.filter((c) => c.status === "active").length;
  const expired = codes.filter((c) => c.status !== "active").length;
  const videos = DB.col("videos");
  const exams = DB.col("exams");
  const results = DB.col("results");
  const avgAll = results.length ? results.reduce((a, r) => a + (r.score / r.total) * 100, 0) / results.length : 0;

  const subjectCounts = {};
  results.forEach((r) => {
    const ex = DB.find("exams", r.examId);
    if (ex) subjectCounts[ex.subject] = (subjectCounts[ex.subject] || 0) + 1;
  });
  const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0];

  const examCounts = {};
  results.forEach((r) => (examCounts[r.examId] = (examCounts[r.examId] || 0) + 1));
  const topExamId = Object.entries(examCounts).sort((a, b) => b[1] - a[1])[0];
  const topExam = topExamId ? DB.find("exams", topExamId[0]) : null;

  renderShell(
    "admin",
    "admin",
    "الإحصائيات",
    "لوحة تحكم الأدمن",
    `
    <div class="grid grid-4 mb-16">
      ${statCard("🎓", students.length, "إجمالي الطلاب", "var(--green-700)", "#0E7C4A18")}
      ${statCard("✅", active, "اشتراكات نشطة", "var(--blue-600)", "#2563EB18")}
      ${statCard("⛔", expired, "اشتراكات منتهية", "var(--red-600)", "#DC262618")}
      ${statCard("📈", avgAll.toFixed(0) + "%", "متوسط درجات المنصة", "var(--green-700)", "#0E7C4A18")}
    </div>
    <div class="grid grid-4 mb-16">
      ${statCard("🎬", videos.length, "عدد الفيديوهات", "var(--blue-600)", "#2563EB18")}
      ${statCard("📝", exams.length, "عدد الامتحانات", "var(--red-600)", "#DC262618")}
      ${statCard("🔥", topSubject ? topSubject[0] : "—", "أكثر مادة حلًا للامتحانات", "var(--green-700)", "#0E7C4A18")}
      ${statCard("🏅", topExam ? topExam.title : "—", "أكثر امتحان تم حله", "var(--blue-600)", "#2563EB18")}
    </div>
    <div class="card">
      <h3 class="mb-16">أحدث الطلاب المسجلين</h3>
      ${
        students.length
          ? `<table><thead><tr><th>الاسم</th><th>المدرسة</th><th>الشعبة</th><th>تاريخ التسجيل</th></tr></thead><tbody>
        ${students.slice(-6).reverse().map((s) => `<tr><td>${s.name}</td><td>${s.school}</td><td>${s.track}</td><td>${s.createdAt}</td></tr>`).join("")}
        </tbody></table>`
          : emptyState("🎓", "لا يوجد طلاب مسجلون بعد")
      }
    </div>
  `
  );
}

/* ---- students management ---- */
function renderAdminStudents() {
  const students = DB.col("students");
  renderShell(
    "admin",
    "admin/students",
    "إدارة الطلاب",
    `${students.length} طالب`,
    `
    <div class="card">
      ${
        students.length
          ? `<table><thead><tr><th>الاسم</th><th>الهاتف</th><th>المدرسة</th><th>الشعبة</th><th>الحالة</th><th></th></tr></thead><tbody>
        ${students
          .map((s) => {
            const code = DB.find("codes", s.codeId);
            return `<tr>
              <td>${s.name}</td><td>${s.phone}</td><td>${s.school}</td><td>${s.track}</td>
              <td>${code && code.status === "active" ? '<span class="badge badge-green">نشط</span>' : '<span class="badge badge-red">موقوف</span>'}</td>
              <td class="table-actions">
                <button class="btn btn-outline btn-sm" onclick="viewStudent('${s.id}')">عرض</button>
                <button class="btn btn-red btn-sm" onclick="deleteStudent('${s.id}')">حذف</button>
              </td>
            </tr>`;
          })
          .join("")}
        </tbody></table>`
          : emptyState("🎓", "لا يوجد طلاب بعد")
      }
    </div>
  `
  );
}
function viewStudent(id) {
  const s = DB.find("students", id);
  const code = DB.find("codes", s.codeId);
  const { avg, count } = studentAvgAndRank(id);
  openModal(`
    <h3>${s.name}</h3>
    <p>📞 ${s.phone} · ولي الأمر: ${s.parentPhone}</p>
    <p>🏫 ${s.school} — ${s.governorate} — ${s.track}</p>
    <p>📊 متوسط الدرجات: ${avg.toFixed(1)}% عبر ${count} امتحان</p>
    <p>🔑 الكود: ${code ? code.code : "—"} · الحالة: ${code ? code.status : "—"}</p>
    <div class="modal-close-row">
      <button class="btn btn-outline" onclick="toggleStudentSub('${s.id}')">${code && code.status === "active" ? "إيقاف الاشتراك" : "إعادة تفعيل"}</button>
      <button class="btn btn-blue" onclick="unlinkDevice('${s.id}')">فك ربط الجهاز</button>
      <button class="btn btn-primary" onclick="closeModal()">إغلاق</button>
    </div>
  `);
}
function toggleStudentSub(studentId) {
  const s = DB.find("students", studentId);
  const code = DB.find("codes", s.codeId);
  DB.update("codes", code.id, { status: code.status === "active" ? "expired" : "active" });
  toast("تم تحديث حالة الاشتراك");
  closeModal();
  route();
}
function unlinkDevice(studentId) {
  const s = DB.find("students", studentId);
  DB.update("codes", s.codeId, { deviceId: null });
  toast("تم فك ربط الجهاز، يمكن الدخول من جهاز جديد");
  closeModal();
}
function deleteStudent(id) {
  if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;
  const s = DB.find("students", id);
  DB.remove("students", id);
  DB.remove("codes", s.codeId);
  toast("تم حذف الطالب", "red");
  route();
}

/* ---- codes management ---- */
function renderAdminCodes() {
  const codes = DB.col("codes");
  renderShell(
    "admin",
    "admin/codes",
    "إدارة الأكواد",
    `${codes.length} كود`,
    `
    <div class="flex justify-between mb-16"><div></div><button class="btn btn-primary" onclick="openCodeModal()">+ إنشاء كود جديد</button></div>
    <div class="card">
      <table><thead><tr><th>الكود</th><th>النوع</th><th>الطالب</th><th>الانتهاء</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${codes
        .map(
          (c) => `<tr>
        <td><b>${c.code}</b></td>
        <td>${c.type === "admin" ? '<span class="badge badge-blue">أدمن</span>' : '<span class="badge badge-green">طالب</span>'}</td>
        <td>${c.studentName || "—"}</td>
        <td>${c.endDate || "—"}</td>
        <td>${c.status === "active" ? '<span class="badge badge-green">فعال</span>' : '<span class="badge badge-red">منتهي</span>'}</td>
        <td class="table-actions">
          ${c.type === "student" ? `<button class="btn btn-outline btn-sm" onclick="extendCode('${c.id}')">تمديد شهر</button>` : ""}
          <button class="btn btn-red btn-sm" onclick="deleteCode('${c.id}')">حذف</button>
        </td>
      </tr>`
        )
        .join("")}
      </tbody></table>
    </div>
  `
  );
}
function openCodeModal() {
  openModal(`
    <h3>إنشاء كود جديد</h3>
    <div class="field"><label>الكود</label><input id="newCode" placeholder="مثال: STUD1002" style="text-transform:uppercase" /></div>
    <div class="field"><label>مدة الاشتراك (بالأشهر)</label><input id="newCodeMonths" type="number" value="1" min="1" /></div>
    <div class="modal-close-row">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="createCode()">إنشاء</button>
    </div>
  `);
}
function createCode() {
  const code = val("newCode").toUpperCase();
  const months = parseInt(val("newCodeMonths") || "1", 10);
  if (!code) return toast("أدخل نص الكود", "red");
  if (DB.col("codes").some((c) => c.code.toUpperCase() === code)) return toast("هذا الكود مستخدم بالفعل", "red");
  DB.add("codes", {
    code, type: "student", studentName: null, startDate: todayISO(),
    endDate: addMonthsISO(todayISO(), months), durationMonths: months,
    status: "active", deviceId: null, studentId: null
  });
  toast("تم إنشاء الكود بنجاح");
  closeModal();
  route();
}
function extendCode(id) {
  const c = DB.find("codes", id);
  DB.update("codes", id, { endDate: addMonthsISO(c.endDate || todayISO(), 1), status: "active" });
  toast("تم تمديد الاشتراك شهرًا إضافيًا");
  route();
}
function deleteCode(id) {
  if (!confirm("حذف هذا الكود نهائيًا؟")) return;
  DB.remove("codes", id);
  route();
}

/* ---- teachers management ---- */
function renderAdminTeachers() {
  const teachers = DB.col("teachers");
  renderShell(
    "admin",
    "admin/teachers",
    "إدارة المدرسين",
    `${teachers.length} مدرس`,
    `
    <div class="flex justify-between mb-16"><div></div><button class="btn btn-primary" onclick="openTeacherModal()">+ إضافة مدرس</button></div>
    <div class="grid grid-3">
      ${teachers
        .map(
          (t) => `<div class="card">
        <div class="flex items-center gap-12 mb-16">
          <div class="teacher-avatar" style="margin:0;width:54px;height:54px;font-size:17px;background:linear-gradient(155deg, ${t.color}, var(--blue-600))">${initials(t.name)}</div>
          <div><b>${t.name}</b><div style="font-size:12.5px;color:var(--green-700);font-weight:700">${t.subject}</div></div>
        </div>
        <p style="font-size:13px;margin-bottom:14px">${t.bio}</p>
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" onclick='openTeacherModal(${JSON.stringify(t.id)})'>تعديل</button>
          <button class="btn btn-red btn-sm" onclick="deleteTeacher('${t.id}')">حذف</button>
        </div>
      </div>`
        )
        .join("")}
    </div>
  `
  );
}
function openTeacherModal(id) {
  const t = id ? DB.find("teachers", id) : null;
  openModal(`
    <h3>${t ? "تعديل بيانات المدرس" : "إضافة مدرس جديد"}</h3>
    <div class="field"><label>الاسم</label><input id="tName" value="${t ? t.name : ""}" /></div>
    <div class="field"><label>المادة</label><input id="tSubject" value="${t ? t.subject : ""}" /></div>
    <div class="field"><label>نبذة عنه</label><textarea id="tBio" rows="3">${t ? t.bio : ""}</textarea></div>
    <div class="modal-close-row">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveTeacher(${t ? `'${t.id}'` : "null"})">حفظ</button>
    </div>
  `);
}
function saveTeacher(id) {
  const name = val("tName"), subject = val("tSubject"), bio = val("tBio");
  if (!name || !subject) return toast("أدخل الاسم والمادة", "red");
  if (id) {
    DB.update("teachers", id, { name, subject, bio });
  } else {
    DB.add("teachers", { name, subject, bio, color: ["#0E7C4A", "#2563EB", "#DC2626", "#1CA35C"][Math.floor(Math.random() * 4)] });
  }
  toast("تم الحفظ بنجاح");
  closeModal();
  route();
}
function deleteTeacher(id) {
  if (!confirm("حذف هذا المدرس؟ سيتم حذف محاضراته وامتحاناته أيضًا.")) return;
  DB.col("videos").filter((v) => v.teacherId === id).forEach((v) => DB.remove("videos", v.id));
  DB.col("exams").filter((e) => e.teacherId === id).forEach((e) => DB.remove("exams", e.id));
  DB.remove("teachers", id);
  toast("تم الحذف", "red");
  route();
}

/* ---- videos management ---- */
function renderAdminVideos() {
  const videos = DB.col("videos");
  const teachers = DB.col("teachers");
  renderShell(
    "admin",
    "admin/videos",
    "إدارة الفيديوهات",
    `${videos.length} فيديو`,
    `
    <div class="flex justify-between mb-16"><div></div><button class="btn btn-primary" onclick="openVideoModal()">+ إضافة فيديو</button></div>
    <div class="card">
      ${
        videos.length
          ? videos
              .map((v) => {
                const t = DB.find("teachers", v.teacherId);
                return `<div class="video-item">
              <div class="num">🎬</div>
              <div class="meta"><b>${v.title}</b><span>${v.subject} · ${t ? t.name : "—"}</span></div>
              <div class="table-actions">
                <button class="btn btn-outline btn-sm" onclick='openVideoModal(${JSON.stringify(v.id)})'>تعديل</button>
                <button class="btn btn-red btn-sm" onclick="deleteVideo('${v.id}')">حذف</button>
              </div>
            </div>`;
              })
              .join("")
          : emptyState("🎬", "لا توجد فيديوهات بعد")
      }
    </div>
  `
  );
}
function openVideoModal(id) {
  const v = id ? DB.find("videos", id) : null;
  const teachers = DB.col("teachers");
  openModal(`
    <h3>${v ? "تعديل فيديو" : "إضافة فيديو جديد"}</h3>
    <div class="field"><label>اسم الدرس</label><input id="vTitle" value="${v ? v.title : ""}" /></div>
    <div class="field"><label>المدرس</label>
      <select id="vTeacher">
        ${teachers.map((t) => `<option value="${t.id}" ${v && v.teacherId === t.id ? "selected" : ""}>${t.name} — ${t.subject}</option>`).join("")}
      </select>
    </div>
    <div class="field"><label>رابط Google Drive</label><input id="vUrl" value="${v ? v.driveUrl : "https://drive.google.com/"}" /></div>
    <div class="modal-close-row">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveVideo(${v ? `'${v.id}'` : "null"})">حفظ</button>
    </div>
  `);
}
function saveVideo(id) {
  const title = val("vTitle"), teacherId = val("vTeacher"), driveUrl = val("vUrl");
  if (!title || !teacherId || !driveUrl) return toast("أكمل كل الحقول", "red");
  const t = DB.find("teachers", teacherId);
  if (id) {
    DB.update("videos", id, { title, teacherId, subject: t.subject, driveUrl });
  } else {
    const order = DB.col("videos").filter((x) => x.teacherId === teacherId).length + 1;
    DB.add("videos", { title, teacherId, subject: t.subject, driveUrl, order });
  }
  toast("تم الحفظ بنجاح");
  closeModal();
  route();
}
function deleteVideo(id) {
  if (!confirm("حذف هذا الفيديو؟")) return;
  DB.remove("videos", id);
  route();
}

/* ---- exams management ---- */
function renderAdminExams() {
  const exams = DB.col("exams");
  renderShell(
    "admin",
    "admin/exams",
    "إدارة الامتحانات",
    `${exams.length} امتحان`,
    `
    <div class="flex justify-between mb-16"><div></div><button class="btn btn-primary" onclick="createExamQuick()">+ إنشاء امتحان جديد</button></div>
    <div class="card">
      ${
        exams.length
          ? exams
              .map((e) => {
                const t = DB.find("teachers", e.teacherId);
                const results = DB.col("results").filter((r) => r.examId === e.id);
                return `<div class="exam-item">
              <div class="num">📝</div>
              <div class="meta"><b>${e.title}</b><span>${e.subject} · ${t ? t.name : "—"} · ${e.questions.length} سؤال · ${results.length} محاولة</span></div>
              <div class="table-actions">
                <button class="btn btn-outline btn-sm" onclick="location.hash='#/admin/exams/builder/${e.id}'">تعديل الأسئلة</button>
                <button class="btn btn-red btn-sm" onclick="deleteExam('${e.id}')">حذف</button>
              </div>
            </div>`;
              })
              .join("")
          : emptyState("📝", "لا توجد امتحانات بعد")
      }
    </div>
  `
  );
}
function createExamQuick() {
  const teachers = DB.col("teachers");
  if (!teachers.length) return toast("أضف مدرسًا أولًا", "red");
  openModal(`
    <h3>إنشاء امتحان جديد</h3>
    <div class="field"><label>عنوان الامتحان</label><input id="eTitle" /></div>
    <div class="field"><label>المدرس</label>
      <select id="eTeacher">${teachers.map((t) => `<option value="${t.id}">${t.name} — ${t.subject}</option>`).join("")}</select>
    </div>
    <div class="form-grid">
      <div class="field"><label>الزمن (دقيقة)</label><input id="eDuration" type="number" value="20" /></div>
      <div class="field"><label>الدرجة الكلية</label><input id="eTotal" type="number" value="10" /></div>
    </div>
    <div class="modal-close-row">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveNewExam()">إنشاء ثم أضف الأسئلة</button>
    </div>
  `);
}
function saveNewExam() {
  const title = val("eTitle"), teacherId = val("eTeacher");
  const duration = parseInt(val("eDuration") || "20", 10), totalGrade = parseInt(val("eTotal") || "10", 10);
  if (!title || !teacherId) return toast("أكمل البيانات", "red");
  const t = DB.find("teachers", teacherId);
  const exam = DB.add("exams", { title, subject: t.subject, teacherId, duration, totalGrade, questions: [] });
  closeModal();
  location.hash = `#/admin/exams/builder/${exam.id}`;
}
function deleteExam(id) {
  if (!confirm("حذف هذا الامتحان؟")) return;
  DB.remove("exams", id);
  route();
}
function renderExamBuilder(examId) {
  const exam = DB.find("exams", examId);
  if (!exam) return (location.hash = "#/admin/exams");
  renderShell(
    "admin",
    "admin/exams",
    exam.title,
    "بناء أسئلة الامتحان",
    `
    <div class="card mb-16">
      ${
        exam.questions.length
          ? exam.questions
              .map(
                (q, qi) => `
        <div class="exam-question">
          <div class="qtitle">${qi + 1}. ${q.q}</div>
          ${q.options.map((o, oi) => `<div class="opt-row ${oi === q.correct ? "selected" : ""}"><span class="bubble-dot ${oi === q.correct ? "filled" : ""}"></span> ${o}</div>`).join("")}
          <button class="btn btn-red btn-sm mt-10" onclick="deleteQuestion('${exam.id}',${qi})">حذف السؤال</button>
        </div>`
              )
              .join("")
          : emptyState("❓", "لم تتم إضافة أسئلة بعد")
      }
    </div>
    <div class="card">
      <h3 class="mb-16">إضافة سؤال جديد</h3>
      <div class="field"><label>نص السؤال</label><input id="qText" /></div>
      <div class="form-grid">
        <div class="field"><label>الاختيار 1</label><input id="qOpt0" /></div>
        <div class="field"><label>الاختيار 2</label><input id="qOpt1" /></div>
        <div class="field"><label>الاختيار 3</label><input id="qOpt2" /></div>
        <div class="field"><label>الاختيار 4</label><input id="qOpt3" /></div>
      </div>
      <div class="field"><label>رقم الإجابة الصحيحة (1-4)</label><input id="qCorrect" type="number" min="1" max="4" value="1" /></div>
      <button class="btn btn-primary" onclick="addQuestion('${exam.id}')">إضافة السؤال</button>
    </div>
    <a href="#/admin/exams" class="btn btn-outline mt-16">إنهاء والعودة لقائمة الامتحانات</a>
  `
  );
}
function addQuestion(examId) {
  const q = val("qText");
  const opts = [val("qOpt0"), val("qOpt1"), val("qOpt2"), val("qOpt3")];
  const correct = parseInt(val("qCorrect") || "1", 10) - 1;
  if (!q || opts.some((o) => !o)) return toast("أكمل نص السؤال وكل الاختيارات", "red");
  const exam = DB.find("exams", examId);
  const questions = [...exam.questions, { q, options: opts, correct }];
  DB.update("exams", examId, { questions });
  toast("تمت إضافة السؤال");
  route();
}
function deleteQuestion(examId, qi) {
  const exam = DB.find("exams", examId);
  const questions = exam.questions.filter((_, i) => i !== qi);
  DB.update("exams", examId, { questions });
  route();
}

/* ---- notifications management ---- */
function renderAdminNotifications() {
  const notifs = DB.col("notifications").sort((a, b) => new Date(b.date) - new Date(a.date));
  renderShell(
    "admin",
    "admin/notifications",
    "الإشعارات",
    `${notifs.length} إشعار مُرسل`,
    `
    <div class="card mb-16">
      <h3 class="mb-16">إرسال إشعار جديد</h3>
      <div class="field"><label>العنوان</label><input id="nTitle" /></div>
      <div class="field"><label>النص</label><textarea id="nBody" rows="2"></textarea></div>
      <button class="btn btn-primary" onclick="sendNotification()">إرسال لجميع الطلاب</button>
    </div>
    <div class="card">
      ${
        notifs.length
          ? notifs.map((n) => `<div class="video-item"><div class="num">🔔</div><div class="meta"><b>${n.title}</b><span>${n.body}</span></div></div>`).join("")
          : emptyState("🔔", "لم يتم إرسال أي إشعار بعد")
      }
    </div>
  `
  );
}
function sendNotification() {
  const title = val("nTitle"), body = val("nBody");
  if (!title || !body) return toast("أكمل العنوان والنص", "red");
  DB.add("notifications", { title, body, target: "all", date: new Date().toISOString() });
  toast("تم إرسال الإشعار لجميع الطلاب");
  route();
}

/* ================================================================
   MODAL
   ================================================================ */
function openModal(html) {
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modalOverlay").classList.add("active");
}
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  DB.load();
  route();
});
