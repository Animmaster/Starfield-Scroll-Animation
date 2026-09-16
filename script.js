gsap.registerPlugin(ScrollTrigger, SplitText);

const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

const settings = {
  starCount: 1000,
  palette: ["#7CF5FF", "#8CE0FF", "#9D7CFF", "#C77CFF", "#FF7CE8", "#FF6FB5"],
  paletteWeights: [0.45, 0.2, 0.15, 0.125, 0.1, 0.078],
  holeRadius: 50,
  reachScale: 1.25,

  minStreakLength: 25,
  maxStreakLength: 350,
  minStreakWidth: 2.5,
  maxStreakWidth: 3.5,

  layers: 4,
  glowRadius: 300,
  glowSoftness: 3,
  acceleration: 1.5,
  tailFade: 0.25,
  restingFill: 0.25,
};

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height, centerX, centerY, maxDistance, pixelRatio;
let stars = [];
let scrollProgress = 0;

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function pickWeightedColor() {
  let roll = Math.random();
  for (let i = 0; i < settings.palette.length; i++) {
    roll -= settings.paletteWeights[i];
    if (roll <= 0) return hexToRgb(settings.palette[i]);
  }
  return hexToRgb(settings.palette[0]);
}

function createStars() {
  stars = [];
  for (let i = 0; i < settings.starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    stars.push({
      dirX: Math.cos(angle),
      dirY: Math.sin(angle),
      offset: Math.random(),
      length: random(settings.minStreakLength, settings.maxStreakLength),
      width: random(settings.minStreakWidth, settings.maxStreakWidth),
      color: pickWeightedColor(),
    });
  }
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  centerX = width / 2;
  centerY = height / 2;
  maxDistance = Math.hypot(width / 2, height / 2) * settings.reachScale;
}

function drawStarfield() {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";

  const filled =
    settings.restingFill + scrollProgress * (1 - settings.restingFill);
  const speed = Math.pow(filled, 1 / settings.acceleration);

  for (const star of stars) {
    const travel = Math.max(0, speed * settings.layers - star.offset) % 1;

    const headDistance =
      settings.holeRadius + travel * (maxDistance - settings.holeRadius);

    const streakLength = star.length * (0.2 + travel * 0.8);
    const tailDistance = Math.max(
      settings.holeRadius,
      headDistance - streakLength,
    );

    const tailX = centerX + star.dirX * tailDistance;
    const tailY = centerY + star.dirY * tailDistance;
    const headX = centerX + star.dirX * headDistance;
    const headY = centerY + star.dirY * headDistance;

    let opacity = 1;
    if (headDistance < settings.glowRadius) {
      const t =
        (headDistance - settings.holeRadius) /
        (settings.glowRadius - settings.holeRadius);
      opacity = Math.pow(Math.max(0, t), settings.glowSoftness);
    }
    if (opacity <= 0.01) continue;

    const [r, g, b] = star.color;
    const gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
    gradient.addColorStop(settings.tailFade, `rgba(${r},${g},${b},${opacity})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},${opacity})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = star.width * (0.5 + travel * 0.9);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();
  }
}

createStars();
resizeCanvas();
drawStarfield();

window.addEventListener("resize", () => {
  resizeCanvas();
  drawStarfield();
});

const headers = [
  document.getElementById("header-1"),
  document.getElementById("header-2"),
  document.getElementById("header-3"),
];

const headerWords = headers.map(
  (header) =>
    SplitText.create(header, { type: "words", wordsClass: "word" }).words,
);

headerWords.forEach((words, index) => {
  gsap.set(words, { opacity: index === 0 ? 1 : 0 });
});
gsap.set([headers[1], headers[2]], { scale: 0.85 });

const wordCount = headerWords.map((words) => words.length);
const totalWordSteps = wordCount[0] + wordCount[1] * 2 + wordCount[2];
const perWord = 1 / totalWordSteps;

const readingPause = perWord * 4;
const edgeHold = totalWordSteps * perWord * 0.075;

const timeline = gsap.timeline({ defaults: { ease: "none" } });

function fadeHeaderIn(header, words) {
  const span = words.length * perWord;
  timeline.to(
    words,
    { opacity: 1, stagger: { each: perWord }, duration: perWord },
    ">",
  );
  timeline.to(header, { scale: 1, duration: span }, "<");
}

function fadeHeaderOut(header, words) {
  const span = words.length * perWord;
  timeline.to(header, { scale: 1.12, duration: readingPause + span }, ">");
  timeline.to(
    words,
    { opacity: 0, stagger: { each: perWord }, duration: perWord },
    `<+${readingPause}`,
  );
}

timeline.to({}, { duration: edgeHold });
fadeHeaderOut(headers[0], headerWords[0]);
fadeHeaderIn(headers[1], headerWords[1]);
fadeHeaderOut(headers[1], headerWords[1]);
fadeHeaderIn(headers[2], headerWords[2]);
timeline.to({}, { duration: edgeHold });

ScrollTrigger.create({
  trigger: ".starfield",
  start: "top top",
  end: "+=500%",
  pin: true,
  scrub: 1,
  animation: timeline,
  onUpdate: (self) => {
    scrollProgress = self.progress;
    drawStarfield();
  },
});
