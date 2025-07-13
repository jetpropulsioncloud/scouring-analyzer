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
  } else {
    loginSection.style.display = 'block';
    homeScreen.style.display = 'none';
    buildList.innerHTML = '';
    buildSelector.innerHTML = '';
    authStatus.textContent = '🔒 Please log in';
  }
});

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
  buildList.innerHTML = '';
  data[name].steps.forEach((stepText, index) => {
    const li = document.createElement('li');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `step-${index}`;

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = stepText;

    li.appendChild(checkbox);
    li.appendChild(label);
    buildList.appendChild(li);
  });
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
  const steps = newSteps.value.trim().split('\n').map(s => s.trim()).filter(s => s);
  const selectedClan = newClan.value;
  const user = auth.currentUser;

  if (!user) {
    statusMsg.textContent = "You must be logged in to submit a Build!";
    return;
  }
  if (!buildName || steps.length === 0 || !selectedClan) {
    statusMsg.textContent = "⚠️ Enter a build name, steps, and select a Clan";
    return;
  }

  try {
    await addDoc(collection(db, "builds"), {
      name: buildName,
      steps: steps,
      clan: selectedClan,
      situationalTags: situationalTags,
      userID: user.uid
    });

    statusMsg.textContent = "✅ Build submitted!";
    newName.value = "";
    newSteps.value = "";
    newClan.selectedIndex = 0;

    await loadBuilds();
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

loadBuilds();
