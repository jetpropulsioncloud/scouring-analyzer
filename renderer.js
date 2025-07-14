const buildSelector = document.getElementById('buildSelector');
const buildList = document.getElementById('buildList');
const submitBtn = document.getElementById('submitBuild');
const newName = document.getElementById('newName');
const newSteps = document.getElementById('newSteps');
const statusMsg = document.getElementById('statusMsg');
const newClan = document.getElementById('newClan');
const clanFilter = document.getElementById('clanFilter');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authStatus = document.getElementById('authStatus');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('login-screen');
const homeScreen = document.getElementById('home-screen');
const tabContents = document.querySelectorAll('.tab-content');
const yearlyContainer = document.getElementById("yearly-builds");

const { db, collection, getDocs, addDoc, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } = window;

let buildData = {};

function showTab(tabId) {
  tabContents.forEach(div => {
    div.style.display = 'none';
  });
  const tab = document.getElementById(tabId);
  if (tab) tab.style.display = 'block';
}
window.showTab = showTab;
const tagIds = ['forestTag', 'shipwreckTag', 'ironTag', 'stoneTag', 'ruinsTag', 'loreTag'];
const situationalTags = tagIds
  .map(id => document.getElementById(id).value)
  .filter(tag => tag !== "Off");
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.style.display = 'none';
    homeScreen.style.display = 'block';
    showTab('build-tab');
    authStatus.textContent = `✅ Logged in as ${user.email}`;
    loadUserBuilds(user.uid)
  } else {
    loginSection.style.display = 'block';
    homeScreen.style.display = 'none';
    buildList.innerHTML = '';
    buildSelector.innerHTML = '';
    authStatus.textContent = '🔒 Please log in';
  }
});

for (let year = 800; year <= 804; year++) {
  const wrapper = document.createElement("div");
  wrapper.className = "year-block";
  wrapper.innerHTML = `
    <h4>Year ${year}</h4>
    <textarea id="steps-${year}" rows="4" placeholder="Steps for ${year}..."></textarea>
    <label>
      <input type="checkbox" id="toggle-winter-${year}" />
      Add Winter Steps for ${year}
    </label>
    <textarea id="steps-${year}-winter" style="display: none;" rows="3" placeholder="Winter ${year} steps..."></textarea>
  `;
  yearlyContainer.appendChild(wrapper);
}

for (let year = 800; year <= 804; year++) {
  const toggle = document.getElementById(`toggle-winter-${year}`);
  const winterBox = document.getElementById(`steps-${year}-winter`);
  toggle.addEventListener("change", () => {
    winterBox.style.display = toggle.checked ? "block" : "none";
  });
}
logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    authStatus.textContent = "Logged out successfully";
  } catch (err) {
    console.error("logout error:", err);
    authStatus.textContent = "Error Logging out";
  }
});

function showBuild(name, data = buildData) {
  buildList.innerHTML = renderBuildSteps(data[name].steps);
}

function updateBuildSelector(filteredData) {
  buildSelector.innerHTML = '';

  for (const buildName in filteredData) {
    const option = document.createElement('option');
    option.value = buildName;
    option.textContent = buildName;
    buildSelector.appendChild(option);
  }

  if (buildSelector.options.length > 0) {
    buildSelector.selectedIndex = 0;
    showBuild(buildSelector.value, filteredData);
  } else {
    buildList.innerHTML = '<li>No builds for this clan.</li>';
  }
}

window.loadBuilds = async function () {
  const querySnapshot = await getDocs(collection(db, "builds"));
  buildData = {};

  querySnapshot.forEach((doc) => {
    const build = doc.data();
    buildData[build.name] = {
      steps: build.steps,
      clan: build.clan
    };
  });

  updateBuildSelector(buildData);
};

clanFilter.addEventListener('change', () => {
  const selectedClan = clanFilter.value;

  if (selectedClan === "All") {
    updateBuildSelector(buildData);
  } else {
    const filtered = Object.fromEntries(
      Object.entries(buildData).filter(([_, data]) => data.clan === selectedClan)
    );
    updateBuildSelector(filtered);
  }
});

buildSelector.addEventListener('change', () => {
  showBuild(buildSelector.value);
});

registerBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    authStatus.textContent = "✅ Registered successfully!";
  } catch (error) {
    authStatus.textContent = `❌ Error: ${error.message}`;
  }
});

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authStatus.textContent = "✅ Logged in!";
  } catch (error) {
    authStatus.textContent = `❌ Error: ${error.message}`;
  }
});

submitBtn.addEventListener('click', async () => {
  const buildName = newName.value.trim();
  const selectedClan = newClan.value;
  const user = auth.currentUser;
  let allSteps = [];
  
  for (let year = 800; year <= 804; year++) {
    const mainSteps = document.getElementById(`steps-${year}`).value.trim().split("\n").filter(Boolean);
    if (mainSteps.length > 0) {
      allSteps.push(`# ${year}`);
      allSteps.push(...mainSteps);
    }
    const winterSteps = document.getElementById(`steps-${year}-winter`).value.trim().split("\n").filter(Boolean);
    if (winterSteps.length > 0) {
      allSteps.push(`# ${year} Winter`);
      allSteps.push(...winterSteps);
    }
  }
  if (!user) {
    statusMsg.textContent = "You must be logged in to submit a Build!";
    return;
  }
  if (!buildName || allSteps.length === 0 || !selectedClan) {
    statusMsg.textContent = "⚠️ Enter a build name, steps, and select a Clan";
    return;
  }
  try {
    await addDoc(collection(db, "builds"), {
      name: buildName,
      steps: allSteps,
      clan: selectedClan,
      situationalTags: situationalTags,
      userID: user.uid
    });

    statusMsg.textContent = "✅ Build submitted!";
    newName.value = "";
    newSteps.value = "";
    newClan.selectedIndex = 0;

    await loadBuilds();
    await loadUserBuilds(user.uid);
  } catch (err) {
    console.error("Error submitting build:", err);
    statusMsg.textContent = "❌ Error submitting build. Check console.";
  }
});

const { ipcRenderer } = require('electron');

function closeApp() {
  ipcRenderer.send('request-app-close');
}
window.closeApp = closeApp;

ipcRenderer.on('logout-before-close', () => {
  auth.signOut().then(() => {
    console.log("🔒 Logged out before app closed.");
    window.close();
  });
});
const toggleBtn = document.getElementById('toggleSituationalTags');
const situationalContent = document.getElementById('situationalTagsContent');

if (toggleBtn && situationalContent) {
  toggleBtn.addEventListener('click', () => {
    const isVisible = situationalContent.style.display === 'block';
    situationalContent.style.display = isVisible ? 'none' : 'block';
    toggleBtn.textContent = isVisible ? '+ Situational Tags' : '− Situational Tags';
  });
}
function getEmojiForStep(step) {
  const lower = step.toLowerCase();
  if (lower.includes("wood") || lower.includes("lodge")) return "🌲";
  if (lower.includes("house")) return "🏠";
  if (lower.includes("scout")) return "🧭";
  if (lower.includes("colonize")) return "📍";
  if (lower.includes("training") || lower.includes("military")) return "⚔️";
  if (lower.includes("feast")) return "🍽️";
  if (lower.includes("clear") || lower.includes("attack")) return "🛡️";
  return "•";
}

function renderBuildSteps(steps) {
  return steps.map(step => {
    if (step.startsWith("#")) {
      return `<h4 class="phase-header">📅 ${step.slice(1).trim()}</h4>`;
    } else {
      return `<div class="build-step">${getEmojiForStep(step)} ${step}</div>`;
    }
  }).join("");
}
async function loadUserBuilds(uid) {
  const container = document.getElementById("profileBuildsContainer")
  container.innerHTML = "<p>Loading your builds...</p>"
  try {
    const buildsRef = collection (db, "builds");
    const q = window.query(buildsRef, window.where("userID", "==", uid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
     container.innerHTML = "<p> No builds yet</p>";
     return; 
    }
    container.innerHTML = "";

    querySnapshot.forEach((doc) => {
      const build = doc.data();
      const card = document.createElement("div");
      card.className = "build-card";
      card.innerHTML = `
        <h3>${build.name || "Untitled"} (${build.clan})</h3>
        <div class="steps-block">
          ${renderBuildSteps(build.steps || [])}
        </div>
      `;
      container.appendChild(card);
    });   
  } catch (error) {
    console.error("Error Loading Builds:", error);
    container.innerHTML = "<p>Failed to load builds. Try again Later.</p>"
  }
}
loadBuilds();
