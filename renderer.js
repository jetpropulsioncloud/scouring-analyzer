document.addEventListener("DOMContentLoaded", () => {
  const fs = require('fs');
  const path = require('path');
  const { ipcRenderer } = require('electron');

  const dataDir = path.join(__dirname, 'assets', 'maps');
  let mapsData = [];
  const mapsPath = path.resolve(dataDir, 'maps.json');
  try {
    const raw = fs.readFileSync(mapsPath, 'utf8');
    const parsed = JSON.parse(raw);
    mapsData = Array.isArray(parsed) ? parsed : Array.isArray(parsed.maps) ? parsed.maps : [];
    console.log('✅ Loaded maps from:', mapsPath, 'count =', mapsData.length);
  } catch (e) {
    console.warn('⚠️ Could not load maps JSON at:', mapsPath, e?.message || e);
    mapsData = [];
  }

  const mapByName = Object.fromEntries(mapsData.map(m => [m.name, m.image || m.img || '']));

  const phases = [
    { id: "early", label: "Early Game (0–4 min)" },
    { id: "mid", label: "Mid Game (4–10 min)" },
    { id: "late", label: "Late Game (10+ min)" }
  ];

  const closeBtn = document.getElementById('closeBtn');
  const buildSelector = document.getElementById('buildSelector');
  const buildList = document.getElementById('buildList');
  const submitBtn = document.getElementById('submitBuild');
  const newName = document.getElementById('newName');
  const statusMsg = document.getElementById('statusMsg');
  const newClan = document.getElementById('newClan');
  const clanFilter = document.getElementById('clanFilter');
  const emailInput = document.getElementById('loginIdentifier');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const authStatus = document.getElementById('authStatus');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginSection = document.getElementById('login-screen');
  const homeScreen = document.getElementById('home-screen');
  const tabContents = document.querySelectorAll('.tab-content');
  const yearlyContainer = document.getElementById("yearly-builds");
  const refreshBuildsBtn = document.getElementById('refreshBuildsBtn');
  const profileBuildsContainer = document.getElementById('profileBuildsContainer');

  const upgradesInput = document.getElementById('upgrades');
  const mapSelectors = ['mapTag1', 'mapTag2'];
  const toggleBtn = document.getElementById('toggleSituationalTags');
  const tagsContent = document.getElementById('situationalTagsContent');
  if (toggleBtn && tagsContent) {
    toggleBtn.addEventListener('click', () => {
      tagsContent.style.display = tagsContent.style.display === 'none' ? 'block' : 'none';
    });
  }

  const buildTabBtn = document.getElementById('tab-build');
  const postTabBtn = document.getElementById('tab-post');
  const profileTabBtn = document.getElementById('tab-profile');

  const { db, collection, getDocs, addDoc, auth, createUserWithEmailAndPassword, onAuthStateChanged } = window;

  const stayLoggedIn = localStorage.getItem("stayLoggedIn") === "true";
  if (typeof window.setPersistence === 'function' && window.auth) {
    const persistenceMode = stayLoggedIn ? window.browserLocalPersistence : window.browserSessionPersistence;
    window.setPersistence(window.auth, persistenceMode)
      .then(() => console.log("✅ Persistence set:", stayLoggedIn ? "Local" : "Session"))
      .catch(err => console.warn("setPersistence warn:", err?.message || err));
  } else {
    console.warn("ℹ️ Firebase not ready yet; skipping setPersistence.");
  }

  if (closeBtn) closeBtn.addEventListener('click', () => ipcRenderer.send('request-app-close'));

  ipcRenderer.on('update-available', () => {
    const container = document.getElementById('updateProgressContainer');
    const progressBar = document.getElementById('updateProgressBar');
    const progressText = document.getElementById('updateProgressText');
    if (!container || !progressBar || !progressText) return;
    container.style.display = 'block';
    progressBar.value = 0;
    progressText.textContent = `0%`;
  });
  ipcRenderer.on('download-progress', (_, progressObj) => {
    const container = document.getElementById('updateProgressContainer');
    const progressBar = document.getElementById('updateProgressBar');
    const progressText = document.getElementById('updateProgressText');
    if (!container || !progressBar || !progressText) return;
    container.style.display = 'block';
    const percent = Math.round(progressObj.percent);
    progressBar.value = percent;
    progressText.textContent = `${percent}%`;
  });
  ipcRenderer.on('update-downloaded', () => {
    const container = document.getElementById('updateProgressContainer');
    if (container) container.style.display = 'none';
  });

  function showTab(tabId) {
    tabContents.forEach(div => div.style.display = 'none');
    const tab = document.getElementById(tabId);
    if (tab) tab.style.display = 'block';
  }
  window.showTab = showTab;

  if (buildTabBtn) buildTabBtn.addEventListener('click', () => showTab('build-tab'));
  if (postTabBtn) postTabBtn.addEventListener('click', () => showTab('post-tab'));
  if (profileTabBtn) profileTabBtn.addEventListener('click', () => showTab('profile-tab'));

  if (yearlyContainer) {
    phases.forEach(p => {
      const wrapper = document.createElement("div");
      wrapper.className = "year-block";
      wrapper.innerHTML = `
        <h4>${p.label}</h4>
        <textarea id="steps-${p.id}" rows="5" placeholder="One instruction per line..."></textarea>
      `;
      yearlyContainer.appendChild(wrapper);
    });
  }

  mapSelectors.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    const off = document.createElement('option');
    off.value = 'Off';
    off.textContent = 'Off';
    sel.appendChild(off);
    mapsData.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => renderMapPreview(id, sel.value));
  });

  function renderMapPreview(selectorId, mapName) {
    const slot = document.getElementById(selectorId + 'Preview');
    if (!slot) return;
    slot.innerHTML = '';
    if (!mapName || mapName === 'Off') return;
    const img = document.createElement('img');
    img.src = mapByName[mapName] || '';
    img.alt = mapName;
    const cap = document.createElement('div');
    cap.className = 'map-name';
    cap.textContent = mapName;
    slot.appendChild(img);
    slot.appendChild(cap);
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginSection.style.display = 'none';
      document.getElementById('register-screen').style.display = 'none';
      homeScreen.style.display = 'block';
      showTab('build-tab');
      authStatus.textContent = `✅ Logged in as ${user.email}`;
      loadUserBuilds(user.uid);
      setTimeout(() => { if (refreshBuildsBtn) refreshBuildsBtn.click(); }, 200);
    } else {
      loginSection.style.display = 'block';
      homeScreen.style.display = 'none';
      buildList.innerHTML = '';
      buildSelector.innerHTML = '';
      authStatus.textContent = '🔒 Please log in';
    }
  });

  if (refreshBuildsBtn) {
    refreshBuildsBtn.addEventListener('click', async () => {
      await loadBuilds(true, true);
      const user = auth.currentUser;
      if (user) await loadUserBuilds(user.uid);
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
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        localStorage.removeItem("stayLoggedIn");
        await auth.signOut();
        authStatus.textContent = "Logged out successfully";
      } catch (err) {
        console.error("logout error:", err);
        authStatus.textContent = "Error Logging out";
      }
    });
  }

  function getEmojiForStep(step) {
    const lower = step.toLowerCase();
    if (lower.includes("wood") || lower.includes("lodge") || lower.includes("logging")) return "🌲";
    if (lower.includes("house") || lower.includes("hall") || lower.includes("clan hall") || lower.includes("town hall")) return "🏠";
    if (lower.includes("scout")) return "🧭";
    if (lower.includes("colonize")) return "📍";
    if (lower.includes("training") || lower.includes("military") || lower.includes("barracks")) return "⚔️";
    if (lower.includes("feast")) return "🍽️";
    if (lower.includes("clear") || lower.includes("attack")) return "🛡️";
    if (lower.includes("trade post")) return "🏦";
    if (lower.includes("warchief")) return "🪓";
    if (lower.includes("brewery")) return "🍺";
    if (lower.includes("mine") || lower.includes("mining")) return "⛏️";
    if (lower.includes("fish") || lower.includes("fisherman")) return "🐟";
    if (lower.includes("merchant")) return "🛍️";
    if (lower.includes("forge") || lower.includes("smithy")) return "🛠️";
    if (lower.includes("altar")) return "🕯️";
    if (lower.includes("relic")) return "🗿";
    if (lower.includes("ready")) return "✅";
    if (lower.includes("church")) return "⛪";
    if (lower.includes("stables") || lower.includes("cavalier")) return "🐎";
    if (lower.includes("archer")) return "🏹";
    if (lower.includes("cannoneer")) return "💣";
    if (lower.includes("warrior") || lower.includes("swordsman")) return "🗡️";
    if (lower.includes("muncher")) return "🦷";
    if (lower.includes("barricade")) return "🪵";
    if (lower.includes("potion")) return "🧪";
    if (lower.includes("farm") || lower.includes("farmland")) return "🌾";
    if (lower.includes("tower")) return "🏰";
    return "•";
  }

  function renderBuildSteps(steps) {
    return (steps || []).map(step => {
      if (step.startsWith("#")) {
        return `<h4 class="phase-header">📅 ${step.slice(1).trim()}</h4>`;
      }
      return `<div class="build-step">${getEmojiForStep(step)} ${step}</div>`;
    }).join("");
  }

  let buildData = {};

  function showBuild(name, data = buildData) {
    const build = data[name];
    if (!build) return;
    let html = '';
    html += `<details class="build-section" open>
      <summary><strong>📋 Build Info</strong></summary>`;
    if (build.username) {
      html += `<p><strong>👤 Submitted by:</strong> ${build.username}</p><hr>`;
    }
    if ((build.upgrades || []).length > 0) {
      html += `<h4>⬆ Upgrades</h4><p>${build.upgrades.join(", ")}</p><hr>`;
    }
    if ((build.situationalTags || []).length > 0) {
      html += `<h4>🗺️ Applicable Maps</h4><div class="tag-pill-container">`;
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
      if (!build || !Array.isArray(build.steps)) continue;

      const option = document.createElement('option');
      option.value = buildName;
      option.textContent = buildName;
      buildSelector.appendChild(option);

      const preview = document.createElement('div');
      preview.className = 'build-preview';
      const tagText = (build.situationalTags || []).join(', ') || 'None';
      const isOwnBuild = window.auth.currentUser?.uid === build.userID;
      const canUpvote = !isOwnBuild;
      const upvoteCount = build.upvotes?.length || 0;

      preview.innerHTML = `
        <h4>${buildName} (${build.clan})</h4>
        <p><strong>👤 Submitted by:</strong> ${build.username || "Unknown"}</p>
        <p><strong>Maps:</strong> ${tagText}</p>
        ${canUpvote ? `<button class="upvote-btn" data-build="${buildName}" type="button">🔼 Upvote</button>` : `<em>Can't upvote own build</em>`}
        <p>👍 ${upvoteCount} Upvote${upvoteCount === 1 ? '' : 's'}</p>
        <button class="view-btn" data-build="${buildName}" type="button">View</button>
      `;
      buildList.appendChild(preview);
    }

    if (buildSelector.options.length > 0) {
      buildSelector.selectedIndex = 0;
      showBuild(buildSelector.value, filteredData);
    } else {
      buildList.innerHTML = '<li>No builds for this faction.</li>';
    }
  }

  if (buildList) {
    buildList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.classList.contains('view-btn')) {
        const name = btn.dataset.build;
        openBuildInWindow(name);
      }
      if (btn.classList.contains('upvote-btn')) {
        const name = btn.dataset.build;
        upvoteBuild(name);
      }
    });
  }

  window.loadBuilds = async function (forceRefresh = false, skipInitialDisplay = false) {
    if (!forceRefresh) {
      const cached = localStorage.getItem("cachedBuilds");
      if (cached) {
        buildData = JSON.parse(cached);
        if (!skipInitialDisplay) updateBuildSelector(buildData);
        return;
      }
    }
    const querySnapshot = await getDocs(collection(db, "builds"));
    buildData = {};
    querySnapshot.forEach((doc) => {
      const build = doc.data();
      buildData[build.name] = {
        steps: build.steps,
        clan: build.clan,
        situationalTags: build.situationalTags || [],
        username: build.username || "Unknown",
        upvotes: build.upvotes || [],
        upgrades: build.upgrades || []
      };
    });
    localStorage.setItem("cachedBuilds", JSON.stringify(buildData));
    if (!skipInitialDisplay) updateBuildSelector(buildData);
  };

  if (clanFilter) {
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
  }
  if (buildSelector) {
    buildSelector.addEventListener('change', () => {
      showBuild(buildSelector.value);
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('register-screen').style.display = 'block';
    });
  }
  const backToLoginBtn = document.getElementById('backToLoginBtn');
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', () => {
      document.getElementById('register-screen').style.display = 'none';
      document.getElementById('login-screen').style.display = 'block';
    });
  }
  const finalizeRegisterBtn = document.getElementById('finalizeRegisterBtn');
  if (finalizeRegisterBtn) {
    finalizeRegisterBtn.addEventListener('click', async () => {
      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      if (!username || !email || !password) {
        document.getElementById('registerStatus').textContent = "Fill in all fields.";
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await addDoc(collection(db, "users"), { uid: user.uid, username, email });
        document.getElementById('registerStatus').textContent = "✅ Registered!";
      } catch (err) {
        document.getElementById('registerStatus').textContent = `❌ ${err.message}`;
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const identifier = emailInput.value.trim();
      const password = passwordInput.value;
      const stay = document.getElementById('stayLoggedIn').checked;
      localStorage.setItem("stayLoggedIn", stay);
      if (!identifier || !password) {
        authStatus.textContent = "Please fill in all fields.";
        return;
      }
      try {
        let emailToUse = identifier;
        if (!identifier.includes('@')) {
          const q = window.query(window.collection(window.db, "users"), window.where("username", "==", identifier));
          const snap = await window.getDocs(q);
          if (snap.empty) {
            authStatus.textContent = "❌ Username not found.";
            return;
          }
          emailToUse = snap.docs[0].data().email;
        }
        await window.setPersistence(window.auth, stay ? window.browserLocalPersistence : window.browserSessionPersistence);
        await window.signInWithEmailAndPassword(window.auth, emailToUse, password);
        authStatus.textContent = "✅ Logged in!";
      } catch (error) {
        console.error("Login Error:", error);
        authStatus.textContent = `❌ ${error.message}`;
      }
    });
  }

  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        authStatus.textContent = "Enter your email first";
        return;
      }
      try {
        await window.sendPasswordResetEmail(window.auth, email);
        authStatus.textContent = "Reset email sent!";
      } catch (error) {
        authStatus.textContent = `Error: ${error.message}`;
      }
    });
  }

  let buildSubmitCooldown = false;
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const buildName = newName.value.trim();
      const selectedClan = newClan.value;
      const user = auth.currentUser;
      const upgrades = upgradesInput.value.trim().split("\n").filter(Boolean);

      let allSteps = [];
      const headerMap = { early: "Early Game", mid: "Mid Game", late: "Late Game" };
      phases.forEach(p => {
        const ta = document.getElementById(`steps-${p.id}`);
        const lines = (ta?.value || '').trim().split("\n").filter(Boolean);
        if (lines.length > 0) {
          allSteps.push(`# ${headerMap[p.id]}`);
          allSteps.push(...lines);
        }
      });

      const situationalTags = mapSelectors
        .map(id => document.getElementById(id)?.value)
        .filter(v => v && v !== "Off");

      if (!user) {
        statusMsg.textContent = "You must be logged in to submit a Build!";
        return;
      }
      if (!buildName || allSteps.length === 0 || !selectedClan) {
        statusMsg.textContent = "⚠️ Enter a build name, steps, and select a Faction";
        return;
      }
      if (buildSubmitCooldown) {
        statusMsg.textContent = "⏳ Please wait before submitting again.";
        return;
      }
      buildSubmitCooldown = true;
      setTimeout(() => { buildSubmitCooldown = false; }, 5000);

      try {
        const userSnapshot = await getDocs(window.query(window.collection(window.db, "users"), window.where("uid", "==", user.uid)));
        const username = userSnapshot.empty ? user.email : userSnapshot.docs[0].data().username;

        await addDoc(collection(db, "builds"), {
          name: buildName,
          steps: allSteps,
          clan: selectedClan,
          situationalTags,
          userID: user.uid,
          username: username || user.email,
          upgrades,
          upvotes: []
        });

        statusMsg.textContent = "✅ Build submitted!";
        localStorage.removeItem("cachedBuilds");
        await loadBuilds(true, true);
        await loadUserBuilds(user.uid);
      } catch (err) {
        console.error("Error submitting build:", err);
        statusMsg.textContent = "❌ Error submitting build. Check console.";
      }

      newName.value = "";
      newClan.selectedIndex = 0;
      upgradesInput.value = "";
      phases.forEach(p => {
        const ta = document.getElementById(`steps-${p.id}`);
        if (ta) ta.value = '';
      });
      mapSelectors.forEach(id => {
        const el = document.getElementById(id);
        const prev = document.getElementById(id + 'Preview');
        if (el) el.selectedIndex = 0;
        if (prev) prev.innerHTML = '';
      });
    });
  }

  let openingBuildWindow = false;
  function openBuildInWindow(name) {
    if (openingBuildWindow) return;
    openingBuildWindow = true;
    setTimeout(() => openingBuildWindow = false, 300);
    const build = buildData[name];
    const buildWithName = { ...build, name };
    const fromTags = (build.situationalTags || [])
      .map(n => mapByName[n])
      .filter(Boolean);

    const fromApplicable = Array.isArray(build.applicableMaps)
      ? build.applicableMaps.map(m =>
          typeof m === 'string' ? (mapByName[m] || '') : (m.image || '')
        ).filter(Boolean)
      : [];

     buildWithName.mapImages = fromTags.length ? fromTags : fromApplicable;
    ipcRenderer.send('open-build-window', buildWithName);
  }
  window.openBuildInWindow = openBuildInWindow;

  async function upvoteBuild(name) {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to upvote!");
    const build = buildData[name];
    const buildRef = window.query(collection(db, "builds"), window.where("name", "==", name));
    const snapshot = await window.getDocs(buildRef);
    if (snapshot.empty) return alert("Build not found.");
    const docRef = snapshot.docs[0].ref;
    const currentUpvotes = build.upvotes || [];
    if (currentUpvotes.includes(user.uid)) {
      alert("You already upvoted this build!");
      return;
    }
    try {
      const updatedVotes = [...currentUpvotes, user.uid];
      await window.updateDoc(docRef, { upvotes: updatedVotes });
      localStorage.removeItem("cachedBuilds");
      await loadBuilds(true, true);
      const selectedClan = clanFilter.value;
      const filtered = selectedClan === "All"
        ? buildData
        : Object.fromEntries(Object.entries(buildData).filter(([_, data]) => data.clan === selectedClan));
      updateBuildSelector(filtered);
    } catch (err) {
      console.error("Upvote error:", err);
      alert("Error upvoting. Try again.");
    }
  }
  window.upvoteBuild = upvoteBuild;

  let profileClicksBound = false;
  async function loadUserBuilds(uid) {
    const container = document.getElementById("profileBuildsContainer");
    container.innerHTML = "<p>Loading your builds...</p>";
    try {
      const buildsRef = collection(db, "builds");
      const q = window.query(buildsRef, window.where("userID", "==", uid));
      const querySnapshot = await getDocs(q);
      container.innerHTML = "";
      if (querySnapshot.empty) {
        container.innerHTML = "<p>No builds yet</p>";
      } else {
        querySnapshot.forEach((doc) => {
          const build = doc.data();
          const card = document.createElement("div");
          card.className = "build-card";
          card.innerHTML = `
            <h3>${build.name || "Untitled"} (${build.clan})</h3>
            <p><strong>👤 Username:</strong> ${build.username || "Unknown"}</p>
            ${build.upgrades && build.upgrades.length ? `<p><strong>⬆ Upgrades:</strong> ${build.upgrades.join(", ")}</p>` : ""}
            <div class="steps-block">${renderBuildSteps(build.steps || [])}</div>
            <button class="delete-btn" data-id="${doc.id}" type="button">Delete</button>
            <button class="view-btn" data-build="${build.name}" type="button">View</button>
          `;
          container.appendChild(card);
        });

        if (!profileClicksBound) {
          container.addEventListener('click', async (e) => {
            const t = e.target.closest('button');
            if (!t) return;
            if (t.classList.contains('delete-btn')) {
              const id = t.dataset.id;
              if (confirm("Are you sure you want to delete this build?")) {
                try {
                  await window.deleteDoc(window.doc(db, "builds", id));
                  localStorage.removeItem("cachedBuilds");
                  await loadUserBuilds(uid);
                  await loadBuilds(true, true);
                } catch (err) {
                  console.error("Delete Error:", err);
                  alert("Error deleting build. See console.");
                }
              }
            }
            if (t.classList.contains('view-btn')) {
              const name = t.dataset.build;
              openBuildInWindow(name);
            }
          });
          profileClicksBound = true;
        }
      }

      const allBuildsSnap = await getDocs(collection(db, "builds"));
      const upvoted = [];
      allBuildsSnap.forEach(doc => {
        const build = doc.data();
        if ((build.upvotes || []).includes(uid) && build.userID !== uid) {
          upvoted.push({ ...build, docId: doc.id });
        }
      });
      if (upvoted.length > 0) {
        const upvotedHeader = document.createElement("h3");
        upvotedHeader.textContent = "⭐ Builds You’ve Upvoted";
        container.appendChild(upvotedHeader);
        upvoted.forEach(build => {
          const card = document.createElement("div");
          card.className = "build-card";
          const upvoteCount = build.upvotes?.length || 0;
          card.innerHTML = `
            <h4>${build.name || "Untitled"} (${build.clan})</h4>
            <p><strong>👤 Submitted by:</strong> ${build.username || "Unknown"}</p>
            <p>👍 ${upvoteCount} Upvote${upvoteCount === 1 ? '' : 's'}</p>
            <button class="view-btn" data-build="${build.name}" type="button">View</button>
          `;
          container.appendChild(card);
        });
      }
    } catch (error) {
      console.error("Error Loading Builds:", error);
      container.innerHTML = "<p>Failed to load builds. Try again later.</p>";
    }
  }

  ipcRenderer.on('app-version', (_, version) => {
    document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;bottom:10px;right:10px;color:#999;">v${version}</div>`);
  });
});
