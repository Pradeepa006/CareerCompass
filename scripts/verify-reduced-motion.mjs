const targets = await fetch("http://localhost:9222/json").then(response => response.json());
const target = targets.find(item => String(item.url).includes("3000-i28wgrwqonyjmnlmwto2r-d528b8a8.us3.manus.computer/dashboard"));

if (!target?.webSocketDebuggerUrl) {
  throw new Error("No active CareerCompass dashboard browser target was found.");
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

socket.addEventListener("message", event => {
  const payload = JSON.parse(event.data);
  if (payload.method === "Page.loadEventFired" && globalThis.loadComplete) globalThis.loadComplete();
  if (payload.id && pending.has(payload.id)) {
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    payload.error ? reject(new Error(payload.error.message)) : resolve(payload.result);
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

await command("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await command("Page.enable");
const pageLoaded = new Promise(resolve => { globalThis.loadComplete = resolve; });
await command("Page.reload", { ignoreCache: true });
await pageLoaded;
await new Promise(resolve => setTimeout(resolve, 2500));

const result = await command("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rules = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if ('conditionText' in rule && String(rule.conditionText).includes('prefers-reduced-motion')) rules.push(rule.cssText);
        }
      } catch {}
    }
    const animated = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = getComputedStyle(el);
      return style.transitionDuration !== '0s' || style.animationDuration !== '0s';
    }).filter(el => el.closest('#root')).slice(0, 8).map(el => {
      const style = getComputedStyle(el);
      return { tag: el.tagName, className: el.className, transitionDuration: style.transitionDuration, animationDuration: style.animationDuration };
    });
    const pageTransition = document.querySelector('#root > div');
    const pageStyle = pageTransition ? getComputedStyle(pageTransition) : null;
    const statText = Array.from(document.querySelectorAll('#root *')).find(el => el.children.length === 0 && el.textContent?.trim() === '56')?.textContent?.trim() ?? null;
    return { reduce, ruleCount: rules.length, pageTransition: pageStyle ? { opacity: pageStyle.opacity, transform: pageStyle.transform, transitionDuration: pageStyle.transitionDuration, animationDuration: pageStyle.animationDuration } : null, statText, activeAnimations: document.getAnimations().length, animated };
  })()`,
});

console.log(JSON.stringify(result.result.value, null, 2));
socket.close();
