(() => {
  const isSafeProtocol = (url) => {
    try {
      const parsed = new URL(url, window.location.origin);
      return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
    } catch (_error) {
      return false;
    }
  };

  const slugify = (value) => {
    return value
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const ensureHeadingIds = (headings) => {
    const seen = new Map();

    headings.forEach((heading, index) => {
      if (heading.id) return;
      const base = slugify(heading.textContent || "") || `section-${index + 1}`;
      const current = seen.get(base) || 0;
      seen.set(base, current + 1);
      heading.id = current > 0 ? `${base}-${current + 1}` : base;
    });
  };

  const createToc = (root) => {
    const headings = Array.from(root.querySelectorAll("h2.cvv-heading, h3.cvv-heading"));
    if (headings.length < 3) return;

    ensureHeadingIds(headings);

    const container = document.createElement("nav");
    container.className = "cvv-toc cvv-animate";
    container.setAttribute("aria-label", "Table of contents");

    const title = document.createElement("p");
    title.className = "cvv-toc-title";
    title.textContent = "Contents";
    container.appendChild(title);

    const list = document.createElement("ul");
    list.className = "cvv-toc-list";
    let currentH2Item = null;

    headings.forEach((heading) => {
      const level = Number(heading.tagName.replace("H", ""));
      const item = document.createElement("li");
      item.className = "cvv-toc-item";

      const link = document.createElement("a");
      link.className = "cvv-toc-link";
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.trim();
      link.dataset.targetId = heading.id;
      item.appendChild(link);

      if (level === 3 && currentH2Item) {
        let sublist = currentH2Item.querySelector(".cvv-toc-sublist");
        if (!sublist) {
          sublist = document.createElement("ul");
          sublist.className = "cvv-toc-sublist";
          currentH2Item.appendChild(sublist);
        }
        sublist.appendChild(item);
      } else {
        list.appendChild(item);
        currentH2Item = item;
      }
    });

    container.appendChild(list);
    root.insertBefore(container, root.firstChild);

    list.querySelectorAll("a.cvv-toc-link").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const target = document.getElementById(link.dataset.targetId || "");
        if (!target) return;

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${target.id}`);
      });
    });
  };

  const bindSafeCta = (root) => {
    root.querySelectorAll("a.cvv-button-cta").forEach((anchor) => {
      const href = anchor.getAttribute("href") || "";
      if (!isSafeProtocol(href)) {
        anchor.removeAttribute("href");
        anchor.classList.add("cvv-button-cta-disabled");
        return;
      }
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });
  };

  const bindScrollSpy = (root) => {
    const links = Array.from(root.querySelectorAll(".cvv-toc-link"));
    const headings = Array.from(root.querySelectorAll("h2.cvv-heading[id], h3.cvv-heading[id]"));
    if (!links.length || !headings.length) return;

    const activate = (id) => {
      links.forEach((link) => {
        link.classList.toggle("is-active", link.dataset.targetId === id);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target?.id) activate(visible.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0.1, 0.5] }
    );

    headings.forEach((heading) => observer.observe(heading));
    if (headings[0]?.id) activate(headings[0].id);
  };

  const enhanceFaq = (root) => {
    const headingCandidates = Array.from(root.querySelectorAll("h2.cvv-heading, h3.cvv-heading"));
    const faqHeading = headingCandidates.find((heading) => /faq|câu hỏi|hoi dap/i.test(heading.textContent || ""));
    if (!faqHeading) return;

    const list = faqHeading.nextElementSibling;
    if (!list || !["UL", "OL"].includes(list.tagName)) return;

    list.classList.add("cvv-faq-list");

    Array.from(list.children).forEach((item) => {
      if (item.tagName !== "LI") return;

      const raw = item.innerHTML;
      const segments = raw.split(/<br\s*\/?\s*>/i);
      const question = (segments.shift() || "").trim();
      const answer = segments.join("<br>").trim();
      if (!question || !answer) return;

      item.classList.add("cvv-faq-item");
      item.innerHTML = "";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "cvv-faq-toggle";
      button.innerHTML = question;

      const panel = document.createElement("div");
      panel.className = "cvv-faq-answer";
      panel.innerHTML = answer;

      button.addEventListener("click", () => {
        item.classList.toggle("is-open");
      });

      item.appendChild(button);
      item.appendChild(panel);
    });
  };

  const bindRevealAnimation = (root) => {
    const candidates = Array.from(root.children).filter((node) => !node.classList.contains("cvv-toc"));
    candidates.forEach((node) => node.classList.add("cvv-animate"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    candidates.forEach((node) => observer.observe(node));
  };

  const initCvvBlocksRenderer = () => {
    document.querySelectorAll(".cvv-article").forEach((root) => {
      bindSafeCta(root);
      createToc(root);
      bindScrollSpy(root);
      enhanceFaq(root);
      bindRevealAnimation(root);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCvvBlocksRenderer, { once: true });
  } else {
    initCvvBlocksRenderer();
  }
})();
