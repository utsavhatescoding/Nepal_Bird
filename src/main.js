import "./style.css";
import { identifyBird } from "./inference.js";
import { preparePixels } from "./preprocess.js";
const main = document.querySelector("main");
const dialog = document.querySelector("#profile");
const profileContent = document.querySelector("#profile-content");
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let catalog = [],
  currentImage,
  imageUrl,
  busy = false,
  page = "",
  pageToken = 0;
const photoCache = new Map();
const storageKey = "nepal-bird-observations-v1";
const statuses = {
  CR: "Critically endangered",
  EN: "Endangered",
  VU: "Vulnerable",
  "-": "Not marked threatened in project report",
};
const cameraIcon =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 14h9l3-5h8l3 5h9v25H8Z"/><circle cx="24" cy="26" r="8"/></svg>';
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.style.display = "none"), 3500);
}
function readObservations() {
  try {
    const rows = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(rows)
      ? rows.filter(
          (x) => x && typeof x.id === "string" && Number.isInteger(x.index),
        )
      : [];
  } catch {
    return [];
  }
}
function writeObservations(rows) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(rows));
    return true;
  } catch {
    toast(
      "Browser storage is unavailable. Your observation could not be saved.",
    );
    return false;
  }
}
function pageHead(label, title, text) {
  return `<section class="page-head"><div class="eyebrow">${label}</div><h1>${title}</h1><p>${text}</p></section>`;
}
function home() {
  return `<section class="hero"><img src="/assets/nepal-bird-hero.webp" alt="Bird life in a green landscape"><div class="hero-copy"><div class="eyebrow">For the naturally curious</div><h1>A closer look<br>at the wild.</h1><p>A flash of colour. A familiar call. Discover the bird behind the moment, and the world it belongs to.</p><a class="btn light" href="#identify">Identify a bird <span aria-hidden="true">↗</span></a></div><div class="hero-bottom">Birds · Habitats · Nepal</div></section><div class="intro-strip"><span><strong>85 species.</strong> A starting point for discovery.</span><span>Photo identification on your device</span><span>A notebook for the moments worth keeping</span></div><section class="section"><div class="section-head"><div><div class="eyebrow">Your next encounter</div><h2>From a photograph<br>to a little more understanding.</h2></div><p>You don’t need to know a bird’s name to notice it. Start with a clear photograph, then look closer.</p></div><div class="steps"><article class="step"><span class="step-number">01 / NOTICE</span><h3>Take a photograph</h3><p>Keep your distance. Capture a clear view of one bird, with as much feather detail as possible.</p></article><article class="step"><span class="step-number">02 / COMPARE</span><h3>Explore the possibilities</h3><p>Get three model suggestions. Compare their shape and plumage before deciding what you saw.</p></article><article class="step"><span class="step-number">03 / REMEMBER</span><h3>Keep a field note</h3><p>Save a possible identification, date and a note in your personal browser notebook.</p></article></div></section><section class="feature"><div class="feature-image"><img src="/assets/nepal-bird-hero.webp" alt="A glimpse of Nepal’s bird life" loading="lazy"></div><div class="feature-copy"><div class="eyebrow">The field guide</div><h2>Every bird has<br>a place in the story.</h2><p>Explore the 85 species supported by this model, from waterbirds and raptors to forest songbirds.</p><a class="btn secondary" href="#explore">Open the field guide <span aria-hidden="true">↗</span></a></div></section><section class="section"><div class="eyebrow">A thoughtful companion</div><h2>Curiosity, with care.</h2><p class="lead">A suggestion is a reason to look closer. Our model offers clues, while careful observation and field knowledge help you reach a sound identification.</p><a class="text-button" href="#about">Meet the project and its people</a></section>`;
}
function identifyPage() {
  return `${pageHead("Photo identification", "What caught your eye?", "Start with one clear photograph. Your photo stays on this device during identification.")}<div class="identify-layout"><div><div class="upload-box" id="drop-zone">${cameraIcon}<h3>Bring your bird into focus</h3><p>Choose a photograph or take one with your phone. JPG, PNG and WebP · up to 20 MB.</p><div class="upload-actions"><button class="btn" id="choose">Choose a photo</button><button class="btn secondary" id="camera">Take a photo</button></div><input class="hidden" type="file" id="file" accept="image/jpeg,image/png,image/webp"><input class="hidden" type="file" id="camera-file" accept="image/*" capture="environment"></div><div id="image-controls" class="hidden controls"><label for="crop">Crop the outer edges: <span id="crop-value">0</span>%</label><input id="crop" type="range" min="0" max="30" value="0" step="1"><p class="disclaimer">Use this only when the bird is near the centre. The preview is the image used for identification.</p><button class="text-button" id="replace">Choose a different photograph</button></div></div><aside class="panel"><div class="eyebrow">A first clue</div><h2>Look. Compare.<br>Learn.</h2><p>The model compares your photograph against 85 trained species and returns its three closest matches.</p><button class="btn full" id="identify-button" disabled>Choose a photo to begin</button><div class="status" id="model-status" role="status" aria-live="polite"></div><div id="progress" class="progress hidden"><span></span></div><div class="note"><strong>On your device</strong><br>The model downloads on first use. Identification can take longer on older phones.</div><div class="note"><strong>Know the limits</strong><br>Unsupported species and non-bird photos can still receive a match. Model scores are not verified probabilities.</div></aside></div><section id="results" aria-live="polite"></section>`;
}
function renderGuide() {
  main.innerHTML = `${pageHead("The field guide", "Meet your wild neighbours.", "Explore the exact 85 species our model supports. Search by common or scientific name, or browse a bird order.")}<div class="toolbar"><input type="search" id="search" aria-label="Search species" placeholder="Try monal, vulture, owl…"><select id="order" aria-label="Filter by bird order"><option value="">All orders</option>${[
    ...new Set(catalog.map((x) => x.order)),
  ]
    .sort()
    .map((x) => `<option>${escape(x)}</option>`)
    .join(
      "",
    )}</select></div><p class="count" id="count"></p><div class="catalog" id="catalog"></div>`;
  const update = () => {
    const needle = document.querySelector("#search").value.trim().toLowerCase(),
      order = document.querySelector("#order").value;
    const birds = catalog
      .filter(
        (x) =>
          (!order || x.order === order) &&
          `${x.common} ${x.scientific}`.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.common.localeCompare(b.common));
    document.querySelector("#count").textContent =
      `${birds.length} of 85 species`;
    document.querySelector("#catalog").innerHTML = birds.length
      ? birds
          .map(
            (x) =>
              `<button class="catalog-card" data-profile="${x.index}"><span class="eyebrow">${escape(x.order)}</span><h3>${escape(x.common)}</h3><span class="latin">${escape(x.scientific)}</span><span class="family">${escape(x.family)} <span aria-hidden="true">↗</span></span></button>`,
          )
          .join("")
      : '<p class="disclaimer">No species match. Try a broader search or a different order.</p>';
    bindProfiles();
  };
  document.querySelector("#search").addEventListener("input", update);
  document.querySelector("#order").addEventListener("change", update);
  update();
}
function renderNotebook() {
  const rows = readObservations();
  main.innerHTML = `${pageHead("Your field notebook", "Keep the encounter.", "These notes are saved in this browser. They are personal observations, not verified species records. Export a copy before clearing browser data.")}<div class="toolbar"><button class="btn secondary" id="export" ${rows.length ? "" : "disabled"}>Export notebook</button><a class="btn" href="#identify">New identification</a></div>${
    rows.length
      ? rows
          .map((x) => {
            const bird = catalog.find((b) => b.index === x.index);
            return `<article class="notebook-item"><div><span class="tag">Unverified observation</span><h3>${escape(bird?.common || "Unknown species")}</h3><span class="latin">${escape(x.date)}${x.location ? ` · ${escape(x.location)}` : ""}</span>${x.note ? `<p>${escape(x.note)}</p>` : ""}</div><div><button class="text-button" data-profile="${x.index}">Species profile</button> · <button class="text-button" data-delete="${escape(x.id)}">Delete</button></div></article>`;
          })
          .join("")
      : '<div class="empty"><div class="eyebrow">A fresh page</div><h2>Your first encounter belongs here.</h2><p>Identify a bird, compare the suggestions, and save a field note.</p><a class="btn" href="#identify">Start with a photograph</a></div>'
  }<p class="disclaimer">Locations are optional. Avoid recording precise nest locations or sensitive sites. Photos are not stored in this notebook.</p>`;
  bindProfiles();
  document.querySelector("#export").onclick = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            observations: rows.map((x) => ({
              ...x,
              species: catalog.find((b) => b.index === x.index)?.common,
            })),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "nepal-bird-notebook.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  main.querySelectorAll("[data-delete]").forEach(
    (el) =>
      (el.onclick = () => {
        if (confirm("Delete this field note?")) {
          if (
            writeObservations(
              readObservations().filter((x) => x.id !== el.dataset.delete),
            )
          )
            renderNotebook();
        }
      }),
  );
}
function about() {
  return `${pageHead("Our purpose", "Know the bird.<br>Care for its world.", "A project connecting computer vision with curiosity about Nepal’s bird life.")}<div class="about-grid"><article><h2>Attention is a beginning.</h2><p>Birds connect forests, farms, rivers, wetlands and cities. Noticing them invites us to ask what they eat, where they nest, and what makes their habitat worth protecting.</p><p>This field companion makes a research model accessible. It supports learning and comparison; it does not replace an ornithologist, a field guide or careful evidence.</p></article><article class="panel"><div class="eyebrow">Open about the limits</div><h3>85 classes, not every bird.</h3><p>EfficientNetB0 always chooses among its trained species. The displayed softmax scores are not calibrated probabilities, and high scores do not establish a correct identification.</p><h3>Sources matter.</h3><p>Taxonomy and conservation fields reproduce project materials covering records through 2022. They are historical, not live assessments. A dash does not mean Least Concern.</p><p>Reference photos come from Wikimedia Commons with individual attribution. Species introductions come from Wikipedia with source links and CC BY-SA attribution.</p></article></div><section class="section"><div class="eyebrow">People behind the project</div><h2>A shared curiosity.</h2><div class="contributors">${[
    [
      "prajwol-karki",
      "Prajwol Karki",
      "MS Knowledge Engineering · IOE Pulchowk",
    ],
    [
      "utsav-phuyal",
      "Utsav Phuyal",
      "Master’s in Business and Economics · KUSOM",
    ],
    ["bibha-sss", "Bibha Sthapit", "Assistant Professor · IOE Pulchowk"],
  ]
    .map(
      ([file, name, role]) =>
        `<article class="contributor"><img src="/assets/contributors/${file}.png" alt="${name}" loading="lazy"><h3>${name}</h3><p>${role}</p></article>`,
    )
    .join(
      "",
    )}</div></section><section class="section"><div class="eyebrow">Responsible observation</div><h2>Leave the wild as you found it.</h2><div class="steps"><article class="step"><h3>Keep your distance</h3><p>A photograph is never worth disturbing a bird or approaching a nest.</p></article><article class="step"><h3>Share thoughtfully</h3><p>Keep sensitive locations private. An unverified model suggestion is not a confirmed sighting.</p></article><article class="step"><h3>Check the evidence</h3><p>Consult current conservation sources before using historical status fields for research or action.</p></article></div></section>`;
}
function bindProfiles() {
  main
    .querySelectorAll("[data-profile]")
    .forEach(
      (el) => (el.onclick = () => openProfile(Number(el.dataset.profile))),
    );
}
async function requestJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Source unavailable");
  return response.json();
}
function safeURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
function plain(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, " ");
}
async function fetchPhoto(bird) {
  if (photoCache.has(bird.index)) return photoCache.get(bird.index);
  const promise = (async () => {
    for (const query of [bird.scientific, bird.common]) {
      try {
        const params = new URLSearchParams({
          action: "query",
          generator: "search",
          gsrsearch: `"${query}" filetype:bitmap`,
          gsrnamespace: "6",
          gsrlimit: "8",
          prop: "imageinfo",
          iiprop: "url|mime|extmetadata",
          iiurlwidth: "800",
          format: "json",
          formatversion: "2",
          origin: "*",
        });
        const data = await requestJSON(
          `https://commons.wikimedia.org/w/api.php?${params}`,
        );
        for (const page of data.query?.pages || []) {
          const info = page.imageinfo?.[0],
            meta = info?.extmetadata;
          if (
            !info ||
            !["image/jpeg", "image/png", "image/webp"].includes(info.mime) ||
            /map|range|distribution|egg|skull|stamp|museum|specimen|skin/i.test(
              page.title,
            )
          )
            continue;
          const url = safeURL(info.thumburl || info.url),
            source = safeURL(info.descriptionurl);
          if (url && source && meta?.LicenseShortName?.value)
            return {
              url,
              source,
              artist: plain(
                meta.Artist?.value || "Wikimedia contributor",
              ).slice(0, 120),
              licence: plain(meta.LicenseShortName.value),
              licenceURL: safeURL(meta.LicenseUrl?.value),
            };
        }
      } catch {}
    }
    return null;
  })();
  photoCache.set(bird.index, promise);
  return promise;
}
async function fillPhoto(container, bird) {
  const photo = await fetchPhoto(bird);
  if (!container.isConnected || !photo) return;
  container.innerHTML = `<img src="${escape(photo.url)}" alt="Reference photograph of ${escape(bird.common)}" loading="lazy"><div class="credit">${escape(photo.artist)} · ${escape(photo.licence)} · <a href="${escape(photo.source)}" target="_blank" rel="noopener noreferrer">Source</a>${photo.licenceURL ? ` · <a href="${escape(photo.licenceURL)}" target="_blank" rel="noopener noreferrer">Licence</a>` : ""}</div>`;
  container.querySelector("img").onerror = () => {
    container.innerHTML = '<span class="placeholder">Photo unavailable</span>';
  };
}
let profileToken = 0;
async function openProfile(index) {
  const bird = catalog.find((x) => x.index === index);
  if (!bird) return;
  const token = ++profileToken;
  profileContent.innerHTML = `<div class="eyebrow">${escape(bird.order)}</div><h2>${escape(bird.common)}</h2><p class="latin">${escape(bird.scientific)}</p><div class="profile-grid"><div class="bird-image"><span class="placeholder">${String(bird.number).padStart(2, "0")}</span></div><div class="profile-facts"><strong>Family</strong><br>${escape(bird.family)}<br><strong>Global status · historical</strong><br>${escape(statuses[bird.globalStatus])}<br><strong>Nepal status · historical</strong><br>${escape(statuses[bird.nepalStatus])}</div></div><p class="disclaimer">Status fields are from project records through 2022. Verify current status before using them for conservation decisions.</p><div class="profile-description" id="description">Loading the sourced species introduction…</div><button class="btn secondary" id="profile-save">Save a field note</button>`;
  if (!dialog.open) dialog.showModal();
  fillPhoto(profileContent.querySelector(".bird-image"), bird);
  document.querySelector("#profile-save").onclick = () => saveForm(bird);
  const description = document.querySelector("#description");
  try {
    const params = new URLSearchParams({
      action: "query",
      prop: "extracts|info",
      titles: bird.scientific,
      redirects: "1",
      exintro: "1",
      explaintext: "1",
      exchars: "900",
      inprop: "url",
      format: "json",
      formatversion: "2",
      origin: "*",
    });
    const data = await requestJSON(
      `https://en.wikipedia.org/w/api.php?${params}`,
    );
    const item = data.query?.pages?.[0];
    if (profileToken !== token) return;
    const link = safeURL(item?.fullurl);
    description.innerHTML =
      item?.extract && link
        ? `<p>${escape(item.extract)}</p><p class="disclaimer">Introduction: <a href="${escape(link)}" target="_blank" rel="noopener noreferrer">${escape(item.title)} on Wikipedia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA</a></p>`
        : "A species introduction is unavailable. The project taxonomy is shown above.";
  } catch {
    if (profileToken === token)
      description.textContent =
        "The external species introduction is unavailable right now. The project taxonomy is shown above.";
  }
}
function saveForm(bird) {
  ++profileToken;
  profileContent.innerHTML = `<div class="eyebrow">Your field notebook</div><h2>${escape(bird.common)}</h2><p class="disclaimer">Save this as an unverified observation. Notes stay in this browser.</p><form class="save-form"><label>Date<input class="form-field" type="date" name="date" required value="${localDate()}"></label><label>General location · optional<input class="form-field" name="location" maxlength="120" placeholder="e.g. a park in Kathmandu"></label><label>What did you notice?<textarea class="form-field" name="note" maxlength="1500" placeholder="Habitat, behaviour, plumage, or anything you’re unsure about"></textarea></label><button class="btn" type="submit">Save field note</button></form>`;
  if (!dialog.open) dialog.showModal();
  profileContent.querySelector("form").onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const row = {
      id: crypto.randomUUID(),
      index: bird.index,
      date: data.get("date"),
      location: data.get("location").trim(),
      note: data.get("note").trim(),
      verified: false,
    };
    if (writeObservations([row, ...readObservations()])) {
      dialog.close();
      toast("Field note saved in this browser.");
      if (page === "notebook") renderNotebook();
    }
  };
}
function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
dialog.querySelector(".close").onclick = () => dialog.close();
dialog.addEventListener("close", () => {
  ++profileToken;
});
function bindIdentify() {
  const file = document.querySelector("#file"),
    cameraFile = document.querySelector("#camera-file"),
    zone = document.querySelector("#drop-zone"),
    button = document.querySelector("#identify-button"),
    status = document.querySelector("#model-status"),
    crop = document.querySelector("#crop");
  document.querySelector("#choose").onclick = () => file.click();
  document.querySelector("#camera").onclick = () => cameraFile.click();
  document.querySelector("#replace").onclick = () => file.click();
  async function acceptFile(upload) {
    if (!upload || busy) return;
    if (upload.size > 20 * 1024 * 1024) {
      toast("Choose a photograph smaller than 20 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(upload.type)) {
      toast("Please use JPG, PNG or WebP. Export HEIC photos as JPG first.");
      return;
    }
    const url = URL.createObjectURL(upload),
      image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (page !== "identify") {
        URL.revokeObjectURL(url);
        return;
      }
      if (image.width * image.height > 40000000)
        throw new Error("Choose an image below 40 megapixels.");
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = url;
      currentImage = image;
      crop.value = 0;
      document.querySelector("#crop-value").textContent = "0";
      zone.innerHTML =
        '<canvas class="preview" aria-label="Selected photograph preview"></canvas>';
      document.querySelector("#image-controls").classList.remove("hidden");
      drawPreview();
      button.disabled = false;
      button.textContent = "Identify this bird";
      status.textContent = "Your photograph is ready.";
      document.querySelector("#results").innerHTML = "";
    } catch (error) {
      URL.revokeObjectURL(url);
      toast(
        error.message === "Choose an image below 40 megapixels."
          ? error.message
          : "This photograph could not be opened. Please try a JPG.",
      );
    }
  }
  file.onchange = () => acceptFile(file.files[0]);
  cameraFile.onchange = () => acceptFile(cameraFile.files[0]);
  for (const event of ["dragenter", "dragover"])
    zone.addEventListener(event, (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
  for (const event of ["dragleave", "drop"])
    zone.addEventListener(event, (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      if (event === "drop") acceptFile(e.dataTransfer.files[0]);
    });
  crop.oninput = () => {
    document.querySelector("#crop-value").textContent = crop.value;
    drawPreview();
    document.querySelector("#results").innerHTML = "";
    status.textContent =
      "Crop changed. Identify again to update the suggestions.";
  };
  function drawPreview() {
    const canvas = zone.querySelector("canvas");
    if (!canvas || !currentImage) return;
    const margin = Number(crop.value) / 100,
      w = currentImage.naturalWidth,
      h = currentImage.naturalHeight;
    const width = w * (1 - 2 * margin),
      height = h * (1 - 2 * margin),
      scale = Math.min(1200 / width, 1200 / height, 1);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas
      .getContext("2d")
      .drawImage(
        currentImage,
        Math.floor(w * margin),
        Math.floor(h * margin),
        w - 2 * Math.floor(w * margin),
        h - 2 * Math.floor(h * margin),
        0,
        0,
        canvas.width,
        canvas.height,
      );
  }
  button.onclick = async () => {
    if (!currentImage || busy) return;
    busy = true;
    button.disabled = true;
    crop.disabled = true;
    file.disabled = true;
    cameraFile.disabled = true;
    const token = pageToken,
      progress = document.querySelector("#progress");
    progress.classList.remove("hidden");
    status.textContent =
      "Loading the identification model. The first download may take a moment…";
    button.textContent = "Looking closer…";
    try {
      const pixels = preparePixels(currentImage, Number(crop.value));
      const start = performance.now();
      const matches = await identifyBird(pixels, (p) => {
        if (pageToken === token) {
          progress.querySelector("span").style.width =
            `${Math.round(p * 100)}%`;
          status.textContent =
            p < 1
              ? `Downloading model · ${Math.round(p * 100)}%`
              : "Comparing the photograph…";
        }
      });
      if (pageToken !== token) return;
      renderResults(matches);
      status.textContent = `Suggestions ready · ${((performance.now() - start) / 1000).toFixed(1)} seconds including model loading.`;
    } catch (error) {
      console.error(error);
      if (pageToken === token)
        status.textContent =
          "Identification could not finish. Check your connection and try again. If it persists, this browser may not support the model.";
    } finally {
      busy = false;
      if (pageToken === token) {
        button.disabled = false;
        crop.disabled = false;
        file.disabled = false;
        cameraFile.disabled = false;
        button.textContent = "Identify this bird";
        progress.classList.add("hidden");
      }
    }
  };
}
function renderResults(matches) {
  const container = document.querySelector("#results");
  container.innerHTML = `<div class="section-head"><div><div class="eyebrow">A starting point</div><h2>Three possible matches.</h2></div><p>Compare these suggestions with your photograph. A higher score does not guarantee an identification.</p></div><div class="result-grid">${matches
    .map((match, rank) => {
      const bird = catalog.find((x) => x.index === match.index);
      return `<article class="result"><div class="bird-image" data-photo="${bird.index}"><span class="placeholder">${String(bird.number).padStart(2, "0")}</span></div><div class="result-body"><div class="score"><span>Suggestion ${rank + 1}</span><span>${(match.score * 100).toFixed(1)}% model score</span></div><h3>${escape(bird.common)}</h3><p class="latin">${escape(bird.scientific)}</p><div class="actions"><button class="text-button" data-profile="${bird.index}">View species</button><button class="text-button" data-save="${bird.index}">Save a note</button></div></div></article>`;
    })
    .join(
      "",
    )}</div><p class="disclaimer">The classifier compares only 85 trained species. It will return suggestions for unsupported birds and non-bird images too. Check shape, bill and plumage against independent field references.</p>`;
  bindProfiles();
  container
    .querySelectorAll("[data-save]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          saveForm(catalog.find((x) => x.index === Number(el.dataset.save)))),
    );
  container.querySelectorAll("[data-photo]").forEach((el) =>
    fillPhoto(
      el,
      catalog.find((x) => x.index === Number(el.dataset.photo)),
    ),
  );
}
function render() {
  ++pageToken;
  currentImage = null;
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
    imageUrl = null;
  }
  dialog.close();
  page = location.hash.slice(1) || "home";
  if (!["home", "identify", "explore", "notebook", "about"].includes(page))
    page = "home";
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.hash === `#${page}`) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = `${{ home: "A closer look at the wild", identify: "Identify a bird", explore: "Field guide", notebook: "Your notebook", about: "Our purpose" }[page]} — Nepal Bird ID`;
  if (page === "explore") renderGuide();
  else if (page === "notebook") renderNotebook();
  else {
    main.innerHTML =
      page === "identify"
        ? identifyPage()
        : page === "about"
          ? about()
          : home();
    if (page === "identify") bindIdentify();
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);
async function init() {
  try {
    const response = await fetch("/catalog.json");
    if (!response.ok) throw new Error();
    catalog = await response.json();
    if (catalog.length !== 85) throw new Error();
    render();
  } catch {
    main.innerHTML =
      '<section class="empty"><h1>The guide could not load.</h1><p>Please refresh the page or check your connection.</p><button class="btn" onclick="location.reload()">Try again</button></section>';
  }
}
init();
