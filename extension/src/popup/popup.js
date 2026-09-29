const $ = (id) => document.getElementById(id);
const say = (text) => ($("message").textContent = text);
const RESULTS = {
  completed: "Last session completed clean.",
  stained: "Last session was stained.",
  removed: "Last session ended early.",
};

async function render() {
  const { [KEYS.token]: token, [KEYS.user]: user, [KEYS.session]: session } =
    await browser.storage.local.get(Object.values(KEYS));
  const running = isBlocking(session);

  $("signedOut").hidden = !!token;
  $("idle").hidden = !token || running;
  $("running").hidden = !token || !running;
  $("logout").hidden = !token;
  if (!token) return;

  say(`Signed in as ${user?.name ?? user?.email}`);
  $("lastResult").textContent = RESULTS[session?.status] ?? "No session running.";
  if (!running) return;

  $("sessionName").textContent = session.name || "Focus session";
  $("sessionStatus").textContent = session.status === "stained" ? "Stained" : "Clean";
  $("sessionStatus").className = `pill ${session.status}`;
  const ends = session.endDate
    ? `ends ${new Date(session.endDate).toLocaleString()}`
    : "no end date";
  $("sessionInfo").textContent = `${session.blockedSites.length} sites blocked · ${ends}`;
}

$("login").addEventListener("click", async () => {
  $("login").disabled = true;
  say("Opening Google sign-in…");
  try {
    await browser.runtime.sendMessage("login");
  } catch (error) {
    say(`Sign-in failed: ${error.message}`);
  }
  $("login").disabled = false;
});

$("logout").addEventListener("click", async () => {
  const session = await get(KEYS.session);
  if (isBlocking(session) && !confirm("Signing out stops check-ins, so your badge will show as unverified. Sign out?"))
    return;
  await api("/auth/logout", { method: "POST" }).catch(() => {});
  await browser.storage.local.remove([KEYS.token, KEYS.user]);
});

const openOptions = () => {
  browser.runtime.openOptionsPage();
  window.close();
};
$("start").addEventListener("click", openOptions);
$("manage").addEventListener("click", openOptions);

$("copyBadge").addEventListener("click", async () => {
  await navigator.clipboard.writeText(badgeUrl(await get(KEYS.session)));
  say("Badge link copied.");
});

$("openBadge").addEventListener("click", async () => {
  browser.tabs.create({ url: badgeUrl(await get(KEYS.session)) });
  window.close();
});

$("end").addEventListener("click", async () => {
  if (!confirm("End this session early? Your badge will show it as ended early.")) return;
  const session = await get(KEYS.session);
  try {
    const { session: ended } = await api(`/session/${session.id}/end`, { method: "POST" });
    await set(KEYS.session, { ...session, ...ended });
  } catch (error) {
    say(`Could not end session: ${error.message}`);
  }
});

browser.storage.onChanged.addListener(render);
render();
