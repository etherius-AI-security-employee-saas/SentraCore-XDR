const revealNodes = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.16 },
);

revealNodes.forEach((node) => observer.observe(node));

const tiltNode = document.querySelector("[data-tilt]");
if (tiltNode instanceof HTMLElement) {
  const updateTilt = (event) => {
    const rect = tiltNode.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltNode.style.transform = `perspective(1600px) rotateX(${y * -3}deg) rotateY(${x * 4}deg)`;
  };

  tiltNode.addEventListener("mousemove", updateTilt);
  tiltNode.addEventListener("mouseleave", () => {
    tiltNode.style.transform = "perspective(1600px) rotateX(0deg) rotateY(0deg)";
  });
}

const canvas = document.getElementById("fx-layer");
if (canvas instanceof HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (context) {
    const particles = [];
    const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles.length = 0;
      const count = Math.max(28, Math.floor(window.innerWidth / 48));

      for (let index = 0; index < count; index += 1) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          radius: Math.random() * 1.6 + 0.7,
        });
      }
    };

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -40) particle.x = canvas.width + 40;
        if (particle.x > canvas.width + 40) particle.x = -40;
        if (particle.y < -40) particle.y = canvas.height + 40;
        if (particle.y > canvas.height + 40) particle.y = -40;

        const dx = pointer.x - particle.x;
        const dy = pointer.y - particle.y;
        const distance = Math.hypot(dx, dy);

        context.beginPath();
        context.fillStyle = "rgba(255,255,255,0.42)";
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const nextParticle = particles[nextIndex];
          const lineDx = particle.x - nextParticle.x;
          const lineDy = particle.y - nextParticle.y;
          const lineDistance = Math.hypot(lineDx, lineDy);

          if (lineDistance < 120) {
            context.strokeStyle = `rgba(104,240,255,${(1 - lineDistance / 120) * 0.12})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(nextParticle.x, nextParticle.y);
            context.stroke();
          }
        }

        if (distance < 180) {
          context.strokeStyle = `rgba(117,255,181,${(1 - distance / 180) * 0.18})`;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      });

      window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    });
  }
}

const yearNode = document.getElementById("year");
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}
