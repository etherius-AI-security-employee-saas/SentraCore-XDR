(() => {
  const body = document.body;
  const page = body.dataset.page || "";

  const motes = document.createElement("div");
  motes.className = "bg-motes";
  for (let i = 0; i < 28; i += 1) {
    const mote = document.createElement("span");
    const size = 3 + Math.random() * 8;
    mote.style.width = `${size}px`;
    mote.style.height = `${size}px`;
    mote.style.left = `${Math.random() * 100}%`;
    mote.style.bottom = `${-10 - Math.random() * 40}px`;
    mote.style.animationDuration = `${18 + Math.random() * 22}s`;
    mote.style.animationDelay = `${Math.random() * 14}s`;
    mote.style.opacity = `${0.2 + Math.random() * 0.35}`;
    motes.appendChild(mote);
  }
  document.body.appendChild(motes);

  const nav = document.querySelector(".nav-links");
  const menuBtn = document.querySelector(".menu-btn");
  if (nav && menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach((link) => {
      if (link.dataset.page === page) {
        link.classList.add("active");
      }

      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.querySelectorAll(".btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  });

  document.querySelectorAll(".card, .product-card, .download-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rx = ((y / rect.height) - 0.5) * -5;
      const ry = ((x / rect.width) - 0.5) * 7;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  const wipe = document.createElement("div");
  wipe.className = "page-wipe";
  document.body.appendChild(wipe);

  const clearWipe = () => wipe.classList.remove("active");
  clearWipe();
  window.addEventListener("pageshow", clearWipe);
  window.addEventListener("popstate", clearWipe);

  document.querySelectorAll("a[data-transition='page']").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("/") || href.startsWith("/api")) {
      return;
    }

    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      event.preventDefault();
      wipe.classList.add("active");
      setTimeout(() => {
        window.location.href = href;
      }, 180);
      setTimeout(clearWipe, 1200);
    });
  });

  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const runCounter = (element) => {
      const target = Number(element.dataset.count || "0");
      const suffix = element.dataset.suffix || "";
      const prefix = element.dataset.prefix || "";
      const decimals = Number(element.dataset.decimals || "0");
      const start = performance.now();
      const duration = 1200;

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        element.textContent = `${prefix}${decimals ? value.toFixed(decimals) : Math.floor(value)}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          element.textContent = `${prefix}${decimals ? target.toFixed(decimals) : target}${suffix}`;
        }
      };

      requestAnimationFrame(tick);
    };

    let started = false;
    const trigger = document.querySelector(".stats-row") || counters[0];
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started) {
          started = true;
          counters.forEach(runCounter);
        }
      });
    }, { threshold: 0.26 });

    counterObserver.observe(trigger);
  }

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy || "";
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Copy Failed";
      }
      setTimeout(() => {
        button.textContent = original;
      }, 1200);
    });
  });

  const xdrCanvas = document.querySelector(".xdr-canvas");
  if (xdrCanvas instanceof HTMLCanvasElement && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const context = xdrCanvas.getContext("2d");
    if (context) {
      const particles = [];
      const pointer = { x: 0, y: 0, active: false };
      const host = xdrCanvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const resizeCanvas = () => {
        const rect = xdrCanvas.getBoundingClientRect();
        xdrCanvas.width = rect.width * dpr;
        xdrCanvas.height = rect.height * dpr;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        particles.length = 0;

        const count = Math.max(22, Math.floor(rect.width / 26));
        for (let index = 0; index < count; index += 1) {
          particles.push({
            x: Math.random() * rect.width,
            y: Math.random() * rect.height,
            vx: (Math.random() - 0.5) * 0.28,
            vy: (Math.random() - 0.5) * 0.28,
            radius: 0.8 + Math.random() * 1.6,
          });
        }
      };

      const draw = () => {
        const width = xdrCanvas.width / dpr;
        const height = xdrCanvas.height / dpr;
        context.clearRect(0, 0, width, height);

        particles.forEach((particle, index) => {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x < -40) particle.x = width + 40;
          if (particle.x > width + 40) particle.x = -40;
          if (particle.y < -40) particle.y = height + 40;
          if (particle.y > height + 40) particle.y = -40;

          context.beginPath();
          context.fillStyle = "rgba(255,255,255,0.55)";
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context.fill();

          for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
            const nextParticle = particles[nextIndex];
            const dx = particle.x - nextParticle.x;
            const dy = particle.y - nextParticle.y;
            const distance = Math.hypot(dx, dy);

            if (distance < 132) {
              context.strokeStyle = `rgba(106,229,255,${(1 - distance / 132) * 0.16})`;
              context.lineWidth = 1;
              context.beginPath();
              context.moveTo(particle.x, particle.y);
              context.lineTo(nextParticle.x, nextParticle.y);
              context.stroke();
            }
          }

          if (pointer.active) {
            const pointerDx = pointer.x - particle.x;
            const pointerDy = pointer.y - particle.y;
            const pointerDistance = Math.hypot(pointerDx, pointerDy);
            if (pointerDistance < 170) {
              context.strokeStyle = `rgba(99,241,199,${(1 - pointerDistance / 170) * 0.2})`;
              context.beginPath();
              context.moveTo(particle.x, particle.y);
              context.lineTo(pointer.x, pointer.y);
              context.stroke();
            }
          }
        });

        requestAnimationFrame(draw);
      };

      resizeCanvas();
      draw();
      window.addEventListener("resize", resizeCanvas);

      if (host) {
        host.addEventListener("mousemove", (event) => {
          const rect = xdrCanvas.getBoundingClientRect();
          pointer.x = event.clientX - rect.left;
          pointer.y = event.clientY - rect.top;
          pointer.active = true;
        });

        host.addEventListener("mouseleave", () => {
          pointer.active = false;
        });
      }
    }
  }
})();
