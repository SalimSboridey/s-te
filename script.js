const STORAGE_KEY = "roadmap-v1";
const TOTAL_BUDGET = 200000;

const goals = [
  {
    id: 1,
    title: "Ремонт в домике для квартирантов",
    deadline: "30.03.2026",
    budget: 20000,
    tasks: [
      "покрасить кухню, прихожку, потолок в спальне",
      "переклеить наличники в ванной",
      "починить комод",
      "обшить диван и кресла",
      "собрать кровать и купить матрас",
      "купить холодильник",
      "починить стиралку"
    ]
  },
  {
    id: 2,
    title: "Сделать фасад нового дома",
    deadline: "30.04.2026",
    budget: 10000,
    tasks: ["слой клея выровнять стены", "грунтовка всех стен", "фактурная краска всех стен"]
  },
  {
    id: 3,
    title: "Покрасить все дома / освежить фасады",
    deadline: "15.05.2026",
    budget: 5000,
    tasks: [
      "сделать короб под газовую трубу",
      "доклеить углы после тротуарной плитки",
      "покрасить все дома одним слоем фасадной краски"
    ]
  },
  {
    id: 4,
    title: "Перенести туалет в угол двора",
    deadline: "30.05.2026",
    budget: 15000,
    tasks: ["снести старый туалет", "построить новый туалет", "проложить тропинку к нему"]
  },
  {
    id: 5,
    title: "Доложить двор тротуарной плиткой",
    deadline: "30.06.2026",
    budget: 0,
    tasks: [
      "облицевать колодец",
      "доделать заезд в воротах",
      "доложить плитку",
      "сделать тропинку вместо туалета",
      "перетащить землю жёлтую из огорода"
    ]
  },
  {
    id: 6,
    title: "Накопить 300 000 ₽",
    deadline: "Финальная цель",
    budget: 0,
    tasks: ["Откладывать по 50к в месяц"]
  },
  {
    id: 7,
    title: "Починить Октавию",
    deadline: "30.04.2026",
    budget: 50000,
    tasks: [
      "заменить масла и фильтры (ТО)",
      "заменить топливный фильтр",
      "полирнуть кузов и фары",
      "сделать химчистку салона",
      "починить кондер",
      "поменять верхний опорный подшипник"
    ]
  },
  {
    id: 8,
    title: "Купить кондиционер в дом",
    deadline: "30.03.2026",
    budget: 40000,
    tasks: ["Выбрать модель", "Вызвать мастера"]
  }
];

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
const goalsLayer = document.getElementById("goalsLayer");
const connections = document.querySelector(".connections");
const coreCard = document.getElementById("coreCard");
const detailsPanel = document.getElementById("detailsPanel");
const panelTitle = document.getElementById("panelTitle");
const tasksList = document.getElementById("tasksList");
const moodboardModal = document.getElementById("moodboardModal");
const modalTitle = document.getElementById("modalTitle");

const radialLayout = [
  { angle: -85, radius: 340 },
  { angle: -35, radius: 365 },
  { angle: 18, radius: 345 },
  { angle: 60, radius: 355 },
  { angle: 110, radius: 335 },
  { angle: 155, radius: 370 },
  { angle: 210, radius: 360 },
  { angle: 255, radius: 345 }
];

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getGoalState(goalId) {
  state[goalId] ??= { deadline: null, budget: null, doneTasks: {} };
  return state[goalId];
}

function formatBudget(num) {
  return `${Number(num || 0).toLocaleString("ru-RU")} ₽`;
}

function parseDate(dateStr) {
  if (!dateStr.includes(".")) return null;
  const [d, m, y] = dateStr.split(".").map(Number);
  return new Date(y, m - 1, d);
}

function setTimeProgress() {
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  const end = new Date(2026, 5, 30);
  const now = new Date();
  const total = end - start;
  const elapsed = Math.min(Math.max(now - start, 0), total);
  const pct = Math.round((elapsed / total) * 100);
  const el = document.getElementById("timeProgress");
  el.style.setProperty("--progress", `${pct}%`);
  el.dataset.label = `${pct}%`;
}

function buildBudgetChart() {
  const chart = document.getElementById("budgetChart");
  let acc = 0;
  const gradients = goals
    .filter((g) => g.budget > 0)
    .map((g, idx) => {
      const hue = (idx * 45 + 210) % 360;
      const part = (g.budget / TOTAL_BUDGET) * 100;
      const from = acc;
      acc += part;
      return `hsl(${hue} 75% 60%) ${from}% ${acc}%`;
    });
  gradients.push(`#e5e7eb ${acc}% 100%`);
  chart.style.background = `conic-gradient(${gradients.join(",")})`;
}

function renderGoals() {
  goalsLayer.innerHTML = "";
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  goals.forEach((goal, i) => {
    const local = getGoalState(goal.id);
    const deadline = local.deadline || goal.deadline;
    const budget = local.budget ?? goal.budget;
    const card = document.createElement("article");
    card.className = "goal-card";
    card.dataset.goalId = String(goal.id);

    const costPct = Math.min((Number(budget) / TOTAL_BUDGET) * 100, 100);

    card.innerHTML = `
      <div class="goal-top">
        <h4 class="goal-title">${goal.title}</h4>
        <button class="mood-trigger" title="Открыть мудборд">📷</button>
      </div>
      <div class="meta">
        <div>📅 <span class="editable" data-field="deadline">${deadline}</span></div>
        <div>₽ <span class="editable" data-field="budget">${formatBudget(budget)}</span></div>
      </div>
      <div class="cost-bar"><div class="cost-fill" style="width:${costPct}%"></div></div>
    `;

    if (window.innerWidth > 900) {
      const { angle, radius } = radialLayout[i];
      const x = centerX + radius * Math.cos((angle * Math.PI) / 180) - 110;
      const y = centerY + radius * Math.sin((angle * Math.PI) / 180) - 70;
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
    }

    wireInteractions(card, goal);
    goalsLayer.appendChild(card);
  });

  drawConnections();
}

function wireInteractions(card, goal) {
  card.addEventListener("click", (e) => {
    if (e.target.closest(".editable") || e.target.closest("input") || e.target.closest(".mood-trigger")) return;
    openDetails(goal);
  });

  card.addEventListener("dblclick", () => openMoodboard(goal));

  card.querySelector(".mood-trigger").addEventListener("click", () => openMoodboard(goal));

  card.querySelectorAll(".editable").forEach((editable) => {
    editable.addEventListener("click", (e) => {
      e.stopPropagation();
      const field = editable.dataset.field;
      const current = editable.textContent.replace("₽", "").replaceAll(" ", "").trim();
      editable.innerHTML = `<input value="${current}" />`;
      const input = editable.querySelector("input");
      input.focus();
      input.addEventListener("blur", () => {
        const local = getGoalState(goal.id);
        if (field === "budget") {
          local.budget = Number(input.value.replace(/\D/g, "")) || 0;
          editable.textContent = formatBudget(local.budget);
        } else {
          local.deadline = input.value || goal.deadline;
          editable.textContent = local.deadline;
        }
        saveState();
        buildBudgetChart();
        renderGoals();
      });
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") input.blur();
      });
    });
  });
}

function drawConnections() {
  if (window.innerWidth <= 900) {
    connections.innerHTML = "";
    return;
  }

  const coreRect = coreCard.getBoundingClientRect();
  const sx = coreRect.left + coreRect.width / 2;
  const sy = coreRect.top + coreRect.height / 2;
  connections.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);

  let svg = "";
  document.querySelectorAll(".goal-card").forEach((card) => {
    const r = card.getBoundingClientRect();
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height / 2;
    svg += `<line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}" stroke="rgba(99,102,241,.7)" stroke-width="1.3"/>`;
  });
  connections.innerHTML = svg;
}

function openDetails(goal) {
  detailsPanel.classList.add("open");
  panelTitle.textContent = goal.title;

  const local = getGoalState(goal.id);
  tasksList.innerHTML = "";

  if (!goal.tasks.length) {
    tasksList.innerHTML = "<li>Задачи пока не добавлены</li>";
    return;
  }

  goal.tasks.forEach((task, idx) => {
    const key = `task-${idx}`;
    const done = !!local.doneTasks[key];
    const li = document.createElement("li");
    li.className = `task-item ${done ? "done" : ""}`;
    li.innerHTML = `<button class="check" aria-label="Отметить задачу"></button><span>${task}</span>`;
    li.querySelector(".check").addEventListener("click", () => {
      local.doneTasks[key] = !local.doneTasks[key];
      saveState();
      li.classList.toggle("done");
    });
    tasksList.appendChild(li);
  });
}

function openMoodboard(goal) {
  modalTitle.textContent = `Мудборд: ${goal.title}`;
  moodboardModal.classList.add("open");
  moodboardModal.setAttribute("aria-hidden", "false");
}

document.getElementById("closePanel").addEventListener("click", () => {
  detailsPanel.classList.remove("open");
});

document.getElementById("closeModal").addEventListener("click", () => {
  moodboardModal.classList.remove("open");
  moodboardModal.setAttribute("aria-hidden", "true");
});

moodboardModal.addEventListener("click", (e) => {
  if (e.target === moodboardModal) {
    moodboardModal.classList.remove("open");
    moodboardModal.setAttribute("aria-hidden", "true");
  }
});

window.addEventListener("resize", renderGoals);

setTimeProgress();
buildBudgetChart();
renderGoals();
