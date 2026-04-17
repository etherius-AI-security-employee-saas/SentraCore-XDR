const revealNodes = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.18 },
);

revealNodes.forEach((node) => observer.observe(node));

const tiltNode = document.querySelector("[data-tilt]");
if (tiltNode instanceof HTMLElement) {
  const updateTilt = (event) => {
    const rect = tiltNode.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
    tiltNode.style.transform = `perspective(1400px) rotateX(${relativeY * -3}deg) rotateY(${relativeX * 5}deg)`;
  };

  tiltNode.addEventListener("mousemove", updateTilt);
  tiltNode.addEventListener("mouseleave", () => {
    tiltNode.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg)";
  });
}

const yearNode = document.getElementById("year");
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}
