(() => {
  const isSafeProtocol = (url) => {
    try {
      const parsed = new URL(url, window.location.origin);
      return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
    } catch (_error) {
      return false;
    }
  };

  const initCvvBlocksRenderer = () => {
    const rootNodes = document.querySelectorAll(".cvv-article");

    rootNodes.forEach((root) => {
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
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCvvBlocksRenderer, { once: true });
  } else {
    initCvvBlocksRenderer();
  }
})();
