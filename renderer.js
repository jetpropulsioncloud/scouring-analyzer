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
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
const pathSelector = document.getElementById('selectedPath');
const lorePicker = document.getElementById('lorePicker');
let buildSubmitCooldown = false;
let loreOrderState = [];

newClan.addEventListener('change', () => {
  const clan = newClan.value;
  if (!clan) return;

  pathSelector.innerHTML = '';
  lorePicker.innerHTML = '';
  loreOrderState = [];

  const paths = militaryPaths[clan]?.military_paths || [];
  paths.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    pathSelector.appendChild(opt);
  });

  const availableLore = [
    ...(clanLore[clan]?.has_common_lore || []),
    ...(clanLore[clan]?.unique_lore || [])
  ];

  availableLore.forEach(lore => {
    const btn = document.createElement('button');
    btn.className = 'lore-button';
    btn.textContent = lore;
    btn.dataset.order = lore;
    btn.dataset.lore = lore;
    btn.addEventListener('click', () => {
      const currentIndex = loreOrderState.findIndex(item => item.lore === lore);

      if (currentIndex === -1) {
        loreOrderState.push({ lore, order: loreOrderState.length + 1 });
      } else {
        loreOrderState.splice(currentIndex, 1);
        loreOrderState = loreOrderState.map((item, index) => ({ ...item, order: index + 1 }));
      }

      document.querySelectorAll('.lore-button').forEach(button => {
        const matched = loreOrderState.find(item => item.lore === button.dataset.lore);
        button.dataset.order = matched ? matched.order : '';
        button.textContent = matched ? `${matched.order}. ${button.dataset.lore}` : button.dataset.lore;
      });
    });
    lorePicker.appendChild(btn);
  });
});
const militaryPaths = JSON.parse(
  fs.readFileSync(path.resolve(dataDir, 'militarypath.json'))
);
const clanLore = JSON.parse(
  fs.readFileSync(path.resolve(dataDir, 'lore.json'))
);
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

const refreshBuildsBtn = document.getElementById('refreshBuildsBtn');
refreshBuildsBtn.addEventListener('click', async () => {
  await loadBuilds ();
  const user = auth.currentUser;
  if (user) await loadUserBuilds(user.uid);
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
  const build = data[name];
  let html = '';
  
  html += `<details class="build-section"open>
    <summary><strong>📋 Build Info</strong></summary>`;

  if (build.militaryPath) {
    html += `<h4>⚔️ Military Path</h4><p>${build.militaryPath}</p><hr>`;
  }

  if (build.loreOrder && build.loreOrder.length > 0) {
    html += `<h4>📜 Lore Order</h4><ul class="lore-order-list">`;
    build.loreOrder.forEach((lore, index) => {
      html += `<li>${index + 1}. ${lore}</li>`;
    });
    html += `</ul>`;
  }
  if (build.situationalTags && build.situationalTags.length > 0) {
    html += `<h4>🌍 Situational Tags</h4><div class="tag-pill-container">`;
    build.situationalTags.forEach(tag => {
      html += `<span class="tag-pill">${tag}</span>`;
    });
    html += `</div><hr>`;
  }
  html += `</details><hr>`;
  html += renderBuildSteps(build.steps);
}

function updateBuildSelector(filteredData) {
  buildSelector.innerHTML = '';
  buildList.innerHTML = '';

  for (const buildName in filteredData) {
    const build = filteredData[buildName];
    if (!build || !build.steps || !Array.isArray(build.steps)) continue;
    const option = document.createElement('option');
    option.value = buildName;
    option.textContent = buildName;
    buildSelector.appendChild(option);
    const preview = document.createElement('div')
    preview.className = 'build-preview';
    const tagText = (build.situationalTags || []).join(', ') || 'None';
    const previewHTML = `
      <h4>${buildName} (${build.clan})</h4>
      <p><strong>Tags:</strong> ${tagText}</p>
      <button onclick="openBuildInWindow('${buildName}')">View</button>
    `;
    preview.innerHTML = previewHTML;
    buildList.appendChild(preview);
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
      clan: build.clan,
      loreOrder: build.loreOrder || [],
      militaryPath: build.militaryPath || '',
      situationalTags: build.situationalTags || []
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
  const stayLoggedIn = document.getElementById('stayLoggedIn').checked;

  try {
    if (stayLoggedIn) {
      window.auth.setPersistence(window.firebaseAuth.Persistence.LOCAL);
    } else {
      window.auth.setPersistence(window.firebaseAuth.Persistence.SESSION);
    }
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
  const selectedPath = pathSelector.value;
  const selectedLores = loreOrderState.map(item => item.lore);
  const situationalTags = tagIds
  .map(id => document.getElementById(id).value)
  .filter(tag => tag !== "Off");
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
  if (buildSubmitCooldown) {
    statusMsg.textContent = "⏳ Please wait before submitting again.";
    return;
  }
  buildSubmitCooldown = true;
  setTimeout(() => {
    buildSubmitCooldown = false;
  }, 5000);
  try {
    await addDoc(collection(db, "builds"), {
      name: buildName,
      steps: allSteps,
      clan: selectedClan,
      situationalTags: situationalTags,
      userID: user.uid,
      militaryPath: selectedPath,
      loreOrder: selectedLores
    });

    statusMsg.textContent = "✅ Build submitted!";
    await loadBuilds();
    await loadUserBuilds(user.uid);
  } catch (err) {
    console.error("Error submitting build:", err);
    statusMsg.textContent = "❌ Error submitting build. Check console.";
  }
  newName.value = "";
  newSteps.value = "";
  newClan.selectedindex = 0;
  lorePicker.innerHTML = '';
  loreOrderState = [];
  for (let year = 800; year <= 804; year++) {
    document.getElementById(`steps-${year}`).value = '';
    document.getElementById(`steps-${year}-winter`).value = '';
    document.getElementById(`toggle-winter-${year}`).checked = false;
    document.getElementById(`steps-${year}-winter`).style.display = 'none';
  }
  pathSelector.innerHTML = '';
  tagIds.forEach(id => {
    const dropdown = document.getElementById(id);
    dropdown.selectedIndex = 0;
  });
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
  setTimeout(() => {
    const y800 = document.querySelector('.phase-header');
    if (y800) y800.scrollIntoView({ behavior: 'smooth' });
  }, 100);
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
        <button class="delete-btn" data-id="${doc.id}">Delete</button>
      `;
      container.appendChild(card);
    });   
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm("Are you sure you want to delete this build?")) {
          try{
            await window.deleteDoc(window.doc(db, "builds", id));
            await loadUserBuilds(uid);
          } catch (err) {
            console.error("Delete Error:", err);
            alert("Error Deleting build. See Console.")
          }
        }
      })
    })
  } catch (error) {
    console.error("Error Loading Builds:", error);
    container.innerHTML = "<p>Failed to load builds. Try again Later.</p>"
  }
}
function openBuildInWindow(name) {
  const build = buildData[name];
  const buildWithName = { ...build, name }; // explicitly attach name
  ipcRenderer.send('open-build-window', buildWithName);
}
window.openBuildInWindow = openBuildInWindow;
loadBuilds();
