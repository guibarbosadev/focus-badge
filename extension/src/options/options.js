const $ = (id) => document.getElementById(id);
const say = (text) => ($("message").textContent = text);

async function render() {
  const { [KEYS.token]: token, [KEYS.session]: session } =
    await browser.storage.local.get([KEYS.token, KEYS.session]);
  const running = isBlocking(session);

  $("signedOut").hidden = !!token;
  $("createForm").hidden = !token || running;
  $("running").hidden = !token || !running;

  if (!running) {
    // Prefill with the previous session's list to make restarting easy.
    if (session && !$("sites").value) $("sites").value = session.blockedSites.join("\n");
    return;
  }
  $("sessionName").textContent = session.name || "Focus session";
  $("siteList").replaceChildren(
    ...session.blockedSites.map((site) => {
      const li = document.createElement("li");
      li.textContent = site;
      return li;
    })
  );
}

$("createForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const lines = $("sites").value.split("\n").filter((l) => l.trim());
  const invalid = lines.filter((l) => !normalizeSite(l));
  if (invalid.length) return say(`Not a valid site: ${invalid.join(", ")}`);
  const endDate = $("endDate").value;
  if (endDate && new Date(endDate) <= new Date()) return say("End date must be in the future.");

  const button = event.submitter;
  button.disabled = true;
  try {
    const { session } = await api("/session", {
      method: "POST",
      body: {
        blockedSites: [...new Set(lines.map(normalizeSite))],
        name: $("name").value.trim() || undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        device: await getDevice(),
      },
    });
    await set(KEYS.session, session);
    say("Session started. Blocking is on.");
  } catch (error) {
    say(`Could not start session: ${error.message}`);
  }
  button.disabled = false;
});

$("addForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const site = normalizeSite($("newSite").value);
  if (!site) return say("Not a valid site.");
  const session = await get(KEYS.session);
  if (session.blockedSites.includes(site)) return say(`${site} is already blocked.`);
  await set(KEYS.session, { ...session, blockedSites: [...session.blockedSites, site] });
  $("newSite").value = "";
  say(`${site} added.`);
  ping(); // sync now; if offline the hourly ping picks it up
});

browser.storage.onChanged.addListener(render);
render();
