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
    if (headings.length < 3) return null;

    ensureHeadingIds(headings);

    const container = document.createElement("nav");
    container.className = "cvv-toc is-collapsed";
    container.setAttribute("aria-label", "Table of contents");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "cvv-toc-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Table of contents";

    const panel = document.createElement("div");
    panel.className = "cvv-toc-panel";

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

    panel.appendChild(list);
    container.appendChild(toggle);
    container.appendChild(panel);
    root.insertBefore(container, root.firstChild);

    toggle.addEventListener("click", () => {
      const collapsed = container.classList.toggle("is-collapsed");
      toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    list.querySelectorAll("a.cvv-toc-link").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const target = document.getElementById(link.dataset.targetId || "");
        if (!target) return;

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${target.id}`);
      });
    });

    return { container, links: Array.from(list.querySelectorAll(".cvv-toc-link")), headings };
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

  const bindScrollSpy = (links, headings) => {
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
      { rootMargin: "-18% 0px -70% 0px", threshold: [0.1, 0.5] }
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

    const faqItems = [];

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
      faqItems.push(item);
    });

    faqItems.slice(0, 2).forEach((faqItem) => faqItem.classList.add("is-open"));
  };

  const initCvvBlocksRenderer = () => {
    document.querySelectorAll(".cvv-article").forEach((root) => {
      bindSafeCta(root);
      const toc = createToc(root);
      if (toc) bindScrollSpy(toc.links, toc.headings);
      enhanceFaq(root);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCvvBlocksRenderer, { once: true });
  } else {
    initCvvBlocksRenderer();
  }
})();
